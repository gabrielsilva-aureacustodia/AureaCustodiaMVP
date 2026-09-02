/**
 * O vocabulário mínimo que os repositórios usam para falar com o banco.
 *
 * Este módulo NÃO tem `import 'server-only'` de propósito: ele não carrega
 * segredo nenhum — só tipos e duas funções puras — e precisa ser importável
 * pela suíte de testes, que roda os repositórios contra um Postgres embutido
 * (ver db.test.ts). Quem carrega credenciais é o client.ts, e esse sim tem a
 * barreira.
 *
 * `Consulta` é a única coisa que um repositório sabe sobre a conexão: um
 * `query(texto, valores)` que devolve linhas. Tanto o `PoolClient` do `pg`
 * quanto a transação do PGlite cabem nessa forma, e é isso que permite testar
 * a SQL de verdade sem infraestrutura.
 */

/** Uma conexão (ou transação) capaz de executar SQL parametrizada. */
export interface Consulta {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    texto: string,
    valores?: readonly unknown[],
  ): Promise<{ rows: R[] }>
}

export interface OpcoesTransacao {
  /**
   * Abre a transação como somente leitura, com instantâneo consistente: as
   * nove consultas que montam o AppState enxergam o mesmo momento do banco,
   * mesmo que uma escrita seja commitada no meio delas.
   */
  somenteLeitura?: boolean
}

/**
 * Executa `fn` dentro de UMA transação e devolve o que ela retornar. Commit se
 * `fn` resolver, rollback se rejeitar. É a única forma de obter uma `Consulta`
 * — não existe consulta fora de transação, para que nenhum repositório possa
 * ler com uma conexão e escrever com outra.
 */
export type Executor = <T>(
  fn: (tx: Consulta) => Promise<T>,
  opcoes?: OpcoesTransacao,
) => Promise<T>

/** Nome padrão do schema — o que a migration cria e o Supabase não expõe. */
export const SCHEMA_PADRAO = 'aurea'

/**
 * Identificador de schema: só letras minúsculas, dígitos e sublinhado, começando
 * por letra ou sublinhado. O nome entra na SQL por interpolação (identificador
 * não aceita parâmetro), então a validação é o que impede uma variável de
 * ambiente malformada de virar SQL injetada.
 */
const IDENTIFICADOR = /^[a-z_][a-z0-9_]{0,62}$/

/**
 * Schema em uso, vindo de `AUREA_DB_SCHEMA` ou o padrão `aurea`.
 *
 * A variável existe pelo mesmo motivo que `AUREA_STORE_KEY` existia no blob: o
 * banco é um só, e um ambiente local apontado para o mesmo projeto Supabase
 * mexeria no saldo dos sócios. Com `AUREA_DB_SCHEMA=aurea_local`, o mesmo banco
 * recebe uma "gaveta" separada, criada por `npm run db:migrate`.
 */
export function nomeDoSchema(): string {
  const bruto = process.env.AUREA_DB_SCHEMA?.trim()
  if (!bruto) return SCHEMA_PADRAO
  if (!IDENTIFICADOR.test(bruto)) {
    throw new Error(
      `AUREA_DB_SCHEMA inválido: "${bruto}". Use só letras minúsculas, dígitos e "_".`,
    )
  }
  return bruto
}

/**
 * Converte o que o driver devolver para `bigint`/`integer` em `number`.
 *
 * O `pg` entrega `bigint` como STRING (o tipo pode exceder 2^53); o PGlite
 * entrega como `BigInt`. Nenhum dos dois é o `Cents` do domínio. Todo valor da
 * plataforma cabe com folga em um `number` inteiro — R$ 90 trilhões em
 * centavos — então a conversão é segura, e centralizá-la aqui é o que evita um
 * `'28500' + 100 === '28500100'` escondido em algum repositório.
 */
export function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'bigint' || typeof v === 'string') {
    const n = Number(v)
    if (!Number.isSafeInteger(n)) throw new Error(`Valor inteiro fora do intervalo seguro: ${String(v)}`)
    return n
  }
  throw new Error(`Esperava número do banco, veio ${typeof v}`)
}

/** `num` para colunas que aceitam NULL. */
export function numOuNulo(v: unknown): number | null {
  return v === null || v === undefined ? null : num(v)
}

/**
 * Lê uma coluna `jsonb`. O `pg` já desserializa; o PGlite também. Se algum
 * driver devolver a string crua, o parse cobre — e o tipo continua sendo
 * responsabilidade de quem chama, que sabe o que gravou.
 */
export function json<T>(v: unknown): T | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return JSON.parse(v) as T
  return v as T
}

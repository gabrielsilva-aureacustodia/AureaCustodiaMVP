/**
 * Tipos de `db-check.mjs` para quem o importa de TypeScript — hoje a suíte em
 * src/server/db/db.test.ts, que roda o diagnóstico contra o Postgres embutido.
 *
 * O script é JavaScript puro porque roda fora do Next, sem bundler
 * (`node scripts/db-check.mjs`), e o `tsconfig` do projeto tem `allowJs: false`.
 * Esta declaração é o que permite as duas coisas ao mesmo tempo: comando em JS,
 * teste em TS, sem `any`.
 */

/**
 * Cliente mínimo: serve o `pg` e serve a transação do Postgres embutido.
 *
 * `R` precisa da MESMA restrição que `Consulta` em src/server/db/sql.ts
 * (`extends Record<string, unknown>`). Sem ela, um chamador poderia pedir
 * `R = number`, que a `Consulta` do projeto não sabe devolver — e o
 * `tsc --noEmit` recusa passar uma à outra, que é exatamente o que a suíte
 * faz em db.test.ts.
 */
export interface ClienteDeConsulta {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    texto: string,
    valores?: readonly unknown[],
  ): Promise<{ rows: R[] }>
}

export interface Achado {
  nivel: 'ok' | 'info' | 'aviso' | 'falha'
  texto: string
}

export interface Diagnostico {
  achados: Achado[]
  /** true quando nenhum achado é 'falha' — é o código de saída do comando. */
  pronto: boolean
}

export declare const TABELAS_ESPERADAS: readonly string[]

export declare function identificadorValido(nome: string): boolean

export declare function diagnosticar(
  client: ClienteDeConsulta,
  schema: string,
): Promise<Diagnostico>

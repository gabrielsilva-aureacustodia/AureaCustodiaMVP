import type { Pool, PoolClient } from 'pg'

import type { StateStore, StoreKind } from './types'

/**
 * Store sobre Postgres (Vercel Postgres, Neon, Supabase — qualquer um serve).
 *
 * É o único backend que resolve concorrência de verdade: `mutate` roda dentro
 * de uma transação com SELECT ... FOR UPDATE, então duas compras simultâneas
 * da mesma moeda entram em fila em vez de uma apagar a outra. O Redis apenas
 * mitiga (ver comentário em redis.ts).
 *
 * Uma tabela chave-valor basta porque o MVP tratava o estado como um documento
 * único. O schema normalizado de 9 tabelas da Seção 2.5 é a etapa seguinte da
 * migração; enquanto ele não existe, o JSONB guarda o mesmo AppState inteiro.
 *
 * O `import` de 'pg' é dinâmico e fica DENTRO da função de conexão: no topo do
 * módulo ele seria resolvido em todo build, inclusive nas implantações que
 * escolhem memória ou Redis e não têm o banco configurado. Só os `import type`
 * ficam aqui em cima — eles somem na compilação e não geram require nenhum.
 */

/**
 * Schema próprio, fora do `public`. No Supabase, `public` é publicado como API
 * REST na internet; `aurea` não está na lista de schemas expostos. Ver o
 * comentário em ensureTable().
 */
const SCHEMA = 'aurea'
const TABLE = `${SCHEMA}.aurea_state`

/** `ssl` do pg aceita boolean ou opções de TLS; só usamos essas duas formas. */
type SslConfig = boolean | { rejectUnauthorized: boolean }

/**
 * TLS deduzido da própria connection string, como manda o costume do Postgres.
 * Provedores gerenciados usam certificado de cadeia própria, por isso o
 * `rejectUnauthorized: false` — quem quiser verificação estrita pede
 * explicitamente com sslmode=verify-full.
 */
function sslFor(connectionString: string): SslConfig {
  const mode = /[?&\s]sslmode=([^&\s]+)/.exec(connectionString)?.[1]
  if (mode === 'disable') return false
  if (mode === 'verify-full' || mode === 'verify-ca') return true
  if (mode) return { rejectUnauthorized: false }
  // Sem sslmode declarado: banco local roda sem TLS, qualquer outro host exige.
  return isLocalHost(connectionString) ? false : { rejectUnauthorized: false }
}

function isLocalHost(connectionString: string): boolean {
  let host = ''
  try {
    host = new URL(connectionString).hostname
  } catch {
    // Senha com caractere não escapado derruba o parser de URL; nesse caso
    // vale o palpite pelo texto, que erra para o lado seguro (usa TLS).
    host = /@([^:/?]+)/.exec(connectionString)?.[1] ?? ''
  }
  // A URL padrão devolve IPv6 entre colchetes; comparamos as duas formas.
  return (
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'
  )
}

export function createPostgresStore(connectionString: string): StateStore {
  const kind: StoreKind = 'postgres'

  // Um pool por store — e o store é singleton de módulo (index.ts), logo um
  // pool por processo. Em serverless o processo é reaproveitado entre
  // invocações, e abrir um pool por requisição estoura o limite de conexões do
  // banco em minutos. Guardamos a PROMESSA, não o pool pronto, para que duas
  // requisições concorrentes no mesmo cold start compartilhem a criação.
  let poolPromise: Promise<Pool> | null = null
  let tablePromise: Promise<void> | null = null

  async function createPool(): Promise<Pool> {
    const { Pool: PgPool } = await import('pg')
    return new PgPool({
      connectionString,
      ssl: sslFor(connectionString),
      // Serverless: muitas instâncias pequenas, cada uma com poucas conexões.
      max: 5,
      idleTimeoutMillis: 30_000,
    })
  }

  function getPool(): Promise<Pool> {
    poolPromise ??= createPool()
    return poolPromise
  }

  /**
   * Cria a tabela sob demanda, na primeira operação. É idempotente e roda uma
   * vez por processo — evita exigir um passo de migração manual antes do
   * primeiro deploy funcionar.
   */
  function ensureTable(): Promise<void> {
    tablePromise ??= (async () => {
      const pool = await getPool()
      /*
       * SCHEMA PRÓPRIO E RLS LIGADA — não é enfeite, é a diferença entre o
       * estado ficar privado ou público.
       *
       * O Supabase publica automaticamente uma API REST na internet para toda
       * tabela do schema `public`, acessível com a chave `anon` — que é pública
       * por design e está no repositório aberto. Uma tabela `public.aurea_state`
       * sem RLS seria o estado inteiro (saldos, ofertas, senhas de teste)
       * legível e ALTERÁVEL por qualquer pessoa, sem passar pela plataforma.
       *
       * Duas defesas independentes, e as duas ficam:
       *  1. o schema `aurea` não está na lista de schemas expostos pela API;
       *  2. RLS ligada sem política nenhuma nega tudo aos papéis `anon` e
       *     `authenticated`. O dono da tabela (este mesmo usuário `postgres`,
       *     via conexão direta) não é afetado — RLS não vale para o dono.
       *
       * Em Postgres fora do Supabase (Neon, local) o schema e o RLS são
       * inócuos: custam nada e não mudam comportamento.
       */
      await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`)
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ${TABLE} (
           key TEXT PRIMARY KEY,
           value JSONB NOT NULL,
           updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
         )`,
      )
      await pool.query(`ALTER TABLE ${TABLE} ENABLE ROW LEVEL SECURITY`)
    })()
    return tablePromise
  }

  return {
    kind,

    async get<T>(key: string): Promise<T | null> {
      await ensureTable()
      const pool = await getPool()
      const res = await pool.query<{ value: unknown }>(
        `SELECT value FROM ${TABLE} WHERE key = $1`,
        [key],
      )
      const row = res.rows[0]
      if (!row) return null
      // JSONB já chega desserializado do driver; o JSON null vira null aqui.
      return (row.value ?? null) as T | null
    },

    async set<T>(key: string, value: T): Promise<void> {
      await ensureTable()
      const pool = await getPool()
      await pool.query(
        `INSERT INTO ${TABLE} (key, value, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, JSON.stringify(value)],
      )
    },

    async mutate<T, S>(
      key: string,
      mutator: (current: S | null) => S | Promise<S>,
      pick: (s: S) => T,
    ): Promise<{ state: S; result: T }> {
      await ensureTable()
      const pool = await getPool()
      const client: PoolClient = await pool.connect()

      try {
        await client.query('BEGIN')

        // O FOR UPDATE só tranca linha existente — numa base recém-criada não
        // haveria nada para trancar e duas requisições simultâneas semeariam o
        // estado duas vezes. O INSERT de um JSON null garante que a linha
        // exista; quem chegar depois fica bloqueado no índice único até o
        // commit do primeiro e então enxerga o estado já semeado.
        await client.query(
          `INSERT INTO ${TABLE} (key, value) VALUES ($1, 'null'::jsonb)
           ON CONFLICT (key) DO NOTHING`,
          [key],
        )

        const res = await client.query<{ value: unknown }>(
          `SELECT value FROM ${TABLE} WHERE key = $1 FOR UPDATE`,
          [key],
        )
        const current = (res.rows[0]?.value ?? null) as S | null

        const next = await mutator(current)

        await client.query(
          `UPDATE ${TABLE} SET value = $2::jsonb, updated_at = now() WHERE key = $1`,
          [key, JSON.stringify(next)],
        )
        await client.query('COMMIT')

        return { state: next, result: pick(next) }
      } catch (err) {
        // O rollback não pode mascarar o erro original: se ele mesmo falhar
        // (conexão caída, por exemplo), o que interessa relatar é o primeiro.
        await client.query('ROLLBACK').catch(() => undefined)
        throw err
      } finally {
        client.release()
      }
    },
  }
}

/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * É por aqui que a credencial do banco entra (POSTGRES_URL). Importar este
 * arquivo de um Client Component quebra o build — é o `server-only` abaixo
 * fazendo o papel de compilador, como em ../state.ts.
 * ==========================================================================*/

import 'server-only'

import type { Pool, PoolClient } from 'pg'

import type { Consulta, Executor } from './sql'

/**
 * Cliente Postgres para o Supabase (ou qualquer Postgres) — a única porta de
 * entrada para o banco. Substitui o adaptador de blob em ../store/postgres.ts
 * com a mesma disciplina de conexão:
 *
 *  - UM pool por processo, pendurado em `globalThis`. O Next mantém dois grafos
 *    de bundle no mesmo processo em desenvolvimento (Server Actions e Route
 *    Handlers); um pool por módulo viraria dois pools, e em serverless cada um
 *    esgotaria sozinho as conexões do plano Free. `globalThis` é único por
 *    processo e atravessa a fronteira de bundle.
 *  - Guarda-se a PROMESSA do pool, não o pool: duas requisições no mesmo cold
 *    start compartilham a criação em vez de disparar duas.
 *  - `pg` é importado dinamicamente DENTRO da função: no topo do módulo ele
 *    seria resolvido em todo build, inclusive nos ambientes sem banco (que
 *    caem no store em memória e nunca deveriam carregar o driver).
 *  - Sem prepared statements nomeados. O pooler do Supabase em modo transação
 *    (porta 6543) não os aceita; `client.query(texto, valores)` usa statements
 *    anônimos, que ele aceita.
 */

/** As variáveis que ligam o banco, na ordem em que o legado já as procurava. */
export function urlDoBanco(): string | undefined {
  const v = process.env.POSTGRES_URL ?? process.env.DATABASE_URL
  return v && v.length > 0 ? v : undefined
}

/** true quando há Postgres configurado — e, portanto, quando o estado vive em tabelas. */
export function bancoConfigurado(): boolean {
  return urlDoBanco() !== undefined
}

/* ---------- TLS ---------- */

type SslConfig = boolean | { rejectUnauthorized: boolean }

/**
 * TLS deduzido da connection string, como em ../store/postgres.ts. Provedores
 * gerenciados usam cadeia própria, por isso `rejectUnauthorized: false`; quem
 * quiser verificação estrita pede com sslmode=verify-full.
 */
function sslFor(connectionString: string): SslConfig {
  const mode = /[?&\s]sslmode=([^&\s]+)/.exec(connectionString)?.[1]
  if (mode === 'disable') return false
  if (mode === 'verify-full' || mode === 'verify-ca') return true
  if (mode) return { rejectUnauthorized: false }
  return isLocalHost(connectionString) ? false : { rejectUnauthorized: false }
}

function isLocalHost(connectionString: string): boolean {
  let host = ''
  try {
    host = new URL(connectionString).hostname
  } catch {
    host = /@([^:/?]+)/.exec(connectionString)?.[1] ?? ''
  }
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'
}

/* ---------- pool ---------- */

interface GlobalComPool {
  __aureaDbPool__?: Promise<Pool>
}

async function criarPool(connectionString: string): Promise<Pool> {
  const { Pool: PgPool } = await import('pg')
  return new PgPool({
    connectionString,
    ssl: sslFor(connectionString),
    // Serverless: muitas instâncias pequenas, cada uma com poucas conexões.
    max: 5,
    idleTimeoutMillis: 30_000,
  })
}

function obterPool(): Promise<Pool> {
  const url = urlDoBanco()
  if (!url) {
    throw new Error('Banco não configurado: defina POSTGRES_URL (ou DATABASE_URL).')
  }
  const g = globalThis as unknown as GlobalComPool
  g.__aureaDbPool__ ??= criarPool(url)
  return g.__aureaDbPool__
}

/** Veste o `PoolClient` do `pg` com a forma mínima que os repositórios conhecem. */
function adaptar(client: PoolClient): Consulta {
  return {
    async query<R extends Record<string, unknown>>(texto: string, valores?: readonly unknown[]) {
      const res = await client.query<R>(texto, valores ? [...valores] : undefined)
      return { rows: res.rows }
    },
  }
}

/**
 * Abre uma transação, entrega a conexão a `fn`, commita se ela resolver e
 * desfaz se ela rejeitar. A leitura pede REPEATABLE READ para que as nove
 * consultas do AppState vejam o mesmo instantâneo; a escrita usa o nível
 * padrão e conta com o FOR UPDATE em `seq` (ver repositories/seq.ts).
 */
export const executarNoBanco: Executor = async (fn, opcoes) => {
  const pool = await obterPool()
  const client = await pool.connect()
  try {
    await client.query(
      opcoes?.somenteLeitura ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN',
    )
    const saida = await fn(adaptar(client))
    await client.query('COMMIT')
    return saida
  } catch (err) {
    // O rollback não pode mascarar o erro original.
    await client.query('ROLLBACK').catch(() => undefined)
    throw err
  } finally {
    client.release()
  }
}

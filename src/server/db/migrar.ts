/**
 * Aplicador de migrations — a versão que a suíte de testes usa.
 *
 * Lê os arquivos de `migrations/` em ordem de nome, aplica os que ainda não
 * constam em `schema_migrations` e registra cada um. Cada arquivo roda dentro
 * de uma transação própria: ou entra inteiro, ou não entra.
 *
 * Existe também `scripts/db-migrate.mjs`, que faz o mesmo contra o Supabase a
 * partir da linha de comando. São dois arquivos porque este é TypeScript com o
 * alias `@/` e o outro precisa rodar em Node puro, sem bundler; a SQL é UMA só,
 * lida da mesma pasta. Se um dia mudar a regra do que é "aplicado", muda nos
 * dois — está anotado no README.
 *
 * Sem `server-only`: os testes importam daqui. Não há segredo — só leitura de
 * arquivos SQL versionados.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { nomeDoSchema, SCHEMA_PADRAO, type Executor } from './sql'

export interface Migration {
  /** Nome do arquivo sem extensão: '001_inicial'. */
  versao: string
  sql: string
}

export const PASTA_MIGRATIONS = fileURLToPath(new URL('./migrations', import.meta.url))

/** Lista os `.sql` da pasta, em ordem de nome — o prefixo numérico é a ordem. */
export function listarMigrations(pasta: string = PASTA_MIGRATIONS): Migration[] {
  return readdirSync(pasta)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ versao: f.replace(/\.sql$/, ''), sql: readFileSync(join(pasta, f), 'utf8') }))
}

/**
 * Reescreve a SQL para outro schema. Os arquivos são escritos com `aurea.`
 * literal — assim podem ser colados no editor SQL do Supabase sem risco de
 * cair no `public` — e a troca só acontece quando `AUREA_DB_SCHEMA` pede outra
 * gaveta (ambiente local, suíte de testes contra banco real).
 */
export function comSchema(sql: string, schema: string): string {
  if (schema === SCHEMA_PADRAO) return sql
  return sql
    .replace(/\baurea\./g, `${schema}.`)
    .replace(/SCHEMA IF NOT EXISTS aurea\b/g, `SCHEMA IF NOT EXISTS ${schema}`)
}

export interface OpcoesMigrar {
  schema?: string
  migrations?: Migration[]
}

/** Aplica o que falta e devolve as versões aplicadas nesta chamada. */
export async function aplicarMigrations(executar: Executor, opcoes: OpcoesMigrar = {}): Promise<string[]> {
  const S = opcoes.schema ?? nomeDoSchema()
  const migrations = opcoes.migrations ?? listarMigrations()

  await executar(async (tx) => {
    await tx.query(`CREATE SCHEMA IF NOT EXISTS ${S}`)
    await tx.query(
      `CREATE TABLE IF NOT EXISTS ${S}.schema_migrations (
         version    text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    )
    await tx.query(`ALTER TABLE ${S}.schema_migrations ENABLE ROW LEVEL SECURITY`)
  })

  const aplicadas = new Set(
    (
      await executar((tx) => tx.query<{ version: string }>(`SELECT version FROM ${S}.schema_migrations`))
    ).rows.map((r) => r.version),
  )

  const novas: string[] = []
  for (const m of migrations) {
    if (aplicadas.has(m.versao)) continue
    await executar(async (tx) => {
      await tx.query(comSchema(m.sql, S))
      await tx.query(`INSERT INTO ${S}.schema_migrations (version) VALUES ($1)`, [m.versao])
    })
    novas.push(m.versao)
  }
  return novas
}

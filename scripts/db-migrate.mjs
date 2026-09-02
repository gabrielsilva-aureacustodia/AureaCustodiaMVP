#!/usr/bin/env node
/**
 * Aplica as migrations de src/server/db/migrations/ no banco.
 *
 *   npm run db:migrate
 *
 * Usa POSTGRES_URL_DIRECT (session pooler, porta 5432) — o pooler em modo
 * transação (6543) recusa alguns comandos de criação de tabela. Sem ela, cai
 * em POSTGRES_URL. Se nenhuma estiver no ambiente, lê `.env.local` — desta
 * pasta ou, rodando num git worktree, a do worktree principal (ver
 * scripts/env-local.mjs; `.env.local` é ignorado pelo Git e não viaja entre
 * worktrees).
 *
 * `AUREA_DB_SCHEMA` (opcional) aplica a mesma SQL noutro schema — é como o
 * ambiente local ganha uma gaveta própria no mesmo projeto Supabase, sem tocar
 * no estado dos sócios. Padrão: `aurea`.
 *
 * Este arquivo é Node puro, sem TypeScript, porque roda fora do Next e sem
 * bundler. A lógica de "aplicar o que falta" está repetida em
 * src/server/db/migrar.ts (a versão que os testes usam) — a SQL é uma só,
 * lida da mesma pasta. Mudou a regra aqui, muda lá.
 *
 * Idempotente: rodar duas vezes não aplica nada na segunda.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import pg from 'pg'

import { carregarEnvLocal, descreverUrl } from './env-local.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const pastaMigrations = join(raiz, 'src', 'server', 'db', 'migrations')

// .env.local só entra se o ambiente não trouxe a URL — na Vercel ela já vem.
const envUsado = carregarEnvLocal(raiz, ['POSTGRES_URL_DIRECT', 'POSTGRES_URL'])
if (envUsado) console.log(`db-migrate: variáveis de ${envUsado}`)

const url = process.env.POSTGRES_URL_DIRECT || process.env.POSTGRES_URL
if (!url) {
  console.error(
    'db-migrate: defina POSTGRES_URL_DIRECT (ou POSTGRES_URL) no ambiente ou em .env.local.\n' +
      '            Num git worktree, o .env.local da pasta principal também serve — este\n' +
      '            comando procura nos dois lugares e não encontrou em nenhum.',
  )
  process.exit(1)
}

const schema = (process.env.AUREA_DB_SCHEMA || 'aurea').trim()
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) {
  console.error(`db-migrate: AUREA_DB_SCHEMA inválido: "${schema}"`)
  process.exit(1)
}

/** A mesma reescrita de src/server/db/migrar.ts: os arquivos dizem `aurea.` literal. */
function comSchema(sql) {
  if (schema === 'aurea') return sql
  return sql
    .replace(/\baurea\./g, `${schema}.`)
    .replace(/SCHEMA IF NOT EXISTS aurea\b/g, `SCHEMA IF NOT EXISTS ${schema}`)
}

const migrations = readdirSync(pastaMigrations)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => ({ versao: f.replace(/\.sql$/, ''), sql: readFileSync(join(pastaMigrations, f), 'utf8') }))

const local = /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)/.test(url)
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } })

// O host aparece no log; a senha, nunca.
const host = descreverUrl(url)

await client.connect()
try {
  await client.query('BEGIN')
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
       version    text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
  await client.query(`ALTER TABLE ${schema}.schema_migrations ENABLE ROW LEVEL SECURITY`)
  await client.query('COMMIT')

  const { rows } = await client.query(`SELECT version FROM ${schema}.schema_migrations`)
  const aplicadas = new Set(rows.map((r) => r.version))

  let novas = 0
  for (const m of migrations) {
    if (aplicadas.has(m.versao)) {
      console.log(`  = ${m.versao} (já aplicada)`)
      continue
    }
    await client.query('BEGIN')
    try {
      await client.query(comSchema(m.sql))
      await client.query(`INSERT INTO ${schema}.schema_migrations (version) VALUES ($1)`, [m.versao])
      await client.query('COMMIT')
      console.log(`  + ${m.versao}`)
      novas += 1
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw err
    }
  }
  console.log(`db-migrate: ${host} · schema "${schema}" · ${novas} migration(s) aplicada(s)`)

  // A conferência que não pode faltar num projeto Supabase: nada em `public`.
  const pub = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`,
  )
  if (pub.rows.length) {
    console.warn(
      `ATENÇÃO: existem tabelas no schema public (exposto pela API do Supabase): ` +
        pub.rows.map((r) => r.table_name).join(', '),
    )
  } else {
    console.log('  ✓ nenhuma tabela em public')
  }
} finally {
  await client.end()
}

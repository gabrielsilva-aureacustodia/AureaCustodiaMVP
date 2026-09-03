#!/usr/bin/env node
/**
 * Diagnóstico do banco, SOMENTE LEITURA — não cria, não altera, não apaga nada.
 *
 *   npm run db:check
 *
 * Responde, em dez segundos, as perguntas que decidem se o cutover pode
 * acontecer:
 *
 *   1. a connection string está bem formada e o host resolve?
 *   2. a senha vale?
 *   3. a migration já foi aplicada no schema que vai ser usado?
 *   4. as tabelas estão lá, com RLS ligada?
 *   5. existe alguma tabela em `public` (que o Supabase publica na internet)?
 *
 * POR QUE ISTO É UM COMANDO E NÃO UM SCRIPT COLADO NA HORA. Antes, conferir a
 * conexão exigia colar um arquivo temporário no worktree. Script colado não é
 * revisado, não é versionado e some — e este é exatamente o passo que precisa
 * ser repetido antes de publicar em produção, quando errar custa o site no ar.
 *
 * POR QUE `diagnosticar` É EXPORTADA. Um comando de conferência que nunca foi
 * conferido não conferе nada: um erro de digitação na SQL só apareceria na hora
 * do cutover, que é o pior momento possível. A função abaixo recebe qualquer
 * cliente com `query(texto, valores) -> { rows }` — o `pg` aqui, o Postgres
 * embutido em src/server/db/db.test.ts — e por isso os dois cenários que
 * importam (migration ausente e banco pronto) são exercitados na suíte.
 *
 * Termina com código 0 quando está tudo pronto e 1 quando falta alguma coisa,
 * para poder entrar num `&&` sem que ninguém precise ler a saída.
 *
 * Nunca imprime a senha.
 */

import dns from 'node:dns/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { carregarEnvLocal, descreverUrl } from './env-local.mjs'

/** As tabelas que a migration 001 cria. `schema_migrations` é do aplicador. */
export const TABELAS_ESPERADAS = [
  'users',
  'coins',
  'nfts',
  'sell_offers',
  'buy_orders',
  'trades',
  'envios',
  'deposits',
  'custody_charges',
  'seq',
  // Migration 002 — pagamentos e rastreio (frente C). Sem elas o webhook do
  // Mercado Pago não tem onde gravar a idempotência, e o depósito credita duas
  // vezes no primeiro reenvio. Por isso entram na conferência de prontidão.
  'payment_events',
  'payment_intents',
  'rastreios',
]

/**
 * Valida o nome do schema. Ele vem de `AUREA_DB_SCHEMA` (um arquivo) e é
 * interpolado na SQL, porque identificador não aceita parâmetro — a validação
 * é o que impede uma variável malformada de virar SQL injetada.
 */
export function identificadorValido(nome) {
  return /^[a-z_][a-z0-9_]{0,62}$/.test(nome)
}

/**
 * Roda as conferências e devolve uma lista de achados:
 * `{ nivel: 'ok' | 'aviso' | 'falha' | 'info', texto }`.
 *
 * `pronto` (nenhuma falha) é o que decide o código de saída do comando.
 */
export async function diagnosticar(client, schema) {
  const achados = []
  const ok = (texto) => achados.push({ nivel: 'ok', texto })
  const info = (texto) => achados.push({ nivel: 'info', texto })
  const aviso = (texto) => achados.push({ nivel: 'aviso', texto })
  const falha = (texto) => achados.push({ nivel: 'falha', texto })

  const { rows: existe } = await client.query(
    `SELECT to_regclass(format('%I.%I', $1::text, 'schema_migrations')) AS r`,
    [schema],
  )

  if (!existe[0].r) {
    falha(`schema "${schema}": migration NÃO aplicada — rode "npm run db:migrate"`)
  } else {
    const { rows: migs } = await client.query(
      `SELECT version FROM ${schema}.schema_migrations ORDER BY version`,
    )
    ok(`migrations aplicadas em "${schema}": ${migs.map((r) => r.version).join(', ')}`)

    const { rows: faltando } = await client.query(
      `SELECT t.nome FROM unnest($1::text[]) AS t(nome)
        WHERE to_regclass(format('%I.%I', $2::text, t.nome)) IS NULL
        ORDER BY t.nome`,
      [TABELAS_ESPERADAS, schema],
    )
    if (faltando.length) {
      falha(`faltam tabelas em "${schema}": ${faltando.map((r) => r.nome).join(', ')}`)
    } else {
      ok(`as ${TABELAS_ESPERADAS.length} tabelas do M1 existem`)
    }

    const { rows: semRls } = await client.query(
      `SELECT c.relname FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'r' AND NOT c.relrowsecurity
        ORDER BY c.relname`,
      [schema],
    )
    if (semRls.length) {
      falha(`sem RLS: ${semRls.map((r) => r.relname).join(', ')}`)
    } else {
      ok('RLS ligada em todas as tabelas do schema')
    }

    if (!faltando.length) {
      // Quantas contas já existem: diz se a próxima requisição vai semear.
      const { rows: contas } = await client.query(`SELECT count(*)::int AS n FROM ${schema}.users`)
      const n = Number(contas[0].n)
      info(
        n === 0
          ? 'users vazia: a primeira requisição semeia as 7 contas'
          : `users com ${n} conta(s): o ambiente já foi semeado`,
      )
    }
  }

  // A conferência que não pode faltar num projeto Supabase.
  const { rows: pub } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY 1`,
  )
  if (pub.length) {
    aviso(`tabelas em public (expostas pela API do Supabase): ${pub.map((r) => r.table_name).join(', ')}`)
  } else {
    ok('nenhuma tabela em public')
  }

  // O blob antigo ainda existe? Enquanto existir, o passo 9 do M1 está aberto.
  const { rows: blob } = await client.query(`SELECT to_regclass('aurea.aurea_state') AS r`)
  info(
    blob[0].r
      ? 'aurea.aurea_state (blob antigo) ainda existe — sai na migration de limpeza'
      : 'aurea.aurea_state não existe',
  )

  return { achados, pronto: !achados.some((a) => a.nivel === 'falha') }
}

const SIMBOLO = { ok: '✓', info: '·', aviso: '⚠', falha: '✗' }

/* ---------------------------------------------------------------------------
 * A partir daqui é o comando de linha. Só roda quando o arquivo é EXECUTADO,
 * nunca quando é importado pela suíte de testes.
 * ------------------------------------------------------------------------- */

const executadoDireto =
  process.argv[1] && resolveIgual(process.argv[1], fileURLToPath(import.meta.url))

function resolveIgual(a, b) {
  return a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase()
}

if (executadoDireto) {
  const pg = (await import('pg')).default
  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

  const envUsado = carregarEnvLocal(raiz, ['POSTGRES_URL_DIRECT', 'POSTGRES_URL'])
  console.log(envUsado ? `variáveis de ${envUsado}` : 'variáveis do ambiente')

  // A mesma precedência do db:migrate: a porta 5432 (session pooler) aceita DDL.
  const url = process.env.POSTGRES_URL_DIRECT || process.env.POSTGRES_URL
  if (!url) {
    console.error('✗ nem POSTGRES_URL_DIRECT nem POSTGRES_URL estão definidas.')
    process.exit(1)
  }

  const schema = (process.env.AUREA_DB_SCHEMA || 'aurea').trim()
  if (!identificadorValido(schema)) {
    console.error(`✗ AUREA_DB_SCHEMA inválido: "${schema}"`)
    process.exit(1)
  }
  console.log(`alvo: ${descreverUrl(url)} · schema "${schema}"`)

  let alvo
  try {
    alvo = new URL(url)
  } catch {
    console.error(
      '✗ a connection string não é uma URL. O valor precisa ser UMA linha começando com\n' +
        '  postgresql:// — e não o bloco "Connection parameters" do painel do Supabase.',
    )
    process.exit(1)
  }

  // Erro clássico do projeto: o host que não é do pooler responde só em IPv6.
  if (alvo.hostname.includes('supabase') && !alvo.hostname.endsWith('pooler.supabase.com')) {
    console.warn(
      `⚠ host "${alvo.hostname}" não é do pooler. A conexão direta do Supabase responde\n` +
        '  apenas em IPv6, e o sintoma é falha de conexão sem explicação. Use o host\n' +
        '  que termina em pooler.supabase.com.',
    )
  }

  try {
    const { address } = await dns.lookup(alvo.hostname)
    console.log(`✓ DNS resolve para ${address}`)
  } catch (e) {
    console.error(`✗ DNS não resolve "${alvo.hostname}": ${e.message}`)
    process.exit(1)
  }

  const local = /^(localhost|127\.0\.0\.1)$/.test(alvo.hostname)
  const client = new pg.Client({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  })

  let pronto = false
  try {
    await client.connect()
    console.log('✓ senha aceita')
    const resultado = await diagnosticar(client, schema)
    for (const a of resultado.achados) console.log(`${SIMBOLO[a.nivel]} ${a.texto}`)
    pronto = resultado.pronto
  } catch (e) {
    console.error(`✗ conexão falhou: ${e.message}`)
    if (/password authentication/i.test(e.message)) {
      console.error(
        '  A senha da connection string não confere com a do Supabase. Regenere em\n' +
          '  Settings → Database → Reset database password e atualize .env.local e a Vercel.',
      )
    }
    process.exit(1)
  } finally {
    await client.end().catch(() => undefined)
  }

  console.log(pronto ? '\nPronto para uso.' : '\nFalta aplicar a migration: npm run db:migrate')
  process.exit(pronto ? 0 : 1)
}

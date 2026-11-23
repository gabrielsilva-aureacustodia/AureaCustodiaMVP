/**
 * Apaga as contas de teste do Pixel da Meta (teste.pixel*@example.com) do banco de produção e do Supabase Auth.
 *
 * Padrão: SÓ LÊ (BEGIN READ ONLY) e mostra o que cada conta tem. Para apagar de verdade: `--apagar`.
 *
 * Trava de segurança: só aceita e-mail no formato `teste.pixel<N>@example.com`. Qualquer outro é recusado, para que
 * um erro de digitação nunca apague conta de cliente ou de sócio.
 *
 * Recusa apagar se alguma conta tiver histórico financeiro ou de operação (ledger, moedas, faturas, envios, depósitos,
 * saques, retiradas, casos): o livro-razão é append-only e o banco proíbe apagar usuário com lançamento.
 *
 * Não roda na suíte (`npm test` só enxerga src/*.test.ts); é ferramenta manual, como db-migrate.mjs.
 *
 * Uso:   node scripts/apagar-contas-de-teste.mjs               (só confere)
 *        node scripts/apagar-contas-de-teste.mjs --so-login    (tira só o login do Supabase Auth; mantém aurea.*)
 *        node scripts/apagar-contas-de-teste.mjs --apagar      (apaga tudo; só funciona sem histórico encadeado)
 *
 * Ledger e aceites têm corrente de hash global: conta que já tem lançamento ou aceite NÃO pode ser apagada de aurea.*
 * sem quebrar a prova das contas seguintes. Foi o caso das contas teste.pixel* (15/11/2026): ficam só sem login.
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import pg from 'pg'

import { carregarEnvLocal } from './env-local.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
carregarEnvLocal(raiz, ['POSTGRES_URL_DIRECT', 'POSTGRES_URL'])
const url = process.env.POSTGRES_URL_DIRECT || process.env.POSTGRES_URL
if (!url) {
  console.error('Defina POSTGRES_URL_DIRECT (ou POSTGRES_URL) no ambiente ou em .env.local.')
  process.exit(1)
}

const apagar = process.argv.includes('--apagar')
const soLogin = process.argv.includes('--so-login')
const EMAILS = ['', '2', '3', '4', '5'].map((n) => `teste.pixel${n}@example.com`)
for (const e of EMAILS) {
  if (!/^teste\.pixel\d*@example\.com$/.test(e)) {
    console.error(`E-mail fora do padrão de teste, recusado: ${e}`)
    process.exit(1)
  }
}

// [tabela, coluna do e-mail, bloqueia a exclusão se tiver linha?]
const TABELAS = [
  ['aurea.users', 'email', false],
  ['aurea.coins', 'owner_email', true],
  ['aurea.ledger_entries', 'user_email', true],
  ['aurea.faturas_custodia', 'user_email', true],
  ['aurea.planos_custodia', 'user_email', true],
  ['aurea.custody_charges', 'user_email', true],
  ['aurea.envios', 'user_email', true],
  ['aurea.deposits', 'user_email', true],
  ['aurea.saques', 'user_email', true],
  ['aurea.retiradas', 'user_email', true],
  ['aurea.payment_intents', 'user_email', true],
  ['aurea.recebimentos_gateway', 'user_email', true],
  ['aurea.casos', 'user_email', true],
  ['aurea.cs_contatos', 'user_email', true],
  // Corrente de hash (hash_anterior) do banco inteiro: apagar linha do meio quebra a prova das contas seguintes.
  ['aurea.aceites_documentos', 'user_email', true],
  // Sem chave estrangeira e sem valor financeiro: apagadas junto.
  ['aurea.eventos_uso', 'user_email', false],
  ['aurea.admin_situacao_contas', 'user_email', false],
  ['aurea.admin_notas_usuario', 'user_email', false],
  ['auth.users', 'email', false],
]

const local = /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)/.test(url)
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } })
await client.connect()

let bloqueado = false
try {
  console.log(`Contas alvo: ${EMAILS.join(', ')}\n`)
  for (const [tabela, coluna, bloqueia] of TABELAS) {
    // Uma transação de leitura por tabela: se uma tabela não existir, o erro não derruba as outras.
    await client.query('BEGIN READ ONLY')
    try {
      const r = await client.query(`SELECT count(*)::int AS n FROM ${tabela} WHERE ${coluna} = ANY($1)`, [EMAILS])
      const n = r.rows[0].n
      const marca = bloqueia && n > 0 ? '  <-- BLOQUEIA' : ''
      console.log(`${tabela.padEnd(30)} ${String(n).padStart(3)}${marca}`)
      if (bloqueia && n > 0) bloqueado = true
    } catch (erro) {
      console.log(`${tabela.padEnd(30)} (não consultada: ${erro.message})`)
    } finally {
      await client.query('ROLLBACK')
    }
  }

  if (soLogin) {
    // Caminho seguro quando há histórico em tabela encadeada: tira só o LOGIN (Supabase Auth). As linhas do app ficam,
    // com saldo zero, para não quebrar a corrente de hash do livro-razão e dos aceites.
    await client.query('BEGIN')
    try {
      const a = await client.query('DELETE FROM auth.users WHERE email = ANY($1)', [EMAILS])
      await client.query('COMMIT')
      console.log(`\nLogin apagado em auth.users: ${a.rowCount}. As linhas de aurea.* foram mantidas de propósito.`)
    } catch (erro) {
      await client.query('ROLLBACK')
      console.error(`\nErro, transação desfeita: ${erro.message}`)
      process.exit(3)
    }
    process.exit(0)
  }
  if (!apagar) {
    console.log(
      bloqueado
        ? '\nHá histórico em tabela encadeada: NÃO use --apagar. Use --so-login (tira só o login) ou avise o Claude.'
        : '\nNada bloqueia. Para apagar: node scripts/apagar-contas-de-teste.mjs --apagar',
    )
    process.exit(0)
  }
  if (bloqueado) {
    console.error('\nRecusado: alguma conta tem histórico financeiro ou de operação. Nada foi apagado.')
    process.exit(2)
  }

  await client.query('BEGIN')
  try {
    for (const [tabela, coluna] of [...TABELAS].reverse()) {
      // Ordem inversa da lista: as tabelas filhas primeiro e aurea.users por último. auth.users é apagada depois, abaixo.
      if (tabela === 'auth.users') continue
      const r = await client.query(`DELETE FROM ${tabela} WHERE ${coluna} = ANY($1)`, [EMAILS])
      console.log(`apagado ${String(r.rowCount).padStart(3)} em ${tabela}`)
    }
    const a = await client.query('DELETE FROM auth.users WHERE email = ANY($1)', [EMAILS])
    console.log(`apagado ${String(a.rowCount).padStart(3)} em auth.users`)
    await client.query('COMMIT')
    console.log('\nConcluído. (audit_log foi mantido de propósito: é a trilha de auditoria.)')
  } catch (erro) {
    await client.query('ROLLBACK')
    console.error(`\nErro, transação desfeita, nada foi apagado: ${erro.message}`)
    process.exit(3)
  }
} finally {
  await client.end()
}

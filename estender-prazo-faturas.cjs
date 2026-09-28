/**
 * O prazo de pagamento da fatura de custódia passou de 10 para 30 dias
 * (27/09/2026). As faturas EM ABERTO emitidas sob a regra antiga precisam do
 * prazo novo — senão quem recebeu a cobrança na semana passada continua com
 * dez dias enquanto todo mundo tem trinta.
 *
 * Só mexe em fatura não paga e não cancelada, e só para FRENTE.
 */
const fs = require('fs')
const pg = require('pg')

const APLICAR = process.argv.includes('--aplicar')
const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]
const DIAS_NOVO = 30
const MS_DIA = 24 * 60 * 60 * 1000

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const { rows } = await c.query(
    `SELECT id, user_email, data_emissao, data_vencimento, valor_cents
       FROM aurea.faturas_custodia
      WHERE status NOT IN ('paga', 'cancelada')
      ORDER BY data_emissao`,
  )

  for (const f of rows) {
    const emissao = Number(f.data_emissao)
    const novo = emissao + DIAS_NOVO * MS_DIA
    const atual = Number(f.data_vencimento)
    const fmt = (t) => new Date(t).toLocaleDateString('pt-BR')
    if (novo <= atual) {
      console.log(`${f.id} (${f.user_email}): já vence em ${fmt(atual)} — inalterada`)
      continue
    }
    console.log(`${f.id} (${f.user_email}): ${fmt(atual)} → ${fmt(novo)}`)
    if (APLICAR) {
      await c.query(`UPDATE aurea.faturas_custodia SET data_vencimento = $1 WHERE id = $2`, [
        String(novo),
        f.id,
      ])
    }
  }

  if (!rows.length) console.log('Nenhuma fatura em aberto.')
  if (!APLICAR && rows.length) console.log('\n(simulação — rode com --aplicar)')
  await c.end()
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

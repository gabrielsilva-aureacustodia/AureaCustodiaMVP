/**
 * REGULARIZAÇÃO DA CUSTÓDIA NÃO COBRADA (25/09/2026).
 *
 * O código novo cobra a custódia no instante em que a moeda entra no acervo
 * (src/domain/cobranca-de-entrada.ts). Este script resolve o passado: as moedas
 * que já estavam guardadas quando a regra não existia e por isso nunca geraram
 * fatura nenhuma.
 *
 * Emite UMA fatura por conta, na competência corrente, cobrindo exatamente as
 * moedas que não estão cobertas por nenhuma fatura viva nem por plano vigente
 * quitado. Não mexe em nada que já foi cobrado, e não debita saldo: a fatura
 * nasce pendente, para a pessoa pagar pela tela como qualquer outra.
 *
 * Roda com `node regularizar-custodia-de-entrada.cjs`; sem `--aplicar` só
 * mostra o que faria.
 */
const fs = require('fs')
const pg = require('pg')

const APLICAR = process.argv.includes('--aplicar')
const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

/** R$ 2,00 por moeda por mês — o mesmo `custodiaMensalPorMoeda` do código. */
const POR_MOEDA_CENTS = 200
const DIAS_TOLERANCIA = 10

function competenciaDe(ts) {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const agora = Date.now()
  const competencia = competenciaDe(agora)

  // Moedas sob guarda: recibo que não foi extinto pela retirada física.
  const { rows: moedas } = await c.query(
    `SELECT co.id, co.owner_email, co.tipo_moeda
       FROM aurea.coins co
       LEFT JOIN aurea.recibos r ON r.coin_id = co.id
      WHERE COALESCE(r.status, 'Ativo') <> 'Extinto'
      ORDER BY co.owner_email, co.id`,
  )

  // Tudo o que já cobre alguma moeda: fatura viva (paga ou esperando pagamento)
  // e plano vigente com a competência quitada.
  const { rows: faturas } = await c.query(
    `SELECT moeda_ids, competencia, status FROM aurea.faturas_custodia WHERE status <> 'cancelada'`,
  )
  const { rows: planos } = await c.query(
    `SELECT moeda_ids, pago_ate_competencia FROM aurea.planos_custodia WHERE status = 'vigente'`,
  )

  const cobertas = new Set()
  for (const f of faturas) {
    if (f.competencia >= competencia) for (const id of f.moeda_ids || []) cobertas.add(id)
  }
  for (const p of planos) {
    if (p.pago_ate_competencia && p.pago_ate_competencia >= competencia) {
      for (const id of p.moeda_ids || []) cobertas.add(id)
    }
  }

  const porConta = new Map()
  for (const m of moedas) {
    if (cobertas.has(m.id)) continue
    if (!porConta.has(m.owner_email)) porConta.set(m.owner_email, [])
    porConta.get(m.owner_email).push(m)
  }

  console.log(`Competência ${competencia} · ${moedas.length} moedas sob guarda · ${cobertas.size} já cobertas\n`)

  if (porConta.size === 0) {
    console.log('Nada a regularizar: toda moeda guardada já tem cobrança nesta competência.')
    await c.end()
    return
  }

  for (const [email, lista] of porConta) {
    const tipos = {}
    for (const m of lista) tipos[m.tipo_moeda] = (tipos[m.tipo_moeda] || 0) + 1
    const valor = lista.length * POR_MOEDA_CENTS
    const resumo = Object.entries(tipos).map(([t, n]) => `${n}× ${t}`).join(', ')
    console.log(`${email}: ${lista.length} moeda(s) — ${resumo} → R$ ${(valor / 100).toFixed(2)}`)

    if (!APLICAR) continue

    const sufixo = email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
    const id = `FAT-${competencia}-${sufixo}-ENT-${agora}`
    await c.query(
      `INSERT INTO aurea.faturas_custodia
         (id, user_email, competencia, quantidade_moedas, moeda_ids, valor_cents, status,
          data_emissao, data_vencimento, data_pagamento, forma_pagamento, payment_intent_id,
          plano_id, origem)
       VALUES ($1,$2,$3,$4,$5,$6,'pendente',$7,$8,NULL,NULL,NULL,NULL,'entrada_no_acervo')`,
      [
        id,
        email,
        competencia,
        lista.length,
        lista.map((m) => m.id),
        String(valor),
        String(agora),
        String(agora + DIAS_TOLERANCIA * 24 * 60 * 60 * 1000),
      ],
    )
    console.log(`  → fatura ${id} emitida`)
  }

  if (!APLICAR) console.log('\n(simulação — rode com --aplicar para emitir)')
  await c.end()
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

/**
 * Remove as ofertas de compra PRÉ-PAGAS que foram publicadas sem pagamento
 * (28/09/2026).
 *
 * Até 27/09 a oferta pré-paga era gravada no livro com `pago_antecipado = 0` e
 * só depois cobrada — ela aparecia publicada, para o dono e para todo mundo,
 * antes de um centavo ter entrado. O código novo só cria a ordem quando o
 * pagamento é confirmado; este script apaga as que ficaram da regra antiga.
 *
 * Só apaga pré-paga com lastro ZERO. Pré-paga já bancada é oferta legítima, e
 * saldo e pós-pago não têm nada com isso.
 */
const fs = require('fs')
const pg = require('pg')

const APLICAR = process.argv.includes('--aplicar')
const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const { rows } = await c.query(
    `SELECT id, buyer, price, qty, tipo_moeda
       FROM aurea.buy_orders
      WHERE modalidade = 'prepago' AND COALESCE(pago_antecipado, 0) = 0
      ORDER BY created_at`,
  )

  if (!rows.length) {
    console.log('Nenhuma oferta pré-paga sem lastro no livro.')
    await c.end()
    return
  }

  for (const b of rows) {
    const valor = (Number(b.price) / 100).toFixed(2)
    console.log(`${b.id} · ${b.buyer} · ${b.qty}× ${b.tipo_moeda} a R$ ${valor} — sem pagamento`)
  }

  if (APLICAR) {
    const ids = rows.map((b) => b.id)
    await c.query(`DELETE FROM aurea.buy_orders WHERE id = ANY($1)`, [ids])
    console.log(`\n${ids.length} oferta(s) removida(s).`)
  } else {
    console.log('\n(simulação — rode com --aplicar)')
  }

  await c.end()
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

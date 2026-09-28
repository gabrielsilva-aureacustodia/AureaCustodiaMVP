/**
 * LIMPEZA DAS ORDENS DE COMPRA SEM LASTRO (28/09/2026).
 *
 * Duas famílias saem do livro, pelo pedido do Gabriel:
 *
 *  1. TODA ordem PÓS-PAGA. A modalidade foi ocultada da tela em 28/09 ("acho
 *     inseguro usar ela por enquanto"), mas as ordens já publicadas continuavam
 *     vivas no livro — e pós-pago não paga nada para casar: ele CASA e depois
 *     tem dez minutos para pagar. Na prática, três bids pós-pagos que nunca
 *     pagaram vinham prendendo moedas em reserva e soltando-as no vencimento,
 *     em ciclo. Com a opção fora da tela, ninguém tem sequer como pagá-las.
 *
 *  2. Ordem PRÉ-PAGA com `pago_antecipado = 0` — publicada antes da correção
 *     de 28/09, quando a oferta entrava no livro antes do pagamento.
 *
 * O CUIDADO QUE FAZ ESTE SCRIPT NÃO PERDER MOEDA
 * ----------------------------------------------
 * Uma reserva aberta guarda a moeda FORA do livro de vendas: quando a reserva
 * nasce, a oferta sai de `sell_offers` e fica inteira dentro de `oferta_json`.
 * Apagar o bid sem tratar a reserva deixaria a moeda órfã — nem vendida, nem
 * anunciada, invisível para o dono.
 *
 * Então, antes de apagar, cada reserva aberta desses bids é encerrada como o
 * domínio encerra uma vencida (`expirarReservasVencidas`): marca 'expirada' e
 * devolve a oferta ao livro a partir de `oferta_json` — mas só se o vendedor
 * ainda tiver a moeda e ela já não estiver anunciada, que são as duas mesmas
 * condições do código.
 *
 * Sem `--aplicar`, só relata.
 */
const fs = require('fs')
const pg = require('pg')

const APLICAR = process.argv.includes('--aplicar')
const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

function reais(cents) {
  return 'R$ ' + (Number(cents) / 100).toFixed(2)
}

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const { rows: alvos } = await c.query(
    `SELECT id, buyer, price, qty, tipo_moeda, modalidade, pago_antecipado
       FROM aurea.buy_orders
      WHERE modalidade = 'pospago'
         OR (modalidade = 'prepago' AND COALESCE(pago_antecipado, 0) = 0)
      ORDER BY modalidade, price DESC`,
  )

  if (alvos.length === 0) {
    console.log('Nenhuma ordem de compra sem lastro no livro.')
    await c.end()
    return
  }

  console.log(`${alvos.length} ordem(ns) de compra a remover:`)
  for (const b of alvos) {
    console.log(
      `  ${b.id} · ${b.buyer} · ${b.qty}× ${b.tipo_moeda} a ${reais(b.price)} · ${b.modalidade}`,
    )
  }

  const ids = alvos.map((b) => b.id)

  const { rows: reservas } = await c.query(
    `SELECT id, bid_id, comprador, vendedor, coin_id, preco, oferta_json, status
       FROM aurea.reservas_compra
      WHERE bid_id = ANY($1) AND status = 'aguardando_pagamento'`,
    [ids],
  )

  console.log(`\n${reservas.length} reserva(s) aberta(s) presa(s) a essas ordens:`)
  for (const r of reservas) {
    console.log(`  ${r.id} · ${r.coin_id} de ${r.vendedor} para ${r.comprador} · ${reais(r.preco)}`)
  }

  // Quais moedas voltam ao livro, pelas mesmas duas condições do domínio.
  const aRestaurar = []
  for (const r of reservas) {
    const { rows: dono } = await c.query(`SELECT owner_email FROM aurea.coins WHERE id = $1`, [r.coin_id])
    const aindaEDele = dono[0]?.owner_email === r.vendedor
    const { rows: noLivro } = await c.query(
      `SELECT 1 FROM aurea.sell_offers WHERE coin_id = $1 LIMIT 1`,
      [r.coin_id],
    )
    if (aindaEDele && noLivro.length === 0) {
      aRestaurar.push(r)
      console.log(`    → ${r.coin_id} volta ao livro por ${reais(r.oferta_json.price)}`)
    } else {
      console.log(
        `    → ${r.coin_id} NÃO volta: ${!aindaEDele ? 'já não é do vendedor' : 'já está anunciada'}`,
      )
    }
  }

  if (!APLICAR) {
    console.log('\n(simulação — rode com --aplicar para gravar)')
    await c.end()
    return
  }

  const agora = Date.now()
  await c.query('BEGIN')
  try {
    // 1. A oferta volta ao livro ANTES de a reserva ser encerrada: assim, em
    //    nenhum instante da transação a moeda fica sem lugar.
    let ord = Number(
      (await c.query(`SELECT COALESCE(MAX(ord), 0) m FROM aurea.sell_offers`)).rows[0].m,
    )
    for (const r of aRestaurar) {
      const o = r.oferta_json
      ord++
      await c.query(
        `INSERT INTO aurea.sell_offers
           (id, ord, coin_id, seller, price, obs, lot_id, created_at, tipo_moeda, prioridade_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          o.id,
          ord,
          o.coinId,
          o.seller,
          String(o.price),
          o.obs ?? '',
          o.lotId,
          String(o.createdAt),
          o.tipoMoeda,
          // A oferta NÃO perde a vez: quem não cumpriu foi o comprador. É a
          // mesma regra de `expirarReservasVencidas`.
          String(o.prioridadeEm),
        ],
      )
    }

    // 2. Reservas encerradas.
    if (reservas.length > 0) {
      await c.query(
        `UPDATE aurea.reservas_compra SET status = 'expirada' WHERE id = ANY($1)`,
        [reservas.map((r) => r.id)],
      )
    }

    // 3. As ordens saem do livro. A tabela de reservas não tem FK para
    //    buy_orders (rastro, decisão da migration 036), então as reservas
    //    antigas continuam registradas com o bid_id que já não existe.
    await c.query(`DELETE FROM aurea.buy_orders WHERE id = ANY($1)`, [ids])

    await c.query('COMMIT')
  } catch (e) {
    await c.query('ROLLBACK')
    throw e
  }

  console.log(`\n✓ ${ids.length} ordem(ns) removida(s).`)
  console.log(`✓ ${reservas.length} reserva(s) encerrada(s), ${aRestaurar.length} moeda(s) de volta ao livro.`)

  const restante = (
    await c.query(
      `SELECT count(*)::int n FROM aurea.buy_orders
        WHERE modalidade = 'pospago' OR (modalidade = 'prepago' AND COALESCE(pago_antecipado,0) = 0)`,
    )
  ).rows[0].n
  const orfas = (
    await c.query(
      `SELECT count(*)::int n FROM aurea.reservas_compra r
        WHERE r.status = 'aguardando_pagamento'
          AND NOT EXISTS (SELECT 1 FROM aurea.buy_orders b WHERE b.id = r.bid_id)`,
    )
  ).rows[0].n

  console.log(`\nCONFERÊNCIA`)
  console.log(`  ordens sem lastro restantes: ${restante}`)
  console.log(`  reservas abertas sem ordem correspondente: ${orfas}`)

  await c.end()
  if (restante > 0 || orfas > 0) process.exit(1)
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

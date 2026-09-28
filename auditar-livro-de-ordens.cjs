/**
 * LEITURA APENAS — por que cada ordem do livro casa ou não casa (28/09/2026).
 *
 * Reproduz as condições do motor (`matchOrders`, src/domain/market.ts) contra
 * os dados reais e diz, par a par, o que impede o casamento. Não escreve nada.
 */
const fs = require('fs')
const pg = require('pg')
const url = fs.readFileSync('.env.local', 'utf8').match(/^POSTGRES_URL="?([^"\r\n]+)/m)[1]

const PCT = 0.005
const FIXO = 100
const comissao = (p) => Math.round(p * PCT) + FIXO
const reais = (c) => 'R$ ' + (Number(c) / 100).toFixed(2)

;(async () => {
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const agora = Date.now()

  const users = Object.fromEntries(
    (await c.query('select email, balance from aurea.users')).rows.map((u) => [u.email, Number(u.balance)]),
  )
  const bids = (await c.query('select * from aurea.buy_orders')).rows
  const offers = (await c.query('select * from aurea.sell_offers')).rows
  const reservas = (await c.query(`select * from aurea.reservas_compra`)).rows
  const coins = Object.fromEntries(
    (await c.query('select id, owner_email from aurea.coins')).rows.map((x) => [x.id, x.owner_email]),
  )
  const recibos = Object.fromEntries(
    (await c.query('select coin_id, status from aurea.recibos')).rows.map((x) => [x.coin_id, x.status]),
  )
  const faturas = (await c.query(`select * from aurea.faturas_custodia`)).rows
  const planos = (await c.query(`select * from aurea.planos_custodia`)).rows

  const UM_DIA = 86_400_000
  const bloqueia = (f) =>
    f.status !== 'paga' && f.status !== 'cancelada' && agora > Number(f.data_vencimento) + UM_DIA

  function custodiaTrava(coinId, seller) {
    return faturas.some(
      (f) => f.user_email === seller && bloqueia(f) && (f.moeda_ids || []).includes(coinId),
    )
  }
  function semCobranca(coinId) {
    const emFatura = faturas.some((f) => f.status !== 'cancelada' && (f.moeda_ids || []).includes(coinId))
    const emPlano = planos.some((p) => p.status !== 'cancelado' && (p.moeda_ids || []).includes(coinId))
    return !emFatura && !emPlano
  }
  const reservada = (coinId) =>
    reservas.some((r) => r.coin_id === coinId && r.status === 'aguardando_pagamento')
  const jaFalhou = (bidId, coinId) =>
    reservas.some((r) => r.bid_id === bidId && r.coin_id === coinId && r.status === 'expirada')

  console.log('=== ORDENS DE COMPRA ===\n')
  for (const b of bids) {
    const modalidade = b.modalidade || 'saldo'
    const preco = Number(b.price)
    const precisa = preco + comissao(preco)
    const fundos =
      modalidade === 'saldo' ? users[b.buyer] ?? 0
      : modalidade === 'prepago' ? Number(b.pago_antecipado || 0)
      : 0
    console.log(`${b.id}  ${b.buyer}`)
    console.log(`  ${b.qty}× ${b.tipo_moeda} a ${reais(preco)} · ${modalidade}`)
    console.log(`  precisa ${reais(precisa)} por moeda · tem ${reais(fundos)} → ${fundos >= precisa ? 'PODE PAGAR' : 'NÃO PODE PAGAR'}`)

    const candidatas = offers
      .filter((o) => o.tipo_moeda === b.tipo_moeda && Number(o.price) <= preco && o.seller !== b.buyer)
      .sort((x, y) => Number(x.price) - Number(y.price))

    if (candidatas.length === 0) {
      const maisBarata = offers
        .filter((o) => o.tipo_moeda === b.tipo_moeda && o.seller !== b.buyer)
        .sort((x, y) => Number(x.price) - Number(y.price))[0]
      console.log(
        `  sem oferta que cruze. Mais barata de terceiro: ${maisBarata ? reais(maisBarata.price) : 'nenhuma'}`,
      )
    } else {
      for (const o of candidatas.slice(0, 3)) {
        const motivos = []
        if (jaFalhou(b.id, o.coin_id)) motivos.push('este bid já deixou o prazo vencer com esta moeda')
        if (reservada(o.coin_id)) motivos.push('moeda em reserva aberta')
        if (custodiaTrava(o.coin_id, o.seller)) motivos.push('custódia vencida do vendedor')
        if (semCobranca(o.coin_id)) motivos.push('moeda sem cobrança de custódia registrada')
        if (coins[o.coin_id] !== o.seller) motivos.push('moeda já não é do vendedor')
        if (recibos[o.coin_id] === 'Extinto') motivos.push('recibo extinto')
        if (fundos < Number(o.price) + comissao(Number(o.price))) motivos.push('sem fundos para pagar')
        console.log(
          `  vs ${o.coin_id} de ${o.seller.split('@')[0]} a ${reais(o.price)} → ${motivos.length ? motivos.join('; ') : 'DEVERIA CASAR'}`,
        )
      }
    }
    console.log()
  }

  console.log('=== OFERTAS DE VENDA COM PROBLEMA ===\n')
  let ruins = 0
  for (const o of offers) {
    const motivos = []
    if (coins[o.coin_id] !== o.seller) motivos.push('moeda já não é do vendedor')
    if (recibos[o.coin_id] === 'Extinto') motivos.push('recibo extinto')
    if (custodiaTrava(o.coin_id, o.seller)) motivos.push('custódia vencida')
    if (semCobranca(o.coin_id)) motivos.push('sem cobrança de custódia registrada')
    if (reservada(o.coin_id)) motivos.push('moeda em reserva aberta E anunciada ao mesmo tempo')
    if (motivos.length) {
      ruins++
      console.log(`  ${o.id} ${o.coin_id} ${o.seller} ${reais(o.price)} → ${motivos.join('; ')}`)
    }
  }
  if (ruins === 0) console.log('  nenhuma.')

  await c.end()
})().catch((e) => { console.error(e.message); process.exit(1) })

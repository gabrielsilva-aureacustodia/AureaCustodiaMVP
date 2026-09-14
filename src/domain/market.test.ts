/**
 * Testes do motor de mercado — a rede do item CD-03.
 *
 * Estes casos são a versão VERSIONADA das 34 verificações que validaram o
 * mercado multi-ativo (docs/MUDANCAS_MERCADO_MULTI_ATIVO.md, seção 7), mais os
 * casos de oferta órfã e de auto-negociação que o CD-03 lista.
 *
 * O que está protegido aqui, em ordem de importância:
 *  1. um livro de ordens POR TIPO — bid de um ativo nunca casa com oferta de
 *     outro, por mais que o preço cruze;
 *  2. a aritmética do dinheiro — comprador paga cheio, vendedor recebe
 *     líquido, comissão ao centavo;
 *  3. a prioridade preço-tempo — regra de negócio protegida no CLAUDE.md;
 *  4. a oferta órfã não move saldo nem grava negociação (divergências
 *     autorizadas nº 2 e 3 do port).
 */

import { describe, expect, it } from 'vitest'

import {
  availableCoinsForSell,
  avg7,
  lotsFromOffers,
  matchOrders,
  medianSellPrice,
  posicaoNaFila,
} from '@/domain/market'
import { comissaoPorMoeda } from '@/domain/fees'
import { BAN, DH, compra, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'

describe('matchOrders — um livro por tipo', () => {
  it('bid de Direitos Humanos NÃO consome oferta de Bandeira mais barata', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN)]),
      c: usuario('Comprador', 10_000_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 28_500, BAN, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 45_000, 1, DH, 1000))

    const r = matchOrders(s)

    expect(r.matched).toBe(false)
    expect(s.sellOffers).toHaveLength(1) // a oferta segue no livro
    expect(s.users.v.coins).toHaveLength(1) // a moeda não trocou de dono
    expect(s.users.c.balance).toBe(10_000_000) // nenhum saldo se moveu
    expect(s.users.v.balance).toBe(0)
  })

  it('mesmo tipo casa com a aritmética exata: comissão dos dois lados (comprador paga cheio + taxa, vendedor recebe líquido)', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', DH)]),
      c: usuario('Comprador', 10_000_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 45_000, DH, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 45_000, 1, DH, 1000))

    const r = matchOrders(s)
    const feeVendedor = comissaoPorMoeda(45_000, 'vendedor')
    const feeComprador = comissaoPorMoeda(45_000, 'comprador')

    expect(r.matched).toBe(true)
    expect(r.trades).toHaveLength(1)
    expect(r.trades[0].tipoMoeda).toBe(DH)
    expect(r.trades[0].feeComprador).toBe(feeComprador)
    expect(r.trades[0].feeVendedor).toBe(feeVendedor)
    expect(r.trades[0].fee).toBe(feeComprador + feeVendedor)
    expect(s.users.c.balance).toBe(10_000_000 - (45_000 + feeComprador))
    expect(s.users.v.balance).toBe(45_000 - feeVendedor)
    expect(s.users.c.coins).toHaveLength(1)
    expect(s.users.v.coins).toHaveLength(0)
  })

  it('negociação canônica de R$ 200,00: comprador paga R$ 202, vendedor recebe R$ 198, Áurea retém R$ 4', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN)]),
      c: usuario('Comprador', 100_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 20_000, BAN, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 20_000, 1, BAN, 1000))

    const r = matchOrders(s)

    expect(r.matched).toBe(true)
    expect(r.trades).toHaveLength(1)
    const t = r.trades[0]
    expect(t.feeComprador).toBe(200) // R$ 2,00
    expect(t.feeVendedor).toBe(200) // R$ 2,00
    expect(t.fee).toBe(400) // R$ 4,00
    expect(s.users.c.balance).toBe(100_000 - 20_200) // R$ 202,00 debitado
    expect(s.users.v.balance).toBe(19_800) // R$ 198,00 creditado
  })

  it('comprador com saldo para o preço mas sem saldo para a comissão NÃO casa (é pulado)', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN)]),
      c: usuario('Comprador', 20_000, []), // tem exatamente R$ 200,00, mas precisa de R$ 202,00
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 20_000, BAN, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 20_000, 1, BAN, 1000))

    const r = matchOrders(s)

    expect(r.matched).toBe(false)
    expect(s.buyOrders).toHaveLength(1) // bid continua no livro
    expect(s.sellOffers).toHaveLength(1) // oferta continua no livro
    expect(s.users.c.balance).toBe(20_000)
    expect(s.users.v.balance).toBe(0)
  })

  it('dois livros executam em paralelo sem contaminação cruzada', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN), moeda('RO-000002', DH)]),
      c: usuario('Comprador', 10_000_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 28_500, BAN, 1000))
    s.sellOffers.push(venda('OF-2', 'RO-000002', 'v', 45_000, DH, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 28_500, 1, BAN, 1000))
    s.buyOrders.push(compra('BID-2', 'c', 45_000, 1, DH, 1000))

    const r = matchOrders(s)

    expect(r.trades).toHaveLength(2)
    const porTipo = new Map(r.trades.map((t) => [t.tipoMoeda, t.price]))
    expect(porTipo.get(BAN)).toBe(28_500)
    expect(porTipo.get(DH)).toBe(45_000)
    expect(s.sellOffers).toHaveLength(0)
    expect(s.buyOrders).toHaveLength(0)
  })

  it('mesmo comprador, vendedor e preço em tipos DIFERENTES geram duas linhas no histórico', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN), moeda('RO-000002', DH)]),
      c: usuario('Comprador', 10_000_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 40_000, BAN, 1000))
    s.sellOffers.push(venda('OF-2', 'RO-000002', 'v', 40_000, DH, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 40_000, 1, BAN, 1000))
    s.buyOrders.push(compra('BID-2', 'c', 40_000, 1, DH, 1000))

    const r = matchOrders(s)

    // Sem o tipo na chave de agrupamento, isto viraria UMA linha de qty 2 —
    // e o histórico registraria uma Bandeira vendida como Direitos Humanos.
    expect(r.trades).toHaveLength(2)
    expect(r.trades.every((t) => t.qty === 1)).toBe(true)
  })
})

describe('matchOrders — prioridade preço-tempo (regra protegida)', () => {
  it('empate de preço: quem publicou antes compra primeiro', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN)]),
      a: usuario('Ana', 10_000_000, []),
      b: usuario('Bruno', 10_000_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 28_500, BAN, 500))
    // Bruno entra no array primeiro, mas publicou DEPOIS: a ordenação por
    // createdAt é quem decide, não a posição no array.
    s.buyOrders.push(compra('BID-B', 'b', 30_000, 1, BAN, 2000))
    s.buyOrders.push(compra('BID-A', 'a', 30_000, 1, BAN, 1000))

    matchOrders(s)

    expect(s.users.a.coins).toHaveLength(1)
    expect(s.users.b.coins).toHaveLength(0)
  })

  it('preço maior ganha de quem chegou antes', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN)]),
      a: usuario('Ana', 10_000_000, []),
      b: usuario('Bruno', 10_000_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 28_500, BAN, 500))
    s.buyOrders.push(compra('BID-A', 'a', 29_000, 1, BAN, 1000)) // antes, paga menos
    s.buyOrders.push(compra('BID-B', 'b', 31_000, 1, BAN, 2000)) // depois, paga mais

    matchOrders(s)

    expect(s.users.b.coins).toHaveLength(1)
    expect(s.users.a.coins).toHaveLength(0)
  })
})

describe('matchOrders — proteções', () => {
  it('oferta órfã (moeda fora do inventário) sai do livro sem mover saldo nem gravar negociação', () => {
    const s = estado({
      v: usuario('Vendedor', 0, []), // o inventário NÃO tem a moeda anunciada
      c: usuario('Comprador', 10_000_000, []),
    })
    s.sellOffers.push(venda('OF-orfa', 'RO-999999', 'v', 28_500, BAN, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 30_000, 1, BAN, 1000))

    const r = matchOrders(s)

    expect(r.matched).toBe(false)
    expect(r.trades).toHaveLength(0)
    expect(s.sellOffers).toHaveLength(0) // a órfã foi removida — não fica presa no livro
    expect(s.users.c.balance).toBe(10_000_000)
    expect(s.users.v.balance).toBe(0)
    expect(s.trades).toHaveLength(0)
  })

  it('ninguém compra da própria oferta', () => {
    const s = estado({
      v: usuario('Vendedor', 10_000_000, [moeda('RO-000001', BAN)]),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 28_500, BAN, 1000))
    s.buyOrders.push(compra('BID-1', 'v', 30_000, 1, BAN, 1000))

    const r = matchOrders(s)

    expect(r.matched).toBe(false)
    expect(s.sellOffers).toHaveLength(1)
    expect(s.users.v.balance).toBe(10_000_000) // nem a comissão se moveu
  })

  it('bid sem saldo é PULADO, não cancelado — volta a valer quando o dinheiro entrar', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN)]),
      c: usuario('Comprador', 100, []), // não paga nem uma unidade
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 28_500, BAN, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 28_500, 1, BAN, 1000))

    const r = matchOrders(s)

    expect(r.matched).toBe(false)
    expect(s.buyOrders).toHaveLength(1) // o bid continua no livro
    expect(s.sellOffers).toHaveLength(1)
  })
})

describe('indicadores por tipo', () => {
  it('avg7 de um tipo ignora as negociações do outro', () => {
    const s = estado({ u: usuario('U', 0, []) })
    const agora = Date.now()
    s.trades.push({ price: 28_500, qty: 2, date: agora - 1000, buyer: 'a', seller: 'b', tipoMoeda: BAN })
    s.trades.push({ price: 45_000, qty: 1, date: agora - 500, buyer: 'a', seller: 'b', tipoMoeda: DH })

    expect(avg7(s, BAN)).toBe(28_500)
    expect(avg7(s, DH)).toBe(45_000)
  })

  it('avg7 pondera pela quantidade, não pela negociação', () => {
    const s = estado({ u: usuario('U', 0, []) })
    const agora = Date.now()
    // 5 moedas a 200 e 1 a 800: média ponderada 300, média simples seria 500.
    s.trades.push({ price: 20_000, qty: 5, date: agora - 1000, buyer: 'a', seller: 'b', tipoMoeda: BAN })
    s.trades.push({ price: 80_000, qty: 1, date: agora - 500, buyer: 'a', seller: 'b', tipoMoeda: BAN })

    expect(avg7(s, BAN)).toBe(30_000)
  })

  it('medianSellPrice separa os livros', () => {
    const s = estado({ u: usuario('U', 0, []) })
    const agora = Date.now()
    s.sellOffers.push(venda('OF-1', 'RO-1', 'b', 29_000, BAN, agora))
    s.sellOffers.push(venda('OF-2', 'RO-2', 'b', 46_000, DH, agora))

    expect(medianSellPrice(s, BAN)).toBe(29_000)
    expect(medianSellPrice(s, DH)).toBe(46_000)
  })

  it('sem oferta nem negociação do tipo, a mediana é null — nunca zero', () => {
    const s = estado({ u: usuario('U', 0, []) })
    expect(medianSellPrice(s, DH)).toBeNull()
  })
})

describe('lotes e disponibilidade', () => {
  it('lotsFromOffers carrega o tipo e filtra por ele', () => {
    const s = estado({ u: usuario('U', 0, []) })
    s.sellOffers.push(venda('OF-1', 'RO-1', 'v', 28_500, BAN, 1000))
    s.sellOffers.push(venda('OF-2', 'RO-2', 'v', 45_000, DH, 1000))

    const todos = lotsFromOffers(s)
    expect(todos).toHaveLength(2)
    expect(todos.every((l) => l.tipoMoeda === (l.price === 28_500 ? BAN : DH))).toBe(true)
    expect(lotsFromOffers(s, DH)).toHaveLength(1)
  })

  it('availableCoinsForSell: só o tipo pedido, só negociável, e nunca moeda já anunciada', () => {
    const dono = usuario('Dono', 0, [
      moeda('RO-000001', BAN),
      moeda('RO-000002', DH),
      moeda('RO-000003', 'Mascote Vinicius'), // em custódia, mas não negociável
    ])
    const s = estado({ dono })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'dono', 28_500, BAN, 1000))

    // Sem tipo: todas as negociáveis LIVRES — a Bandeira anunciada não conta,
    // a Mascote não negociável também não.
    expect(availableCoinsForSell(s, dono).map((c) => c.id)).toEqual(['RO-000002'])
    // Por tipo: idem, recortado.
    expect(availableCoinsForSell(s, dono, BAN)).toHaveLength(0)
    expect(availableCoinsForSell(s, dono, DH)).toHaveLength(1)
    // Tipo não negociável nunca vai a leilão, mesmo pedido explicitamente.
    expect(availableCoinsForSell(s, dono, 'Mascote Vinicius')).toHaveLength(0)
  })
})

describe('matchOrders — prioridadeEm e fila justa (Decisão F-3)', () => {
  it('dois vendedores no mesmo preço: executa quem cadastrou primeiro (menor prioridadeEm)', () => {
    const s = estado({
      v1: usuario('Vendedor 1', 0, [moeda('RO-000001', BAN)]),
      v2: usuario('Vendedor 2', 0, [moeda('RO-000002', BAN)]),
      c: usuario('Comprador', 10_000_000, []),
    })
    // Vendedor 2 cadastrou depois (t=2000), Vendedor 1 antes (t=1000)
    s.sellOffers.push(venda('OF-2', 'RO-000002', 'v2', 20_000, BAN, 2000))
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v1', 20_000, BAN, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 20_000, 1, BAN, 3000))

    matchOrders(s)

    expect(s.users.c.coins.some((coin) => coin.id === 'RO-000001')).toBe(true)
    expect(s.users.v1.coins).toHaveLength(0)
    expect(s.users.v2.coins).toHaveLength(1)
  })

  it('vendedor que mudou o preço/prioridade vai para o fim da fila, mesmo tendo cadastrado antes', () => {
    const s = estado({
      v1: usuario('Vendedor 1', 0, [moeda('RO-000001', BAN)]),
      v2: usuario('Vendedor 2', 0, [moeda('RO-000002', BAN)]),
      c: usuario('Comprador', 10_000_000, []),
    })
    // v1 cadastrou em t=1000, mas teve prioridade resetada para t=5000 (ex: editou)
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v1', 20_000, BAN, 1000, 5000))
    // v2 cadastrou em t=2000 com prioridade t=2000
    s.sellOffers.push(venda('OF-2', 'RO-000002', 'v2', 20_000, BAN, 2000, 2000))
    s.buyOrders.push(compra('BID-1', 'c', 20_000, 1, BAN, 6000))

    matchOrders(s)

    // v2 executa primeiro pois tem prioridadeEm 2000 < 5000
    expect(s.users.c.coins.some((coin) => coin.id === 'RO-000002')).toBe(true)
    expect(s.users.v2.coins).toHaveLength(0)
    expect(s.users.v1.coins).toHaveLength(1)
  })

  it('venda cadastrada antes, compra depois no mesmo preço: executa na publicação da compra', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN)]),
      c: usuario('Comprador', 50_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 20_000, BAN, 1000))
    s.buyOrders.push(compra('BID-1', 'c', 20_000, 1, BAN, 2000))

    const res = matchOrders(s)
    expect(res.matched).toBe(true)
    expect(s.trades).toHaveLength(1)
    expect(s.sellOffers).toHaveLength(0)
    expect(s.buyOrders).toHaveLength(0)
  })

  it('compra cadastrada antes, venda depois no mesmo preço: executa na publicação da venda', () => {
    const s = estado({
      v: usuario('Vendedor', 0, [moeda('RO-000001', BAN)]),
      c: usuario('Comprador', 50_000, []),
    })
    s.buyOrders.push(compra('BID-1', 'c', 20_000, 1, BAN, 1000))
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'v', 20_000, BAN, 2000))

    const res = matchOrders(s)
    expect(res.matched).toBe(true)
    expect(s.trades).toHaveLength(1)
    expect(s.sellOffers).toHaveLength(0)
    expect(s.buyOrders).toHaveLength(0)
  })
})

describe('posicaoNaFila', () => {
  it('primeiro da fila quando não há outras ofertas', () => {
    const s = estado({})
    s.sellOffers.push(venda('OF-1', 'RO-1', 'v', 20_000, BAN, 1000))
    const pos = posicaoNaFila(s, 'venda', 'OF-1')
    expect(pos).toEqual({ posicao: 1, aFrente: 0, mesmoPreco: 1 })
  })

  it('empate de preço: quem tem prioridadeEm anterior fica à frente', () => {
    const s = estado({})
    s.sellOffers.push(venda('OF-1', 'RO-1', 'v1', 20_000, BAN, 1000))
    s.sellOffers.push(venda('OF-2', 'RO-2', 'v2', 20_000, BAN, 2000))

    expect(posicaoNaFila(s, 'venda', 'OF-1')).toEqual({ posicao: 1, aFrente: 0, mesmoPreco: 2 })
    expect(posicaoNaFila(s, 'venda', 'OF-2')).toEqual({ posicao: 2, aFrente: 1, mesmoPreco: 2 })
  })

  it('preço melhor à frente conta em aFrente', () => {
    const s = estado({})
    s.sellOffers.push(venda('OF-barato', 'RO-1', 'v1', 19_000, BAN, 1000))
    s.sellOffers.push(venda('OF-caro', 'RO-2', 'v2', 20_000, BAN, 2000))

    // OF-caro é 1ª na fila a R$ 200,00, mas tem 1 oferta mais barata à frente
    expect(posicaoNaFila(s, 'venda', 'OF-caro')).toEqual({ posicao: 1, aFrente: 1, mesmoPreco: 1 })
  })

  it('outro tipo de moeda não conta na fila', () => {
    const s = estado({})
    s.sellOffers.push(venda('OF-dh', 'RO-1', 'v1', 19_000, DH, 1000))
    s.sellOffers.push(venda('OF-ban', 'RO-2', 'v2', 20_000, BAN, 2000))

    expect(posicaoNaFila(s, 'venda', 'OF-ban')).toEqual({ posicao: 1, aFrente: 0, mesmoPreco: 1 })
  })

  it('compras: maior preço tem prioridade, empate resolvido por prioridadeEm', () => {
    const s = estado({})
    s.buyOrders.push(compra('BID-1', 'c1', 20_000, 1, BAN, 1000))
    s.buyOrders.push(compra('BID-2', 'c2', 20_000, 1, BAN, 2000))
    s.buyOrders.push(compra('BID-3', 'c3', 21_000, 1, BAN, 3000))

    // BID-3 paga mais, fica à frente
    expect(posicaoNaFila(s, 'compra', 'BID-3')).toEqual({ posicao: 1, aFrente: 0, mesmoPreco: 1 })
    // BID-1 é 1º a R$ 200,00 com 1 à frente (BID-3)
    expect(posicaoNaFila(s, 'compra', 'BID-1')).toEqual({ posicao: 1, aFrente: 1, mesmoPreco: 2 })
    // BID-2 é 2º a R$ 200,00 com 2 à frente (BID-3 e BID-1)
    expect(posicaoNaFila(s, 'compra', 'BID-2')).toEqual({ posicao: 2, aFrente: 2, mesmoPreco: 2 })
  })
})

/**
 * O que estes testes protegem: a regra que o Gabriel definiu em uma frase —
 * "se não pagar, a fila anda e o próximo que fez oferta como ele pega a moeda".
 *
 * É a parte do pós-pago que não pode quebrar em silêncio. Se a moeda não
 * voltar ao livro, ela some do mercado; se o bid caloteiro não perder a vez,
 * ele reserva a mesma moeda para sempre e ninguém atrás dele compra nunca.
 */

import { describe, expect, it } from 'vitest'

import { availableCoinsForSell, matchOrders } from './market'
import {
  abrirReserva,
  devolverLastroDoBid,
  expirarReservasVencidas,
  expurgarOrdensSemLastro,
  fundosDoBid,
  marcarReservaPaga,
  modalidadeDoBid,
  PRAZO_DA_RESERVA_MS,
} from './reserva-de-compra'
import type { AppState, BuyOrder, SellOffer, User } from './types'

const AGORA = 1_790_000_000_000

function moeda(id: string) {
  return {
    id,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    entrada: '01/01/2026',
    statusFisico: 'Armazenado' as const,
    statusDigital: 'Validado' as const,
    valorEstimado: 28500,
    protocolo: 'RO-ENV-0001',
    recibo: {
      codigo: id.replace('RO-', 'REC-'),
      hash: '0xABC',
      dataEmissao: '01/01/2026',
      status: 'Ativo' as const,
    },
  }
}

function usuario(nome: string, saldo: number, coins: string[] = []): User {
  return { name: nome, balance: saldo, coins: coins.map(moeda) }
}

function oferta(id: string, seller: string, coinId: string, price: number): SellOffer {
  return {
    id,
    coinId,
    seller,
    price,
    obs: 'anúncio de teste',
    lotId: 'LOT-1',
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    createdAt: AGORA,
    prioridadeEm: AGORA,
  }
}

function bid(id: string, buyer: string, price: number, modalidade: BuyOrder['modalidade'], em: number): BuyOrder {
  return {
    id,
    buyer,
    price,
    qty: 1,
    createdAt: em,
    prioridadeEm: em,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    modalidade,
  }
}

function estado(): AppState {
  return {
    users: {
      vendedor: usuario('Vendedor', 0, ['RO-000001']),
      caloteiro: usuario('Caloteiro', 0),
      // O segundo da fila tem saldo: é ele que deve levar a moeda quando o
      // primeiro não pagar.
      segundo: usuario('Segundo', 1_000_00),
    },
    sellOffers: [oferta('OF-1', 'vendedor', 'RO-000001', 28500)],
    buyOrders: [],
    trades: [],
    envios: [],
    seq: { coin: 1, envio: 1 },
    deposits: [],
    analises: [],
    saques: [],
  } as unknown as AppState
}

describe('fundos e modalidade', () => {
  it('pós-pago nunca tem fundos, por mais saldo que a conta tenha', () => {
    const b = bid('B1', 'caloteiro', 28500, 'pospago', AGORA)
    expect(fundosDoBid(b, 999_999_00)).toBe(0)
    expect(modalidadeDoBid(b)).toBe('pospago')
  })

  it('bid sem `modalidade` vale como saldo — é todo bid publicado antes de 22/09/2026', () => {
    const b = { ...bid('B2', 'segundo', 28500, undefined, AGORA) }
    expect(modalidadeDoBid(b)).toBe('saldo')
    expect(fundosDoBid(b, 50_000)).toBe(50_000)
  })

  it('pré-pago só gasta o que entrou preso à oferta, não o saldo da conta', () => {
    const b = { ...bid('B3', 'segundo', 28500, 'prepago', AGORA), pagoAntecipadoCents: 10_000 }
    expect(fundosDoBid(b, 999_999_00)).toBe(10_000)
  })
})

describe('o casamento de uma oferta pós-paga', () => {
  it('reserva a moeda sem transferir dono nem mover dinheiro', () => {
    const s = estado()
    s.buyOrders.push(bid('B1', 'caloteiro', 28500, 'pospago', AGORA))

    matchOrders(s)

    expect(s.reservas).toHaveLength(1)
    const r = s.reservas![0]
    expect(r.status).toBe('aguardando_pagamento')
    expect(r.coinId).toBe('RO-000001')

    // A MOEDA CONTINUA DO VENDEDOR. É o que impede o comprador de revender
    // dentro dos dez minutos algo que ele ainda não pagou.
    expect(s.users.vendedor.coins).toHaveLength(1)
    expect(s.users.caloteiro.coins).toHaveLength(0)
    expect(s.users.caloteiro.balance).toBe(0)

    // Saiu do livro, para não ser reservada duas vezes.
    expect(s.sellOffers).toHaveLength(0)

    // O bid não consumiu a unidade: a compra ainda pode não acontecer.
    expect(s.buyOrders[0].qty).toBe(1)
  })
})

describe('quando o prazo vence, a fila anda', () => {
  it('devolve a oferta ao livro inteira, rebaixa o bid e deixa o próximo comprar', () => {
    const s = estado()
    s.buyOrders.push(bid('B1', 'caloteiro', 28500, 'pospago', AGORA))
    matchOrders(s)

    // O prazo sai do relógio do MOTOR, que usa `Date.now()` real — e não do
    // AGORA fictício das fixtures. Ler `expiraEm` da própria reserva é o que
    // mantém o teste honesto: ele expira quando o sistema diz que expira.
    const depois = s.reservas![0].expiraEm + 1
    const expiradas = expirarReservasVencidas(s, depois)

    expect(expiradas).toHaveLength(1)
    expect(s.reservas![0].status).toBe('expirada')

    // A oferta volta COMO ERA — `obs` e `lotId` inclusive, que é o que
    // reagrupa a moeda no anúncio original da vitrine.
    expect(s.sellOffers).toHaveLength(1)
    expect(s.sellOffers[0]).toMatchObject({ id: 'OF-1', obs: 'anúncio de teste', lotId: 'LOT-1' })

    // O bid que não pagou foi para o fim da fila do próprio preço.
    expect(s.buyOrders[0].prioridadeEm).toBe(depois)

    // E agora o segundo da fila leva a moeda. Ele publicou ANTES da expiração,
    // que é o caso real: a fila já existia quando o prazo venceu.
    s.buyOrders.push(bid('B2', 'segundo', 28500, 'saldo', AGORA + 5))
    matchOrders(s)

    expect(s.users.segundo.coins.map((c) => c.id)).toEqual(['RO-000001'])
    expect(s.users.caloteiro.coins).toHaveLength(0)
    expect(s.trades).toHaveLength(1)
  })

  it('o caloteiro não reserva a MESMA moeda de novo, mesmo sozinho na fila', () => {
    // Sem esta regra, um bid pós-pago sozinho travaria o item para sempre:
    // reservar, deixar vencer, reservar de novo, dez minutos por vez, sem
    // nunca pagar e sem ninguém mais conseguir comprar.
    const s = estado()
    s.buyOrders.push(bid('B1', 'caloteiro', 28500, 'pospago', AGORA))
    matchOrders(s)
    expirarReservasVencidas(s, s.reservas![0].expiraEm + 1)

    expect(s.sellOffers).toHaveLength(1)

    matchOrders(s)

    // A oferta continua no livro, disponível para qualquer outro comprador.
    expect(s.sellOffers).toHaveLength(1)
    expect(s.reservas!.filter((r) => r.status === 'aguardando_pagamento')).toHaveLength(0)
  })

  it('não ressuscita a oferta se o vendedor já não tem a moeda', () => {
    const s = estado()
    s.buyOrders.push(bid('B1', 'caloteiro', 28500, 'pospago', AGORA))
    matchOrders(s)

    // A moeda saiu do acervo do vendedor durante os dez minutos.
    s.users.vendedor.coins = []

    expirarReservasVencidas(s, s.reservas![0].expiraEm + 1)

    // Anúncio de moeda que não existe mais seria pior do que anúncio nenhum.
    expect(s.sellOffers).toHaveLength(0)
  })
})

describe('marcarReservaPaga', () => {
  it('recusa reserva vencida mesmo que ninguém a tenha expirado ainda', () => {
    const s = estado()
    const r = abrirReserva({
      bo: bid('B1', 'caloteiro', 28500, 'pospago', AGORA),
      oferta: oferta('OF-1', 'vendedor', 'RO-000001', 28500),
      comissaoCompradorCents: 242,
      agora: AGORA,
    })
    void s

    // O relógio manda, não a passagem do varredor.
    const tarde = marcarReservaPaga(r, AGORA + PRAZO_DA_RESERVA_MS + 1)
    expect(tarde.ok).toBe(false)
    expect(r.status).toBe('aguardando_pagamento')

    const dentro = marcarReservaPaga(r, AGORA + 1000)
    expect(dentro.ok).toBe(true)
    expect(r.status).toBe('paga')

    // E não paga duas vezes.
    expect(marcarReservaPaga(r, AGORA + 2000).ok).toBe(false)
  })
})

describe('moeda em reserva aberta não volta ao livro por reanúncio (28/09/2026)', () => {
  /**
   * O caso real: a reserva pós-paga tira a moeda de `sellOffers` e a guarda
   * dentro de si por dez minutos. Enquanto isso, `availableCoinsForSell` não
   * via reserva nenhuma e a moeda parecia livre — a vendedora reanunciou a
   * RO-000101 enquanto ela estava reservada. Se a reserva fosse paga logo
   * depois, a moeda trocaria de dono ainda anunciada pela antiga dona.
   */
  function comReserva(status: 'aguardando_pagamento' | 'expirada'): AppState {
    const s = estado()
    // A oferta sai do livro quando a reserva nasce: é assim que `abrirReserva`
    // a guarda, e é o que fazia a moeda parecer livre.
    s.sellOffers = []
    // `availableCoinsForSell` olha o RELÓGIO DE VERDADE para decidir se a
    // reserva ainda vale (28/09/2026: o prazo conta, não só o status — ver
    // `moedaEmReservaAberta`). Como `AGORA` aqui é um carimbo fixo no passado,
    // `expiraEm` precisa ser calculado a partir de `Date.now()` para o caso
    // 'aguardando_pagamento' realmente valer como "ainda dentro do prazo".
    const expiraEm =
      status === 'aguardando_pagamento' ? Date.now() + PRAZO_DA_RESERVA_MS : AGORA + PRAZO_DA_RESERVA_MS
    s.reservas = [
      {
        id: 'RSV-1',
        bidId: 'B1',
        comprador: 'caloteiro',
        vendedor: 'vendedor',
        coinId: 'RO-000001',
        tipoMoeda: 'Entrega da Bandeira Olímpica',
        precoCents: 28500,
        comissaoCompradorCents: 242,
        totalCents: 28742,
        oferta: oferta('OF-1', 'vendedor', 'RO-000001', 28500),
        criadaEm: AGORA,
        expiraEm,
        status,
        paymentIntentRef: null,
        avisadoEm: null,
      },
    ]
    return s
  }

  it('reserva aguardando pagamento tira a moeda das vendáveis', () => {
    const s = comReserva('aguardando_pagamento')
    const ids = availableCoinsForSell(s, s.users.vendedor!).map((c) => c.id)
    expect(ids).not.toContain('RO-000001')
  })

  it('reserva expirada devolve a moeda às vendáveis', () => {
    const s = comReserva('expirada')
    const ids = availableCoinsForSell(s, s.users.vendedor!).map((c) => c.id)
    expect(ids).toContain('RO-000001')
  })
})

describe('dinheiro preso na oferta pré-paga não some com ela (28/09/2026)', () => {
  function comPrepago(lastro: number, preco = 28500): AppState {
    const s = estado()
    s.sellOffers = []
    s.buyOrders = [{ ...bid('B1', 'caloteiro', preco, 'prepago', AGORA), pagoAntecipadoCents: lastro }]
    return s
  }

  it('devolve ao saldo o valor preso quando a ordem sai', () => {
    const s = comPrepago(28_742)
    const antes = s.users.caloteiro!.balance

    expect(devolverLastroDoBid(s, s.buyOrders[0]!)).toBe(28_742)
    expect(s.users.caloteiro!.balance).toBe(antes + 28_742)
    // Zerado para que uma segunda passagem não credite de novo.
    expect(s.buyOrders[0]!.pagoAntecipadoCents).toBe(0)
  })

  it('não devolve duas vezes', () => {
    const s = comPrepago(28_742)
    devolverLastroDoBid(s, s.buyOrders[0]!)
    const depoisDaPrimeira = s.users.caloteiro!.balance
    expect(devolverLastroDoBid(s, s.buyOrders[0]!)).toBe(0)
    expect(s.users.caloteiro!.balance).toBe(depoisDaPrimeira)
  })

  it('ordem de saldo não tem lastro a devolver', () => {
    const s = estado()
    s.buyOrders = [bid('B1', 'segundo', 28500, 'saldo', AGORA)]
    expect(devolverLastroDoBid(s, s.buyOrders[0]!)).toBe(0)
  })
})

describe('expurgarOrdensSemLastro', () => {
  const comComissao = (preco: number) => preco + Math.round(preco * 0.005) + 100

  it('tira do livro a ordem de saldo que não paga nem uma moeda', () => {
    const s = estado()
    s.users.caloteiro!.balance = 100
    s.buyOrders = [bid('B1', 'caloteiro', 28500, 'saldo', AGORA)]

    const removidas = expurgarOrdensSemLastro(s, comComissao)
    expect(removidas.map((b) => b.id)).toEqual(['B1'])
    expect(s.buyOrders).toHaveLength(0)
  })

  it('mantém a ordem de saldo que ainda paga', () => {
    const s = estado()
    s.buyOrders = [bid('B1', 'segundo', 28500, 'saldo', AGORA)]
    expect(expurgarOrdensSemLastro(s, comComissao)).toHaveLength(0)
    expect(s.buyOrders).toHaveLength(1)
  })

  it('NÃO toca no pós-pago — ele não tem lastro por definição', () => {
    const s = estado()
    s.users.caloteiro!.balance = 0
    s.buyOrders = [bid('B1', 'caloteiro', 28500, 'pospago', AGORA)]
    expect(expurgarOrdensSemLastro(s, comComissao)).toHaveLength(0)
    expect(s.buyOrders).toHaveLength(1)
  })

  it('devolve o troco do pré-pago ao saldo antes de tirar a ordem', () => {
    const s = estado()
    const antes = s.users.caloteiro!.balance
    // Sobrou dinheiro, mas não o bastante para mais uma moeda.
    s.buyOrders = [{ ...bid('B1', 'caloteiro', 28500, 'prepago', AGORA), pagoAntecipadoCents: 5_000 }]

    expect(expurgarOrdensSemLastro(s, comComissao)).toHaveLength(1)
    expect(s.buyOrders).toHaveLength(0)
    expect(s.users.caloteiro!.balance).toBe(antes + 5_000)
  })

  it('mantém o pré-pago que ainda tem lastro para uma moeda', () => {
    const s = estado()
    s.buyOrders = [{ ...bid('B1', 'caloteiro', 28500, 'prepago', AGORA), pagoAntecipadoCents: 28_743 }]
    expect(expurgarOrdensSemLastro(s, comComissao)).toHaveLength(0)
    expect(s.buyOrders).toHaveLength(1)
  })
})

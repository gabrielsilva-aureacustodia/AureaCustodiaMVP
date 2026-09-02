/**
 * Testes do planejador de diff — sem banco, sem I/O.
 *
 * O que se prova aqui: que cada gesto do domínio (depositar, anunciar, casar,
 * transferir, avançar um envio) vira EXATAMENTE as operações de banco que se
 * espera, na ordem que as chaves estrangeiras aceitam, e que o histórico não
 * pode encolher. Os cenários usam o próprio seed e as próprias funções de
 * domínio, para que o diff seja testado contra o que a plataforma faz de
 * verdade e não contra fixtures inventadas.
 */

import { describe, expect, it } from 'vitest'

import { tradeFee } from '@/domain/fees'
import { matchOrders, transferCoin } from '@/domain/market'
import { nextEnvioCode } from '@/domain/codes'
import { seedState } from '@/domain/seed'
import type { AppState, Envio } from '@/domain/types'

import { normalizarTrade, planejarDiff, type Operacao } from './diff'

const BANDEIRA = 'Entrega da Bandeira Olímpica'

function cenario(): { antes: AppState; depois: AppState } {
  const antes = seedState()
  return { antes, depois: structuredClone(antes) }
}

function tipos(ops: Operacao[]): string[] {
  return ops.map((o) => o.tipo)
}

/** Primeira Bandeira livre de um usuário — a moeda que qualquer teste de venda usa. */
function bandeiraDe(state: AppState, email: string): string {
  const c = state.users[email].coins.find((x) => x.tipoMoeda === BANDEIRA)
  if (!c) throw new Error(`${email} não tem Bandeira no seed`)
  return c.id
}

describe('planejarDiff — nada mudou', () => {
  it('estado idêntico produz zero operações', () => {
    const { antes, depois } = cenario()
    expect(planejarDiff(antes, depois)).toEqual([])
  })

  it('estado vazio para seed produz só inserções e a atualização do contador', () => {
    const vazio: AppState = {
      users: {},
      sellOffers: [],
      buyOrders: [],
      trades: [],
      envios: [],
      seq: { coin: 0, envio: 0 },
      custodyCharges: {},
      deposits: [],
    }
    const seed = seedState()
    const ops = planejarDiff(vazio, seed)
    const t = tipos(ops)

    expect(t.filter((x) => x === 'user.inserir')).toHaveLength(7)
    const totalMoedas = Object.values(seed.users).reduce((s, u) => s + u.coins.length, 0)
    expect(t.filter((x) => x === 'coin.inserir')).toHaveLength(totalMoedas)
    expect(t.filter((x) => x === 'trade.inserir')).toHaveLength(seed.trades.length)
    expect(t.filter((x) => x === 'custodyCharge.gravar')).toHaveLength(7)
    expect(t.filter((x) => x === 'seq.atualizar')).toHaveLength(1)
    expect(t.some((x) => x.endsWith('.atualizar') && x !== 'seq.atualizar')).toBe(false)
    expect(t.some((x) => x.endsWith('.remover'))).toBe(false)

    // usuários antes das moedas: as moedas apontam para eles
    expect(t.lastIndexOf('user.inserir')).toBeLessThan(t.indexOf('coin.inserir'))
  })
})

describe('planejarDiff — conta', () => {
  it('depósito: atualiza o usuário e insere o depósito, nada mais', () => {
    const { antes, depois } = cenario()
    const email = Object.keys(depois.users)[0]
    depois.users[email].balance += 10_000
    depois.deposits.push({ userEmail: email, valor: 10_000, date: Date.now() })

    const ops = planejarDiff(antes, depois)
    expect(tipos(ops)).toEqual(['user.atualizar', 'deposit.inserir'])
    expect(ops[0]).toMatchObject({ email, user: { balance: antes.users[email].balance + 10_000 } })
  })

  it('senha e preferências trocadas viram uma única atualização do usuário', () => {
    const { antes, depois } = cenario()
    const email = Object.keys(depois.users)[1]
    depois.users[email].pass = 'novaSenha123'
    depois.users[email].settings = {
      twoFA: true,
      notifEnvios: false,
      notifNegociacoes: true,
      notifNovidades: false,
    }

    const ops = planejarDiff(antes, depois)
    expect(tipos(ops)).toEqual(['user.atualizar'])
    expect(ops[0]).toMatchObject({
      user: { pass: 'novaSenha123', settings: { twoFA: true, notifEnvios: false } },
    })
  })
})

describe('planejarDiff — moedas', () => {
  it('transferência: só a moeda movida e as que deslocaram de posição são atualizadas', () => {
    const { antes, depois } = cenario()
    const [vendedor, comprador] = Object.keys(depois.users)
    const s = depois.users[vendedor]
    const b = depois.users[comprador]
    // Move a PRIMEIRA moeda do vendedor: todas as demais dele recuam uma posição.
    const coinId = s.coins[0].id
    const restantes = s.coins.length - 1
    transferCoin(s, b, coinId)

    const ops = planejarDiff(antes, depois)
    const coinsAtualizadas = ops.filter((o) => o.tipo === 'coin.atualizar')
    expect(tipos(ops).every((t) => t === 'coin.atualizar')).toBe(true)
    // a movida + as que deslocaram
    expect(coinsAtualizadas).toHaveLength(1 + restantes)

    const movida = coinsAtualizadas.find((o) => o.tipo === 'coin.atualizar' && o.registro.coin.id === coinId)
    expect(movida).toMatchObject({
      registro: {
        owner: comprador,
        posicao: b.coins.length - 1,
        coin: { transferido: true },
      },
    })
  })

  it('transferir a ÚLTIMA moeda não toca nas outras', () => {
    const { antes, depois } = cenario()
    const [vendedor, comprador] = Object.keys(depois.users)
    const s = depois.users[vendedor]
    transferCoin(s, depois.users[comprador], s.coins[s.coins.length - 1].id)

    expect(tipos(planejarDiff(antes, depois))).toEqual(['coin.atualizar'])
  })
})

describe('planejarDiff — livro de ordens', () => {
  it('anunciar insere a oferta; cancelar remove', () => {
    const { antes, depois } = cenario()
    const email = Object.keys(depois.users)[0]
    depois.sellOffers.push({
      id: 'OF-1',
      coinId: bandeiraDe(depois, email),
      seller: email,
      price: 30_000,
      obs: '',
      lotId: 'LOT-1',
      createdAt: Date.now(),
      tipoMoeda: BANDEIRA,
    })
    expect(tipos(planejarDiff(antes, depois))).toEqual(['sellOffer.inserir'])

    const cancelado = structuredClone(depois)
    cancelado.sellOffers = []
    expect(tipos(planejarDiff(depois, cancelado))).toEqual(['sellOffer.remover'])
  })

  it('editar o preço do lote atualiza a oferta em vez de recriá-la', () => {
    const { antes, depois } = cenario()
    const email = Object.keys(depois.users)[0]
    const oferta = {
      id: 'OF-1',
      coinId: bandeiraDe(depois, email),
      seller: email,
      price: 30_000,
      obs: '',
      lotId: 'LOT-1',
      createdAt: Date.now(),
      tipoMoeda: BANDEIRA,
    }
    antes.sellOffers.push(structuredClone(oferta))
    depois.sellOffers.push({ ...oferta, price: 31_000 })

    const ops = planejarDiff(antes, depois)
    expect(tipos(ops)).toEqual(['sellOffer.atualizar'])
    expect(ops[0]).toMatchObject({ oferta: { id: 'OF-1', price: 31_000 } })
  })

  it('casamento de ordens: remove a oferta, esvazia o bid, move a moeda, ajusta saldos e grava a negociação com a comissão congelada', () => {
    const { antes, depois } = cenario()
    const [vendedor, comprador] = Object.keys(depois.users)
    const coinId = bandeiraDe(depois, vendedor)
    const now = Date.now()
    const oferta = {
      id: 'OF-1',
      coinId,
      seller: vendedor,
      price: 30_000,
      obs: '',
      lotId: 'LOT-1',
      createdAt: now,
      tipoMoeda: BANDEIRA,
    }
    antes.sellOffers.push(structuredClone(oferta))
    depois.sellOffers.push(structuredClone(oferta))
    depois.buyOrders.push({
      id: 'BID-1',
      buyer: comprador,
      price: 30_000,
      qty: 1,
      createdAt: now,
      tipoMoeda: BANDEIRA,
    })

    const { matched, trades } = matchOrders(depois)
    expect(matched).toBe(true)
    expect(trades).toHaveLength(1)

    const ops = planejarDiff(antes, depois)
    const t = tipos(ops)

    expect(t).toContain('sellOffer.remover')
    expect(t).not.toContain('buyOrder.inserir') // o bid nasceu e morreu na mesma transação
    expect(t.filter((x) => x === 'user.atualizar')).toHaveLength(2)
    expect(t).toContain('coin.atualizar')
    expect(t.filter((x) => x === 'trade.inserir')).toHaveLength(1)

    // remoção da oferta vem ANTES de qualquer inserção/atualização
    expect(t.indexOf('sellOffer.remover')).toBeLessThan(t.indexOf('user.atualizar'))
    expect(t.indexOf('sellOffer.remover')).toBeLessThan(t.indexOf('coin.atualizar'))

    const trade = ops.find((o) => o.tipo === 'trade.inserir')
    expect(trade).toMatchObject({
      trade: {
        price: 30_000,
        qty: 1,
        buyer: comprador,
        seller: vendedor,
        tipoMoeda: BANDEIRA,
        fee: tradeFee(30_000),
      },
    })
  })
})

describe('planejarDiff — envios e custódia', () => {
  it('novo protocolo insere o envio e atualiza o contador', () => {
    const { antes, depois } = cenario()
    const email = Object.keys(depois.users)[2]
    const protocolo = nextEnvioCode(depois.seq)
    const envio: Envio = {
      protocolo,
      userEmail: email,
      tipoMoeda: BANDEIRA,
      ano: 2016,
      quantidade: 2,
      codigoRastreio: null,
      dataPostagem: null,
      dataRecebimento: null,
      etapaAtual: 'Protocolo gerado',
      createdAt: Date.now(),
      codigosAtivosGerados: [],
    }
    depois.envios.push(envio)

    const ops = planejarDiff(antes, depois)
    expect(tipos(ops)).toEqual(['envio.inserir', 'seq.atualizar'])
    expect(ops[1]).toMatchObject({ seq: { envio: antes.seq.envio + 1 } })
  })

  it('avanço de etapa atualiza o envio; recibo emitido grava a cobrança de custódia', () => {
    const { antes, depois } = cenario()
    const email = Object.keys(depois.users)[2]
    const envio: Envio = {
      protocolo: 'RO-ENV-9999',
      userEmail: email,
      tipoMoeda: BANDEIRA,
      ano: 2016,
      quantidade: 1,
      codigoRastreio: null,
      dataPostagem: null,
      dataRecebimento: null,
      etapaAtual: 'Protocolo gerado',
      createdAt: Date.now(),
      codigosAtivosGerados: [],
    }
    antes.envios.push(structuredClone(envio))
    depois.envios.push({ ...envio, etapaAtual: 'Envio postado', codigoRastreio: 'BR1BR', dataPostagem: Date.now() })
    depois.custodyCharges[email] = { ...depois.custodyCharges[email], statusPagamento: 'Pendente' }

    const ops = planejarDiff(antes, depois)
    expect(tipos(ops)).toEqual(['envio.atualizar', 'custodyCharge.gravar'])
    expect(ops[0]).toMatchObject({ envio: { etapaAtual: 'Envio postado', codigoRastreio: 'BR1BR' } })
    expect(ops[1]).toMatchObject({ email, cobranca: { statusPagamento: 'Pendente' } })
  })
})

describe('planejarDiff — histórico é append-only', () => {
  it('encolher trades é erro, não operação', () => {
    const { antes, depois } = cenario()
    depois.trades.pop()
    expect(() => planejarDiff(antes, depois)).toThrow(/append-only/)
  })

  it('encolher deposits é erro, não operação', () => {
    const { antes, depois } = cenario()
    antes.deposits.push({ userEmail: 'x', valor: 1, date: 1 })
    expect(() => planejarDiff(antes, depois)).toThrow(/append-only/)
  })

  it('só a cauda nova vira inserção', () => {
    const { antes, depois } = cenario()
    depois.trades.push({ price: 1, qty: 1, date: 2, buyer: 'a', seller: 'b', tipoMoeda: BANDEIRA })
    depois.trades.push({ price: 2, qty: 1, date: 3, buyer: 'a', seller: 'b', tipoMoeda: BANDEIRA })
    expect(tipos(planejarDiff(antes, depois))).toEqual(['trade.inserir', 'trade.inserir'])
  })
})

describe('normalizarTrade — a comissão congelada', () => {
  it('sem fee gravada, calcula tradeFee(price) × qty', () => {
    const t = normalizarTrade({ price: 28_500, qty: 3, date: 1, buyer: 'a', seller: 'b', tipoMoeda: BANDEIRA })
    expect(t.fee).toBe(tradeFee(28_500) * 3)
  })

  it('com fee gravada, preserva o valor — mesmo que a fórmula atual desse outro', () => {
    const t = normalizarTrade({ price: 28_500, qty: 1, date: 1, buyer: 'a', seller: 'b', tipoMoeda: BANDEIRA, fee: 7 })
    expect(t.fee).toBe(7)
  })
})

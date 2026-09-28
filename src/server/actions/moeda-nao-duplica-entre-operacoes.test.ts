/**
 * Uma moeda comprometida numa operação não pode entrar em outra ao mesmo
 * tempo — nem anúncio duplicado, nem retirada de moeda prometida a um
 * comprador (28/09/2026, achado do Gabriel).
 *
 * O CASO REAL QUE ORIGINOU ESTE ARQUIVO
 * --------------------------------------
 * A oferta da Rozâne casou com uma compra pós-paga (a moeda saiu do livro,
 * foi para uma reserva de dez minutos). Vinte segundos depois, ela conseguiu
 * anunciar a MESMA moeda de novo, a um preço diferente — porque
 * `publishOffer` só recusava moeda que já estivesse em `sellOffers`, e uma
 * moeda reservada não está mais lá. Quando a reserva original venceu sem
 * pagamento, a oferta antiga não pôde voltar (a trava contra anúncio
 * duplicado da mesma moeda bloqueou, corretamente) — e a vaga dela sumiu.
 *
 * A mesma pergunta ("esta moeda está livre de verdade?") tinha resposta
 * incompleta em dois lugares: `publishOffer` (venda) e `solicitarRetirada`
 * (retirada física). As duas passaram a usar os mesmos predicados puros que
 * `availableCoinsForSell` já usava — `moedaEmReservaAberta` e
 * `moedaComRetiradaEmAndamento` — em vez de reinventar a checagem.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import { COIN } from '@/domain/constants'
import { competenciaAtual } from '@/domain/custody'
import { cadastroCompleto } from '@/domain/testing/fixtures'
import type { EnderecoEntrega } from '@/domain/types'
import { getState, mutateState } from '@/server/state'
import { solicitarRetirada } from './custody'
import { publishBid } from './market'
import { publishOffer } from './sell'

const BANDEIRA = COIN.name
const VENDEDOR = 'rogeriopena@testeaurea.com.br'
const COMPRADOR = 'gabrielsilva@testeaurea.com.br'
const PRECO = 20_000

const ENDERECO: EnderecoEntrega = {
  nome: 'Rogério Pena',
  cpfOuCnpj: '123.456.789-00',
  logradouro: 'Avenida Raja Gabaglia',
  numero: '2000',
  bairro: 'Estoril',
  cidade: 'Belo Horizonte',
  uf: 'MG',
  cep: '30494-170',
  telefone: '(31) 98888-7777',
}

beforeEach(async () => {
  getSessionEmail.mockReset()

  await mutateState((s) => {
    s.sellOffers = []
    s.buyOrders = []
    s.trades = []
    s.reservas = []
    s.retiradas = []

    s.users[VENDEDOR]!.balance = 0
    s.users[VENDEDOR]!.cadastro = cadastroCompleto()
    s.users[COMPRADOR]!.balance = 100_000
    s.users[COMPRADOR]!.cadastro = cadastroCompleto()
    s.users[COMPRADOR]!.coins = []

    s.faturasCustodia = []
    const competencia = competenciaAtual(Date.now())
    for (const [email, u] of Object.entries(s.users)) {
      if (u.coins.length === 0) continue
      s.faturasCustodia.push({
        id: `FAT-EM-DIA-${email}`,
        userEmail: email,
        competencia,
        quantidadeMoedas: u.coins.length,
        moedaIds: u.coins.map((c) => c.id),
        valorCents: 200 * u.coins.length,
        status: 'paga',
        dataEmissao: Date.now() - 86_400_000,
        dataVencimento: Date.now() + 29 * 86_400_000,
        dataPagamento: Date.now() - 86_400_000,
        formaPagamento: 'saldo',
        paymentIntentId: null,
        planoId: null,
        origem: 'ciclo_mensal',
      })
    }
  })
})

async function moedaDoVendedor(): Promise<string> {
  const s = await getState()
  return s.users[VENDEDOR]!.coins.find((c) => c.tipoMoeda === BANDEIRA)!.id
}

/** Publica a oferta e o bid pós-pago que a casam, deixando a moeda em reserva. */
async function reservarMoedaDoVendedor(): Promise<string> {
  const coinId = await moedaDoVendedor()

  getSessionEmail.mockResolvedValue(VENDEDOR)
  const pub = await publishOffer([coinId], PRECO, '')
  expect(pub.ok).toBe(true)

  getSessionEmail.mockResolvedValue(COMPRADOR)
  const bid = await publishBid(1, PRECO, BANDEIRA, 'pospago')
  expect(bid.ok).toBe(true)

  const s = await getState()
  expect(s.sellOffers.some((o) => o.coinId === coinId)).toBe(false) // saiu do livro: casou
  expect(s.reservas ?? []).toHaveLength(1) // e foi para a reserva, não para uma venda instantânea

  return coinId
}

describe('publishOffer recusa moeda em reserva aberta', () => {
  it('não deixa a mesma moeda ser anunciada de novo enquanto a reserva não resolve', async () => {
    const coinId = await reservarMoedaDoVendedor()

    getSessionEmail.mockResolvedValue(VENDEDOR)
    const r = await publishOffer([coinId], 40_000, '')

    expect(r.ok).toBe(false)
    const s = await getState()
    // Nenhum anúncio novo para esta moeda — nem no preço antigo, nem no novo.
    expect(s.sellOffers.filter((o) => o.coinId === coinId)).toHaveLength(0)
  })
})

describe('publishOffer recusa moeda com retirada física em andamento', () => {
  it('não deixa anunciar uma moeda que já está a caminho dos Correios', async () => {
    const coinId = await moedaDoVendedor()
    getSessionEmail.mockResolvedValue(VENDEDOR)

    const ret = await solicitarRetirada(coinId, 'comum', ENDERECO)
    expect(ret.ok).toBe(true)

    const r = await publishOffer([coinId], PRECO, '')

    expect(r.ok).toBe(false)
    const s = await getState()
    expect(s.sellOffers.filter((o) => o.coinId === coinId)).toHaveLength(0)
  })
})

describe('solicitarRetirada recusa moeda em reserva aberta', () => {
  it('não deixa pedir a saída física de uma moeda prometida a um comprador', async () => {
    const coinId = await reservarMoedaDoVendedor()

    getSessionEmail.mockResolvedValue(VENDEDOR)
    const r = await solicitarRetirada(coinId, 'comum', ENDERECO)

    expect(r.ok).toBe(false)
    expect(r.error).toContain('reservada')
    expect((await getState()).retiradas ?? []).toHaveLength(0)
  })
})

describe('quando a reserva vence sem pagamento, o vendedor pode anunciar de novo na hora', () => {
  it('não precisa esperar a varredura passar — o prazo vale por si só', async () => {
    const coinId = await reservarMoedaDoVendedor()

    // O prazo venceu, mas nenhuma varredura rodou ainda: o registro da reserva
    // continua com status 'aguardando_pagamento'. `moedaEmReservaAberta`
    // precisa olhar o PRAZO, não só o status — senão `publishOffer` recusaria
    // uma moeda cujo comprador já perdeu a janela há muito tempo.
    await mutateState((s) => {
      const r = (s.reservas ?? [])[0]!
      r.expiraEm = Date.now() - 1
      expect(r.status).toBe('aguardando_pagamento') // a varredura ainda não passou
    })

    getSessionEmail.mockResolvedValue(VENDEDOR)
    const r = await publishOffer([coinId], PRECO, '')

    expect(r.ok).toBe(true)
    const s = await getState()
    expect(s.sellOffers.filter((o) => o.coinId === coinId)).toHaveLength(1)
    expect(s.sellOffers.find((o) => o.coinId === coinId)?.price).toBe(PRECO)
  })
})

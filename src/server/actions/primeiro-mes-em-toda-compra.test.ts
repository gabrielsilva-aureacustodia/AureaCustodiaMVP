/**
 * Toda forma de compra cobra o 1º mês de custódia do COMPRADOR (frente B, T1 — 17/11/2026).
 *
 * O PEDIDO (Rogério, 11/11/2026): "cobrar o primeiro mês de custódia junto com o pagamento do envio, ou da
 * compra". Desde 21/10/2026 a compra já embute o mês (`custoDeCompraPorMoeda`, CLAUDE.md), mas nada provava,
 * via por via, que o dinheiro do comprador e a fatura nascem juntos. Este arquivo é essa prova: uma compra
 * por teste, pelas Server Actions de verdade, e em cada uma conferimos as duas metades da regra —
 *
 *   1. a fatura `origem: 'compra'` do COMPRADOR nasce PAGA, uma só, com o valor da TABELA VIGENTE (aqui
 *      R$ 3,50, e não o R$ 2,00 do código: é o que impede um número fixo de voltar a morar numa via);
 *   2. o dinheiro do mês saiu do comprador — do saldo, do valor preso à oferta pré-paga ou do pagamento que
 *      o gateway confirmou — e a moeda já nasce NEGOCIÁVEL na mão dele.
 *
 * As vias: saldo (`buyLot`), Pix e cartão (`iniciarCompraDireta` + conciliação), oferta de compra a saldo
 * casada pelo motor, oferta pré-paga casada pelo motor, venda a uma oferta de compra (`sellToBid`) e a
 * reserva pós-paga paga com saldo, com Pix e com cartão. Todas passam por `transferirMoedaVendida`, que é
 * quem cria a fatura; o teste existe para a regra não depender de ninguém lembrar disso.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
// A confirmação por senha tem testes próprios (reautenticacao*.test.ts); aqui a ação roda já confirmada.
vi.mock('@/server/auth/reautenticacao', () => ({ exigirReautenticacao: async () => null }))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

const { consultarPagamentoMercadoPago } = vi.hoisted(() => ({ consultarPagamentoMercadoPago: vi.fn() }))
vi.mock('@/lib/payments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments')>()),
  consultarPagamentoMercadoPago,
}))

// A tabela do painel: custódia a R$ 3,50 (o código diz R$ 2,00). Duas leituras, dois módulos — as ações de
// compra leem `carregarRegrasDoMercado`; a conciliação lê `carregarTabelaDeTaxas`.
const { TABELA } = vi.hoisted(() => ({
  TABELA: { custodiaMensalPorMoeda: 350 },
}))
vi.mock('@/server/config/carregar', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/config/carregar')>()
  const { TAXAS_PADRAO } = await import('@/domain/fees')
  const { COIN_TYPES } = await import('@/domain/constants')
  return {
    ...original,
    carregarRegrasDoMercado: vi.fn(async () => ({
      taxas: { ...TAXAS_PADRAO, ...TABELA },
      catalogo: COIN_TYPES,
      depositoMaxCents: 10_000_000,
    })),
  }
})
vi.mock('@/server/taxas/carregar', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/taxas/carregar')>()
  const { TAXAS_PADRAO } = await import('@/domain/fees')
  return { ...original, carregarTabelaDeTaxas: vi.fn(async () => ({ ...TAXAS_PADRAO, ...TABELA })) }
})

import { COIN } from '@/domain/constants'
import { custodiaImpedeNegociar } from '@/domain/custodia-da-moeda'
import { custoDeCompraPorMoeda, TAXAS_PADRAO, type TabelaDeTaxas } from '@/domain/fees'
import type { AppState, FaturaCustodia } from '@/domain/types'
import { cadastroCompleto, custodiaEmDia, moeda } from '@/domain/testing/fixtures'
import { conciliarPagamento } from '@/server/payments/conciliacao'
import { _limparRecebimentosEmMemoria } from '@/server/payments/recebimentos'
import { _limparRepositoriosEmMemoria } from '@/server/payments/repositorios'
import { getState, mutateState } from '@/server/state'

import { iniciarCompraDireta } from './payments'
import { buyLot, publishBid } from './market'
import { iniciarPagamentoReserva, pagarReservaComSaldo, publicarOfertaPrePagaComSaldo } from './reserva'
import { publishOffer, sellToBid } from './sell'

const BANDEIRA = COIN.name
const VENDEDOR = 'rogeriopena@testeaurea.com.br'
const COMPRADOR = 'gabrielsilva@testeaurea.com.br'

const PRECO = 20_000
const TAXAS_VIGENTES: TabelaDeTaxas = { ...TAXAS_PADRAO, ...TABELA }
/** O que a compra custa: preço + comissão de compra + o 1º mês da TABELA (R$ 3,50). */
const CUSTO = custoDeCompraPorMoeda(PRECO, TAXAS_VIGENTES)
const CUSTODIA_VIGENTE = 350
const SALDO_INICIAL = 100_000

let contador = 0
let coinId: string

/** A moeda do vendedor, nova a cada teste: a anterior já trocou de dono. */
async function prepararCenario(): Promise<void> {
  contador += 1
  coinId = `RO-8${String(contador).padStart(5, '0')}`
  _limparRepositoriosEmMemoria()
  _limparRecebimentosEmMemoria()
  consultarPagamentoMercadoPago.mockReset()
  getSessionEmail.mockReset()

  await mutateState((s) => {
    s.sellOffers = []
    s.buyOrders = []
    s.trades = []
    s.reservas = []
    s.faturasCustodia = []

    s.users[VENDEDOR]!.balance = 0
    s.users[VENDEDOR]!.cadastro = cadastroCompleto()
    s.users[VENDEDOR]!.coins = [moeda(coinId, BANDEIRA)]
    s.users[COMPRADOR]!.balance = SALDO_INICIAL
    s.users[COMPRADOR]!.cadastro = cadastroCompleto()
    s.users[COMPRADOR]!.coins = []

    // A custódia do VENDEDOR está em dia (desde 12/10/2026 moeda sem custódia paga não se anuncia).
    custodiaEmDia(s)
  })
}

async function anunciarComoVendedor(): Promise<void> {
  getSessionEmail.mockResolvedValue(VENDEDOR)
  const r = await publishOffer([coinId], PRECO, '')
  expect(r.ok).toBe(true)
}

/** As duas metades da regra, conferidas no estado depois de qualquer via de compra. */
function conferirPrimeiroMes(s: AppState, quem: string = COMPRADOR): FaturaCustodia {
  // A moeda mudou de dono.
  expect(s.users[quem]!.coins.some((c) => c.id === coinId)).toBe(true)
  expect(s.users[VENDEDOR]!.coins.some((c) => c.id === coinId)).toBe(false)

  // Uma fatura 'compra' da moeda, do COMPRADOR, PAGA, no valor da tabela vigente.
  const daCompra = (s.faturasCustodia ?? []).filter((f) => f.origem === 'compra' && f.moedaIds.includes(coinId))
  expect(daCompra).toHaveLength(1)
  const fatura = daCompra[0]!
  expect(fatura).toMatchObject({
    userEmail: quem,
    status: 'paga',
    quantidadeMoedas: 1,
    valorCents: CUSTODIA_VIGENTE,
  })
  expect(fatura.dataPagamento).not.toBeNull()
  expect(fatura.coberturaAte ?? 0).toBeGreaterThan(Date.now())

  // E a moeda nasce NEGOCIÁVEL na mão do comprador, pela custódia que ELE pagou (não a do vendedor).
  expect(custodiaImpedeNegociar(s, coinId)).toBe(false)
  return fatura
}

function aprovado(ref: string, valor: number) {
  const agora = Date.now()
  return {
    id: 'pay-t1',
    status: 'approved',
    valorCents: valor,
    valorLiquidoCents: valor,
    tarifaCents: 0,
    totalPagoCents: valor,
    parcelas: 1,
    valorParcelaCents: valor,
    dataLiberacao: agora,
    externalReference: ref,
    paymentMethodId: 'pix',
    paymentTypeId: 'bank_transfer',
    dateApproved: agora,
    dateCreated: agora,
    payerEmail: 'quem-pagou@exemplo.com',
  }
}

beforeEach(async () => {
  await prepararCenario()
})

describe('o custo da compra leva o mês da tabela vigente', () => {
  it('preço + comissão + R$ 3,50 (e não os R$ 2,00 do código)', () => {
    expect(CUSTO).toBe(PRECO + 200 + CUSTODIA_VIGENTE)
    expect(CUSTO).not.toBe(custoDeCompraPorMoeda(PRECO, TAXAS_PADRAO))
  })
})

describe('compra com SALDO', () => {
  it('buyLot: compra do lote debita o custo inteiro e cria a fatura paga do mês', async () => {
    await anunciarComoVendedor()
    const lotId = (await getState()).sellOffers[0]!.lotId

    getSessionEmail.mockResolvedValue(COMPRADOR)
    const r = await buyLot(lotId, 1)
    expect(r.ok).toBe(true)

    const s = await getState()
    conferirPrimeiroMes(s)
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL - CUSTO)
  })

  it('motor — oferta de compra a saldo + oferta de venda: casa e cobra o mês', async () => {
    getSessionEmail.mockResolvedValue(COMPRADOR)
    expect((await publishBid(1, PRECO, BANDEIRA, 'saldo')).ok).toBe(true)
    await anunciarComoVendedor()

    const s = await getState()
    conferirPrimeiroMes(s)
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL - CUSTO)
  })

  it('motor — o comprador chega DEPOIS da venda e cobra o mesmo mês', async () => {
    await anunciarComoVendedor()
    getSessionEmail.mockResolvedValue(COMPRADOR)
    expect((await publishBid(1, PRECO, BANDEIRA, 'saldo')).ok).toBe(true)

    const s = await getState()
    conferirPrimeiroMes(s)
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL - CUSTO)
  })

  it('sellToBid: o vendedor aceita uma oferta de compra e o COMPRADOR paga o mês', async () => {
    getSessionEmail.mockResolvedValue(COMPRADOR)
    // Preço de compra abaixo de qualquer oferta: a ordem fica no livro até alguém vender direto a ela.
    expect((await publishBid(1, PRECO, BANDEIRA, 'saldo')).ok).toBe(true)
    const bidId = (await getState()).buyOrders[0]!.id

    getSessionEmail.mockResolvedValue(VENDEDOR)
    const r = await sellToBid(bidId, 1)
    expect(r.ok).toBe(true)

    const s = await getState()
    conferirPrimeiroMes(s)
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL - CUSTO)
    // O vendedor recebe o preço líquido da comissão, sem custódia nenhuma na conta dele.
    expect(s.users[VENDEDOR]!.balance).toBe(PRECO - 200)
  })
})

describe('compra com oferta PRÉ-PAGA', () => {
  it('o valor preso já leva o mês; quando o motor casa, a fatura nasce paga e o preso zera', async () => {
    getSessionEmail.mockResolvedValue(COMPRADOR)
    const pre = await publicarOfertaPrePagaComSaldo(1, PRECO, BANDEIRA)
    expect(pre.ok).toBe(true)
    expect((await getState()).buyOrders[0]!.pagoAntecipadoCents).toBe(CUSTO)

    await anunciarComoVendedor()

    const s = await getState()
    conferirPrimeiroMes(s)
    // O dinheiro saiu da conta no pagamento da oferta, e só dele: o casamento não cobra uma segunda vez.
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL - CUSTO)
    expect(s.buyOrders).toHaveLength(0)
  })
})

describe('compra por Pix e por cartão (compra direta)', () => {
  async function compraDiretaPor(metodo: 'pix' | 'checkout_pro'): Promise<void> {
    await anunciarComoVendedor()
    const lotId = (await getState()).sellOffers[0]!.lotId

    getSessionEmail.mockResolvedValue(COMPRADOR)
    const aberta = await iniciarCompraDireta(lotId, 1, metodo)
    expect(aberta.ok).toBe(true)
    if (!aberta.ok || !aberta.data) throw new Error('Esperava a cobrança aberta')
    // A cobrança já leva o mês da tabela: preço + comissão + R$ 3,50.
    expect(aberta.data.valorCents).toBe(CUSTO)

    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(aberta.data.externalReference, CUSTO))
    const conc = await conciliarPagamento('pay-t1')
    expect(conc.creditado).toBe(true)
    expect(conc.compraConcluida).toBe(true)
  }

  it('Pix: o pagamento confirmado entrega a moeda e a fatura paga do mês', async () => {
    await compraDiretaPor('pix')

    const s = await getState()
    conferirPrimeiroMes(s)
    // Dinheiro de fora: entra e sai na mesma operação, e o saldo do comprador não se mexe.
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL)
    expect(s.deposits.at(-1)).toMatchObject({ userEmail: COMPRADOR, valor: CUSTO })
  })

  it('cartão: o mesmo total, a mesma fatura paga', async () => {
    await compraDiretaPor('checkout_pro')

    const s = await getState()
    conferirPrimeiroMes(s)
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL)
    expect(s.deposits.at(-1)).toMatchObject({ userEmail: COMPRADOR, valor: CUSTO })
  })
})

describe('reserva pós-paga (opção oculta na tela, mas ligada no código)', () => {
  async function abrirReserva(): Promise<string> {
    getSessionEmail.mockResolvedValue(COMPRADOR)
    expect((await publishBid(1, PRECO, BANDEIRA, 'pospago')).ok).toBe(true)
    await anunciarComoVendedor()

    const reservas = (await getState()).reservas ?? []
    expect(reservas).toHaveLength(1)
    // A reserva abre com o total da compra INTEIRA, mês incluso.
    expect(reservas[0]!.totalCents).toBe(CUSTO)
    return reservas[0]!.id
  }

  it('saldo: pagar a reserva debita o custo inteiro e cria a fatura paga', async () => {
    const reservaId = await abrirReserva()

    getSessionEmail.mockResolvedValue(COMPRADOR)
    const r = await pagarReservaComSaldo(reservaId)
    expect(r.ok).toBe(true)

    const s = await getState()
    conferirPrimeiroMes(s)
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL - CUSTO)
  })

  it('Pix/cartão: a conciliação da reserva entrega a moeda com a fatura paga', async () => {
    const reservaId = await abrirReserva()

    getSessionEmail.mockResolvedValue(COMPRADOR)
    const aberta = await iniciarPagamentoReserva(reservaId, 'pix')
    expect(aberta.ok).toBe(true)
    const ref = ((await getState()).reservas ?? []).find((x) => x.id === reservaId)!.paymentIntentRef
    expect(ref).toBeTruthy()

    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref!, CUSTO))
    const conc = await conciliarPagamento('pay-t1')
    expect(conc.creditado).toBe(true)
    expect(conc.compraConcluida).toBe(true)

    const s = await getState()
    conferirPrimeiroMes(s)
    expect(s.users[COMPRADOR]!.balance).toBe(SALDO_INICIAL)
  })
})

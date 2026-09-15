/**
 * Testes da compra direta com a tabela de taxas vigente (C3 / P-C3-03).
 *
 * Prova que:
 * 1. A comissão do vendedor descontada na compra direta segue a tabela vigente do painel.
 * 2. O Trade gravado congela feeVendedor, feeComprador = 0 e fee total.
 * 3. O comprador não paga comissão no gateway (RA-24 mantido para a segunda onda).
 * 4. Falha na leitura da tabela cai no padrão sem travar a liquidação (RA-47).
 * 5. O livro-razão fecha sem lançamentos de ajuste com a comissão vigente.
 * 6. Depósito comum não é afetado pela tabela vigente.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { consultarPagamentoMercadoPago, carregarTabelaDeTaxas } = vi.hoisted(() => ({
  consultarPagamentoMercadoPago: vi.fn(),
  carregarTabelaDeTaxas: vi.fn(),
}))

vi.mock('@/lib/payments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments')>()),
  consultarPagamentoMercadoPago,
}))

vi.mock('@/server/taxas/carregar', () => ({ carregarTabelaDeTaxas }))

import { TAXAS_PADRAO, type TabelaDeTaxas } from '@/domain/fees'
import { GENESIS } from '@/domain/hash'
import { seedState } from '@/domain/seed'
import type { IntencaoDeposito } from '@/server/db/repositories/payments'
import { derivarLancamentos } from '@/server/db/derivar'
import { getState, mutateState } from '@/server/state'

import { conciliarPagamento, LIQUIDADORES } from './conciliacao'
import { _limparRecebimentosEmMemoria } from './recebimentos'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from './repositorios'

const TAXAS_DO_PAINEL: TabelaDeTaxas = {
  ...TAXAS_PADRAO,
  comissaoVendedorBp: 100,
  comissaoVendedorFixa: 250, // vendedor: 1% + R$ 2,50
  comissaoCompradorBp: 80,
  comissaoCompradorFixa: 150, // comprador: não pode aparecer no gateway
}

const BUYER_EMAIL = 'gabrielsilva@testeaurea.com.br'
const SELLER_EMAIL = 'alex@testeaurea.com.br'

function aprovado(ref: string, valor: number) {
  const agora = Date.now()
  return {
    id: `pay-${ref}`,
    status: 'approved' as const,
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
    payerEmail: BUYER_EMAIL,
  }
}

async function prepararLote(lotId: string, coinIds: [string, string], precoUnitario = 20_000) {
  await mutateState((s) => {
    const seller = s.users[SELLER_EMAIL]
    if (!seller) throw new Error('Seller não encontrado no seed')
    for (const cId of coinIds) {
      seller.coins.push({
        id: cId,
        tipoMoeda: 'Entrega da Bandeira Olímpica',
        ano: 2016,
        entrada: '01/01/2026',
        statusFisico: 'Armazenado',
        statusDigital: 'Validado',
        valorEstimado: precoUnitario,
        protocolo: 'RO-ENV-TEST',
        recibo: {
          codigo: `REC-${cId}`,
          dataEmissao: '01/01/2026',
          hash: 'abc',
          status: 'Ativo',
        },
      })
      s.sellOffers.push({
        id: `OFFER-${cId}`,
        coinId: cId,
        seller: SELLER_EMAIL,
        price: precoUnitario,
        obs: 'Lote teste compra direta vigente',
        lotId,
        createdAt: Date.now(),
        tipoMoeda: 'Entrega da Bandeira Olímpica',
      })
    }
  })
}

async function criarIntencaoCompraDireta(
  ref: string,
  valor: number,
  lotId: string,
  qty: number,
  tipoMoeda: string,
): Promise<void> {
  const agora = Date.now()
  await repositorioIntencoes().criar({
    externalReference: ref,
    userEmail: BUYER_EMAIL,
    valor,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'compra_direta',
    metadata: { lotId, qty, tipoMoeda },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })
}

async function criarIntencaoDeposito(ref: string, valor: number): Promise<void> {
  const agora = Date.now()
  await repositorioIntencoes().criar({
    externalReference: ref,
    userEmail: BUYER_EMAIL,
    valor,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'deposito',
    metadata: null,
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })
}

describe('compra direta com a tabela vigente (P-C3-03)', () => {
  beforeEach(() => {
    _limparRepositoriosEmMemoria()
    _limparRecebimentosEmMemoria()
    consultarPagamentoMercadoPago.mockReset()
    carregarTabelaDeTaxas.mockReset()
  })

  it('desconta do vendedor a comissão da tabela vigente, não a padrão', async () => {
    carregarTabelaDeTaxas.mockResolvedValue(TAXAS_DO_PAINEL)
    const ref = 'CMP-e2-caso1'
    const lotId = 'LOT-e2-caso1'
    const coinIds: [string, string] = ['RO-E2-C1-1', 'RO-E2-C1-2']

    await prepararLote(lotId, coinIds, 20_000)
    await criarIntencaoCompraDireta(ref, 40_000, lotId, 2, 'Entrega da Bandeira Olímpica')
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 40_000))

    const stateAntes = await getState()
    const saldoVendedorAntes = stateAntes.users[SELLER_EMAIL].balance

    const res = await conciliarPagamento(`pay-${ref}`)

    expect(res.creditado).toBe(true)
    expect(res.compraConcluida).toBe(true)

    const stateDepois = await getState()
    const saldoVendedorDepois = stateDepois.users[SELLER_EMAIL].balance

    // Na tabela do painel: 1% + R$ 2,50 por moeda = R$ 4,50 (450 cents).
    // Líquido por moeda = 20_000 - 450 = 19_550. Em duas moedas = 39_100 (e não 39_600).
    expect(saldoVendedorDepois - saldoVendedorAntes).toBe(39_100)

    // Moedas transferidas para o comprador
    const compradorMoedas = stateDepois.users[BUYER_EMAIL].coins
    expect(compradorMoedas.some((c) => c.id === coinIds[0])).toBe(true)
    expect(compradorMoedas.some((c) => c.id === coinIds[1])).toBe(true)
  })

  it('grava no histórico a comissão cobrada: feeVendedor da tabela vigente e feeComprador zero', async () => {
    carregarTabelaDeTaxas.mockResolvedValue(TAXAS_DO_PAINEL)
    const ref = 'CMP-e2-caso2'
    const lotId = 'LOT-e2-caso2'
    const coinIds: [string, string] = ['RO-E2-C2-1', 'RO-E2-C2-2']

    await prepararLote(lotId, coinIds, 20_000)
    await criarIntencaoCompraDireta(ref, 40_000, lotId, 2, 'Entrega da Bandeira Olímpica')
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 40_000))

    await conciliarPagamento(`pay-${ref}`)

    const stateDepois = await getState()
    const trade = stateDepois.trades[stateDepois.trades.length - 1]

    expect(trade).toMatchObject({
      qty: 2,
      feeVendedor: 900,
      feeComprador: 0,
      fee: 900,
    })
  })

  it('a comissão do comprador da tabela vigente não entra na compra pelo gateway (RA-24)', async () => {
    carregarTabelaDeTaxas.mockResolvedValue(TAXAS_DO_PAINEL)
    const ref = 'CMP-e2-caso3'
    const lotId = 'LOT-e2-caso3'
    const coinIds: [string, string] = ['RO-E2-C3-1', 'RO-E2-C3-2']

    await prepararLote(lotId, coinIds, 20_000)
    await criarIntencaoCompraDireta(ref, 40_000, lotId, 2, 'Entrega da Bandeira Olímpica')
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 40_000))

    const stateAntes = await getState()
    const saldoCompradorAntes = stateAntes.users[BUYER_EMAIL].balance

    await conciliarPagamento(`pay-${ref}`)

    const stateDepois = await getState()
    // Saldo do comprador continua inalterado: entrada externa cobriu o valor do lote
    expect(stateDepois.users[BUYER_EMAIL].balance).toBe(saldoCompradorAntes)

    // O registro em deposits reflete o valor pago
    const novoDeposito = stateDepois.deposits[stateDepois.deposits.length - 1]
    expect(novoDeposito.userEmail).toBe(BUYER_EMAIL)
    expect(novoDeposito.valor).toBe(40_000)
  })

  it('leitura da tabela que falha cai na tabela padrão e a compra conclui', async () => {
    carregarTabelaDeTaxas.mockRejectedValue(new Error('banco fora'))
    const ref = 'CMP-e2-caso4'
    const lotId = 'LOT-e2-caso4'
    const coinIds: [string, string] = ['RO-E2-C4-1', 'RO-E2-C4-2']

    await prepararLote(lotId, coinIds, 20_000)
    await criarIntencaoCompraDireta(ref, 40_000, lotId, 2, 'Entrega da Bandeira Olímpica')
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 40_000))

    const stateAntes = await getState()
    const saldoVendedorAntes = stateAntes.users[SELLER_EMAIL].balance

    const res = await conciliarPagamento(`pay-${ref}`)

    expect(res.creditado).toBe(true)

    const stateDepois = await getState()
    const saldoVendedorDepois = stateDepois.users[SELLER_EMAIL].balance

    // Na tabela padrão: 0,5% + R$ 1,00 = R$ 2,00 por moeda.
    // Líquido por moeda = 20_000 - 200 = 19_800. Duas moedas = 39_600.
    expect(saldoVendedorDepois - saldoVendedorAntes).toBe(39_600)

    const intencaoSalva = await repositorioIntencoes().buscar(ref)
    expect(intencaoSalva?.status).toBe('creditado')
  })

  it('o livro-razão da compra direta fecha sem ajuste com a comissão vigente', () => {
    const antes = seedState()
    const lotId = 'LOT-e2-ledger'
    const coinIds: [string, string] = ['RO-E2-LEDGER-1', 'RO-E2-LEDGER-2']
    const precoUnitario = 20_000
    const seller = antes.users[SELLER_EMAIL]

    for (const cId of coinIds) {
      seller.coins.push({
        id: cId,
        tipoMoeda: 'Entrega da Bandeira Olímpica',
        ano: 2016,
        entrada: '01/01/2026',
        statusFisico: 'Armazenado',
        statusDigital: 'Validado',
        valorEstimado: precoUnitario,
        protocolo: 'RO-ENV-TEST',
        recibo: {
          codigo: `REC-${cId}`,
          dataEmissao: '01/01/2026',
          hash: 'abc',
          status: 'Ativo',
        },
      })
      antes.sellOffers.push({
        id: `OFFER-${cId}`,
        coinId: cId,
        seller: SELLER_EMAIL,
        price: precoUnitario,
        obs: 'Lote teste ledger',
        lotId,
        createdAt: Date.now(),
        tipoMoeda: 'Entrega da Bandeira Olímpica',
      })
    }

    const depois = structuredClone(antes)
    const intencao: IntencaoDeposito = {
      externalReference: 'CMP-e2-ledger',
      userEmail: BUYER_EMAIL,
      valor: 40_000,
      metodo: 'pix',
      status: 'creditando',
      tipoOperacao: 'compra_direta',
      metadata: { lotId, qty: 2, tipoMoeda: 'Entrega da Bandeira Olímpica' },
      paymentId: 'pay-ledger',
      motivoRecusa: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const detalhes = aprovado('CMP-e2-ledger', 40_000)

    LIQUIDADORES.compra_direta(depois, intencao, detalhes, { taxas: TAXAS_DO_PAINEL })

    const derivado = derivarLancamentos({
      antes,
      depois,
      ops: [],
      semeadura: false,
      agora: Date.now(),
      hashAnterior: GENESIS,
    })

    expect(derivado.ajustes).toEqual([])
    const lancamentoComissao = derivado.lancamentos.find(
      (l) => l.tipo === 'comissao' && l.userEmail === SELLER_EMAIL,
    )
    expect(lancamentoComissao).toBeDefined()
    expect(lancamentoComissao?.valor).toBe(900)
  })

  it('depósito comum não muda com a tabela vigente', async () => {
    carregarTabelaDeTaxas.mockResolvedValue(TAXAS_DO_PAINEL)
    const ref = 'DEP-e2-comum'
    await criarIntencaoDeposito(ref, 25_000)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado(ref, 25_000))

    const stateAntes = await getState()
    const saldoAntes = stateAntes.users[BUYER_EMAIL].balance

    const res = await conciliarPagamento(`pay-${ref}`)

    expect(res.creditado).toBe(true)

    const stateDepois = await getState()
    const saldoDepois = stateDepois.users[BUYER_EMAIL].balance

    expect(saldoDepois - saldoAntes).toBe(25_000)
  })
})

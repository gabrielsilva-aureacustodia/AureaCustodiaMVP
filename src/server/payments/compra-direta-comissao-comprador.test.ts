/**
 * A comissão do comprador na compra direta pelo gateway (E8, RA-24).
 *
 * Prova que:
 * 1. O `Trade` grava `feeComprador` (a comissão congelada na cobrança), `feeVendedor` (a tabela
 *    vigente na aprovação, regra da E2) e `fee` igual à soma.
 * 2. O depósito que explica a compra cobre preço mais comissão do comprador, que é exatamente o que
 *    o livro-razão debita — e por isso o livro fecha com `ajustes` vazio.
 * 3. Intenção aberta ANTES da E8, sem o campo na metadata, continua liquidando com comissão zero:
 *    é o que o gateway cobrou dela.
 * 4. Preço que sobe entre a cobrança e o pagamento não vira compra: o valor inteiro vira saldo e o
 *    anúncio continua no livro.
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
import { derivarLancamentos } from '@/server/db/derivar'
import { getState, mutateState } from '@/server/state'

import { conciliarPagamento } from './conciliacao'
import { _limparRecebimentosEmMemoria } from './recebimentos'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from './repositorios'

const TAXAS_DO_PAINEL: TabelaDeTaxas = {
  ...TAXAS_PADRAO,
  comissaoVendedorBp: 100,
  comissaoVendedorFixa: 250, // vendedor: 1% + R$ 2,50
  comissaoCompradorBp: 80,
  comissaoCompradorFixa: 150, // comprador: 0,8% + R$ 1,50
}

const BUYER_EMAIL = 'gabrielsilva@testeaurea.com.br'
const SELLER_EMAIL = 'alex@testeaurea.com.br'

const PRECO = 20_000
/** round(20_000 × 80 / 10_000) + 150 = 160 + 150 */
const COMISSAO_COMPRADOR_UNIT = 310
/** 20_000 × 100 / 10_000 + 250 = 200 + 250 */
const COMISSAO_VENDEDOR_UNIT = 450

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

async function prepararLote(lotId: string, coinIds: string[], precoUnitario = PRECO) {
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
        recibo: { codigo: `REC-${cId}`, dataEmissao: '01/01/2026', hash: 'abc', status: 'Ativo' },
      })
      s.sellOffers.push({
        id: `OFFER-${cId}`,
        coinId: cId,
        seller: SELLER_EMAIL,
        price: precoUnitario,
        obs: 'Lote teste comissão do comprador',
        lotId,
        createdAt: Date.now(),
        tipoMoeda: 'Entrega da Bandeira Olímpica',
      })
    }
  })
}

async function criarIntencao(
  ref: string,
  valor: number,
  lotId: string,
  qty: number,
  comissaoCompradorPorMoeda?: number,
): Promise<void> {
  const agora = Date.now()
  await repositorioIntencoes().criar({
    externalReference: ref,
    userEmail: BUYER_EMAIL,
    valor,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'compra_direta',
    metadata: {
      lotId,
      qty,
      tipoMoeda: 'Entrega da Bandeira Olímpica',
      sellerEmail: SELLER_EMAIL,
      unitPrice: PRECO,
      ...(comissaoCompradorPorMoeda === undefined ? {} : { comissaoCompradorPorMoeda }),
    },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })
}

describe('Compra direta pelo gateway cobra e registra a comissão do comprador (E8)', () => {
  beforeEach(async () => {
    _limparRepositoriosEmMemoria()
    _limparRecebimentosEmMemoria()
    consultarPagamentoMercadoPago.mockReset()
    carregarTabelaDeTaxas.mockReset()
    carregarTabelaDeTaxas.mockResolvedValue(TAXAS_DO_PAINEL)
    await mutateState((s) => {
      const limpo = seedState()
      s.users = limpo.users
      s.sellOffers = limpo.sellOffers
      s.buyOrders = limpo.buyOrders
      s.trades = limpo.trades
      s.deposits = limpo.deposits
    })
  })

  it('grava feeComprador e feeVendedor no Trade, e o depósito cobre os dois lados', async () => {
    const lotId = 'LOT-E8-1'
    await prepararLote(lotId, ['RO-E8-01', 'RO-E8-02'])

    const valorCobrado = (PRECO + COMISSAO_COMPRADOR_UNIT) * 2 // 40_620
    await criarIntencao('CMP-e8-1', valorCobrado, lotId, 2, COMISSAO_COMPRADOR_UNIT)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado('CMP-e8-1', valorCobrado))

    const r = await conciliarPagamento('pay-CMP-e8-1')
    expect(r.creditado).toBe(true)
    expect(r.motivo).toBe('compra_direta_concluida')

    const s = await getState()
    const trade = s.trades[s.trades.length - 1]
    expect(trade.feeComprador).toBe(COMISSAO_COMPRADOR_UNIT * 2) // 620
    expect(trade.feeVendedor).toBe(COMISSAO_VENDEDOR_UNIT * 2) // 900
    expect(trade.fee).toBe(COMISSAO_COMPRADOR_UNIT * 2 + COMISSAO_VENDEDOR_UNIT * 2) // 1_520

    // O vendedor recebe o preço menos a comissão dele, por moeda.
    const depositoDaCompra = s.deposits.find((d) => d.valor === valorCobrado)
    expect(depositoDaCompra).toBeDefined()
  })

  it('fecha o livro-razão sem nenhum lançamento de ajuste, com comissão dos dois lados', async () => {
    const lotId = 'LOT-E8-2'
    await prepararLote(lotId, ['RO-E8-03', 'RO-E8-04'])

    const antes = structuredClone(await getState())
    const valorCobrado = (PRECO + COMISSAO_COMPRADOR_UNIT) * 2
    await criarIntencao('CMP-e8-2', valorCobrado, lotId, 2, COMISSAO_COMPRADOR_UNIT)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado('CMP-e8-2', valorCobrado))
    await conciliarPagamento('pay-CMP-e8-2')

    const depois = await getState()
    const derivado = derivarLancamentos({
      antes,
      depois,
      ops: [],
      semeadura: false,
      agora: Date.now(),
      hashAnterior: GENESIS,
    })

    // A prova do RA-24: sem a comissão do comprador no depósito, a conta não fechava e o
    // livro-razão gerava um 'ajuste' a cada compra direta.
    expect(derivado.ajustes).toEqual([])

    const doComprador = derivado.lancamentos.find(
      (l) => l.tipo === 'comissao' && l.userEmail === BUYER_EMAIL,
    )
    const doVendedor = derivado.lancamentos.find(
      (l) => l.tipo === 'comissao' && l.userEmail === SELLER_EMAIL,
    )
    expect(doComprador?.valor).toBe(COMISSAO_COMPRADOR_UNIT * 2) // 620
    expect(doVendedor?.valor).toBe(COMISSAO_VENDEDOR_UNIT * 2) // 900
  })

  it('intenção aberta antes da E8, sem o campo na metadata, liquida com comissão zero', async () => {
    const lotId = 'LOT-E8-3'
    await prepararLote(lotId, ['RO-E8-05'])

    // O gateway cobrou só o preço, como antes da E8.
    await criarIntencao('CMP-e8-3', PRECO, lotId, 1, undefined)
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado('CMP-e8-3', PRECO))

    const r = await conciliarPagamento('pay-CMP-e8-3')
    expect(r.motivo).toBe('compra_direta_concluida')

    const s = await getState()
    const trade = s.trades[s.trades.length - 1]
    expect(trade.feeComprador).toBe(0)
    expect(trade.feeVendedor).toBe(COMISSAO_VENDEDOR_UNIT)
    expect(trade.fee).toBe(COMISSAO_VENDEDOR_UNIT)
  })

  it('preço que sobe depois da cobrança não vira compra: o valor inteiro entra no saldo', async () => {
    const lotId = 'LOT-E8-4'
    await prepararLote(lotId, ['RO-E8-06'])

    const valorCobrado = PRECO + COMISSAO_COMPRADOR_UNIT
    await criarIntencao('CMP-e8-4', valorCobrado, lotId, 1, COMISSAO_COMPRADOR_UNIT)

    // O vendedor sobe o preço entre abrir a cobrança e o pagamento cair.
    await mutateState((s) => {
      for (const o of s.sellOffers) if (o.lotId === lotId) o.price = PRECO * 2
    })

    const saldoAntes = (await getState()).users[BUYER_EMAIL].balance
    consultarPagamentoMercadoPago.mockResolvedValue(aprovado('CMP-e8-4', valorCobrado))

    const r = await conciliarPagamento('pay-CMP-e8-4')
    expect(r.motivo).toBe('valor_pago_nao_cobre_o_anuncio_creditado_em_saldo')

    const s = await getState()
    expect(s.users[BUYER_EMAIL].balance).toBe(saldoAntes + valorCobrado)
    // O anúncio continua à venda.
    expect(s.sellOffers.filter((o) => o.lotId === lotId).length).toBe(1)
  })
})

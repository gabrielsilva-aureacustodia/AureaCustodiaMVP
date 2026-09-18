/**
 * A conciliação reconfere a pendência de custódia na hora do pagamento (E8, RA-53).
 *
 * A E4 barrou a porta de entrada: quem tem fatura de custódia vencida não abre cobrança de venda
 * nem de retirada. Faltava a outra ponta — entre abrir o Pix e o Pix cair podem passar horas, e a
 * fatura pode vencer nesse meio. Sem esta reconferência, o recibo se extinguia mesmo assim, e
 * extinção de recibo é irreversível.
 *
 * A regra do dinheiro é a mesma dos outros casos: o valor pago NÃO se perde e NÃO volta pelo
 * gateway — entra inteiro no saldo da conta (RA-56).
 *
 * Conta da equipe continua liquidando como antes: nada tranca a equipe para fora (E4).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { consultarPagamentoMercadoPago, carregarTabelaDeTaxas, contaBloqueavel } = vi.hoisted(() => ({
  consultarPagamentoMercadoPago: vi.fn(),
  carregarTabelaDeTaxas: vi.fn(),
  contaBloqueavel: vi.fn(),
}))

vi.mock('@/lib/payments', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/payments')>()),
  consultarPagamentoMercadoPago,
}))
vi.mock('@/server/taxas/carregar', () => ({ carregarTabelaDeTaxas }))
vi.mock('@/server/custodia/isencao-da-equipe', () => ({ contaBloqueavel }))

import { TAXAS_PADRAO } from '@/domain/fees'
import { seedState } from '@/domain/seed'
import type { FaturaCustodia, Retirada } from '@/domain/types'
import { getState, mutateState } from '@/server/state'

import { conciliarPagamento } from './conciliacao'
import { _limparRecebimentosEmMemoria } from './recebimentos'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from './repositorios'

const TITULAR = 'gabrielsilva@testeaurea.com.br'
const VENDEDOR = 'alex@testeaurea.com.br'
const COMPRADOR = 'pegge@testeaurea.com.br'

const ENDERECO = {
  nome: 'Gabriel Silva',
  cpfOuCnpj: '529.982.247-25',
  telefone: '(11) 98765-4321',
  logradouro: 'Rua das Moedas',
  numero: '10',
  complemento: '',
  bairro: 'Centro',
  cidade: 'São Paulo',
  uf: 'SP',
  cep: '01001-000',
}

const TAXA_RETIRADA = 5_000
const PRECO = 20_000
const COMISSAO_UNIT = 100

function aprovado(ref: string, valor: number, email: string) {
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
    payerEmail: email,
  }
}

/** Fatura de custódia vencida, fora da tolerância: o que torna a conta pendente. */
function faturaVencida(email: string, agora: number): FaturaCustodia {
  return {
    id: `FAT-VENC-${email}`,
    userEmail: email,
    competencia: '2026-08',
    quantidadeMoedas: 1,
    moedaIds: ['RO-000001'],
    valorCents: 200,
    status: 'atrasada',
    dataEmissao: agora - 60 * 86_400_000,
    dataVencimento: agora - 40 * 86_400_000,
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
  }
}

async function prepararRetirada(id: string, coinId: string): Promise<void> {
  const agora = Date.now()
  await mutateState((s) => {
    const u = s.users[TITULAR]
    if (!u) throw new Error('Titular não encontrado no seed')
    u.coins.push({
      id: coinId,
      tipoMoeda: 'Entrega da Bandeira Olímpica',
      ano: 2016,
      entrada: '01/01/2026',
      statusFisico: 'Armazenado',
      statusDigital: 'Validado',
      valorEstimado: PRECO,
      protocolo: 'RO-ENV-TEST',
      recibo: { codigo: `REC-${coinId}`, dataEmissao: '01/01/2026', hash: 'x', status: 'Ativo' },
    })
    s.retiradas = s.retiradas ?? []
    const ret: Retirada = {
      id,
      coinId,
      reciboCodigo: `REC-${coinId}`,
      userEmail: TITULAR,
      modalidade: 'comum',
      status: 'solicitada',
      valorTaxaCents: TAXA_RETIRADA,
      endereco: ENDERECO,
      solicitadoEm: agora,
      dataLimiteD30: agora + 30 * 86_400_000,
      historico: [],
      updatedAt: agora,
    }
    s.retiradas.push(ret)
  })
}

async function criarIntencaoRetirada(ref: string, retiradaId: string): Promise<void> {
  const agora = Date.now()
  await repositorioIntencoes().criar({
    externalReference: ref,
    userEmail: TITULAR,
    valor: TAXA_RETIRADA,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'retirada',
    metadata: { retiradaId },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })
}

describe('Conciliação reconfere a pendência de custódia (E8, RA-53)', () => {
  beforeEach(async () => {
    _limparRepositoriosEmMemoria()
    _limparRecebimentosEmMemoria()
    consultarPagamentoMercadoPago.mockReset()
    carregarTabelaDeTaxas.mockReset()
    carregarTabelaDeTaxas.mockResolvedValue(TAXAS_PADRAO)
    contaBloqueavel.mockReset()
    contaBloqueavel.mockResolvedValue(true) // conta fora da equipe, por padrão

    await mutateState((s) => {
      const limpo = seedState()
      s.users = limpo.users
      s.sellOffers = limpo.sellOffers
      s.trades = limpo.trades
      s.deposits = limpo.deposits
      s.retiradas = []
      s.faturasCustodia = []
    })
  })

  describe('retirada', () => {
    it('com fatura vencida: o recibo NÃO é extinto e o valor vira saldo', async () => {
      const agora = Date.now()
      await prepararRetirada('RET-e8-1', 'RO-E8-R1')
      await mutateState((s) => {
        s.faturasCustodia = [faturaVencida(TITULAR, agora)]
      })

      const saldoAntes = (await getState()).users[TITULAR].balance
      await criarIntencaoRetirada('RET-ref-1', 'RET-e8-1')
      consultarPagamentoMercadoPago.mockResolvedValue(
        aprovado('RET-ref-1', TAXA_RETIRADA, TITULAR),
      )

      const r = await conciliarPagamento('pay-RET-ref-1')
      expect(r.motivo).toBe('retirada_com_pendencia_creditada_em_saldo')

      const s = await getState()
      expect(s.users[TITULAR].balance).toBe(saldoAntes + TAXA_RETIRADA)

      const coin = s.users[TITULAR].coins.find((c) => c.id === 'RO-E8-R1')
      expect(coin?.recibo.status).toBe('Ativo') // não extinguiu

      const ret = s.retiradas?.find((x) => x.id === 'RET-e8-1')
      expect(ret?.status).toBe('solicitada') // continua esperando pagamento
      expect(ret?.historico.at(-1)?.motivo).toContain('fatura de custódia vencida')
    })

    it('com recibo bloqueado: o recibo NÃO é extinto e o valor vira saldo', async () => {
      await prepararRetirada('RET-e8-2', 'RO-E8-R2')
      await mutateState((s) => {
        const coin = s.users[TITULAR].coins.find((c) => c.id === 'RO-E8-R2')
        if (coin) coin.recibo.status = 'Bloqueado'
      })

      const saldoAntes = (await getState()).users[TITULAR].balance
      await criarIntencaoRetirada('RET-ref-2', 'RET-e8-2')
      consultarPagamentoMercadoPago.mockResolvedValue(
        aprovado('RET-ref-2', TAXA_RETIRADA, TITULAR),
      )

      const r = await conciliarPagamento('pay-RET-ref-2')
      expect(r.motivo).toBe('recibo_bloqueado_creditado_em_saldo')

      const s = await getState()
      expect(s.users[TITULAR].balance).toBe(saldoAntes + TAXA_RETIRADA)
      const coin = s.users[TITULAR].coins.find((c) => c.id === 'RO-E8-R2')
      expect(coin?.recibo.status).toBe('Bloqueado')
    })

    it('conta da equipe com fatura vencida liquida normalmente (E4: nada tranca a equipe)', async () => {
      const agora = Date.now()
      contaBloqueavel.mockResolvedValue(false) // é da equipe
      await prepararRetirada('RET-e8-3', 'RO-E8-R3')
      await mutateState((s) => {
        s.faturasCustodia = [faturaVencida(TITULAR, agora)]
      })

      await criarIntencaoRetirada('RET-ref-3', 'RET-e8-3')
      consultarPagamentoMercadoPago.mockResolvedValue(
        aprovado('RET-ref-3', TAXA_RETIRADA, TITULAR),
      )

      const r = await conciliarPagamento('pay-RET-ref-3')
      expect(r.motivo).toBe('retirada_liquidada')

      const s = await getState()
      const coin = s.users[TITULAR].coins.find((c) => c.id === 'RO-E8-R3')
      expect(coin?.recibo.status).toBe('Extinto')
      expect(s.retiradas?.find((x) => x.id === 'RET-e8-3')?.status).toBe('paga')
    })

    it('checagem de equipe que falha libera a liquidação: o dinheiro já entrou', async () => {
      const agora = Date.now()
      contaBloqueavel.mockRejectedValue(new Error('banco fora do ar'))
      await prepararRetirada('RET-e8-4', 'RO-E8-R4')
      await mutateState((s) => {
        s.faturasCustodia = [faturaVencida(TITULAR, agora)]
      })

      await criarIntencaoRetirada('RET-ref-4', 'RET-e8-4')
      consultarPagamentoMercadoPago.mockResolvedValue(
        aprovado('RET-ref-4', TAXA_RETIRADA, TITULAR),
      )

      const r = await conciliarPagamento('pay-RET-ref-4')
      expect(r.motivo).toBe('retirada_liquidada')
    })
  })

  describe('compra direta', () => {
    it('vendedor com fatura vencida: a moeda não transfere e o valor vira saldo do comprador', async () => {
      const agora = Date.now()
      const lotId = 'LOT-e8-pendencia'
      await mutateState((s) => {
        const seller = s.users[VENDEDOR]
        if (!seller) throw new Error('Seller não encontrado')
        seller.coins.push({
          id: 'RO-E8-C1',
          tipoMoeda: 'Entrega da Bandeira Olímpica',
          ano: 2016,
          entrada: '01/01/2026',
          statusFisico: 'Armazenado',
          statusDigital: 'Validado',
          valorEstimado: PRECO,
          protocolo: 'RO-ENV-TEST',
          recibo: { codigo: 'REC-C1', dataEmissao: '01/01/2026', hash: 'y', status: 'Ativo' },
        })
        s.sellOffers.push({
          id: 'OFFER-E8-C1',
          coinId: 'RO-E8-C1',
          seller: VENDEDOR,
          price: PRECO,
          obs: 'Lote do vendedor pendente',
          lotId,
          createdAt: agora,
          tipoMoeda: 'Entrega da Bandeira Olímpica',
        })
        s.faturasCustodia = [faturaVencida(VENDEDOR, agora)]
      })

      const valorCobrado = PRECO + COMISSAO_UNIT
      await repositorioIntencoes().criar({
        externalReference: 'CMP-e8-pendencia',
        userEmail: COMPRADOR,
        valor: valorCobrado,
        metodo: 'pix',
        status: 'pendente',
        tipoOperacao: 'compra_direta',
        metadata: {
          lotId,
          qty: 1,
          tipoMoeda: 'Entrega da Bandeira Olímpica',
          sellerEmail: VENDEDOR,
          unitPrice: PRECO,
          comissaoCompradorPorMoeda: COMISSAO_UNIT,
        },
        paymentId: null,
        motivoRecusa: null,
        createdAt: agora,
        updatedAt: agora,
      })

      const saldoAntes = (await getState()).users[COMPRADOR].balance
      consultarPagamentoMercadoPago.mockResolvedValue(
        aprovado('CMP-e8-pendencia', valorCobrado, COMPRADOR),
      )

      const r = await conciliarPagamento('pay-CMP-e8-pendencia')
      expect(r.motivo).toBe('vendedor_com_pendencia_creditado_em_saldo')

      const s = await getState()
      expect(s.users[COMPRADOR].balance).toBe(saldoAntes + valorCobrado)
      // A moeda continua com o vendedor e o anúncio continua gravado (RA-52).
      expect(s.users[VENDEDOR].coins.some((c) => c.id === 'RO-E8-C1')).toBe(true)
      expect(s.sellOffers.filter((o) => o.lotId === lotId).length).toBe(1)
    })
  })
})

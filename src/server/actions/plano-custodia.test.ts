import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

const { consultarPagamentoMercadoPago } = vi.hoisted(() => ({
  consultarPagamentoMercadoPago: vi.fn(),
}))
vi.mock('@/lib/payments', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/payments')>()
  return { ...original, consultarPagamentoMercadoPago }
})

import {
  contratarPlanoCustodia,
  iniciarCartaoFatura,
  iniciarPixFatura,
  listarMeusPlanos,
  listarMinhasFaturas,
  pagarFaturaComSaldo,
} from './plano-custodia'
import { calcularPagoAte } from '@/domain/plano-custodia'
import { conciliarPagamento } from '@/server/payments/conciliacao'
import { _limparRecebimentosEmMemoria } from '@/server/payments/recebimentos'
import { _limparRepositoriosEmMemoria } from '@/server/payments/repositorios'
import { getState, mutateState } from '@/server/state'

const EMAIL_TESTE = 'gabrielsilva@testeaurea.com.br'
const PROTOCOLO = 'RO-ENV-0001'

describe('Server Actions de Planos de Custódia (B2.4)', () => {
  beforeEach(async () => {
    _limparRepositoriosEmMemoria()
    _limparRecebimentosEmMemoria()
    getSessionEmail.mockReset()
    getSessionEmail.mockResolvedValue(EMAIL_TESTE)

    // Garante que o usuário existe e tem um envio com moedas no estado em memória
    await mutateState((s) => {
      if (!s.users[EMAIL_TESTE]) {
        s.users[EMAIL_TESTE] = { name: 'Gabriel Silva', balance: 50000, coins: [] }
      } else {
        s.users[EMAIL_TESTE].balance = 50000
      }

      s.planosCustodia = []
      s.faturasCustodia = []
      s.envios = [
        {
          protocolo: PROTOCOLO,
          userEmail: EMAIL_TESTE,
          tipoMoeda: 'Entrega da Bandeira Olímpica',
          ano: 2016,
          quantidade: 2,
          codigoRastreio: null,
          dataPostagem: null,
          dataRecebimento: null,
          etapaAtual: 'Protocolo gerado',
          createdAt: Date.now(),
          codigosAtivosGerados: [],
          modalidadeEnvio: 'SEDEX',
        },
      ]
    })
  })

  it('rejeita contratação sem sessão autenticada', async () => {
    getSessionEmail.mockResolvedValue(null)
    const res = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Sessão expirada.')
  })

  it('recusa modalidade que não existe mais: o plano mensal saiu em 18/09/2026', async () => {
    // A tela só oferece anual e 24 meses; uma aba velha ainda mandaria 'mensal'.
    const res = await contratarPlanoCustodia(PROTOCOLO, 'mensal' as never)
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Modalidade de plano inválida.')
  })

  it('contrata plano anual: cria plano aguardando_pagamento e fatura de contratação', async () => {
    const res = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    expect(res.ok).toBe(true)
    expect(res.data?.planoId).toMatch(/^PLC-/)
    expect(res.data?.faturaId).toMatch(/^FAT-/)

    const s = await getState()
    const plano = (s.planosCustodia || []).find((p) => p.id === res.data?.planoId)
    expect(plano).toBeDefined()
    expect(plano?.status).toBe('aguardando_pagamento')
    expect(plano?.modalidade).toBe('anual')
    expect(plano?.quantidadeContratada).toBe(2)
    expect(plano?.valorPorMoedaCents).toBe(2400)
    expect(plano?.valorTotalCents).toBe(4800) // 2 moedas * R$ 24,00
    expect(plano?.parcelasMax).toBe(12)
    expect(plano?.pagoAteCompetencia).toBeNull()

    const fatura = (s.faturasCustodia || []).find((f) => f.id === res.data?.faturaId)
    expect(fatura).toBeDefined()
    expect(fatura?.origem).toBe('contratacao')
    expect(fatura?.planoId).toBe(plano?.id)
    expect(fatura?.valorCents).toBe(4800)
    expect(fatura?.status).toBe('pendente')
  })

  it('contrata plano anual com 12 parcelas e valor de R$ 24,00 por moeda', async () => {
    const res = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    expect(res.ok).toBe(true)

    const s = await getState()
    const plano = (s.planosCustodia || []).find((p) => p.id === res.data?.planoId)
    expect(plano?.modalidade).toBe('anual')
    expect(plano?.valorPorMoedaCents).toBe(2400)
    expect(plano?.valorTotalCents).toBe(4800) // 2 moedas * R$ 24,00 = R$ 48,00
    expect(plano?.parcelasMax).toBe(12)
  })

  // Com um prazo só, não há modalidade para trocar. O que este caso protege
  // continua valendo: contratar duas vezes o mesmo protocolo antes de pagar
  // recalcula o plano e a fatura que já existem, em vez de criar um segundo par.
  it('contratar de novo antes de pagar recalcula a fatura e o plano existentes', async () => {
    const res1 = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    expect(res1.ok).toBe(true)

    // Troca para anual
    const res2 = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    expect(res2.ok).toBe(true)
    expect(res2.data?.planoId).toBe(res1.data?.planoId)

    const s = await getState()
    const plano = (s.planosCustodia || []).find((p) => p.id === res1.data?.planoId)
    expect(plano?.modalidade).toBe('anual')
    expect(plano?.valorTotalCents).toBe(4800)

    const fatura = (s.faturasCustodia || []).find((f) => f.planoId === plano?.id)
    expect(fatura?.valorCents).toBe(4800)
  })

  it('paga fatura com saldo: debita saldo, marca paga e torna o plano vigente', async () => {
    const contr = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    const faturaId = contr.data!.faturaId

    const sAntes = await getState()
    const saldoAntes = sAntes.users[EMAIL_TESTE].balance

    const res = await pagarFaturaComSaldo(faturaId)
    expect(res.ok).toBe(true)

    const sDepois = await getState()
    expect(sDepois.users[EMAIL_TESTE].balance).toBe(saldoAntes - 4800)

    const fatura = (sDepois.faturasCustodia || []).find((f) => f.id === faturaId)
    expect(fatura?.status).toBe('paga')
    expect(fatura?.formaPagamento).toBe('saldo')

    const plano = (sDepois.planosCustodia || []).find((p) => p.id === contr.data!.planoId)
    expect(plano?.status).toBe('vigente')
    expect(plano?.pagoAteCompetencia).toBe(calcularPagoAte(plano!.inicioCompetencia, 'anual'))
  })

  it('recusa pagamento com saldo se saldo for insuficiente', async () => {
    await mutateState((s) => {
      s.users[EMAIL_TESTE].balance = 100 // Apenas R$ 1,00
    })

    const contr = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    const res = await pagarFaturaComSaldo(contr.data!.faturaId)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/Saldo insuficiente/)
  })

  it('inicia pagamento Pix e Checkout Pro retornando cobrança', async () => {
    const contr = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    const faturaId = contr.data!.faturaId

    const resPix = await iniciarPixFatura(faturaId)
    expect(resPix.ok).toBe(true)
    expect(resPix.data?.forma).toBe('pix')
    expect(resPix.data?.valorCents).toBe(4800)

    const resCartao = await iniciarCartaoFatura(faturaId)
    expect(resCartao.ok).toBe(true)
    expect(resCartao.data?.forma).toBe('cartao')
    expect(resCartao.data?.valorCents).toBe(4800)
    expect(resCartao.data?.parcelasMax).toBe(12)
  })

  it('conciliação de fatura_custodia pelo gateway liquida a fatura e ativa o plano', async () => {
    const contr = await contratarPlanoCustodia(PROTOCOLO, 'anual')
    const faturaId = contr.data!.faturaId

    const resPix = await iniciarPixFatura(faturaId)
    const ref = resPix.data!.externalReference

    const agora = Date.now()
    consultarPagamentoMercadoPago.mockResolvedValueOnce({
      id: 'pay-fatura-1',
      status: 'approved',
      valorCents: 4800,
      valorLiquidoCents: 4600,
      tarifaCents: 200,
      totalPagoCents: 4800,
      parcelas: 1,
      valorParcelaCents: 4800,
      dataLiberacao: agora,
      externalReference: ref,
      paymentMethodId: 'pix',
      paymentTypeId: 'bank_transfer',
      dateApproved: agora,
      dateCreated: agora,
      payerEmail: EMAIL_TESTE,
    })

    const conc = await conciliarPagamento('pay-fatura-1')
    expect(conc.creditado).toBe(true)

    const s = await getState()
    const fatura = (s.faturasCustodia || []).find((f) => f.id === faturaId)
    expect(fatura?.status).toBe('paga')
    expect(fatura?.formaPagamento).toBe('pix')

    const plano = (s.planosCustodia || []).find((p) => p.id === contr.data!.planoId)
    expect(plano?.status).toBe('vigente')
    expect(plano?.formaPagamento).toBe('pix')
  })

  it('listarMinhasFaturas e listarMeusPlanos devolvem apenas dados do usuário logado', async () => {
    await contratarPlanoCustodia(PROTOCOLO, 'anual')

    const resFaturas = await listarMinhasFaturas()
    expect(resFaturas.ok).toBe(true)
    expect(resFaturas.data).toHaveLength(1)

    const resPlanos = await listarMeusPlanos()
    expect(resPlanos.ok).toBe(true)
    expect(resPlanos.data).toHaveLength(1)
  })
})

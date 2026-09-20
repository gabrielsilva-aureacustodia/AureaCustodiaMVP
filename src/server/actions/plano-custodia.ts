'use server'

/**
 * Server Actions para contratação e pagamento de planos de custódia e faturas (B2.4).
 *
 * Ações:
 * - `contratarPlanoCustodia(protocolo, modalidade)`: cria o plano aguardando_pagamento e a fatura de origem contratacao.
 * - `pagarFatura(faturaId, forma)`: liquida com saldo ou gera cobrança Pix/cartão.
 * - `listarMinhasFaturas()`: lista as faturas do usuário logado.
 * - `listarMeusPlanos()`: lista os planos do usuário logado.
 */

import { randomUUID } from 'node:crypto'

import { nextPlanoCode } from '@/domain/codes'
import {
  calcularVencimentoFatura,
  competenciaAtual,
  DIAS_TOLERANCIA_FATURA,
} from '@/domain/custody'
import { brl } from '@/domain/money'
import {
  calcularPagoAte,
  mesesCobertos,
  somarMeses,
  valorDoPlano,
} from '@/domain/plano-custodia'
import type {
  ActionResult,
  FaturaCustodia,
  FormaPagamentoFatura,
  ModalidadePlanoCustodia,
  PlanoCustodia,
} from '@/domain/types'
import {
  criarCobrancaCartao,
  criarCobrancaPix,
  type CobrancaCartao,
  type CobrancaPix,
} from '@/lib/payments'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { repositorioIntencoes } from '@/server/payments/repositorios'
import { getSessionEmail } from '@/server/session'
import { getState, mutateState } from '@/server/state'

const SESSAO_EXPIRADA = 'Sessão expirada.'

export type RespostaPagarFatura =
  | { forma: 'saldo'; status: 'pago'; fatura: FaturaCustodia }
  | (CobrancaPix & { forma: 'pix' })
  | (CobrancaCartao & { forma: 'cartao' })

/**
 * Contrata um plano de custódia (anual ou de 24 meses) associado a um envio.
 * Cria o plano com status 'aguardando_pagamento' e a fatura correspondente de origem 'contratacao'.
 */
export async function contratarPlanoCustodia(
  protocolo: string,
  modalidade: ModalidadePlanoCustodia,
): Promise<ActionResult<{ faturaId: string; planoId: string }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  // O plano mensal foi aposentado em 18/09/2026; a tela manda só estes dois, e uma
  // chamada com 'mensal' vinda de aba velha ou de cliente antigo para aqui.
  if (modalidade !== 'anual' && modalidade !== 'bienal') {
    return { ok: false, error: 'Modalidade de plano inválida.' }
  }

  // O preço por moeda vem da Tabela de Taxas vigente (C3) e fica congelado no plano.
  const { taxas } = await carregarRegrasDoMercado()

  try {
    const { result } = await mutateState((s) => {
      const u = s.users[session]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      const envio = s.envios.find((e) => e.protocolo === protocolo && e.userEmail === session)
      if (!envio) return { ok: false, error: 'Envio não encontrado.' }

      const quantidade = Math.max(1, envio.quantidade || 1)
      const agora = Date.now()

      s.planosCustodia = s.planosCustodia ?? []
      s.faturasCustodia = s.faturasCustodia ?? []

      // Se já existe plano para este envio não cancelado:
      const planoExistente = s.planosCustodia.find(
        (p) => p.protocoloEnvio === protocolo && p.status !== 'cancelado',
      )

      if (planoExistente) {
        if (planoExistente.status === 'aguardando_pagamento' && planoExistente.modalidade !== modalidade) {
          // O cliente trocou a modalidade antes de pagar: recalcula valores
          const { porMoeda, total, parcelasMax } = valorDoPlano(modalidade, quantidade, { ...taxas })
          planoExistente.modalidade = modalidade
          planoExistente.valorPorMoedaCents = porMoeda
          planoExistente.valorTotalCents = total
          planoExistente.parcelasMax = parcelasMax
          planoExistente.atualizadoEm = agora

          const fatura = s.faturasCustodia.find(
            (f) => f.planoId === planoExistente.id && f.status === 'pendente',
          )
          if (fatura) {
            fatura.valorCents = total
          }
        }

        const fatura = s.faturasCustodia.find((f) => f.planoId === planoExistente.id)
        return {
          ok: true,
          data: {
            faturaId: fatura?.id || '',
            planoId: planoExistente.id,
          },
        }
      }

      // Cria novo plano
      const planoId = nextPlanoCode(s.seq)
      const { porMoeda, total, parcelasMax } = valorDoPlano(modalidade, quantidade, { ...taxas })
      const inicioCompetencia = competenciaAtual(agora)

      const novoPlano: PlanoCustodia = {
        id: planoId,
        userEmail: session,
        protocoloEnvio: protocolo,
        modalidade,
        quantidadeContratada: quantidade,
        moedaIds: [],
        valorPorMoedaCents: porMoeda,
        valorTotalCents: total,
        parcelasMax,
        inicioCompetencia,
        pagoAteCompetencia: null,
        status: 'aguardando_pagamento',
        formaPagamento: null,
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: agora,
        atualizadoEm: agora,
      }

      const sanitizeEmail = session.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
      const faturaId = `FAT-${inicioCompetencia}-${sanitizeEmail}-${agora}`

      const novaFatura: FaturaCustodia = {
        id: faturaId,
        userEmail: session,
        competencia: inicioCompetencia,
        quantidadeMoedas: quantidade,
        moedaIds: [],
        valorCents: total,
        status: 'pendente',
        dataEmissao: agora,
        dataVencimento: calcularVencimentoFatura(agora, DIAS_TOLERANCIA_FATURA),
        dataPagamento: null,
        formaPagamento: null,
        paymentIntentId: null,
        planoId,
        origem: 'contratacao',
      }

      s.planosCustodia.push(novoPlano)
      s.faturasCustodia.push(novaFatura)

      return {
        ok: true,
        data: {
          faturaId,
          planoId,
        },
      }
    })

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao contratar plano de custódia.'
    return { ok: false, error: msg }
  }
}

/**
 * Paga uma fatura de custódia usando Saldo em conta, Pix ou Cartão de Crédito.
 */
export async function pagarFatura(
  faturaId: string,
  forma: FormaPagamentoFatura,
): Promise<ActionResult<RespostaPagarFatura>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  if (forma !== 'saldo' && forma !== 'pix' && forma !== 'cartao') {
    return { ok: false, error: 'Forma de pagamento desconhecida.' }
  }

  if (forma === 'saldo') {
    return pagarFaturaComSaldo(faturaId)
  }

  if (forma === 'pix') {
    return iniciarPixFatura(faturaId)
  }

  return iniciarCartaoFatura(faturaId)
}

/**
 * Quita a fatura debitando o valor do saldo em conta.
 */
export async function pagarFaturaComSaldo(
  faturaId: string,
): Promise<ActionResult<{ forma: 'saldo'; status: 'pago'; fatura: FaturaCustodia }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState((s) => {
      const u = s.users[session]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      s.faturasCustodia = s.faturasCustodia ?? []
      const fatura = s.faturasCustodia.find((f) => f.id === faturaId)
      if (!fatura) return { ok: false, error: 'Fatura não encontrada.' }
      if (fatura.userEmail !== session) return { ok: false, error: 'Esta fatura pertence a outro usuário.' }
      if (fatura.status === 'paga') return { ok: false, error: 'Esta fatura já foi paga.' }
      if (fatura.status === 'cancelada') return { ok: false, error: 'Esta fatura foi cancelada.' }

      if (u.balance < fatura.valorCents) {
        return {
          ok: false,
          error: `Saldo insuficiente para quitar a fatura (saldo: ${brl(u.balance)}, fatura: ${brl(fatura.valorCents)}).`,
        }
      }

      const agora = Date.now()
      u.balance -= fatura.valorCents
      fatura.status = 'paga'
      fatura.dataPagamento = agora
      fatura.formaPagamento = 'saldo'

      // Se a fatura é de contratação, ativa o plano
      if (fatura.origem === 'contratacao' && fatura.planoId) {
        s.planosCustodia = s.planosCustodia ?? []
        const plano = s.planosCustodia.find((p) => p.id === fatura.planoId)
        if (plano) {
          plano.status = 'vigente'
          plano.pagoAteCompetencia = calcularPagoAte(plano.inicioCompetencia, plano.modalidade)
          plano.formaPagamento = 'saldo'
          plano.atualizadoEm = agora
        }
      } else if (fatura.origem === 'renovacao_anual' && fatura.planoId) {
        s.planosCustodia = s.planosCustodia ?? []
        const plano = s.planosCustodia.find((p) => p.id === fatura.planoId)
        if (plano) {
          // A renovação estende pelo prazo do próprio plano: 12 meses no anual, 24 no de 24 meses.
          plano.pagoAteCompetencia = somarMeses(plano.pagoAteCompetencia ?? plano.inicioCompetencia, mesesCobertos(plano.modalidade))
          plano.formaPagamento = 'saldo'
          plano.atualizadoEm = agora
        }
      }

      // Não grava user.inadimplente: essa coluna é a marca manual do painel (marcarInadimplencia).
      // A inadimplência por fatura é calculada por quem lê (E8).
      return {
        ok: true,
        data: {
          forma: 'saldo' as const,
          status: 'pago' as const,
          fatura,
        },
      }
    })

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao processar pagamento com saldo.'
    return { ok: false, error: msg }
  }
}

/**
 * Inicia cobrança Pix no gateway para pagamento da fatura.
 */
export async function iniciarPixFatura(
  faturaId: string,
): Promise<ActionResult<CobrancaPix & { forma: 'pix' }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const state = await getState()
  const fatura = (state.faturasCustodia || []).find(
    (f) => f.id === faturaId && f.userEmail === session,
  )
  if (!fatura) return { ok: false, error: 'Fatura não encontrada.' }
  if (fatura.status === 'paga') return { ok: false, error: 'Esta fatura já foi paga.' }
  if (fatura.status === 'cancelada') return { ok: false, error: 'Esta fatura foi cancelada.' }

  const externalReference = `FAT-${randomUUID()}`
  const agora = Date.now()
  const intencoes = repositorioIntencoes()

  await intencoes.criar({
    externalReference,
    userEmail: session,
    valor: fatura.valorCents,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'fatura_custodia',
    metadata: { faturaId },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  try {
    const pix = await criarCobrancaPix({
      externalReference,
      userEmail: session,
      valorCents: fatura.valorCents,
      titulo: `Fatura de Custódia — Real Olímpico (${fatura.competencia})`,
      descricao: `Custódia ${fatura.quantidadeMoedas} moeda(s) - ${fatura.competencia}`,
      parcelasMax: 1,
    })

    await intencoes.anotarPagamento(externalReference, pix.paymentId)
    return { ok: true, data: { ...pix, forma: 'pix' } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao gerar Pix para fatura.'
    return { ok: false, error: msg }
  }
}

/**
 * Inicia preferência de Checkout Pro no gateway para pagamento da fatura por cartão.
 */
export async function iniciarCartaoFatura(
  faturaId: string,
): Promise<ActionResult<CobrancaCartao & { forma: 'cartao' }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const state = await getState()
  const fatura = (state.faturasCustodia || []).find(
    (f) => f.id === faturaId && f.userEmail === session,
  )
  if (!fatura) return { ok: false, error: 'Fatura não encontrada.' }
  if (fatura.status === 'paga') return { ok: false, error: 'Esta fatura já foi paga.' }
  if (fatura.status === 'cancelada') return { ok: false, error: 'Esta fatura foi cancelada.' }

  const plano = fatura.planoId
    ? (state.planosCustodia || []).find((p) => p.id === fatura.planoId)
    : undefined
  // Fatura de plano parcela no cartão pelo que o próprio plano congelou na contratação.
  // Fatura do ciclo mensal, não: são R$ 2,00 por moeda, não há o que parcelar.
  const deplano = plano !== undefined || fatura.origem === 'renovacao_anual'
  const parcelasMax = deplano ? (plano?.parcelasMax || 12) : 1

  const externalReference = `FAT-${randomUUID()}`
  const agora = Date.now()
  const intencoes = repositorioIntencoes()

  await intencoes.criar({
    externalReference,
    userEmail: session,
    valor: fatura.valorCents,
    metodo: 'checkout_pro',
    status: 'pendente',
    tipoOperacao: 'fatura_custodia',
    parcelasMax,
    metadata: { faturaId },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  try {
    const cartao = await criarCobrancaCartao({
      externalReference,
      userEmail: session,
      valorCents: fatura.valorCents,
      titulo: `Fatura de Custódia — Real Olímpico (${fatura.competencia})`,
      descricao: `Custódia ${fatura.quantidadeMoedas} moeda(s) - ${fatura.competencia}`,
      parcelasMax,
      voltarPara: {
        sucesso: '/conta/faturas',
        pendente: '/conta/faturas',
        falha: '/conta/faturas',
      },
    })

    return { ok: true, data: { ...cartao, forma: 'cartao' } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao gerar cobrança de cartão para fatura.'
    return { ok: false, error: msg }
  }
}

/**
 * Lista todas as faturas de custódia do usuário autenticado.
 */
export async function listarMinhasFaturas(): Promise<ActionResult<FaturaCustodia[]>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const state = await getState()
  const faturas = (state.faturasCustodia || [])
    .filter((f) => f.userEmail === session)
    .sort((a, b) => b.dataEmissao - a.dataEmissao)

  return { ok: true, data: faturas }
}

/**
 * Lista todos os planos de custódia do usuário autenticado.
 */
export async function listarMeusPlanos(): Promise<ActionResult<PlanoCustodia[]>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const state = await getState()
  const planos = (state.planosCustodia || [])
    .filter((p) => p.userEmail === session)
    .sort((a, b) => b.criadoEm - a.criadoEm)

  return { ok: true, data: planos }
}

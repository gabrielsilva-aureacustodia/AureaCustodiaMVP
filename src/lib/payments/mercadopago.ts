import 'server-only'

/**
 * Cliente de integração com a API do Mercado Pago.
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Executa exclusivamente no servidor (`import 'server-only'`).
 *  - Tokens e chaves sempre vêm de variáveis de ambiente.
 *  - Dinheiro é convertido de `Cents` (inteiro) para decimal apenas no envio à API,
 *    e de decimal para `Cents` no retorno com `Math.round(val * 100)`.
 *  - Sem credenciais configuradas, opera em modo simulador (sandbox determinístico)
 *    para não quebrar testes nem ambiente de desenvolvimento local.
 *  - RA-01: Por padrão opera em sandbox; `MP_SANDBOX="false"` liga produção. O RA-01 foi encerrado
 *    em 11/09/2026 (os sócios decidiram permitir) — não há parecer a esperar.
 */

import { brl } from '@/domain/money'
import { criarCobrancaCartao, criarCobrancaPix } from './cobranca'
import type {
  CriarPixDepositoInput,
  CriarPreferenciaDepositoInput,
  DetalhesPagamento,
  PixDepositoResult,
  PreferenciaDepositoResult,
  StatusPagamentoGateway,
} from './types'

const MP_API_BASE = 'https://api.mercadopago.com'

/**
 * Obtém o token configurado conforme o ambiente (decisão B1.0, 13/09/2026).
 *
 * Em sandbox (`MP_SANDBOX !== 'false'`), prioriza o token de teste e aceita o de produção como fallback.
 * Em produção (`MP_SANDBOX === 'false'`), aceita EXCLUSIVAMENTE o token de produção (`MP_ACCESS_TOKEN`).
 * Sem token no ambiente, devolve null e o sistema opera no modo simulador com `simulado: true`.
 */
export function getMercadoPagoAccessToken(): string | null {
  return isMercadoPagoSandbox()
    ? process.env.MP_ACCESS_TOKEN_TEST || process.env.MP_ACCESS_TOKEN || null
    : process.env.MP_ACCESS_TOKEN || null
}

/** Verifica se está operando em modo sandbox. */
/**
 * Sandbox é o PADRÃO, não uma trava: `MP_SANDBOX="false"` liga produção.
 *
 * Até 11/09/2026 isso era decorativo — `payments.ts` escolhia a URL de sandbox
 * sempre, ignorando a variável, por causa do RA-01. O RA-01 foi encerrado por
 * decisão do Gabriel em 11/09/2026 e a variável voltou a mandar de verdade.
 */
export function isMercadoPagoSandbox(): boolean {
  // Padrão seguro: a menos que explicitamente configurado como 'false', assume sandbox
  return process.env.MP_SANDBOX !== 'false'
}

/**
 * Cria uma preferência de pagamento no Mercado Pago (Checkout Pro).
 *
 * Reutiliza criarCobrancaCartao (B1.1) mantendo a assinatura e retrocompatibilidade.
 */
export async function criarPreferenciaDeposito(
  input: CriarPreferenciaDepositoInput,
): Promise<PreferenciaDepositoResult> {
  if (!Number.isInteger(input.valorCents) || input.valorCents <= 0) {
    throw new Error('Valor de depósito inválido.')
  }

  const backUrls = input.backUrls
    ? {
        sucesso: input.backUrls.success,
        pendente: input.backUrls.pending,
        falha: input.backUrls.failure,
      }
    : undefined

  return criarCobrancaCartao({
    externalReference: input.externalReference,
    userEmail: input.userEmail,
    valorCents: input.valorCents,
    titulo: input.descricao || `Depósito de saldo — Real Olímpico (${brl(input.valorCents)})`,
    descricao: input.descricao || 'Aporte de recursos na plataforma Real Olímpico',
    parcelasMax: 1,
    voltarPara: backUrls,
  })
}

/**
 * Cria uma cobrança Pix direta via API do Mercado Pago.
 *
 * Reutiliza criarCobrancaPix (B1.1) mantendo a assinatura e retrocompatibilidade.
 */
export async function criarPixDeposito(
  input: CriarPixDepositoInput,
): Promise<PixDepositoResult> {
  if (!Number.isInteger(input.valorCents) || input.valorCents <= 0) {
    throw new Error('Valor de depósito inválido.')
  }

  return criarCobrancaPix({
    externalReference: input.externalReference,
    userEmail: input.userEmail,
    valorCents: input.valorCents,
    titulo: `Depósito de saldo Real Olímpico - ${input.externalReference}`,
    descricao: input.descricao || `Depósito de saldo Real Olímpico - ${input.externalReference}`,
    parcelasMax: 1,
  })
}

/**
 * Consulta os detalhes de um pagamento no Mercado Pago pelo ID da transação.
 * Lê o que o financeiro precisa: bruto, tarifa, líquido, parcelas e data de liberação (B1.2).
 */
export async function consultarPagamentoMercadoPago(
  paymentId: string,
): Promise<DetalhesPagamento> {
  const token = getMercadoPagoAccessToken()

  if (!token) {
    // Simulação determinística para pagamentos mock (B1.2: tarifa zero e líquido = bruto)
    const valor = 10000
    const agora = Date.now()
    return {
      id: paymentId,
      status: 'approved',
      valorCents: valor,
      valorLiquidoCents: valor,
      tarifaCents: 0,
      totalPagoCents: valor,
      parcelas: 1,
      valorParcelaCents: valor,
      dataLiberacao: agora,
      externalReference: `DEP-${paymentId}`,
      paymentMethodId: 'pix',
      paymentTypeId: 'bank_transfer',
      dateApproved: agora,
      dateCreated: agora - 60000,
      payerEmail: 'simulado@testeaurea.com.br',
    }
  }

  const res = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Erro ao consultar pagamento no Mercado Pago: ${res.status} ${errBody}`)
  }

  const data = (await res.json()) as {
    id: number | string
    status: StatusPagamentoGateway
    status_detail?: string
    transaction_amount: number
    external_reference?: string
    payment_method_id?: string
    payment_type_id?: string
    date_approved?: string | null
    date_created?: string
    money_release_date?: string | null
    installments?: number
    transaction_details?: {
      net_received_amount?: number
      total_paid_amount?: number
      installment_amount?: number
    }
    payer?: {
      email?: string
    }
  }

  const valorCents = Math.round(data.transaction_amount * 100)
  const valorLiquidoCents =
    data.transaction_details?.net_received_amount != null
      ? Math.round(data.transaction_details.net_received_amount * 100)
      : valorCents
  // Regra F-5 / B1.2: tarifa = transaction_amount - net_received_amount
  const tarifaCents = Math.max(0, valorCents - valorLiquidoCents)
  const totalPagoCents =
    data.transaction_details?.total_paid_amount != null
      ? Math.round(data.transaction_details.total_paid_amount * 100)
      : valorCents
  const parcelas = data.installments && data.installments > 0 ? data.installments : 1
  const valorParcelaCents =
    data.transaction_details?.installment_amount != null
      ? Math.round(data.transaction_details.installment_amount * 100)
      : Math.round(valorCents / parcelas)
  const dataLiberacao = data.money_release_date
    ? new Date(data.money_release_date).getTime()
    : null

  return {
    id: String(data.id),
    status: data.status,
    statusDetail: data.status_detail,
    valorCents,
    valorLiquidoCents,
    tarifaCents,
    totalPagoCents,
    parcelas,
    valorParcelaCents,
    dataLiberacao,
    externalReference: data.external_reference || '',
    paymentMethodId: data.payment_method_id || '',
    paymentTypeId: data.payment_type_id || '',
    dateApproved: data.date_approved ? new Date(data.date_approved).getTime() : null,
    dateCreated: data.date_created ? new Date(data.date_created).getTime() : Date.now(),
    payerEmail: data.payer?.email || '',
    raw: data,
  }
}

export interface AtivarDebitoAutomaticoInput {
  planoId: string
  userEmail: string
  valorCents: number
  descricao?: string
  backUrl?: string
}

export interface DebitoAutomaticoResult {
  id: string
  initPoint: string
  status: string
  simulado?: boolean
}

/**
 * Ativa assinatura recorrente mensal via endpoint POST /preapproval do Mercado Pago (B2.8).
 * Opera em modo simulado caso não haja token do gateway configurado.
 *
 * Nenhum plano usa isto hoje: desde 18/09/2026 os planos são o anual e o de 24 meses,
 * cobrados de uma vez (à vista ou parcelados em até 12x), e quem não tem plano cai no
 * ciclo mensal, que é fatura e não assinatura. A função fica de pé para a cobrança
 * recorrente do ciclo, se um dia for ligada.
 */
export async function ativarDebitoAutomatico(
  input: AtivarDebitoAutomaticoInput,
): Promise<DebitoAutomaticoResult> {
  const token = getMercadoPagoAccessToken()
  const externalReference = `ASS-${input.planoId}`

  if (!token) {
    return {
      id: `preapp-mock-${input.planoId}`,
      initPoint: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=mock-${input.planoId}`,
      status: 'pending',
      simulado: true,
    }
  }

  const payload = {
    payer_email: input.userEmail,
    // Era 'https://aureacustodia.com.br/conta/faturas' fixo no código — um domínio
    // que nunca foi publicado. Agora sai do mesmo NEXT_PUBLIC_APP_URL que o Checkout
    // Pro usa, para que a troca de domínio seja só uma variável de ambiente.
    back_url: input.backUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/conta/faturas`,
    reason: input.descricao || `Custódia mensal — Real Olímpico (${input.planoId})`,
    external_reference: externalReference,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: input.valorCents / 100,
      currency_id: 'BRL',
    },
  }

  const res = await fetch(`${MP_API_BASE}/preapproval`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Erro ao ativar débito automático no Mercado Pago: ${res.status} ${errBody}`)
  }

  const data = (await res.json()) as { id: string; init_point: string; status: string }
  return {
    id: data.id,
    initPoint: data.init_point,
    status: data.status,
  }
}


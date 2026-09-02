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
 *  - RA-01: Por padrão opera em sandbox. Produção só com parecer jurídico formal.
 */

import { brl } from '@/domain/money'
import type {
  CriarPixDepositoInput,
  CriarPreferenciaDepositoInput,
  DetalhesPagamento,
  PixDepositoResult,
  PreferenciaDepositoResult,
  StatusPagamentoGateway,
} from './types'

const MP_API_BASE = 'https://api.mercadopago.com'

/** Obtém o token configurado (sandbox por padrão). */
export function getMercadoPagoAccessToken(): string | null {
  return (
    process.env.MP_ACCESS_TOKEN_TEST ||
    process.env.MP_ACCESS_TOKEN ||
    null
  )
}

/** Verifica se está operando em modo sandbox. */
export function isMercadoPagoSandbox(): boolean {
  // Padrão seguro: a menos que explicitamente configurado como 'false', assume sandbox
  return process.env.MP_SANDBOX !== 'false'
}

/**
 * Cria uma preferência de pagamento no Mercado Pago (Checkout Pro).
 *
 * Utilizado para depósitos onde o usuário escolhe a forma de pagamento
 * em página segura hospedada pelo Mercado Pago.
 */
export async function criarPreferenciaDeposito(
  input: CriarPreferenciaDepositoInput,
): Promise<PreferenciaDepositoResult> {
  const { userEmail, valorCents, externalReference, descricao, backUrls } = input

  if (!Number.isInteger(valorCents) || valorCents <= 0) {
    throw new Error('Valor de depósito inválido.')
  }

  const token = getMercadoPagoAccessToken()

  // Se não houver token configurado no ambiente, opera em modo simulador
  if (!token) {
    const simId = `SIM-PREF-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    return {
      id: simId,
      initPoint: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${simId}`,
      sandboxInitPoint: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${simId}`,
      externalReference,
      valorCents,
      createdAt: Date.now(),
    }
  }

  const unitPrice = valorCents / 100
  const title = descricao || `Depósito de saldo — Áurea Custódia (${brl(valorCents)})`

  const payload = {
    items: [
      {
        id: externalReference,
        title,
        description: 'Aporte de recursos na plataforma Áurea Custódia',
        quantity: 1,
        unit_price: unitPrice,
        currency_id: 'BRL',
      },
    ],
    payer: {
      email: userEmail,
    },
    external_reference: externalReference,
    statement_descriptor: 'AUREA CUSTODIA',
    payment_methods: {
      excluded_payment_types: [],
      installments: 1,
    },
    back_urls: backUrls || {
      success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/conta?status=success`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/conta?status=pending`,
      failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/conta?status=failure`,
    },
    auto_return: 'approved',
  }

  const res = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Erro ao criar preferência no Mercado Pago: ${res.status} ${errBody}`)
  }

  const data = (await res.json()) as {
    id: string
    init_point: string
    sandbox_init_point: string
    external_reference: string
    date_created?: string
  }

  return {
    id: data.id,
    initPoint: data.init_point,
    sandboxInitPoint: data.sandbox_init_point || data.init_point,
    externalReference: data.external_reference,
    valorCents,
    createdAt: data.date_created ? new Date(data.date_created).getTime() : Date.now(),
  }
}

/**
 * Cria uma cobrança Pix direta via API do Mercado Pago.
 * Devolve o código "Copia e Cola" e o QR Code em base64 para exibição na tela.
 */
export async function criarPixDeposito(
  input: CriarPixDepositoInput,
): Promise<PixDepositoResult> {
  const { userEmail, valorCents, externalReference, descricao } = input

  if (!Number.isInteger(valorCents) || valorCents <= 0) {
    throw new Error('Valor de depósito inválido.')
  }

  const token = getMercadoPagoAccessToken()

  // Modo simulador se não houver credencial
  if (!token) {
    const simId = `SIM-PIX-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    return {
      paymentId: simId,
      status: 'pending',
      qrCode: `00020126580014br.gov.bcb.pix0136${simId}520400005303986540${(valorCents / 100).toFixed(2)}5802BR5914AUREA CUSTODIA6009SAO PAULO62070503***6304E62B`,
      qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      valorCents,
      externalReference,
      createdAt: Date.now(),
    }
  }

  const payload = {
    transaction_amount: valorCents / 100,
    description: descricao || `Depósito de saldo Áurea Custódia - ${externalReference}`,
    payment_method_id: 'pix',
    payer: {
      email: userEmail,
    },
    external_reference: externalReference,
  }

  const res = await fetch(`${MP_API_BASE}/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Idempotency-Key': externalReference,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Erro ao gerar Pix no Mercado Pago: ${res.status} ${errBody}`)
  }

  const data = (await res.json()) as {
    id: number | string
    status: StatusPagamentoGateway
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string
        qr_code_base64?: string
        ticket_url?: string
      }
    }
    date_of_expiration?: string
    date_created?: string
  }

  const transactionData = data.point_of_interaction?.transaction_data

  return {
    paymentId: String(data.id),
    status: data.status,
    qrCode: transactionData?.qr_code || '',
    qrCodeBase64: transactionData?.qr_code_base64,
    ticketUrl: transactionData?.ticket_url,
    valorCents,
    externalReference,
    expirationDate: data.date_of_expiration,
    createdAt: data.date_created ? new Date(data.date_created).getTime() : Date.now(),
  }
}

/**
 * Consulta os detalhes de um pagamento no Mercado Pago pelo ID da transação.
 */
export async function consultarPagamentoMercadoPago(
  paymentId: string,
): Promise<DetalhesPagamento> {
  const token = getMercadoPagoAccessToken()

  if (!token) {
    // Simulação determinística para pagamentos mock
    return {
      id: paymentId,
      status: 'approved',
      valorCents: 10000,
      externalReference: `DEP-${paymentId}`,
      paymentMethodId: 'pix',
      paymentTypeId: 'bank_transfer',
      dateApproved: Date.now(),
      dateCreated: Date.now() - 60000,
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
    payer?: {
      email?: string
    }
  }

  const valorCents = Math.round(data.transaction_amount * 100)

  return {
    id: String(data.id),
    status: data.status,
    statusDetail: data.status_detail,
    valorCents,
    externalReference: data.external_reference || '',
    paymentMethodId: data.payment_method_id || '',
    paymentTypeId: data.payment_type_id || '',
    dateApproved: data.date_approved ? new Date(data.date_approved).getTime() : null,
    dateCreated: data.date_created ? new Date(data.date_created).getTime() : Date.now(),
    payerEmail: data.payer?.email || '',
    raw: data,
  }
}

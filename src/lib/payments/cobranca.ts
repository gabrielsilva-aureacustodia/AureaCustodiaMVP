import 'server-only'

/**
 * Cobrança genérica reutilizável pelo ecossistema Real Olímpico (depósito, faturas, planos e retiradas).
 *
 * Implementa o passo B1.1 do plano de finalizações de 13/09/2026.
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Exclusivo de servidor (`import 'server-only'`).
 *  - Dinheiro é estritamente inteiro em centavos (`Cents`).
 *  - Pix ignora número de parcelas (sempre à vista).
 *  - Cartão (Checkout Pro) configura `payment_methods.installments` com `parcelasMax`.
 *  - Sem credenciais configuradas, o simulador devolve URLs e códigos vazios com `simulado: true`,
 *    evitando mandar o usuário para fora num beco sem saída (defeito corrigido do bloco 8).
 */

import { getMercadoPagoAccessToken } from './mercadopago'
import type {
  CobrancaCartao,
  CobrancaPix,
  PedidoDeCobranca,
  StatusPagamentoGateway,
} from './types'

const MP_API_BASE = 'https://api.mercadopago.com'

/**
 * Cria uma cobrança Pix direta pelo Mercado Pago.
 * Ignora parcelasMax, pois Pix é exclusivamente à vista.
 */
export async function criarCobrancaPix(p: PedidoDeCobranca): Promise<CobrancaPix> {
  const { externalReference, userEmail, valorCents, titulo, descricao } = p

  if (!Number.isInteger(valorCents) || valorCents <= 0) {
    throw new Error('Valor de cobrança inválido.')
  }

  const token = getMercadoPagoAccessToken()

  // Sem token no ambiente, opera no modo simulador determinístico
  if (!token) {
    const simId = `SIM-PIX-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    return {
      simulado: true,
      paymentId: simId,
      status: 'pending',
      qrCode: '',
      valorCents,
      externalReference,
      createdAt: Date.now(),
    }
  }

  const payload = {
    transaction_amount: valorCents / 100,
    description: descricao || titulo || `Real Olímpico - ${externalReference}`,
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
 * Cria uma preferência de pagamento (Checkout Pro) com suporte a parcelasMax.
 *
 * Utilizado para pagamentos por cartão de crédito hospedados no ambiente seguro do Mercado Pago.
 */
export async function criarCobrancaCartao(p: PedidoDeCobranca): Promise<CobrancaCartao> {
  const { externalReference, userEmail, valorCents, titulo, descricao, parcelasMax, voltarPara } = p

  if (!Number.isInteger(valorCents) || valorCents <= 0) {
    throw new Error('Valor de cobrança inválido.')
  }

  const parcelas = Number.isInteger(parcelasMax) && parcelasMax > 0 ? parcelasMax : 1
  const token = getMercadoPagoAccessToken()

  // Sem token no ambiente, opera no modo simulador determinístico
  if (!token) {
    const simId = `SIM-PREF-${Date.now()}-${Math.floor(Math.random() * 10000)}`
    return {
      id: simId,
      initPoint: '',
      sandboxInitPoint: '',
      externalReference,
      valorCents,
      parcelasMax: parcelas,
      createdAt: Date.now(),
      simulado: true,
    }
  }

  const unitPrice = valorCents / 100
  const title = titulo || 'Pagamento — Real Olímpico'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const payload = {
    items: [
      {
        id: externalReference,
        title,
        description: descricao || title,
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
      installments: parcelas,
    },
    back_urls: {
      success: voltarPara?.sucesso || `${appUrl}/conta?status=success`,
      pending: voltarPara?.pendente || `${appUrl}/conta?status=pending`,
      failure: voltarPara?.falha || `${appUrl}/conta?status=failure`,
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
    parcelasMax: parcelas,
    createdAt: data.date_created ? new Date(data.date_created).getTime() : Date.now(),
  }
}

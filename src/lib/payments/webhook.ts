import 'server-only'

/**
 * Validação criptográfica de Webhooks do Mercado Pago.
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Verificação com HMAC-SHA256 usando `MP_WEBHOOK_SECRET`.
 *  - Comparação com `crypto.timingSafeEqual` para mitigar timing attacks.
 *  - Validação de expiração de timestamp para evitar ataques de replay (tolerância padrão: 5 min).
 *  - Parse seguro de payload e extração de identificadores de evento.
 */

import crypto from 'crypto'
import type { MercadoPagoWebhookPayload } from './types'

export interface ValidacaoWebhookResult {
  valido: boolean
  motivo?: string
  eventoId?: string
  tipoEvento?: string
  action?: string
  paymentId?: string
}

/**
 * Valida a assinatura de uma notificação de webhook do Mercado Pago.
 *
 * Headers esperados:
 *  - `x-signature`: formato `ts=1700000000,v1=hash_hexadecimal`
 *  - `x-request-id`: UUID único gerado pelo gateway
 *
 * Template do manifesto para hash HMAC:
 *  `id:[data.id];request-id:[x-request-id];ts:[ts];`
 */
export function validarAssinaturaWebhookMercadoPago(params: {
  xSignatureHeader: string | null
  xRequestIdHeader: string | null
  dataId: string | null
  secret?: string
  maxTimestampDiffMs?: number
}): boolean {
  const {
    xSignatureHeader,
    xRequestIdHeader,
    dataId,
    secret = process.env.MP_WEBHOOK_SECRET,
    maxTimestampDiffMs = 5 * 60 * 1000, // 5 minutos
  } = params

  // Se não houver segredo configurado (ambiente de desenvolvimento/teste sem chave),
  // só valida se o formato dos headers for coerente ou se for explicitamente simulado.
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return false
    }
    // Em dev/test sem secret, aceita se vier com formato simulado
    return Boolean(xSignatureHeader || xRequestIdHeader || dataId)
  }

  if (!xSignatureHeader || !xRequestIdHeader || !dataId) {
    return false
  }

  // Extrai ts e v1 de x-signature (ex: "ts=1710000000,v1=6a7b...")
  const parts = xSignatureHeader.split(',')
  let ts: string | null = null
  let v1Hash: string | null = null

  for (const part of parts) {
    const [key, value] = part.trim().split('=')
    if (key === 'ts') ts = value
    if (key === 'v1') v1Hash = value
  }

  if (!ts || !v1Hash) {
    return false
  }

  // Previne replay attack verificando a janela de timestamp
  const tsNumber = parseInt(ts, 10)
  if (isNaN(tsNumber)) {
    return false
  }

  // ts do MP pode vir em segundos ou milissegundos
  const tsMs = ts.length <= 10 ? tsNumber * 1000 : tsNumber
  const agora = Date.now()
  if (Math.abs(agora - tsMs) > maxTimestampDiffMs) {
    return false
  }

  // Constrói o manifesto de validação do Mercado Pago
  const manifest = `id:${dataId};request-id:${xRequestIdHeader};ts:${ts};`

  // Gera o HMAC SHA256 do manifesto usando a chave secreta
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  try {
    const hashBufferA = Buffer.from(v1Hash, 'utf8')
    const hashBufferB = Buffer.from(expectedHash, 'utf8')

    if (hashBufferA.length !== hashBufferB.length) {
      return false
    }

    return crypto.timingSafeEqual(hashBufferA, hashBufferB)
  } catch {
    return false
  }
}

/**
 * Extrai e normaliza informações essenciais do payload de webhook.
 */
export function processarPayloadWebhook(
  payload: MercadoPagoWebhookPayload,
): {
  eventoId: string
  paymentId: string | null
  tipo: string
  action: string
} {
  // Identificador do evento
  const eventoId = String(payload.id || payload.data?.id || `EVT-${Date.now()}`)

  // O ID do pagamento pode vir em `data.id` (v2) ou `id` (v1/payments)
  let paymentId: string | null = null
  if (payload.data?.id) {
    paymentId = String(payload.data.id)
  } else if (payload.type === 'payment' && payload.id) {
    paymentId = String(payload.id)
  } else if (payload.topic === 'payment' && payload.resource) {
    // Para v1 topic "payment" com resource "https://api.mercadolibre.com/v1/payments/12345"
    const match = payload.resource.match(/\/payments\/(\d+)/)
    if (match) {
      paymentId = match[1]
    }
  }

  const tipo = payload.type || payload.topic || 'payment'
  const action = payload.action || 'payment.updated'

  return {
    eventoId,
    paymentId,
    tipo,
    action,
  }
}

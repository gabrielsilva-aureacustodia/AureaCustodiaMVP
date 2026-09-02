import 'server-only'

/**
 * Validação criptográfica de Webhooks do Mercado Pago.
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Verificação com HMAC-SHA256 usando `MP_WEBHOOK_SECRET`.
 *  - Comparação com `crypto.timingSafeEqual` para mitigar timing attacks.
 *  - Validação de expiração de timestamp para evitar ataques de replay (tolerância padrão: 5 min).
 *  - O manifesto oficial do MP utiliza `dataId` em minúsculas quando alfanumérico: `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`.
 *  - Na ausência de segredo, só aceita se `MP_WEBHOOK_ALLOW_UNSIGNED === 'true'` (desenvolvimento local).
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
 *  `id:[data.id_em_minusculas];request-id:[x-request-id];ts:[ts];`
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

  // Se não houver segredo configurado, só aceita se expressamente liberado por variável de dev
  if (!secret) {
    return process.env.MP_WEBHOOK_ALLOW_UNSIGNED === 'true'
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

  // Constrói o manifesto de validação oficial do Mercado Pago (com dataId em minúsculas)
  const normalizedDataId = dataId.toLowerCase()
  const manifest = `id:${normalizedDataId};request-id:${xRequestIdHeader};ts:${ts};`

  // Gera o HMAC SHA256 do manifesto usando a chave secreta
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  try {
    const hashBufferA = Buffer.from(v1Hash.toLowerCase(), 'utf8')
    const hashBufferB = Buffer.from(expectedHash.toLowerCase(), 'utf8')

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
 * Se o evento não possuir ID, devolve `eventoId: null` para que a rota recuse com 400.
 */
export function processarPayloadWebhook(
  payload: MercadoPagoWebhookPayload,
): {
  eventoId: string | null
  paymentId: string | null
  tipo: string
  action: string
} {
  // Identifica o paymentId (pode vir em data.id ou id do payload v1)
  let paymentId: string | null = null
  if (payload.data?.id) {
    paymentId = String(payload.data.id)
  } else if (payload.type === 'payment' && payload.id) {
    paymentId = String(payload.id)
  } else if (payload.topic === 'payment' && payload.resource) {
    const match = payload.resource.match(/\/payments\/(\d+)/)
    if (match) {
      paymentId = match[1]
    }
  }

  // Identificador do evento: se não houver no payload, devolve null (nunca gera chave aleatória)
  const rawId = payload.id !== undefined && payload.id !== null ? String(payload.id) : null
  const eventoId = rawId || (paymentId ? `evt-${paymentId}` : null)

  const tipo = payload.type || payload.topic || 'payment'
  const action = payload.action || 'payment.updated'

  return {
    eventoId,
    paymentId,
    tipo,
    action,
  }
}

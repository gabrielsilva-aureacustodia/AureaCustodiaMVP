import crypto from 'crypto'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  processarPayloadWebhook,
  validarAssinaturaWebhookMercadoPago,
} from './webhook'

describe('Mercado Pago — Validação de Webhooks', () => {
  const secretTeste = 'segredo_teste_webhook_123456'

  it('valida assinatura correta com HMAC-SHA256', () => {
    const dataId = '123456789'
    const xRequestId = 'req-uuid-98765'
    const ts = String(Math.floor(Date.now() / 1000))

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
    const v1Hash = crypto
      .createHmac('sha256', secretTeste)
      .update(manifest)
      .digest('hex')

    const xSignature = `ts=${ts},v1=${v1Hash}`

    const valido = validarAssinaturaWebhookMercadoPago({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataId,
      secret: secretTeste,
    })

    expect(valido).toBe(true)
  })

  it('rejeita assinatura adulterada ou com chave errada', () => {
    const dataId = '123456789'
    const xRequestId = 'req-uuid-98765'
    const ts = String(Math.floor(Date.now() / 1000))

    const xSignature = `ts=${ts},v1=hash_completamente_invalido_123456`

    const valido = validarAssinaturaWebhookMercadoPago({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataId,
      secret: secretTeste,
    })

    expect(valido).toBe(false)
  })

  it('rejeita timestamp expirado (ataque de replay)', () => {
    const dataId = '123456789'
    const xRequestId = 'req-uuid-98765'
    // Timestamp de 1 hora atrás
    const tsAntigo = String(Math.floor((Date.now() - 3600000) / 1000))

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsAntigo};`
    const v1Hash = crypto
      .createHmac('sha256', secretTeste)
      .update(manifest)
      .digest('hex')

    const xSignature = `ts=${tsAntigo},v1=${v1Hash}`

    const valido = validarAssinaturaWebhookMercadoPago({
      xSignatureHeader: xSignature,
      xRequestIdHeader: xRequestId,
      dataId,
      secret: secretTeste,
    })

    expect(valido).toBe(false)
  })

  it('extrai corretamente dados do payload v2 (data.id)', () => {
    const payload = {
      action: 'payment.created',
      api_version: 'v1',
      data: { id: '99887766' },
      date_created: '2026-09-02T10:00:00Z',
      id: 11223344,
      live_mode: false,
      type: 'payment',
      user_id: 123456,
    }

    const { eventoId, paymentId, tipo, action } = processarPayloadWebhook(payload)

    expect(eventoId).toBe('11223344')
    expect(paymentId).toBe('99887766')
    expect(tipo).toBe('payment')
    expect(action).toBe('payment.created')
  })

  it('extrai dados de payload v1 legado (topic e resource)', () => {
    const payload = {
      topic: 'payment',
      resource: 'https://api.mercadolibre.com/v1/payments/55443322',
      id: 'EVT-LEGADO-1',
    }

    const { eventoId, paymentId, tipo } = processarPayloadWebhook(payload)

    expect(eventoId).toBe('EVT-LEGADO-1')
    expect(paymentId).toBe('55443322')
    expect(tipo).toBe('payment')
  })
})

import crypto from 'node:crypto'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { _resetIdempotenciaParaTestes } from '@/lib/payments'
import { POST } from './route'

describe('Webhook Route — POST /api/webhooks/mercadopago', () => {
  const secretTeste = 'segredo_webhook_teste_123456'
  const originalEnv = process.env.MP_WEBHOOK_SECRET

  beforeEach(() => {
    process.env.MP_WEBHOOK_SECRET = secretTeste
    delete process.env.MP_WEBHOOK_ALLOW_UNSIGNED
    _resetIdempotenciaParaTestes()
  })

  afterEach(() => {
    process.env.MP_WEBHOOK_SECRET = originalEnv
  })

  function gerarAssinatura(dataId: string, requestId: string, ts: string, secret: string): string {
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
    const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    return `ts=${ts},v1=${v1}`
  }

  it('recebe notificação com assinatura válida e retorna 200 imediato', async () => {
    const paymentId = '123456789'
    const eventoId = 'evt-123456789'
    const requestId = 'req-valid-100'
    const ts = String(Math.floor(Date.now() / 1000))
    const xSignature = gerarAssinatura(paymentId, requestId, ts, secretTeste)

    const payload = {
      action: 'payment.created',
      data: { id: paymentId },
      id: eventoId,
      type: 'payment',
    }

    const req = new NextRequest('http://localhost:3000/api/webhooks/mercadopago', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        'x-signature': xSignature,
      },
      body: JSON.stringify(payload),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.status).toBe('received')
    expect(data.eventoId).toBe(eventoId)
  })

  it('rejeita com 401 quando a assinatura for adulterada (um caractere alterado)', async () => {
    const paymentId = '123456789'
    const requestId = 'req-adulterado-101'
    const ts = String(Math.floor(Date.now() / 1000))
    const xSignatureValida = gerarAssinatura(paymentId, requestId, ts, secretTeste)
    // Altera o último caractere do hash
    const xSignatureInvalida = xSignatureValida.slice(0, -1) + (xSignatureValida.endsWith('a') ? 'b' : 'a')

    const payload = {
      action: 'payment.created',
      data: { id: paymentId },
      id: 'evt-adulterado',
      type: 'payment',
    }

    const req = new NextRequest('http://localhost:3000/api/webhooks/mercadopago', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        'x-signature': xSignatureInvalida,
      },
      body: JSON.stringify(payload),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.error).toBe('Assinatura de webhook inválida')
  })

  it('rejeita com 400 quando o payload não possui identificador de evento ({})', async () => {
    const requestId = 'req-sem-id-102'
    const ts = String(Math.floor(Date.now() / 1000))

    const req = new NextRequest('http://localhost:3000/api/webhooks/mercadopago', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        'x-signature': `ts=${ts},v1=qualquer_hash`,
      },
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.ok).toBe(false)
    expect(data.error).toBe('Identificador do evento ausente')
  })

  it('CRITÉRIO RA-07 / RA-14.a: Responde 200 com "already_processed" para reenvios duplicados do gateway', async () => {
    const paymentId = '987654321'
    const eventoId = 'evt-reenvio-987'
    const requestId = 'req-reenvio-103'
    const ts = String(Math.floor(Date.now() / 1000))
    const xSignature = gerarAssinatura(paymentId, requestId, ts, secretTeste)

    const payload = {
      action: 'payment.updated',
      data: { id: paymentId },
      id: eventoId,
      type: 'payment',
    }

    const criarReq = () =>
      new NextRequest('http://localhost:3000/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          'x-signature': xSignature,
        },
        body: JSON.stringify(payload),
      })

    // 1º envio do gateway
    const res1 = await POST(criarReq())
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.status).toBe('received')

    // 2º envio (retentativa)
    const res2 = await POST(criarReq())
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.status).toBe('already_processed')
  })
})

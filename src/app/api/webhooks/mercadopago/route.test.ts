import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { _resetIdempotenciaParaTestes } from '@/lib/payments'
import { POST } from './route'

describe('Webhook Route — POST /api/webhooks/mercadopago', () => {
  beforeEach(() => {
    _resetIdempotenciaParaTestes()
  })

  it('recebe notificação com sucesso e retorna 200 imediato', async () => {
    const payload = {
      action: 'payment.created',
      data: { id: 'test-payment-100' },
      id: 'test-evt-100',
      type: 'payment',
    }

    const req = new NextRequest('http://localhost:3000/api/webhooks/mercadopago', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'req-test-100',
        'x-signature': 'ts=1700000000,v1=simulado',
      },
      body: JSON.stringify(payload),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.status).toBe('received')
    expect(data.eventoId).toBe('test-evt-100')
  })

  it('CRITÉRIO RA-07: Responde 200 com "already_processed" para reenvios duplicados do gateway', async () => {
    const payload = {
      action: 'payment.updated',
      data: { id: 'test-payment-200' },
      id: 'test-evt-200',
      type: 'payment',
    }

    const criarReq = () =>
      new NextRequest('http://localhost:3000/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'req-test-200',
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

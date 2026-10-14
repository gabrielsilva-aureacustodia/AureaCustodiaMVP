/**
 * O aviso de saque do Mercado Pago não é assinado: a rota só pode APONTAR para um saque e mandar
 * consultar — nunca decidir nada pelo corpo (14/10/2026).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({ reagirAoAvisoDoGateway: vi.fn() }))
vi.mock('@/server/saques/pagamento', () => ({ reagirAoAvisoDoGateway: m.reagirAoAvisoDoGateway }))

import { NextRequest } from 'next/server'

import { POST } from './route'

function pedido(corpo: unknown): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/mercadopago-payouts', {
    method: 'POST',
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/webhooks/mercadopago-payouts', () => {
  beforeEach(() => {
    m.reagirAoAvisoDoGateway.mockReset()
    m.reagirAoAvisoDoGateway.mockResolvedValue(undefined)
  })

  it('extrai só o id do payout e a referência e manda conferir', async () => {
    const res = await POST(
      pedido({ id: 'TOP1', status: 'success', status_detail: 'accredited', external_reference: 'SAQ-1', payout: { id: 'POP1', external_reference: 'SAQ-1' } }),
    )
    expect(res.status).toBe(200)
    await vi.waitFor(() => expect(m.reagirAoAvisoDoGateway).toHaveBeenCalledWith('SAQ-1', 'POP1'))
  })

  it('o "success" do corpo não é lido: a rota nem repassa o status', async () => {
    await POST(pedido({ status: 'success', payout: { id: 'POP1' } }))
    await vi.waitFor(() => expect(m.reagirAoAvisoDoGateway).toHaveBeenCalled())
    expect(m.reagirAoAvisoDoGateway.mock.calls[0]).toEqual([null, 'POP1'])
  })

  it('corpo que não é JSON: 400, sem consultar nada', async () => {
    const res = await POST(pedido('isto não é json'))
    expect(res.status).toBe(400)
    expect(m.reagirAoAvisoDoGateway).not.toHaveBeenCalled()
  })

  it('falha ao conferir não vira 500 (500 faz o Mercado Pago reenviar)', async () => {
    m.reagirAoAvisoDoGateway.mockRejectedValue(new Error('banco caiu'))
    const res = await POST(pedido({ payout: { id: 'POP1' } }))
    expect(res.status).toBe(200)
  })
})

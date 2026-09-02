import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  consultarPagamentoMercadoPago,
  criarPixDeposito,
  criarPreferenciaDeposito,
  isMercadoPagoSandbox,
} from './mercadopago'

describe('Mercado Pago — Preferências e Depósitos', () => {
  it('identifica modo sandbox por padrão (RA-01)', () => {
    expect(isMercadoPagoSandbox()).toBe(true)
  })

  it('cria preferência de depósito com valores corretos em centavos (simulador)', async () => {
    const res = await criarPreferenciaDeposito({
      userEmail: 'gabriel.silva@testeaurea.com.br',
      valorCents: 15000, // R$ 150,00
      externalReference: 'DEP-TEST-001',
      descricao: 'Aporte de saldo',
    })

    expect(res.id).toBeDefined()
    expect(res.externalReference).toBe('DEP-TEST-001')
    expect(res.valorCents).toBe(15000)
    expect(res.sandboxInitPoint).toContain('mercadopago.com.br')
  })

  it('recusa depósito com valor inválido (zero ou negativo)', async () => {
    await expect(
      criarPreferenciaDeposito({
        userEmail: 'gabriel.silva@testeaurea.com.br',
        valorCents: 0,
        externalReference: 'DEP-ZERO',
      }),
    ).rejects.toThrow('Valor de depósito inválido.')

    await expect(
      criarPreferenciaDeposito({
        userEmail: 'gabriel.silva@testeaurea.com.br',
        valorCents: -5000,
        externalReference: 'DEP-NEGATIVO',
      }),
    ).rejects.toThrow('Valor de depósito inválido.')
  })

  it('cria cobrança Pix com QR Code e Copia e Cola', async () => {
    const res = await criarPixDeposito({
      userEmail: 'gabriel.silva@testeaurea.com.br',
      valorCents: 28500, // R$ 285,00
      externalReference: 'PIX-DEP-001',
    })

    expect(res.paymentId).toBeDefined()
    expect(res.status).toBe('pending')
    expect(res.qrCode).toContain('00020126')
    expect(res.valorCents).toBe(28500)
  })

  it('consulta pagamento no gateway', async () => {
    const res = await consultarPagamentoMercadoPago('SIM-12345')
    expect(res.id).toBe('SIM-12345')
    expect(res.status).toBe('approved')
    expect(res.valorCents).toBe(10000)
  })
})

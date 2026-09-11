import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  consultarPagamentoMercadoPago,
  criarPixDeposito,
  criarPreferenciaDeposito,
  isMercadoPagoSandbox,
} from './mercadopago'

describe('Mercado Pago — Preferências e Depósitos', () => {
  it('opera em sandbox por padrão, e só MP_SANDBOX="false" liga produção', () => {
    expect(isMercadoPagoSandbox()).toBe(true)
  })

  /**
   * O QUE ESTE TESTE PROTEGE
   * ------------------------
   * Que o simulador NÃO produza endereço de site de terceiro. Até 11/09/2026
   * ele devolvia `https://sandbox.mercadopago.com.br/...?pref_id=SIM-PREF-…`,
   * a tela abria a aba, o Mercado Pago não reconhecia o identificador e o
   * cliente caía na página de erro DELE achando que a falha era da Áurea.
   *
   * Se alguém "consertar" isto voltando a preencher a URL, o beco sem saída
   * volta junto. Quem avisa que não há gateway é a tela, pelo campo `simulado`.
   */
  it('sem credencial, o simulador se declara e não aponta para fora', async () => {
    const res = await criarPreferenciaDeposito({
      userEmail: 'gabriel.silva@testeaurea.com.br',
      valorCents: 15000, // R$ 150,00
      externalReference: 'DEP-TEST-001',
      descricao: 'Aporte de saldo',
    })

    expect(res.id).toBeDefined()
    expect(res.externalReference).toBe('DEP-TEST-001')
    expect(res.valorCents).toBe(15000)
    expect(res.simulado).toBe(true)
    expect(res.initPoint).toBe('')
    expect(res.sandboxInitPoint).toBe('')
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

  /**
   * Mesma proteção do teste acima, do lado do Pix: o ramo simulador devolvia um
   * texto com a estrutura de um payload Pix de verdade e um QR que era um pixel
   * branco de 1x1. Alguém pode tentar pagar aquilo.
   */
  it('sem credencial, o Pix simulado não devolve copia-e-cola pagável', async () => {
    const res = await criarPixDeposito({
      userEmail: 'gabriel.silva@testeaurea.com.br',
      valorCents: 28500, // R$ 285,00
      externalReference: 'PIX-DEP-001',
    })

    expect(res.paymentId).toBeDefined()
    expect(res.status).toBe('pending')
    expect(res.simulado).toBe(true)
    expect(res.qrCode).toBe('')
    expect(res.qrCodeBase64).toBeUndefined()
    expect(res.valorCents).toBe(28500)
  })

  it('consulta pagamento no gateway', async () => {
    const res = await consultarPagamentoMercadoPago('SIM-12345')
    expect(res.id).toBe('SIM-12345')
    expect(res.status).toBe('approved')
    expect(res.valorCents).toBe(10000)
  })
})

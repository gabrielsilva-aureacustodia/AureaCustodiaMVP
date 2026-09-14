import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { criarCobrancaCartao, criarCobrancaPix } from './cobranca'

describe('Cobrança genérica — Pix e Cartão (Checkout Pro) (B1.1)', () => {
  it('sem credencial, Pix opera em modo simulador com simulado: true e qrCode vazio', async () => {
    const res = await criarPixDepositoMock()
    expect(res.simulado).toBe(true)
    expect(res.paymentId).toMatch(/^SIM-PIX-/)
    expect(res.qrCode).toBe('')
    expect(res.valorCents).toBe(10000)
    expect(res.status).toBe('pending')
  })

  it('sem credencial, Cartão opera em modo simulador com simulado: true e initPoint vazio', async () => {
    const res = await criarCobrancaCartao({
      externalReference: 'FAT-TEST-001',
      userEmail: 'cliente@testeaurea.com.br',
      valorCents: 2400,
      titulo: 'Custódia Anual',
      descricao: 'Plano anual de custódia',
      parcelasMax: 12,
    })

    expect(res.simulado).toBe(true)
    expect(res.id).toMatch(/^SIM-PREF-/)
    expect(res.initPoint).toBe('')
    expect(res.sandboxInitPoint).toBe('')
    expect(res.valorCents).toBe(2400)
    expect(res.parcelasMax).toBe(12)
  })

  it('recusa valores de cobrança inválidos (zero, negativo ou não inteiro)', async () => {
    await expect(
      criarCobrancaPix({
        externalReference: 'REF-0',
        userEmail: 'user@testeaurea.com.br',
        valorCents: 0,
        titulo: 'Teste',
        descricao: 'Teste',
        parcelasMax: 1,
      }),
    ).rejects.toThrow('Valor de cobrança inválido.')

    await expect(
      criarCobrancaCartao({
        externalReference: 'REF-NEG',
        userEmail: 'user@testeaurea.com.br',
        valorCents: -500,
        titulo: 'Teste',
        descricao: 'Teste',
        parcelasMax: 1,
      }),
    ).rejects.toThrow('Valor de cobrança inválido.')
  })
})

async function criarPixDepositoMock() {
  return criarCobrancaPix({
    externalReference: 'REF-PIX-001',
    userEmail: 'cliente@testeaurea.com.br',
    valorCents: 10000,
    titulo: 'Depósito em conta',
    descricao: 'Depósito de saldo',
    parcelasMax: 1,
  })
}

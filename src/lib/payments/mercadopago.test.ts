import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  ativarDebitoAutomatico,
  consultarPagamentoMercadoPago,
  criarPixDeposito,
  criarPreferenciaDeposito,
  getMercadoPagoAccessToken,
  isMercadoPagoSandbox,
} from './mercadopago'

describe('Mercado Pago — Preferências e Depósitos', () => {
  it('opera em sandbox por padrão, e só MP_SANDBOX="false" liga produção', () => {
    expect(isMercadoPagoSandbox()).toBe(true)
  })

  describe('B1.0 — getMercadoPagoAccessToken conforme o ambiente', () => {
    const originalEnv = { ...process.env }

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('1. em sandbox, com token de teste presente, devolve o token de teste', () => {
      process.env.MP_SANDBOX = 'true'
      process.env.MP_ACCESS_TOKEN_TEST = 'TEST_TOKEN_123'
      process.env.MP_ACCESS_TOKEN = 'PROD_TOKEN_456'
      expect(getMercadoPagoAccessToken()).toBe('TEST_TOKEN_123')
    })

    it('2. em sandbox, sem token de teste mas com token de prod, faz fallback para prod', () => {
      process.env.MP_SANDBOX = 'true'
      delete process.env.MP_ACCESS_TOKEN_TEST
      process.env.MP_ACCESS_TOKEN = 'PROD_TOKEN_456'
      expect(getMercadoPagoAccessToken()).toBe('PROD_TOKEN_456')
    })

    it('3. em produção (MP_SANDBOX="false"), com ambos presentes, devolve EXCLUSIVAMENTE o de prod', () => {
      process.env.MP_SANDBOX = 'false'
      process.env.MP_ACCESS_TOKEN_TEST = 'TEST_TOKEN_123'
      process.env.MP_ACCESS_TOKEN = 'PROD_TOKEN_456'
      expect(getMercadoPagoAccessToken()).toBe('PROD_TOKEN_456')
    })

    it('4. em produção (MP_SANDBOX="false"), apenas com token de teste, devolve null (não usa teste em prod)', () => {
      process.env.MP_SANDBOX = 'false'
      process.env.MP_ACCESS_TOKEN_TEST = 'TEST_TOKEN_123'
      delete process.env.MP_ACCESS_TOKEN
      expect(getMercadoPagoAccessToken()).toBeNull()
    })
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

  it('consulta pagamento no gateway (simulador B1.2: tarifa zero e líquido = bruto)', async () => {
    const res = await consultarPagamentoMercadoPago('SIM-12345')
    expect(res.id).toBe('SIM-12345')
    expect(res.status).toBe('approved')
    expect(res.valorCents).toBe(10000)
    expect(res.valorLiquidoCents).toBe(10000)
    expect(res.tarifaCents).toBe(0)
    expect(res.totalPagoCents).toBe(10000)
    expect(res.parcelas).toBe(1)
    expect(res.valorParcelaCents).toBe(10000)
    expect(res.dataLiberacao).toBeDefined()
  })

  it('B1.2 — lê tarifa, líquido, parcelas e data de liberação da API do Mercado Pago', async () => {
    const originalEnv = { ...process.env }
    process.env.MP_ACCESS_TOKEN = 'APP_USR_TEST'

    const mockResponse = {
      id: 99887766,
      status: 'approved',
      status_detail: 'accredited',
      transaction_amount: 200.0,
      external_reference: 'FAT-001',
      payment_method_id: 'visa',
      payment_type_id: 'credit_card',
      date_approved: '2026-09-14T10:00:00.000Z',
      date_created: '2026-09-14T09:59:00.000Z',
      money_release_date: '2026-10-14T10:00:00.000Z',
      installments: 2,
      transaction_details: {
        net_received_amount: 192.5, // Tarifa de R$ 7,50 (750 cents)
        total_paid_amount: 200.0,
        installment_amount: 100.0,
      },
      payer: {
        email: 'pagador@exemplo.com',
      },
    }

    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    try {
      const res = await consultarPagamentoMercadoPago('99887766')

      expect(res.id).toBe('99887766')
      expect(res.status).toBe('approved')
      expect(res.valorCents).toBe(20000) // R$ 200,00
      expect(res.valorLiquidoCents).toBe(19250) // R$ 192,50
      expect(res.tarifaCents).toBe(750) // R$ 7,50 (20000 - 19250)
      expect(res.totalPagoCents).toBe(20000)
      expect(res.parcelas).toBe(2)
      expect(res.valorParcelaCents).toBe(10000)
      expect(res.dataLiberacao).toBe(new Date('2026-10-14T10:00:00.000Z').getTime())
      expect(res.externalReference).toBe('FAT-001')
    } finally {
      globalThis.fetch = originalFetch
      process.env = { ...originalEnv }
    }
  })

  describe('B2.8 — ativarDebitoAutomatico (POST /preapproval)', () => {
    const originalEnv = { ...process.env }

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('sem token configurado, opera em modo simulado', async () => {
      delete process.env.MP_ACCESS_TOKEN
      delete process.env.MP_ACCESS_TOKEN_TEST

      const res = await ativarDebitoAutomatico({
        planoId: 'PLC-000001',
        userEmail: 'cliente@teste.com',
        valorCents: 200,
      })

      expect(res.simulado).toBe(true)
      expect(res.id).toBe('preapp-mock-PLC-000001')
      expect(res.initPoint).toContain('mock-PLC-000001')
      expect(res.status).toBe('pending')
    })

    it('com token, envia POST para /preapproval com external_reference e periodicidade mensal', async () => {
      process.env.MP_ACCESS_TOKEN = 'VALID_TOKEN'
      const originalFetch = globalThis.fetch

      let capturedUrl = ''
      let capturedBody: unknown = null

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedUrl = url
        capturedBody = init?.body ? JSON.parse(init.body as string) : null
        return {
          ok: true,
          json: async () => ({
            id: 'preapp-real-12345',
            init_point: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=12345',
            status: 'pending',
          }),
        } as Response
      })

      try {
        const res = await ativarDebitoAutomatico({
          planoId: 'PLC-000002',
          userEmail: 'cliente@teste.com',
          valorCents: 400,
          descricao: 'Assinatura 2 moedas',
        })

        expect(capturedUrl).toBe('https://api.mercadopago.com/preapproval')
        expect(capturedBody).toMatchObject({
          payer_email: 'cliente@teste.com',
          external_reference: 'ASS-PLC-000002',
          reason: 'Assinatura 2 moedas',
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: 4,
            currency_id: 'BRL',
          },
        })
        expect(res.id).toBe('preapp-real-12345')
        expect(res.status).toBe('pending')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })
})


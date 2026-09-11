import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

import type { AppState, FaturaCustodia } from '@/domain/types'

let estadoSimulado: AppState

vi.mock('@/server/state', () => ({
  mutateState: vi.fn(async (fn: (s: AppState) => unknown) => {
    const result = await fn(estadoSimulado)
    return { result, state: estadoSimulado }
  }),
  getState: vi.fn(async () => estadoSimulado),
}))

import { pagarFaturaCustodiaComSaldo, processarCicloFaturamento } from './faturamento'

describe('server/custodia/faturamento', () => {
  beforeEach(() => {
    estadoSimulado = {
      users: {
        'com_saldo@teste.com': {
          name: 'Cliente Com Saldo',
          balance: 10_000, // R$ 100,00
          coins: [
            {
              id: 'RO-000001',
              tipoMoeda: 'Entrega da Bandeira Olímpica',
              ano: 2024,
              entrada: '01/01/2026',
              statusFisico: 'Armazenado',
              statusDigital: 'Validado',
              valorEstimado: 250000,
              protocolo: 'RO-ENV-0001',
              recibo: { codigo: 'REC-000001', hash: 'h1', dataEmissao: '01/01/2026', status: 'Ativo' },
            },
            {
              id: 'RO-000002',
              tipoMoeda: 'Entrega da Bandeira Olímpica',
              ano: 2024,
              entrada: '01/01/2026',
              statusFisico: 'Armazenado',
              statusDigital: 'Validado',
              valorEstimado: 250000,
              protocolo: 'RO-ENV-0001',
              recibo: { codigo: 'REC-000002', hash: 'h2', dataEmissao: '01/01/2026', status: 'Ativo' },
            },
          ],
        },
        'sem_saldo@teste.com': {
          name: 'Cliente Sem Saldo',
          balance: 100, // R$ 1,00 (menor que R$ 2,00)
          coins: [
            {
              id: 'RO-000003',
              tipoMoeda: 'Entrega da Bandeira Olímpica',
              ano: 2024,
              entrada: '01/01/2026',
              statusFisico: 'Armazenado',
              statusDigital: 'Validado',
              valorEstimado: 250000,
              protocolo: 'RO-ENV-0001',
              recibo: { codigo: 'REC-000003', hash: 'h3', dataEmissao: '01/01/2026', status: 'Ativo' },
            },
          ],
        },
        'sem_moeda@teste.com': {
          name: 'Cliente Sem Moeda',
          balance: 50_000,
          coins: [],
        },
      },
      sellOffers: [],
      buyOrders: [],
      trades: [],
      envios: [],
      seq: { coin: 3, envio: 1 },
      deposits: [],
      analises: [],
      saques: [],
      faturasCustodia: [],
    }
  })

  it('debita automaticamente saldo se disponível e emite fatura paga', async () => {
    const rel = await processarCicloFaturamento('2026-09', 1726000000000)

    expect(rel.competencia).toBe('2026-09')
    expect(rel.faturasGeradas).toBe(2)
    expect(rel.faturasLiquidadasComSaldo).toBe(1)
    expect(rel.faturasPendentes).toBe(1)

    // Cliente com saldo: 2 moedas = R$ 4,00 (400 cents)
    const userComSaldo = estadoSimulado.users['com_saldo@teste.com']
    expect(userComSaldo.balance).toBe(10_000 - 400) // 9600
    expect(userComSaldo.inadimplente).toBe(false)

    const faturaComSaldo = estadoSimulado.faturasCustodia?.find((f) => f.userEmail === 'com_saldo@teste.com')
    expect(faturaComSaldo).toBeDefined()
    expect(faturaComSaldo?.status).toBe('paga')
    expect(faturaComSaldo?.formaPagamento).toBe('saldo')
    expect(faturaComSaldo?.valorCents).toBe(400)

    // Cliente sem saldo: 1 moeda = R$ 2,00 (200 cents), saldo permanece 100
    const userSemSaldo = estadoSimulado.users['sem_saldo@teste.com']
    expect(userSemSaldo.balance).toBe(100)
    expect(userSemSaldo.inadimplente).toBe(false) // Dentro da tolerância

    const faturaSemSaldo = estadoSimulado.faturasCustodia?.find((f) => f.userEmail === 'sem_saldo@teste.com')
    expect(faturaSemSaldo).toBeDefined()
    expect(faturaSemSaldo?.status).toBe('pendente')
    expect(faturaSemSaldo?.formaPagamento).toBeNull()

    // Cliente sem moeda não ganha fatura
    const faturaSemMoeda = estadoSimulado.faturasCustodia?.find((f) => f.userEmail === 'sem_moeda@teste.com')
    expect(faturaSemMoeda).toBeUndefined()
  })

  it('é idempotente para a mesma competência', async () => {
    await processarCicloFaturamento('2026-09', 1726000000000)
    const totalFaturas1 = estadoSimulado.faturasCustodia?.length

    const rel2 = await processarCicloFaturamento('2026-09', 1726000000000)
    const totalFaturas2 = estadoSimulado.faturasCustodia?.length

    expect(rel2.faturasGeradas).toBe(0)
    expect(totalFaturas1).toBe(totalFaturas2)
  })

  it('marca fatura como atrasada e usuário como inadimplente quando passa da data de tolerância', async () => {
    // 1. Gera ciclo em t=1000
    await processarCicloFaturamento('2026-09', 1000)
    const fatura = estadoSimulado.faturasCustodia?.find((f) => f.userEmail === 'sem_saldo@teste.com')
    expect(fatura?.status).toBe('pendente')

    // 2. Roda ciclo em t após vencimento (vencimento = 1000 + 10 dias)
    const aposVencimento = 1000 + 11 * 86400000
    const rel = await processarCicloFaturamento('2026-09', aposVencimento)

    expect(fatura?.status).toBe('atrasada')
    expect(estadoSimulado.users['sem_saldo@teste.com'].inadimplente).toBe(true)
    expect(rel.usuariosInadimplentes).toBe(1)
  })

  it('permite o usuário pagar fatura pendente com saldo posterior e remove inadimplência', async () => {
    // Fatura atrasada existente
    const agora = 1726000000000
    const faturaAtrasada: FaturaCustodia = {
      id: 'FAT-2026-08-sem_saldo',
      userEmail: 'sem_saldo@teste.com',
      competencia: '2026-08',
      quantidadeMoedas: 1,
      moedaIds: ['RO-000003'],
      valorCents: 200,
      status: 'atrasada',
      dataEmissao: agora - 20 * 86400000,
      dataVencimento: agora - 10 * 86400000,
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
    }
    estadoSimulado.faturasCustodia = [faturaAtrasada]
    estadoSimulado.users['sem_saldo@teste.com'].inadimplente = true

    // Adiciona saldo para pagar
    estadoSimulado.users['sem_saldo@teste.com'].balance = 5_000

    const res = await pagarFaturaCustodiaComSaldo('FAT-2026-08-sem_saldo', 'sem_saldo@teste.com')
    expect(res.ok).toBe(true)
    expect(estadoSimulado.users['sem_saldo@teste.com'].balance).toBe(4_800)
    expect(faturaAtrasada.status).toBe('paga')
    expect(faturaAtrasada.formaPagamento).toBe('saldo')
    expect(estadoSimulado.users['sem_saldo@teste.com'].inadimplente).toBe(false)
  })

  it('recusa pagamento com saldo se o usuário não possuir saldo suficiente', async () => {
    const faturaPendente: FaturaCustodia = {
      id: 'FAT-2026-09-sem_saldo',
      userEmail: 'sem_saldo@teste.com',
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: ['RO-000003'],
      valorCents: 200,
      status: 'pendente',
      dataEmissao: 1000,
      dataVencimento: 2000,
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
    }
    estadoSimulado.faturasCustodia = [faturaPendente]
    estadoSimulado.users['sem_saldo@teste.com'].balance = 50 // insuficiente

    const res = await pagarFaturaCustodiaComSaldo('FAT-2026-09-sem_saldo', 'sem_saldo@teste.com')
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/Saldo insuficiente/)
    expect(faturaPendente.status).toBe('pendente')
  })
})

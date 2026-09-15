import { describe, expect, it } from 'vitest'
import { userStatement } from '@/domain/statement'
import type { AppState, FaturaCustodia, PlanoCustodia, User } from '@/domain/types'

describe('userStatement — descrições e impactos de faturas de custódia', () => {
  const email = 'cliente@exemplo.com.br'
  const user: User = {
    name: 'Cliente Teste',
    balance: 50000,
    coins: [],
  }

  const planoAnual: PlanoCustodia = {
    id: 'PLC-ANUAL-1',
    userEmail: email,
    protocoloEnvio: 'RO-ENV-001',
    modalidade: 'anual',
    quantidadeContratada: 3,
    moedaIds: [],
    valorPorMoedaCents: 2400,
    valorTotalCents: 7200,
    parcelasMax: 12,
    inicioCompetencia: '2026-09',
    pagoAteCompetencia: '2027-08',
    status: 'vigente',
    formaPagamento: 'saldo',
    paymentIntentRef: null,
    assinaturaId: null,
    estornadoCents: 0,
    criadoEm: 1757894400000,
    atualizadoEm: 1757894400000,
  }

  function criarEstadoComFaturas(faturas: FaturaCustodia[], planos: PlanoCustodia[] = [planoAnual]): AppState {
    return {
      users: { [email]: user },
      sellOffers: [],
      buyOrders: [],
      trades: [],
      envios: [],
      seq: { coin: 0, envio: 0 },
      deposits: [],
      analises: [],
      planosCustodia: planos,
      faturasCustodia: faturas,
    }
  }

  it('fatura de contratação com plano anual descreve "Plano anual" e taxa com valor total', () => {
    const faturaContratacao: FaturaCustodia = {
      id: 'FAT-CONTRATACAO',
      userEmail: email,
      competencia: '2026-09',
      quantidadeMoedas: 3,
      moedaIds: [],
      valorCents: 7200,
      status: 'paga',
      formaPagamento: 'saldo',
      dataEmissao: 1757894400000,
      dataVencimento: 1758758400000,
      dataPagamento: 1757894400000,
      origem: 'contratacao',
      planoId: planoAnual.id,
    }

    const state = criarEstadoComFaturas([faturaContratacao])
    const rows = userStatement(state, email)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.kind).toBe('Taxa de custódia')
    expect(row.descricao).toContain('Plano anual')
    expect(row.descricao).not.toContain('mensal')
    expect(row.taxa).toBe(7200)
    expect(row.impacto).toBe(-7200)
  })

  it('fatura de renovação anual descreve "Renovação anual"', () => {
    const faturaRenovacao: FaturaCustodia = {
      id: 'FAT-RENOVACAO',
      userEmail: email,
      competencia: '2027-09',
      quantidadeMoedas: 3,
      moedaIds: [],
      valorCents: 7200,
      status: 'paga',
      formaPagamento: 'saldo',
      dataEmissao: 1789430400000,
      dataVencimento: 1790294400000,
      dataPagamento: 1789430400000,
      origem: 'renovacao_anual',
      planoId: planoAnual.id,
    }

    const state = criarEstadoComFaturas([faturaRenovacao])
    const rows = userStatement(state, email)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.kind).toBe('Taxa de custódia')
    expect(row.descricao).toContain('Renovação anual')
    expect(row.taxa).toBe(7200)
    expect(row.impacto).toBe(-7200)
  })

  it('fatura de ciclo mensal descreve "Custódia mensal"', () => {
    const faturaCiclo: FaturaCustodia = {
      id: 'FAT-CICLO',
      userEmail: email,
      competencia: '2026-09',
      quantidadeMoedas: 3,
      moedaIds: [],
      valorCents: 600,
      status: 'paga',
      formaPagamento: 'saldo',
      dataEmissao: 1757894400000,
      dataVencimento: 1758758400000,
      dataPagamento: 1757894400000,
      origem: 'ciclo_mensal',
    }

    const state = criarEstadoComFaturas([faturaCiclo], [])
    const rows = userStatement(state, email)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.kind).toBe('Taxa de custódia')
    expect(row.descricao).toContain('Custódia mensal')
    expect(row.taxa).toBe(600)
    expect(row.impacto).toBe(-600)
  })

  it('fatura paga com saldo gera impacto negativo; fatura pendente ou paga por fora gera impacto 0', () => {
    const faturaPendente: FaturaCustodia = {
      id: 'FAT-PEND',
      userEmail: email,
      competencia: '2026-09',
      quantidadeMoedas: 3,
      moedaIds: [],
      valorCents: 600,
      status: 'pendente',
      dataEmissao: 1757894400000,
      dataVencimento: 1758758400000,
      origem: 'ciclo_mensal',
    }
    const faturaPix: FaturaCustodia = {
      id: 'FAT-PIX',
      userEmail: email,
      competencia: '2026-08',
      quantidadeMoedas: 3,
      moedaIds: [],
      valorCents: 600,
      status: 'paga',
      formaPagamento: 'pix',
      dataEmissao: 1755216000000,
      dataVencimento: 1756080000000,
      dataPagamento: 1755300000000,
      origem: 'ciclo_mensal',
    }
    const faturaSaldo: FaturaCustodia = {
      id: 'FAT-SALDO',
      userEmail: email,
      competencia: '2026-07',
      quantidadeMoedas: 3,
      moedaIds: [],
      valorCents: 600,
      status: 'paga',
      formaPagamento: 'saldo',
      dataEmissao: 1752537600000,
      dataVencimento: 1753401600000,
      dataPagamento: 1752600000000,
      origem: 'ciclo_mensal',
    }

    const state = criarEstadoComFaturas([faturaPendente, faturaPix, faturaSaldo], [])
    const rows = userStatement(state, email)

    expect(rows).toHaveLength(3)
    const rowPendente = rows.find((r) => r.descricao.includes('2026-09'))!
    const rowPix = rows.find((r) => r.descricao.includes('2026-08'))!
    const rowSaldo = rows.find((r) => r.descricao.includes('2026-07'))!

    expect(rowPendente.impacto).toBe(0)
    expect(rowPix.impacto).toBe(0)
    expect(rowSaldo.impacto).toBe(-600)
  })
})

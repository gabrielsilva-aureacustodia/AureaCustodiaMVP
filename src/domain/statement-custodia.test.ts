import { describe, expect, it } from 'vitest'
import { userStatement as extratoCompleto } from '@/domain/statement'
import type { AppState, FaturaCustodia, PlanoCustodia, User } from '@/domain/types'

/**
 * Só as linhas de fatura: a conta destes testes nasce com R$ 500,00 e o extrato (18/11/2026) mostra o que ele não
 * explica por fatos numa linha de "Ajuste de saldo" — coberta em `statement-invariante.test.ts`, não aqui.
 */
const userStatement: typeof extratoCompleto = (state, email) =>
  extratoCompleto(state, email).filter((r) => r.kind !== 'Ajuste de saldo')

describe('userStatement — descrições e impactos de faturas de custódia', () => {
  const email = 'cliente@exemplo.com.br'
  const user: User = {
    name: 'Cliente Teste',
    balance: 50000,
    coins: [],
  }

  const planoMensal: PlanoCustodia = {
    id: 'PLC-MENSAL-1',
    userEmail: email,
    protocoloEnvio: 'RO-ENV-001',
    modalidade: 'mensal',
    quantidadeContratada: 3,
    moedaIds: [],
    valorPorMoedaCents: 200,
    valorTotalCents: 600,
    parcelasMax: 1,
    inicioCompetencia: '2026-09',
    pagoAteCompetencia: '2026-09',
    status: 'vigente',
    formaPagamento: 'saldo',
    paymentIntentRef: null,
    assinaturaId: null,
    estornadoCents: 0,
    criadoEm: 1757894400000,
    atualizadoEm: 1757894400000,
  }

  function criarEstadoComFaturas(faturas: FaturaCustodia[], planos: PlanoCustodia[] = [planoMensal]): AppState {
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

  it('fatura de contratação com plano mensal descreve "Plano mensal" e taxa com valor total', () => {
    const faturaContratacao: FaturaCustodia = {
      id: 'FAT-CONTRATACAO',
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
      origem: 'contratacao',
      planoId: planoMensal.id,
    }

    const state = criarEstadoComFaturas([faturaContratacao])
    const rows = userStatement(state, email)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.kind).toBe('Taxa de custódia')
    expect(row.descricao).toContain('Custódia do 1º mês, paga no envio')
    expect(row.taxa).toBe(600)
    expect(row.impacto).toBe(-600)
  })

  it('fatura de renovação descreve "Renovação do plano"', () => {
    const faturaRenovacao: FaturaCustodia = {
      id: 'FAT-RENOVACAO',
      userEmail: email,
      competencia: '2027-09',
      quantidadeMoedas: 3,
      moedaIds: [],
      valorCents: 600,
      status: 'paga',
      formaPagamento: 'saldo',
      dataEmissao: 1789430400000,
      dataVencimento: 1790294400000,
      dataPagamento: 1789430400000,
      origem: 'renovacao_anual',
      planoId: planoMensal.id,
    }

    const state = criarEstadoComFaturas([faturaRenovacao])
    const rows = userStatement(state, email)

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.kind).toBe('Taxa de custódia')
    expect(row.descricao).toContain('Renovação do plano')
    expect(row.taxa).toBe(600)
    expect(row.impacto).toBe(-600)
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

  it('fatura paga sai do saldo seja qual for a forma (o Pix entra como linha própria e se anula); só a fatura em aberto não move nada', () => {
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
    // Até 17/11/2026 a fatura paga por Pix entrava com impacto 0 e a ENTRADA do Pix aparecia sozinha: o extrato
    // dizia +R$ 6,00 enquanto o saldo não saía do lugar. Hoje a saída existe, como no livro-razão.
    expect(rowPix.impacto).toBe(-600)
    expect(rowSaldo.impacto).toBe(-600)
  })
})

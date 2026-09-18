import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { PARAMETROS_VAZIOS } from '@/domain/dre'
import { seedState } from '@/domain/seed'
import type { AppState, FaturaCustodia, PlanoCustodia } from '@/domain/types'
import type { RecebimentoGateway } from '@/server/payments/recebimentos'
import { montarRelatorio, NOMES_RELATORIOS, type Fontes } from './dados'

function criarFontes(state: AppState, recebimentos: RecebimentoGateway[] = []): Fontes {
  return {
    state,
    ledger: [],
    auditoria: [],
    manuaisTodos: [],
    manuaisVigentes: [],
    parametros: { ...PARAMETROS_VAZIOS },
    parametrosLista: [],
    saldosLedger: {},
    exportacoes: [],
    retiradas: [],
    recebimentos,
    semBanco: true,
  }
}

describe('Relatórios B3 — Financeiro e Custódia (dados.ts)', () => {
  it('inclui os 4 novos relatórios na lista oficial NOMES_RELATORIOS', () => {
    expect(NOMES_RELATORIOS).toContain('recebimentos-gateway')
    expect(NOMES_RELATORIOS).toContain('planos-custodia')
    expect(NOMES_RELATORIOS).toContain('receita-diferida')
    expect(NOMES_RELATORIOS).toContain('faturas-custodia')
  })

  describe('Relatório: recebimentos-gateway', () => {
    it('monta corretamente com segregação de tarifa e valor líquido', () => {
      const state = seedState()
      const agora = Date.now()
      const recebimento: RecebimentoGateway = {
        id: 1,
        createdAt: agora,
        paymentId: 'pay-mp-12345',
        externalReference: 'RET-INTENT-001',
        tipoOperacao: 'retirada',
        userEmail: 'gabrielsilva@testeaurea.com.br',
        metodo: 'pix',
        parcelas: 1,
        valorBruto: 5000,
        valorPagoCliente: 5000,
        tarifaGateway: 150,
        valorLiquido: 4850,
        aprovadoEm: agora,
        liberacaoPrevista: agora,
        competencia: '2026-09',
      }

      const rel = montarRelatorio('recebimentos-gateway', criarFontes(state, [recebimento]))
      expect(rel.nome).toBe('recebimentos-gateway')
      expect(rel.titulo).toBe('Recebimentos pelo gateway')
      expect(rel.linhas).toHaveLength(1)

      const linha = rel.linhas[0]
      expect(linha.Tipo).toBe('retirada')
      expect(linha.Conta).toBe('gabrielsilva@testeaurea.com.br')
      expect(linha.Metodo).toBe('pix')
      expect(linha.Parcelas).toBe(1)
      expect(linha.Bruto).toBe(50)
      expect(linha.Tarifa).toBe(1.5)
      expect(linha.Liquido).toBe(48.5)
      expect(linha.Situacao).toBe('liberado')
      expect(linha.Competencia).toBe('2026-09')
    })
  })

  describe('Relatório: planos-custodia', () => {
    it('lista planos de custódia contratados', () => {
      const state = seedState()
      const plano: PlanoCustodia = {
        id: 'PLC-TESTE-01',
        userEmail: 'gabrielsilva@testeaurea.com.br',
        protocoloEnvio: 'ENV-001',
        modalidade: 'anual',
        quantidadeContratada: 10,
        moedaIds: ['RO-000001'],
        valorPorMoedaCents: 2000,
        valorTotalCents: 20000,
        parcelasMax: 1,
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
        formaPagamento: 'pix',
        paymentIntentRef: 'PI-001',
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }
      state.planosCustodia = [plano]

      const rel = montarRelatorio('planos-custodia', criarFontes(state))
      expect(rel.nome).toBe('planos-custodia')
      expect(rel.titulo).toBe('Planos de custódia')
      expect(rel.linhas).toHaveLength(1)

      const linha = rel.linhas[0]
      expect(linha.Plano).toBe('PLC-TESTE-01')
      expect(linha.Modalidade).toBe('anual')
      expect(linha.Moedas).toBe(10)
      expect(linha.Valor).toBe(200)
      expect(linha.Inicio).toBe('2026-09')
      expect(linha.Pago_Ate).toBe('2027-08')
      expect(linha.Situacao).toBe('vigente')
      expect(linha.Forma).toBe('pix')
    })
  })

  describe('Relatório: receita-diferida', () => {
    it('calcula apropriação e saldo a apropriar de planos anuais', () => {
      const state = seedState()
      const plano: PlanoCustodia = {
        id: 'PLC-ANUAL-02',
        userEmail: 'gabrielsilva@testeaurea.com.br',
        protocoloEnvio: 'ENV-002',
        modalidade: 'anual',
        quantidadeContratada: 1,
        moedaIds: ['RO-000002'],
        valorPorMoedaCents: 2000,
        valorTotalCents: 2000,
        parcelasMax: 1,
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: 'PI-002',
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }
      state.planosCustodia = [plano]

      const rel = montarRelatorio('receita-diferida', criarFontes(state))
      expect(rel.nome).toBe('receita-diferida')
      expect(rel.titulo).toBe('Receita diferida de custódia')
      expect(rel.linhas).toHaveLength(1)

      const linha = rel.linhas[0]
      expect(linha.Plano).toBe('PLC-ANUAL-02')
      expect(linha.Modalidade).toBe('anual')
      expect(linha.Valor_Pago).toBe(20)
      expect(typeof linha.Ja_Apropriado).toBe('number')
      expect(typeof linha.A_Apropriar).toBe('number')
      expect((linha.Ja_Apropriado as number) + (linha.A_Apropriar as number)).toBeCloseTo(20, 2)
    })
  })

  describe('Relatório: faturas-custodia', () => {
    it('lista faturas de custódia com valores e status corretos', () => {
      const state = seedState()
      const agora = Date.now()
      const fatura: FaturaCustodia = {
        id: 'FAT-2026-09-001',
        userEmail: 'gabrielsilva@testeaurea.com.br',
        competencia: '2026-09',
        quantidadeMoedas: 2,
        moedaIds: ['RO-000001', 'RO-000002'],
        valorCents: 400,
        status: 'paga',
        dataEmissao: agora,
        dataVencimento: agora + 10 * 86400000,
        dataPagamento: agora,
        formaPagamento: 'saldo',
        paymentIntentId: null,
        planoId: null,
        origem: 'ciclo_mensal',
      }
      state.faturasCustodia = [fatura]

      const rel = montarRelatorio('faturas-custodia', criarFontes(state))
      expect(rel.nome).toBe('faturas-custodia')
      expect(rel.titulo).toBe('Faturas de custódia')
      expect(rel.linhas).toHaveLength(1)

      const linha = rel.linhas[0]
      expect(linha.Fatura).toBe('FAT-2026-09-001')
      expect(linha.Conta).toBe('gabrielsilva@testeaurea.com.br')
      expect(linha.Competencia).toBe('2026-09')
      expect(linha.Origem).toBe('ciclo_mensal')
      expect(linha.Moedas).toBe(2)
      expect(linha.Valor).toBe(4)
      expect(linha.Situacao).toBe('paga')
      expect(linha.Forma).toBe('saldo')
    })
  })
})

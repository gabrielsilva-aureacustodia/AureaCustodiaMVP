import { describe, expect, it } from 'vitest'

import {
  apropriacaoDoPlano,
  calcularReceitaDiferida,
  mesNoPeriodo,
  receitaDeCustodiaNoPeriodo,
} from './competencia'
import { periodoAnual, periodoMensal } from './dre'
import type { FaturaCustodia, PlanoCustodia } from './types'

describe('Regime de Competência e Apropriação Contábil (competencia.ts)', () => {
  describe('mesNoPeriodo', () => {
    it('identifica corretamente se uma competência pertence ao período', () => {
      const p = periodoMensal(2026, 8)
      expect(mesNoPeriodo('2026-08', p)).toBe(true)
      expect(mesNoPeriodo('2026-07', p)).toBe(false)
      expect(mesNoPeriodo('2026-09', p)).toBe(false)
    })

    it('funciona para período anual', () => {
      const p = periodoAnual(2026)
      expect(mesNoPeriodo('2026-01', p)).toBe(true)
      expect(mesNoPeriodo('2026-12', p)).toBe(true)
      expect(mesNoPeriodo('2025-12', p)).toBe(false)
      expect(mesNoPeriodo('2027-01', p)).toBe(false)
    })
  })

  describe('apropriacaoDoPlano', () => {
    it('apropria plano mensal no próprio mês somando exatamente o valor no ano', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-001',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-001',
        modalidade: 'mensal',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 200,
        valorTotalCents: 200,
        parcelasMax: 1,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2026-01',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      // No ano de 2026 inteiro, deve somar exatamente 200
      const pAno = periodoAnual(2026)
      expect(apropriacaoDoPlano(plano, pAno)).toBe(200)

      // No mês 1 (janeiro), deve ser 200 cents (R$ 2,00)
      expect(apropriacaoDoPlano(plano, periodoMensal(2026, 1))).toBe(200)

      // Nos demais meses, 0
      for (let mes = 2; mes <= 12; mes++) {
        const pMes = periodoMensal(2026, mes)
        expect(apropriacaoDoPlano(plano, pMes)).toBe(0)
      }
    })

    it('apropria plano mensal de 3 moedas no próprio mês', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-002',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-002',
        modalidade: 'mensal',
        quantidadeContratada: 3,
        moedaIds: [],
        valorPorMoedaCents: 200,
        valorTotalCents: 600,
        parcelasMax: 1,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2026-01',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      const pAno = periodoAnual(2026)
      expect(apropriacaoDoPlano(plano, pAno)).toBe(600)
      expect(apropriacaoDoPlano(plano, periodoMensal(2026, 1))).toBe(600)
      expect(apropriacaoDoPlano(plano, periodoMensal(2026, 2))).toBe(0)
    })

    it('deduz valores estornados na apropriação', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-005',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-005',
        modalidade: 'mensal',
        quantidadeContratada: 3,
        moedaIds: [],
        valorPorMoedaCents: 200,
        valorTotalCents: 600,
        parcelasMax: 1,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2026-01',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 200, // 1 moeda estornada
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      // Valor líquido = 400
      expect(apropriacaoDoPlano(plano, periodoAnual(2026))).toBe(400)
      expect(apropriacaoDoPlano(plano, periodoMensal(2026, 1))).toBe(400)
    })
  })

  describe('receitaDeCustodiaNoPeriodo', () => {
    it('soma faturas mensais e apropriação de planos sem contagem dupla', () => {
      const planoMensal: PlanoCustodia = {
        id: 'PLC-010',
        userEmail: 'mensal@teste.com',
        protocoloEnvio: 'ENV-010',
        modalidade: 'mensal',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 200,
        valorTotalCents: 200,
        parcelasMax: 1,
        inicioCompetencia: '2026-08',
        pagoAteCompetencia: '2026-08',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      const faturas: FaturaCustodia[] = [
        // Fatura do ciclo mensal de agosto paga: R$ 4,00 (2 moedas)
        {
          id: 'FAT-001',
          userEmail: 'outro@teste.com',
          competencia: '2026-08',
          quantidadeMoedas: 2,
          moedaIds: [],
          valorCents: 400,
          status: 'paga',
          dataEmissao: new Date(2026, 7, 1).getTime(),
          dataVencimento: new Date(2026, 7, 10).getTime(),
          dataPagamento: new Date(2026, 7, 2).getTime(),
          origem: 'ciclo_mensal',
        },
        // Fatura de contratação do plano mensal paga: R$ 2,00 (NÃO DEVE SOMAR DUPLICADA)
        {
          id: 'FAT-002',
          userEmail: 'mensal@teste.com',
          competencia: '2026-08',
          quantidadeMoedas: 1,
          moedaIds: [],
          valorCents: 200,
          status: 'paga',
          dataEmissao: new Date(2026, 7, 5).getTime(),
          dataVencimento: new Date(2026, 7, 15).getTime(),
          dataPagamento: new Date(2026, 7, 5).getTime(),
          origem: 'contratacao',
          planoId: 'PLC-010',
        },
      ]

      const pAgosto = periodoMensal(2026, 8)
      // Receita esperada: R$ 4,00 (fatura ciclo) + R$ 2,00 (apropriação do plano mensal) = R$ 6,00 (600 cents)
      const total = receitaDeCustodiaNoPeriodo(faturas, [planoMensal], pAgosto)
      expect(total).toBe(600)
    })
  })

  describe('calcularReceitaDiferida', () => {
    it('calcula corretamente o diferimento contábil de um plano mensal', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-020',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-020',
        modalidade: 'mensal',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 200,
        valorTotalCents: 200,
        parcelasMax: 1,
        inicioCompetencia: '2026-03',
        pagoAteCompetencia: '2026-03',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      // Em 15/03/2026: março apropriado (1 mês = 200 cents)
      const dataRefMar = new Date(2026, 2, 15).getTime()
      const difMar = calcularReceitaDiferida(plano, dataRefMar)

      expect(difMar.valorPago).toBe(200)
      expect(difMar.jaApropriado).toBe(200)
      expect(difMar.aApropriar).toBe(0)
      expect(difMar.mesesApropriados).toBe(1)
      expect(difMar.mesesRestantes).toBe(0)

      // Em 15/02/2026: antes do início do plano (março)
      const dataRefFev = new Date(2026, 1, 15).getTime()
      const difFev = calcularReceitaDiferida(plano, dataRefFev)

      expect(difFev.valorPago).toBe(200)
      expect(difFev.jaApropriado).toBe(0)
      expect(difFev.aApropriar).toBe(200)
      expect(difFev.mesesApropriados).toBe(0)
      expect(difFev.mesesRestantes).toBe(1)
    })
  })
})

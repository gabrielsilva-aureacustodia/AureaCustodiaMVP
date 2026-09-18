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
    it('apropria plano de R$ 24,00 em 12 meses somando exatamente R$ 24,00 no ano', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-001',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-001',
        modalidade: 'anual',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 2400,
        valorTotalCents: 2400,
        parcelasMax: 12,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2026-12',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      // No ano de 2026 inteiro, deve somar exatamente 2400
      const pAno = periodoAnual(2026)
      expect(apropriacaoDoPlano(plano, pAno)).toBe(2400)

      // Em cada mês individual, deve ser 200 cents (R$ 2,00)
      for (let mes = 1; mes <= 12; mes++) {
        const pMes = periodoMensal(2026, mes)
        expect(apropriacaoDoPlano(plano, pMes)).toBe(200)
      }
    })

    it('apropria plano de R$ 72,00 (3 moedas) somando exatamente R$ 72,00 no ano', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-002',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-002',
        modalidade: 'anual',
        quantidadeContratada: 3,
        moedaIds: [],
        valorPorMoedaCents: 2400,
        valorTotalCents: 7200,
        parcelasMax: 12,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2026-12',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      const pAno = periodoAnual(2026)
      expect(apropriacaoDoPlano(plano, pAno)).toBe(7200)

      // R$ 6,00 por mês
      for (let mes = 1; mes <= 12; mes++) {
        const pMes = periodoMensal(2026, mes)
        expect(apropriacaoDoPlano(plano, pMes)).toBe(600)
      }
    })

    it('coloca a sobra do arredondamento no 12º mês para fechar a soma exata', () => {
      // R$ 25,00 (2500 cents): 2500 / 12 = 208, sobra = 4 cents (208 * 11 = 2288, 12º mês = 212)
      const plano: PlanoCustodia = {
        id: 'PLC-003',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-003',
        modalidade: 'anual',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 2500,
        valorTotalCents: 2500,
        parcelasMax: 12,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2026-12',
        status: 'vigente',
        formaPagamento: 'pix',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      let somaMeses = 0
      for (let mes = 1; mes <= 11; mes++) {
        const valorMes = apropriacaoDoPlano(plano, periodoMensal(2026, mes))
        expect(valorMes).toBe(208)
        somaMeses += valorMes
      }

      const mes12 = apropriacaoDoPlano(plano, periodoMensal(2026, 12))
      expect(mes12).toBe(212) // 208 + 4 de sobra
      somaMeses += mes12

      expect(somaMeses).toBe(2500)
      expect(apropriacaoDoPlano(plano, periodoAnual(2026))).toBe(2500)
    })

    it('plano que começa em novembro divide receita entre os dois anos', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-004',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-004',
        modalidade: 'anual',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 2400,
        valorTotalCents: 2400,
        parcelasMax: 12,
        inicioCompetencia: '2026-11',
        pagoAteCompetencia: '2027-10',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      // Em 2026: nov e dez = 2 meses * 200 = 400
      expect(apropriacaoDoPlano(plano, periodoAnual(2026))).toBe(400)

      // Em 2027: jan a out = 10 meses * 200 = 2000
      expect(apropriacaoDoPlano(plano, periodoAnual(2027))).toBe(2000)

      // Soma dos dois anos = 2400
      expect(
        apropriacaoDoPlano(plano, periodoAnual(2026)) +
          apropriacaoDoPlano(plano, periodoAnual(2027)),
      ).toBe(2400)
    })

    it('deduz valores estornados na apropriação', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-005',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-005',
        modalidade: 'anual',
        quantidadeContratada: 3,
        moedaIds: [],
        valorPorMoedaCents: 2400,
        valorTotalCents: 7200,
        parcelasMax: 12,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2026-12',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 2400, // 1 moeda estornada
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      // Valor líquido = 4800 (400 por mês)
      expect(apropriacaoDoPlano(plano, periodoAnual(2026))).toBe(4800)
      expect(apropriacaoDoPlano(plano, periodoMensal(2026, 1))).toBe(400)
    })
    it('apropria plano de 24 meses a 1/24 por mês, somando R$ 36,00 nos dois anos', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-BIENAL',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-BIENAL',
        modalidade: 'bienal',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 3600,
        valorTotalCents: 3600,
        parcelasMax: 12,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2027-12',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      // R$ 1,50 por mês, nos 24 meses — e nenhum centavo no 25º
      for (let mes = 1; mes <= 12; mes++) {
        expect(apropriacaoDoPlano(plano, periodoMensal(2026, mes))).toBe(150)
        expect(apropriacaoDoPlano(plano, periodoMensal(2027, mes))).toBe(150)
      }
      expect(apropriacaoDoPlano(plano, periodoAnual(2026))).toBe(1800)
      expect(apropriacaoDoPlano(plano, periodoAnual(2027))).toBe(1800)
      expect(apropriacaoDoPlano(plano, periodoAnual(2028))).toBe(0)
    })
  })

  describe('receitaDeCustodiaNoPeriodo', () => {
    it('soma faturas mensais e apropriação de planos anuais sem contagem dupla', () => {
      const planoAnual: PlanoCustodia = {
        id: 'PLC-010',
        userEmail: 'anual@teste.com',
        protocoloEnvio: 'ENV-010',
        modalidade: 'anual',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 2400,
        valorTotalCents: 2400,
        parcelasMax: 12,
        inicioCompetencia: '2026-08',
        pagoAteCompetencia: '2027-07',
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
          userEmail: 'mensal@teste.com',
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
        // Fatura de contratação do plano anual paga: R$ 24,00 (NÃO DEVE SOMAR DUPLICADA)
        {
          id: 'FAT-002',
          userEmail: 'anual@teste.com',
          competencia: '2026-08',
          quantidadeMoedas: 1,
          moedaIds: [],
          valorCents: 2400,
          status: 'paga',
          dataEmissao: new Date(2026, 7, 5).getTime(),
          dataVencimento: new Date(2026, 7, 15).getTime(),
          dataPagamento: new Date(2026, 7, 5).getTime(),
          origem: 'contratacao',
          planoId: 'PLC-010',
        },
      ]

      const pAgosto = periodoMensal(2026, 8)
      // Receita esperada: R$ 4,00 (fatura mensal) + R$ 2,00 (1/12 do plano anual) = R$ 6,00 (600 cents)
      const total = receitaDeCustodiaNoPeriodo(faturas, [planoAnual], pAgosto)
      expect(total).toBe(600)
    })
  })

  describe('calcularReceitaDiferida', () => {
    it('calcula corretamente o diferimento contábil de um plano anual', () => {
      const plano: PlanoCustodia = {
        id: 'PLC-020',
        userEmail: 'user@teste.com',
        protocoloEnvio: 'ENV-020',
        modalidade: 'anual',
        quantidadeContratada: 1,
        moedaIds: [],
        valorPorMoedaCents: 2400,
        valorTotalCents: 2400,
        parcelasMax: 12,
        inicioCompetencia: '2026-01',
        pagoAteCompetencia: '2026-12',
        status: 'vigente',
        formaPagamento: 'cartao',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      }

      // Em 15/03/2026: janeiro, fevereiro e março apropriados (3 meses = 600 cents)
      const dataRefMar = new Date(2026, 2, 15).getTime()
      const difMar = calcularReceitaDiferida(plano, dataRefMar)

      expect(difMar.valorPago).toBe(2400)
      expect(difMar.jaApropriado).toBe(600)
      expect(difMar.aApropriar).toBe(1800)
      expect(difMar.mesesApropriados).toBe(3)
      expect(difMar.mesesRestantes).toBe(9)
    })
  })
})

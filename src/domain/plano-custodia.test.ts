/**
 * Testes unitários para as regras puras de planos de custódia (B2.3).
 */

import { describe, expect, it } from 'vitest'

import {
  calcularPagoAte,
  competenciaCoberta,
  gerarFaturaDoCiclo,
  moedasCobertas,
  renovacaoAnualDevida,
  somarMeses,
  valorDoPlano,
} from '@/domain/plano-custodia'
import type { Coin, PlanoCustodia, User } from '@/domain/types'

function criarMoeda(id: string, statusRecibo: 'Ativo' | 'Bloqueado' | 'Extinto' = 'Ativo'): Coin {
  return {
    id,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    entrada: '14/09/2026',
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 20000,
    protocolo: 'ENV-2026-0001',
    recibo: {
      codigo: `REC-${id}`,
      hash: 'hash-fake',
      dataEmissao: '14/09/2026',
      status: statusRecibo,
    },
  }
}

function criarPlano(parciais: Partial<PlanoCustodia> = {}): PlanoCustodia {
  return {
    id: 'PLC-000001',
    userEmail: 'cliente@teste.com',
    protocoloEnvio: 'ENV-2026-0001',
    modalidade: 'mensal',
    quantidadeContratada: 1,
    moedaIds: ['MOE-001'],
    valorPorMoedaCents: 200,
    valorTotalCents: 200,
    parcelasMax: 1,
    inicioCompetencia: '2026-09',
    pagoAteCompetencia: '2026-09',
    status: 'vigente',
    formaPagamento: 'saldo',
    paymentIntentRef: null,
    assinaturaId: null,
    estornadoCents: 0,
    criadoEm: 1789344000000,
    atualizadoEm: 1789344000000,
    ...parciais,
  }
}

describe('plano-custodia (B2.3)', () => {
  describe('valorDoPlano', () => {
    it('calcula plano mensal padrão (R$ 2,00 por moeda, 1 parcela)', () => {
      const v1 = valorDoPlano('mensal', 1)
      expect(v1).toEqual({ porMoeda: 200, total: 200, parcelasMax: 1 })

      const v5 = valorDoPlano('mensal', 5)
      expect(v5).toEqual({ porMoeda: 200, total: 1000, parcelasMax: 1 })
    })

    it('calcula plano anual padrão (R$ 24,00 por moeda, até 12 parcelas)', () => {
      const v1 = valorDoPlano('anual', 1)
      expect(v1).toEqual({ porMoeda: 2400, total: 2400, parcelasMax: 12 })

      const v3 = valorDoPlano('anual', 3)
      expect(v3).toEqual({ porMoeda: 2400, total: 7200, parcelasMax: 12 })
    })

    it('aceita sobrescrita de taxas e limite de parcelamento', () => {
      const v = valorDoPlano('anual', 2, {
        custodiaAnualPorMoeda: 3000,
        custodiaAnualParcelasMax: 6,
      })
      expect(v).toEqual({ porMoeda: 3000, total: 6000, parcelasMax: 6 })
    })

    it('quantidade zero ou negativa resulta em total zero', () => {
      expect(valorDoPlano('mensal', 0).total).toBe(0)
      expect(valorDoPlano('anual', -2).total).toBe(0)
    })
  })

  describe('somarMeses', () => {
    it('soma meses no mesmo ano', () => {
      expect(somarMeses('2026-03', 4)).toBe('2026-07')
      expect(somarMeses('2026-01', 11)).toBe('2026-12')
    })

    it('soma meses virando o ano', () => {
      expect(somarMeses('2026-10', 3)).toBe('2027-01')
      expect(somarMeses('2026-11', 14)).toBe('2028-01')
    })

    it('mantém competência ao somar 0', () => {
      expect(somarMeses('2026-09', 0)).toBe('2026-09')
    })

    it('subtrai meses no mesmo ano', () => {
      expect(somarMeses('2026-07', -2)).toBe('2026-05')
    })

    it('subtrai meses virando o ano para trás', () => {
      expect(somarMeses('2026-01', -1)).toBe('2025-12')
      expect(somarMeses('2026-02', -14)).toBe('2024-12')
    })

    it('lança erro para competência em formato inválido', () => {
      expect(() => somarMeses('invalido', 1)).toThrow(/Competência inválida/)
      expect(() => somarMeses('2026-13', 1)).toThrow(/Competência inválida/)
    })
  })

  describe('calcularPagoAte', () => {
    it('mensal cobre a própria competência (+0 meses)', () => {
      expect(calcularPagoAte('2026-09', 'mensal')).toBe('2026-09')
    })

    it('anual cobre 12 meses (+11 meses)', () => {
      expect(calcularPagoAte('2026-09', 'anual')).toBe('2027-08')
      expect(calcularPagoAte('2026-12', 'anual')).toBe('2027-11')
    })
  })

  describe('competenciaCoberta', () => {
    it('rejeita plano que não está vigente', () => {
      const planoAguardando = criarPlano({
        status: 'aguardando_pagamento',
        pagoAteCompetencia: null,
      })
      expect(competenciaCoberta(planoAguardando, '2026-09')).toBe(false)

      const planoCancelado = criarPlano({
        status: 'cancelado',
        pagoAteCompetencia: '2026-09',
      })
      expect(competenciaCoberta(planoCancelado, '2026-09')).toBe(false)
    })

    it('valida cobertura de competências para plano vigente', () => {
      const planoAnual = criarPlano({
        modalidade: 'anual',
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
      })

      expect(competenciaCoberta(planoAnual, '2026-08')).toBe(false)
      expect(competenciaCoberta(planoAnual, '2026-09')).toBe(true)
      expect(competenciaCoberta(planoAnual, '2027-01')).toBe(true)
      expect(competenciaCoberta(planoAnual, '2027-08')).toBe(true)
      expect(competenciaCoberta(planoAnual, '2027-09')).toBe(false)
    })
  })

  describe('moedasCobertas', () => {
    it('reúne todas as moedas cobertas de múltiplos planos vigentes', () => {
      const p1 = criarPlano({
        id: 'PLC-001',
        moedaIds: ['M-1', 'M-2'],
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
      })
      const p2 = criarPlano({
        id: 'PLC-002',
        moedaIds: ['M-3'],
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2026-09',
        status: 'vigente',
      })
      const p3NaoPago = criarPlano({
        id: 'PLC-003',
        moedaIds: ['M-4'],
        status: 'aguardando_pagamento',
        pagoAteCompetencia: null,
      })

      const cobertasSet = moedasCobertas([p1, p2, p3NaoPago], '2026-09')
      expect(Array.from(cobertasSet).sort()).toEqual(['M-1', 'M-2', 'M-3'].sort())

      // Em 2026-10, o plano p2 (mensal) expirou, apenas p1 permanece
      const cobertasMesSeguinte = moedasCobertas([p1, p2, p3NaoPago], '2026-10')
      expect(Array.from(cobertasMesSeguinte)).toEqual(['M-1', 'M-2'])
    })
  })

  describe('gerarFaturaDoCiclo', () => {
    const userBase: User = {
      name: 'Cliente Teste',
      balance: 10000,
      coins: [
        criarMoeda('M-1'),
        criarMoeda('M-2'),
        criarMoeda('M-3'),
      ],
    }

    it('retorna null se o usuário não tiver moedas ativas', () => {
      const userSemMoedas: User = { name: 'Vazio', balance: 0, coins: [] }
      const fatura = gerarFaturaDoCiclo(userSemMoedas, 'cliente@teste.com', '2026-10', [])
      expect(fatura).toBeNull()
    })

    it('retorna null se todas as moedas estiverem cobertas por plano', () => {
      const plano = criarPlano({
        moedaIds: ['M-1', 'M-2', 'M-3'],
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
      })
      const fatura = gerarFaturaDoCiclo(userBase, 'cliente@teste.com', '2026-10', [plano])
      expect(fatura).toBeNull()
    })

    it('fatura apenas moedas não cobertas, descontando as cobertas', () => {
      const plano = criarPlano({
        moedaIds: ['M-1', 'M-2'],
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
      })
      // M-1 e M-2 estão cobertas; M-3 não está coberta
      const agora = 1789344000000
      const fatura = gerarFaturaDoCiclo(userBase, 'cliente@teste.com', '2026-10', [plano], undefined, agora)

      expect(fatura).not.toBeNull()
      expect(fatura?.quantidadeMoedas).toBe(1)
      expect(fatura?.moedaIds).toEqual(['M-3'])
      expect(fatura?.valorCents).toBe(200) // R$ 2,00
      expect(fatura?.origem).toBe('ciclo_mensal')
      expect(fatura?.planoId).toBeNull()
      expect(fatura?.status).toBe('pendente')
    })

    it('desconsidera moedas com recibo extinto', () => {
      const userComExtinta: User = {
        name: 'Cliente',
        balance: 0,
        coins: [
          criarMoeda('M-1', 'Ativo'),
          criarMoeda('M-2', 'Extinto'), // Extinto não deve pagar
        ],
      }
      const fatura = gerarFaturaDoCiclo(userComExtinta, 'cliente@teste.com', '2026-10', [])
      expect(fatura?.quantidadeMoedas).toBe(1)
      expect(fatura?.moedaIds).toEqual(['M-1'])
      expect(fatura?.valorCents).toBe(200)
    })
  })

  describe('renovacaoAnualDevida', () => {
    it('retorna false para planos mensais', () => {
      const planoMensal = criarPlano({
        modalidade: 'mensal',
        pagoAteCompetencia: '2026-09',
        status: 'vigente',
      })
      expect(renovacaoAnualDevida(planoMensal, '2026-10')).toBe(false)
    })

    it('retorna false se o plano anual não estiver vigente', () => {
      const planoInativo = criarPlano({
        modalidade: 'anual',
        pagoAteCompetencia: '2027-08',
        status: 'encerrado',
      })
      expect(renovacaoAnualDevida(planoInativo, '2027-09')).toBe(false)
    })

    it('identifica renovação devida exatamente no 13º mês (pagoAteCompetencia === mesAnterior)', () => {
      const planoAnual = criarPlano({
        modalidade: 'anual',
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
      })

      // Mês 12: ainda coberto
      expect(renovacaoAnualDevida(planoAnual, '2027-08')).toBe(false)

      // Mês 13: venceu em 2027-08, logo em 2027-09 a renovação é devida!
      expect(renovacaoAnualDevida(planoAnual, '2027-09')).toBe(true)

      // Mês 14: posterior
      expect(renovacaoAnualDevida(planoAnual, '2027-10')).toBe(false)
    })
  })
})

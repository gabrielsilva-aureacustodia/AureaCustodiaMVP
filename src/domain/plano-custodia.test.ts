/**
 * Testes unitários para as regras puras de planos de custódia (B2.3).
 */

import { describe, expect, it } from 'vitest'

import {
  alimentarPlanoNaAnalise,
  calcularPagoAte,
  competenciaCoberta,
  gerarFaturaDoCiclo,
  moedasCobertas,
  mesesCobertos,
  renovacaoDevida,
  somarMeses,
  valorDoPlano,
} from '@/domain/plano-custodia'
import type { Coin, FaturaCustodia, PlanoCustodia, User } from '@/domain/types'

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
    modalidade: 'anual',
    quantidadeContratada: 1,
    moedaIds: ['MOE-001'],
    valorPorMoedaCents: 2400,
    valorTotalCents: 2400,
    parcelasMax: 12,
    inicioCompetencia: '2026-09',
    pagoAteCompetencia: '2027-08',
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
    // Os dois testes do plano de 24 meses saíram em 20/09/2026 com o próprio
    // plano: passou a existir um prazo só.

    it('o anual sai a R$ 2,00 por moeda por mês', () => {
      expect(valorDoPlano('anual', 1).total / 12).toBe(200)
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
      expect(valorDoPlano('anual', 0).total).toBe(0)
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
    it('anual cobre 12 meses (+11 meses)', () => {
      expect(calcularPagoAte('2026-09', 'anual')).toBe('2027-08')
      expect(calcularPagoAte('2026-12', 'anual')).toBe('2027-11')
    })

    it('mesesCobertos diz o prazo da modalidade', () => {
      expect(mesesCobertos('anual')).toBe(12)
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
      // Anual que acabou em 2026-08: em 2026-09 a renovacao esta devida, e uma moeda
      // esperando fatura de renovacao segue coberta para o ciclo nao cobrar em dobro.
      const p2 = criarPlano({
        id: 'PLC-002',
        moedaIds: ['M-3'],
        inicioCompetencia: '2025-09',
        pagoAteCompetencia: '2026-08',
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

      // Em 2026-10 o p2 ja passou ate do mes da renovacao: so p1 cobre
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

  describe('renovacaoDevida', () => {
    it('retorna false se o plano não estiver vigente', () => {
      const planoInativo = criarPlano({
        modalidade: 'anual',
        pagoAteCompetencia: '2027-08',
        status: 'encerrado',
      })
      expect(renovacaoDevida(planoInativo, '2027-09')).toBe(false)
    })

    it('identifica renovação do anual exatamente no 13º mês (pagoAteCompetencia === mesAnterior)', () => {
      const planoAnual = criarPlano({
        modalidade: 'anual',
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
      })

      // Mês 12: ainda coberto
      expect(renovacaoDevida(planoAnual, '2027-08')).toBe(false)

      // Mês 13: venceu em 2027-08, logo em 2027-09 a renovação é devida!
      expect(renovacaoDevida(planoAnual, '2027-09')).toBe(true)

      // Mês 14: posterior
      expect(renovacaoDevida(planoAnual, '2027-10')).toBe(false)
    })

    // O caso do plano de 24 meses saiu em 20/09/2026 junto com o plano. O que
    // ele protegia — a renovação respeitar o prazo coberto em vez de um 12 fixo
    // no código — continua coberto pelo teste do anual logo acima.
  })

  describe('alimentarPlanoNaAnalise (B2.5)', () => {
    it('3 moedas contratadas e pagas no plano anual, 1 recusada: plano com 2 moedas e R$ 24,00 estornados ao saldo', () => {
      const user: User = { name: 'Cliente', balance: 10000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-ANUAL-1',
        modalidade: 'anual',
        quantidadeContratada: 3,
        valorPorMoedaCents: 2400,
        valorTotalCents: 7200,
        status: 'vigente',
        pagoAteCompetencia: '2027-08',
        moedaIds: [],
        estornadoCents: 0,
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-1',
        userEmail: 'cliente@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 3,
        moedaIds: [],
        valorCents: 7200,
        status: 'paga',
        dataEmissao: 1000,
        dataVencimento: 2000,
        dataPagamento: 1500,
        formaPagamento: 'cartao',
        paymentIntentId: 'PAY-1',
        planoId: plano.id,
        origem: 'contratacao',
      }

      alimentarPlanoNaAnalise({
        plano,
        faturas: [fatura],
        user,
        moedaIdsAprovadas: ['RO-001', 'RO-002'],
        quantidadeRecusadas: 1,
      })

      expect(plano.moedaIds).toEqual(['RO-001', 'RO-002'])
      expect(plano.estornadoCents).toBe(2400) // R$ 24,00 de estorno
      expect(user.balance).toBe(10000 + 2400) // Saldo sobe R$ 24,00
      expect(plano.status).toBe('vigente')
    })

    it('3 moedas contratadas e pagas no plano de 24 meses, 1 recusada: plano com 2 moedas e R$ 36,00 estornados ao saldo', () => {
      const user: User = { name: 'Cliente', balance: 5000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-BIENAL-1',
        modalidade: 'anual',
        quantidadeContratada: 3,
        valorPorMoedaCents: 3600,
        valorTotalCents: 10800,
        status: 'vigente',
        pagoAteCompetencia: '2028-08',
        moedaIds: [],
        estornadoCents: 0,
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-2',
        userEmail: 'cliente@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 3,
        moedaIds: [],
        valorCents: 10800,
        status: 'paga',
        dataEmissao: 1000,
        dataVencimento: 2000,
        dataPagamento: 1500,
        formaPagamento: 'saldo',
        paymentIntentId: null,
        planoId: plano.id,
        origem: 'contratacao',
      }

      alimentarPlanoNaAnalise({
        plano,
        faturas: [fatura],
        user,
        moedaIdsAprovadas: ['RO-001', 'RO-002'],
        quantidadeRecusadas: 1,
      })

      expect(plano.moedaIds).toEqual(['RO-001', 'RO-002'])
      expect(plano.estornadoCents).toBe(3600) // R$ 36,00 de estorno
      expect(user.balance).toBe(5000 + 3600) // Saldo sobe R$ 36,00
    })

    it('3 moedas contratadas e NÃO pagas, 1 recusada: fatura de contratação passa a valer só as aprovadas', () => {
      const user: User = { name: 'Cliente', balance: 5000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-PEND-1',
        modalidade: 'anual',
        quantidadeContratada: 3,
        valorPorMoedaCents: 3600,
        valorTotalCents: 10800,
        status: 'aguardando_pagamento',
        pagoAteCompetencia: null,
        moedaIds: [],
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-3',
        userEmail: 'cliente@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 3,
        moedaIds: [],
        valorCents: 10800,
        status: 'pendente',
        dataEmissao: 1000,
        dataVencimento: 2000,
        dataPagamento: null,
        formaPagamento: null,
        paymentIntentId: null,
        planoId: plano.id,
        origem: 'contratacao',
      }

      alimentarPlanoNaAnalise({
        plano,
        faturas: [fatura],
        user,
        moedaIdsAprovadas: ['RO-001', 'RO-002'],
        quantidadeRecusadas: 1,
      })

      expect(plano.moedaIds).toEqual(['RO-001', 'RO-002'])
      expect(plano.valorTotalCents).toBe(7200)
      expect(fatura.valorCents).toBe(7200)
      expect(fatura.quantidadeMoedas).toBe(2)
      expect(fatura.moedaIds).toEqual(['RO-001', 'RO-002'])
      expect(user.balance).toBe(5000) // Sem alteração de saldo
    })

    it('todas as moedas recusadas com plano pago: cancela plano e estorno integral', () => {
      const user: User = { name: 'Cliente', balance: 1000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-CANCEL-1',
        modalidade: 'anual',
        quantidadeContratada: 2,
        valorPorMoedaCents: 3600,
        valorTotalCents: 7200,
        status: 'vigente',
        pagoAteCompetencia: '2028-08',
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-4',
        userEmail: 'cliente@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 2,
        moedaIds: [],
        valorCents: 7200,
        status: 'paga',
        dataEmissao: 1000,
        dataVencimento: 2000,
        dataPagamento: 1500,
        formaPagamento: 'pix',
        paymentIntentId: 'PAY-4',
        planoId: plano.id,
        origem: 'contratacao',
      }

      alimentarPlanoNaAnalise({
        plano,
        faturas: [fatura],
        user,
        moedaIdsAprovadas: [],
        quantidadeRecusadas: 2,
      })

      expect(plano.status).toBe('cancelado')
      expect(plano.moedaIds).toEqual([])
      expect(plano.estornadoCents).toBe(7200)
      expect(user.balance).toBe(1000 + 7200)
    })

    it('todas as moedas recusadas com plano não pago: cancela plano e cancela fatura pendente', () => {
      const user: User = { name: 'Cliente', balance: 1000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-CANCEL-2',
        modalidade: 'anual',
        quantidadeContratada: 2,
        valorPorMoedaCents: 2400,
        valorTotalCents: 4800,
        status: 'aguardando_pagamento',
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-5',
        userEmail: 'cliente@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 2,
        moedaIds: [],
        valorCents: 4800,
        status: 'pendente',
        dataEmissao: 1000,
        dataVencimento: 2000,
        dataPagamento: null,
        formaPagamento: null,
        paymentIntentId: null,
        planoId: plano.id,
        origem: 'contratacao',
      }

      alimentarPlanoNaAnalise({
        plano,
        faturas: [fatura],
        user,
        moedaIdsAprovadas: [],
        quantidadeRecusadas: 2,
      })

      expect(plano.status).toBe('cancelado')
      expect(fatura.status).toBe('cancelada')
      expect(user.balance).toBe(1000)
    })
  })
})

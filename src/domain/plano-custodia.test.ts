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
    it('o mensal sai a R$ 2,00 por moeda por mês', () => {
      expect(valorDoPlano('mensal', 1).total).toBe(200)
    })

    it('calcula plano mensal padrão (R$ 2,00 por moeda, 1 parcela, 1 mês)', () => {
      const v1 = valorDoPlano('mensal', 1)
      expect(v1).toEqual({ porMoeda: 200, total: 200, parcelasMax: 1, meses: 1 })

      const v3 = valorDoPlano('mensal', 3)
      expect(v3).toEqual({ porMoeda: 200, total: 600, parcelasMax: 1, meses: 1 })
    })

    it('aceita sobrescrita de taxas', () => {
      const v = valorDoPlano('mensal', 2, {
        custodiaMensalPorMoeda: 500,
      })
      expect(v).toEqual({ porMoeda: 500, total: 1000, parcelasMax: 1, meses: 1 })
    })

    it('quantidade zero ou negativa resulta em total zero', () => {
      expect(valorDoPlano('mensal', 0).total).toBe(0)
      expect(valorDoPlano('mensal', -2).total).toBe(0)
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
    it('mensal cobre 1 mês (+0 meses)', () => {
      expect(calcularPagoAte('2026-09', 'mensal')).toBe('2026-09')
      expect(calcularPagoAte('2026-12', 'mensal')).toBe('2026-12')
    })

    it('mesesCobertos diz o prazo da modalidade', () => {
      expect(mesesCobertos('mensal')).toBe(1)
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
      const planoMensal = criarPlano({
        modalidade: 'mensal',
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2026-09',
        status: 'vigente',
      })

      expect(competenciaCoberta(planoMensal, '2026-08')).toBe(false)
      expect(competenciaCoberta(planoMensal, '2026-09')).toBe(true)
      expect(competenciaCoberta(planoMensal, '2026-10')).toBe(false)
    })
  })

  describe('moedasCobertas', () => {
    it('reúne todas as moedas cobertas de múltiplos planos vigentes', () => {
      const p1 = criarPlano({
        id: 'PLC-001',
        moedaIds: ['M-1', 'M-2'],
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2026-09',
        status: 'vigente',
      })
      // Mensal que acabou em 2026-08: em 2026-09 a renovacao esta devida, e uma moeda
      // esperando fatura de renovacao segue coberta para o ciclo nao cobrar em dobro.
      const p2 = criarPlano({
        id: 'PLC-002',
        moedaIds: ['M-3'],
        inicioCompetencia: '2026-08',
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
        inicioCompetencia: '2026-10',
        pagoAteCompetencia: '2026-10',
        status: 'vigente',
      })
      const fatura = gerarFaturaDoCiclo(userBase, 'cliente@teste.com', '2026-10', [plano])
      expect(fatura).toBeNull()
    })

    it('fatura apenas moedas não cobertas, descontando as cobertas', () => {
      const plano = criarPlano({
        moedaIds: ['M-1', 'M-2'],
        inicioCompetencia: '2026-10',
        pagoAteCompetencia: '2026-10',
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
        modalidade: 'mensal',
        pagoAteCompetencia: '2026-09',
        status: 'encerrado',
      })
      expect(renovacaoDevida(planoInativo, '2026-10')).toBe(false)
    })

    it('identifica renovação do mensal exatamente no mês seguinte (pagoAteCompetencia === mesAnterior)', () => {
      const planoMensal = criarPlano({
        modalidade: 'mensal',
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2026-09',
        status: 'vigente',
      })

      // Mês 1: ainda coberto
      expect(renovacaoDevida(planoMensal, '2026-09')).toBe(false)

      // Mês 2: venceu em 2026-09, logo em 2026-10 a renovação é devida!
      expect(renovacaoDevida(planoMensal, '2026-10')).toBe(true)

      // Mês 3: posterior
      expect(renovacaoDevida(planoMensal, '2026-11')).toBe(false)
    })
  })

  describe('alimentarPlanoNaAnalise (B2.5)', () => {
    it('3 moedas contratadas e pagas no plano mensal, 1 recusada: plano com 2 moedas e R$ 2,00 estornados ao saldo', () => {
      const user: User = { name: 'Cliente', balance: 10000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-MENSAL-1',
        modalidade: 'mensal',
        quantidadeContratada: 3,
        valorPorMoedaCents: 200,
        valorTotalCents: 600,
        status: 'vigente',
        pagoAteCompetencia: '2026-09',
        moedaIds: [],
        estornadoCents: 0,
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-1',
        userEmail: 'cliente@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 3,
        moedaIds: [],
        valorCents: 600,
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
      expect(plano.estornadoCents).toBe(200) // R$ 2,00 de estorno
      expect(user.balance).toBe(10000 + 200) // Saldo sobe R$ 2,00
      expect(plano.status).toBe('vigente')
    })

    it('3 moedas contratadas e NÃO pagas, 1 recusada: fatura de contratação passa a valer só as aprovadas', () => {
      const user: User = { name: 'Cliente', balance: 5000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-PEND-1',
        modalidade: 'mensal',
        quantidadeContratada: 3,
        valorPorMoedaCents: 200,
        valorTotalCents: 600,
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
        valorCents: 600,
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
      expect(plano.valorTotalCents).toBe(400)
      expect(fatura.valorCents).toBe(400)
      expect(fatura.quantidadeMoedas).toBe(2)
      expect(fatura.moedaIds).toEqual(['RO-001', 'RO-002'])
      expect(user.balance).toBe(5000) // Sem alteração de saldo
    })

    it('todas as moedas recusadas com plano pago: cancela plano e estorno integral', () => {
      const user: User = { name: 'Cliente', balance: 1000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-CANCEL-1',
        modalidade: 'mensal',
        quantidadeContratada: 2,
        valorPorMoedaCents: 200,
        valorTotalCents: 400,
        status: 'vigente',
        pagoAteCompetencia: '2026-09',
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-4',
        userEmail: 'cliente@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 2,
        moedaIds: [],
        valorCents: 400,
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
      expect(plano.estornadoCents).toBe(400)
      expect(user.balance).toBe(1000 + 400)
    })

    it('todas as moedas recusadas com plano não pago: cancela plano e cancela fatura pendente', () => {
      const user: User = { name: 'Cliente', balance: 1000, coins: [] }
      const plano = criarPlano({
        id: 'PLC-CANCEL-2',
        modalidade: 'mensal',
        quantidadeContratada: 2,
        valorPorMoedaCents: 200,
        valorTotalCents: 400,
        status: 'aguardando_pagamento',
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-5',
        userEmail: 'cliente@teste.com',
        competencia: '2026-09',
        quantidadeMoedas: 2,
        moedaIds: [],
        valorCents: 400,
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

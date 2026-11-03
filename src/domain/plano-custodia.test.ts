/**
 * Testes unitários para as regras puras de planos de custódia (B2.3).
 */

import { describe, expect, it } from 'vitest'

import { alimentarPlanoNaAnalise, mesesCobertos, somarMeses, valorDoPlano } from '@/domain/plano-custodia'
import { custodiaImpedeNegociar, custodiaPagaAte, proximaCobrancaDaMoeda } from '@/domain/custodia-da-moeda'
import type { AppState, Coin, FaturaCustodia, PlanoCustodia, User } from '@/domain/types'

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

  // calcularPagoAte, competenciaCoberta, moedasCobertas e renovacaoDevida saíram em 03/11/2026: eram o plano
  // contado por mês do calendário, com renovação no dia 1º. Ver o cabeçalho de src/domain/plano-custodia.ts.
  it('mesesCobertos: o pagamento cobre um mês (apropriação contábil)', () => {
    expect(mesesCobertos('mensal')).toBe(1)
  })

  describe('o caso do Sidnei (03/11/2026): pagou no envio em 27/10, a moeda foi aceita em 30/10', () => {
    // 00:00 de Brasília (UTC-3)
    const brasilia = (mes: number, dia: number, hora = 0): number => Date.UTC(2026, mes - 1, dia, hora + 3)
    const SIDNEI = 'sidnei@exemplo.com.br'
    const MOEDA = 'RO-000182'

    function cenario(): { s: AppState; plano: PlanoCustodia; fatura: FaturaCustodia } {
      const coin: Coin = {
        id: MOEDA,
        tipoMoeda: 'Entrega da Bandeira Olímpica',
        ano: 2016,
        entrada: '30/10/2026',
        statusFisico: 'Recebido',
        statusDigital: 'Validado',
        valorEstimado: 20000,
        protocolo: 'RO-ENV-0019',
        recibo: { codigo: 'REC-182', hash: 'h', dataEmissao: '30/10/2026', status: 'Ativo' },
      }
      const plano = criarPlano({
        id: 'PLC-000011',
        userEmail: SIDNEI,
        protocoloEnvio: 'RO-ENV-0019',
        moedaIds: [],
        inicioCompetencia: '2026-10',
        pagoAteCompetencia: '2026-10',
      })
      // a fatura de contratação, paga por Pix em 27/10 — ainda sem moeda nenhuma
      const fatura: FaturaCustodia = {
        id: 'FAT-2026-10-sidnei-1793106017201',
        userEmail: SIDNEI,
        competencia: '2026-10',
        quantidadeMoedas: 1,
        moedaIds: [],
        valorCents: 200,
        status: 'paga',
        dataEmissao: brasilia(10, 27, 10),
        dataVencimento: brasilia(11, 26, 10),
        dataPagamento: brasilia(10, 27, 10),
        formaPagamento: 'pix',
        paymentIntentId: 'FAT-a149fff7',
        planoId: plano.id,
        origem: 'contratacao',
      }
      const s: AppState = {
        users: { [SIDNEI]: { name: 'Sidnei', balance: 0, coins: [coin], inadimplente: false } },
        sellOffers: [],
        buyOrders: [],
        trades: [],
        envios: [],
        seq: { coin: 0, envio: 0 },
        deposits: [],
        analises: [],
        faturasCustodia: [fatura],
        planosCustodia: [plano],
      }
      return { s, plano, fatura }
    }

    it('no aceite, o pagamento passa a cobrir o primeiro ciclo da moeda: de 30/10 a 29/11 23:59', () => {
      const { s, plano, fatura } = cenario()
      alimentarPlanoNaAnalise({ plano, faturas: s.faturasCustodia!, user: s.users[SIDNEI]!, moedaIdsAprovadas: [MOEDA], quantidadeRecusadas: 0, agora: brasilia(10, 30, 14) })

      expect(fatura.moedaIds).toEqual([MOEDA])
      expect(fatura.coberturaAte).toBe(brasilia(11, 30) - 1)
      expect(custodiaPagaAte(s, MOEDA)).toBe(brasilia(11, 30) - 1)
    })

    it('a moeda NÃO trava em 01/11 (o erro de 01/11/2026), e a próxima cobrança é 30/11 — não 30/12', () => {
      const { s, plano } = cenario()
      alimentarPlanoNaAnalise({ plano, faturas: s.faturasCustodia!, user: s.users[SIDNEI]!, moedaIdsAprovadas: [MOEDA], quantidadeRecusadas: 0, agora: brasilia(10, 30, 14) })

      expect(custodiaImpedeNegociar(s, MOEDA, brasilia(11, 1, 12))).toBe(false)
      expect(custodiaImpedeNegociar(s, MOEDA, brasilia(11, 30, 23))).toBe(false) // dia da cobrança, até 23:59
      expect(custodiaImpedeNegociar(s, MOEDA, brasilia(12, 1, 0) + 1)).toBe(true) // sem pagar o ciclo 2
      expect(proximaCobrancaDaMoeda(s, s.users[SIDNEI]!.coins[0]!, brasilia(11, 3, 12))).toBe(brasilia(11, 30))
    })

    it('sem o aceite, o plano sozinho não cobre nada: não há "pago até outubro"', () => {
      const { s } = cenario()
      expect(custodiaPagaAte(s, MOEDA)).toBeNull()
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

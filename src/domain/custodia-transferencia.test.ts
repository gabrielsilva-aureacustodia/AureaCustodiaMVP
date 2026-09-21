/**
 * DOMÍNIO — Testes da transferência proporcional de custódia na venda de moeda.
 *
 * Valida a regra de negócio definida em 21/09/2026:
 * A custódia acompanha a moeda física, e não a pessoa. Ao vender uma moeda em
 * custódia, o plano do vendedor é encerrado (ou a moeda é desvinculada dele) e o
 * comprador assume os meses restantes proporcionalmente (ex.: 11 meses = R$ 22,00 em 11x).
 */

import { describe, expect, it } from 'vitest'

import {
  descricaoDoPlano,
  diferencaEmMeses,
  mesesRestantesDeCustodia,
  primeiraCompetenciaDoComprador,
  reescolherPlanoDaTransferencia,
  transferirCustodiaDaMoeda,
} from './custodia-transferencia'
import { transferirMoedaVendida } from './market'
import type { AppState, FaturaCustodia, PlanoCustodia, User } from './types'

function criarPlano(parciais: Partial<PlanoCustodia> = {}): PlanoCustodia {
  return {
    id: 'PLC-TEST-001',
    userEmail: 'vendedor@teste.com',
    protocoloEnvio: 'RO-ENV-0001',
    modalidade: 'anual',
    quantidadeContratada: 1,
    moedaIds: ['RO-000001'],
    valorPorMoedaCents: 2400,
    valorTotalCents: 2400,
    parcelasMax: 12,
    inicioCompetencia: '2026-09',
    pagoAteCompetencia: '2027-08',
    status: 'vigente',
    formaPagamento: 'cartao',
    paymentIntentRef: null,
    assinaturaId: null,
    estornadoCents: 0,
    criadoEm: 1726900000000,
    atualizadoEm: 1726900000000,
    ...parciais,
  }
}

describe('custodia-transferencia', () => {
  describe('diferencaEmMeses', () => {
    it('calcula corretamente a distância entre competências', () => {
      expect(diferencaEmMeses('2026-09', '2026-09')).toBe(0)
      expect(diferencaEmMeses('2026-10', '2026-09')).toBe(1)
      expect(diferencaEmMeses('2027-08', '2026-09')).toBe(11)
      expect(diferencaEmMeses('2026-09', '2026-10')).toBe(-1)
      expect(diferencaEmMeses('2028-01', '2026-01')).toBe(24)
    })
  })

  describe('primeiraCompetenciaDoComprador', () => {
    it('venda no mesmo mês da contratação: comprador começa no mês seguinte (vendedor já pagou o 1º mês)', () => {
      const plano = { inicioCompetencia: '2026-09' }
      expect(primeiraCompetenciaDoComprador(plano, '2026-09')).toBe('2026-10')
    })

    it('venda no 2º mês: comprador assume a partir do mês da venda', () => {
      const plano = { inicioCompetencia: '2026-09' }
      expect(primeiraCompetenciaDoComprador(plano, '2026-10')).toBe('2026-10')
    })

    it('venda meses depois: comprador assume a partir do mês da venda', () => {
      const plano = { inicioCompetencia: '2026-09' }
      expect(primeiraCompetenciaDoComprador(plano, '2027-03')).toBe('2027-03')
    })
  })

  describe('mesesRestantesDeCustodia', () => {
    it('venda no 2º mês de um anual: restam 11 meses', () => {
      const plano = criarPlano({
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
      })
      // Venda em 2026-10 -> comprador começa em 2026-10 até 2027-08 = 11 meses
      expect(mesesRestantesDeCustodia(plano, '2026-10')).toBe(11)
    })

    it('venda no mesmo mês da contratação: também restam 11 meses (o vendedor pagou o 1º)', () => {
      const plano = criarPlano({
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
      })
      expect(mesesRestantesDeCustodia(plano, '2026-09')).toBe(11)
    })

    it('venda no último mês coberto: resta 1 mês', () => {
      const plano = criarPlano({
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
      })
      expect(mesesRestantesDeCustodia(plano, '2027-08')).toBe(1)
    })

    it('venda após expiração do plano: restam 0 meses', () => {
      const plano = criarPlano({
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
      })
      expect(mesesRestantesDeCustodia(plano, '2027-09')).toBe(0)
    })

    it('plano cancelado ou não vigente: restam 0 meses', () => {
      const plano = criarPlano({ status: 'cancelado' })
      expect(mesesRestantesDeCustodia(plano, '2026-10')).toBe(0)
    })
  })

  describe('transferirCustodiaDaMoeda', () => {
    it('venda no 2º mês de plano anual: encerra plano do vendedor e gera plano de 11 meses / R$ 22,00 em 11x para o comprador', () => {
      const planoVendedor = criarPlano({
        id: 'PLC-VENDEDOR-1',
        userEmail: 'vendedor@teste.com',
        moedaIds: ['RO-000001'],
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
      })

      const faturaPendenteVendedor: FaturaCustodia = {
        id: 'FAT-VEND-FUTURA',
        userEmail: 'vendedor@teste.com',
        competencia: '2027-09',
        quantidadeMoedas: 1,
        moedaIds: ['RO-000001'],
        valorCents: 2400,
        status: 'pendente',
        dataEmissao: 1000,
        dataVencimento: 2000,
        dataPagamento: null,
        formaPagamento: null,
        paymentIntentId: null,
        planoId: planoVendedor.id,
        origem: 'renovacao_anual',
      }

      const planos: PlanoCustodia[] = [planoVendedor]
      const faturas: FaturaCustodia[] = [faturaPendenteVendedor]

      let seq = 1
      const resultado = transferirCustodiaDaMoeda({
        planos,
        faturas,
        coinId: 'RO-000001',
        vendedorEmail: 'vendedor@teste.com',
        compradorEmail: 'comprador@teste.com',
        competencia: '2026-10', // 2º mês
        agora: 1729000000000,
        novoPlanoId: () => `PLC-${String(seq++).padStart(6, '0')}`,
      })

      // 1. Plano do vendedor encerrado e moeda desvinculada
      expect(planoVendedor.moedaIds).toEqual([])
      expect(planoVendedor.status).toBe('encerrado')
      expect(faturaPendenteVendedor.status).toBe('cancelada')

      // 2. Resultado da transferência
      expect(resultado.mesesTransferidos).toBe(11)
      expect(resultado.planoDoComprador).not.toBeNull()
      expect(resultado.faturaDoComprador).not.toBeNull()

      // 3. Plano do comprador: 11 meses a R$ 2,00/mês = R$ 22,00 (2200 cents) em até 11 parcelas
      const planoComprador = resultado.planoDoComprador!
      expect(planoComprador.userEmail).toBe('comprador@teste.com')
      expect(planoComprador.origem).toBe('transferencia')
      expect(planoComprador.planoOrigemId).toBe('PLC-VENDEDOR-1')
      expect(planoComprador.mesesContratados).toBe(11)
      expect(planoComprador.inicioCompetencia).toBe('2026-10')
      expect(planoComprador.moedaIds).toEqual(['RO-000001'])
      expect(planoComprador.valorPorMoedaCents).toBe(2200)
      expect(planoComprador.valorTotalCents).toBe(2200)
      expect(planoComprador.parcelasMax).toBe(11)
      expect(planoComprador.status).toBe('aguardando_pagamento')

      // 4. Fatura do comprador
      const faturaComprador = resultado.faturaDoComprador!
      expect(faturaComprador.userEmail).toBe('comprador@teste.com')
      expect(faturaComprador.origem).toBe('transferencia')
      expect(faturaComprador.planoId).toBe(planoComprador.id)
      expect(faturaComprador.valorCents).toBe(2200)
      expect(faturaComprador.status).toBe('pendente')
      expect(faturaComprador.competencia).toBe('2026-10')
    })

    it('vendedor com múltiplas moedas no plano: apenas a moeda vendida é removida e o plano segue vigente', () => {
      const planoVendedor = criarPlano({
        id: 'PLC-VEND-2',
        userEmail: 'vendedor@teste.com',
        moedaIds: ['RO-000001', 'RO-000002'],
        quantidadeContratada: 2,
        status: 'vigente',
      })

      const planos = [planoVendedor]
      const faturas: FaturaCustodia[] = []

      const resultado = transferirCustodiaDaMoeda({
        planos,
        faturas,
        coinId: 'RO-000001',
        vendedorEmail: 'vendedor@teste.com',
        compradorEmail: 'comprador@teste.com',
        competencia: '2026-10',
        agora: 1729000000000,
        novoPlanoId: () => 'PLC-NOVO-1',
      })

      expect(planoVendedor.moedaIds).toEqual(['RO-000002'])
      expect(planoVendedor.status).toBe('vigente')
      expect(resultado.mesesTransferidos).toBe(11)
    })

    it('venda de moeda que não está em nenhum plano: não cria cobrança para comprador', () => {
      const planos: PlanoCustodia[] = []
      const faturas: FaturaCustodia[] = []

      const resultado = transferirCustodiaDaMoeda({
        planos,
        faturas,
        coinId: 'RO-DESCOBERTA',
        vendedorEmail: 'vendedor@teste.com',
        compradorEmail: 'comprador@teste.com',
        competencia: '2026-10',
        agora: 1729000000000,
        novoPlanoId: () => 'PLC-NOVO-1',
      })

      expect(resultado.planoDoComprador).toBeNull()
      expect(resultado.faturaDoComprador).toBeNull()
      expect(resultado.mesesTransferidos).toBe(0)
    })
  })

  describe('reescolherPlanoDaTransferencia', () => {
    it('permite o comprador optar por plano anual de 12 meses a partir do mês corrente', () => {
      const plano = criarPlano({
        origem: 'transferencia',
        status: 'aguardando_pagamento',
        mesesContratados: 11,
        valorTotalCents: 2200,
        parcelasMax: 11,
        inicioCompetencia: '2026-10',
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-TR-1',
        userEmail: 'comprador@teste.com',
        competencia: '2026-10',
        quantidadeMoedas: 1,
        moedaIds: ['RO-000001'],
        valorCents: 2200,
        status: 'pendente',
        dataEmissao: 1000,
        dataVencimento: 2000,
        dataPagamento: null,
        formaPagamento: null,
        paymentIntentId: null,
        planoId: plano.id,
        origem: 'transferencia',
      }

      const ok = reescolherPlanoDaTransferencia(plano, fatura, 'anual', '2026-10', 1000)
      expect(ok).toBe(true)
      expect(plano.modalidade).toBe('anual')
      expect(plano.mesesContratados).toBe(12)
      expect(plano.valorTotalCents).toBe(2400)
      expect(plano.parcelasMax).toBe(12)
      expect(fatura.valorCents).toBe(2400)
    })

    it('permite o comprador optar por plano mensal (R$ 3,00) em 1 parcela', () => {
      const plano = criarPlano({
        origem: 'transferencia',
        status: 'aguardando_pagamento',
        mesesContratados: 11,
        valorTotalCents: 2200,
        parcelasMax: 11,
      })
      const fatura: FaturaCustodia = {
        id: 'FAT-TR-1',
        userEmail: 'comprador@teste.com',
        competencia: '2026-10',
        quantidadeMoedas: 1,
        moedaIds: ['RO-000001'],
        valorCents: 2200,
        status: 'pendente',
        dataEmissao: 1000,
        dataVencimento: 2000,
        dataPagamento: null,
        formaPagamento: null,
        paymentIntentId: null,
        planoId: plano.id,
        origem: 'transferencia',
      }

      const ok = reescolherPlanoDaTransferencia(plano, fatura, 'mensal', '2026-10', 1000)
      expect(ok).toBe(true)
      expect(plano.modalidade).toBe('mensal')
      expect(plano.mesesContratados).toBe(1)
      expect(plano.valorTotalCents).toBe(300)
      expect(plano.parcelasMax).toBe(1)
      expect(fatura.valorCents).toBe(300)
    })
  })

  describe('descricaoDoPlano', () => {
    it('gera rótulos corretos para a interface', () => {
      const p11 = criarPlano({
        origem: 'transferencia',
        status: 'aguardando_pagamento',
        mesesContratados: 11,
      })
      expect(descricaoDoPlano(p11)).toBe('11 meses restantes da custódia')

      const p1 = criarPlano({
        origem: 'transferencia',
        status: 'aguardando_pagamento',
        mesesContratados: 1,
      })
      expect(descricaoDoPlano(p1)).toBe('1 mês restante da custódia')

      const pAnual = criarPlano({ modalidade: 'anual', status: 'vigente' })
      expect(descricaoDoPlano(pAnual)).toBe('Plano anual')

      const pMensal = criarPlano({ modalidade: 'mensal', status: 'vigente' })
      expect(descricaoDoPlano(pMensal)).toBe('Plano mensal')
    })
  })

  describe('transferirMoedaVendida no motor de mercado', () => {
    it('move a moeda do vendedor para o comprador e aciona a transferência de custódia', () => {
      const vendedor: User = {
        name: 'Vendedor',
        balance: 0,
        coins: [
          {
            id: 'RO-000001',
            tipoMoeda: 'Entrega da Bandeira Olímpica',
            ano: 2016,
            entrada: '01/09/2026',
            statusFisico: 'Armazenado',
            statusDigital: 'Validado',
            valorEstimado: 25000,
            protocolo: 'RO-ENV-0001',
            recibo: {
              codigo: 'REC-000001',
              hash: 'h1',
              dataEmissao: '01/09/2026',
              status: 'Ativo',
            },
          },
        ],
      }
      const comprador: User = {
        name: 'Comprador',
        balance: 50000,
        coins: [],
      }

      const planoVendedor = criarPlano({
        id: 'PLC-000001',
        userEmail: 'vendedor@teste.com',
        moedaIds: ['RO-000001'],
        inicioCompetencia: '2026-09',
        pagoAteCompetencia: '2027-08',
        status: 'vigente',
      })

      const state: AppState = {
        users: {
          'vendedor@teste.com': vendedor,
          'comprador@teste.com': comprador,
        },
        sellOffers: [],
        buyOrders: [],
        trades: [],
        envios: [],
        seq: { coin: 1, envio: 1, planoCustodia: 2 },
        deposits: [],
        analises: [],
        saques: [],
        planosCustodia: [planoVendedor],
        faturasCustodia: [],
      }

      const coinTransferida = transferirMoedaVendida(
        state,
        vendedor,
        comprador,
        'vendedor@teste.com',
        'comprador@teste.com',
        'RO-000001',
      )

      expect(coinTransferida).not.toBeNull()
      expect(vendedor.coins).toHaveLength(0)
      expect(comprador.coins).toHaveLength(1)
      expect(comprador.coins[0].id).toBe('RO-000001')

      // Plano do vendedor foi encerrado
      expect(planoVendedor.status).toBe('encerrado')

      // Plano e fatura de transferência foram criados para o comprador
      expect(state.planosCustodia).toHaveLength(2)
      const planoComprador = state.planosCustodia![1]
      expect(planoComprador.userEmail).toBe('comprador@teste.com')
      expect(planoComprador.origem).toBe('transferencia')
      expect(state.faturasCustodia).toHaveLength(1)
      expect(state.faturasCustodia![0].userEmail).toBe('comprador@teste.com')
      expect(state.faturasCustodia![0].origem).toBe('transferencia')
    })
  })
})

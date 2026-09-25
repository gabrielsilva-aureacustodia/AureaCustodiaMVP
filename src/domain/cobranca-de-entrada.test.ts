import { describe, expect, it } from 'vitest'

import { cobrarEntradaNoAcervo, custodiaResolvidaNaCompetencia } from '@/domain/cobranca-de-entrada'
import type { AppState, Coin, FaturaCustodia, PlanoCustodia, User } from '@/domain/types'

/** 25/09/2026, 12:00 UTC — competência '2026-09'. */
const AGORA = Date.UTC(2026, 8, 25, 12)
const DONO = 'dono@exemplo.com.br'

function moeda(id: string): Coin {
  return {
    id,
    tipoMoeda: 'Direitos Humanos',
    ano: 1998,
    entrada: '25/09/2026',
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 45000,
    protocolo: 'RO-DIR-0001',
    recibo: { codigo: `REC-${id}`, hash: 'h', dataEmissao: '25/09/2026', status: 'Ativo' },
  }
}

function estado(saldo: number, moedas: Coin[]): AppState {
  const user: User = { name: 'Dono', balance: saldo, coins: moedas, inadimplente: false }
  return {
    users: { [DONO]: user },
    sellOffers: [],
    buyOrders: [],
    trades: [],
    envios: [],
    seq: { coin: 0, envio: 0 },
    deposits: [],
    analises: [],
    faturasCustodia: [],
    planosCustodia: [],
  }
}

describe('cobrarEntradaNoAcervo', () => {
  it('emite a fatura da competência corrente pelas moedas que acabaram de entrar', () => {
    const s = estado(0, [moeda('RO-000001'), moeda('RO-000002')])
    const f = cobrarEntradaNoAcervo(s, DONO, ['RO-000001', 'RO-000002'], { custodiaMensalPorMoeda: 200 }, AGORA)

    expect(f).not.toBeNull()
    expect(f!.competencia).toBe('2026-09')
    expect(f!.origem).toBe('entrada_no_acervo')
    expect(f!.quantidadeMoedas).toBe(2)
    expect(f!.valorCents).toBe(400)
    expect(f!.moedaIds).toEqual(['RO-000001', 'RO-000002'])
    expect(s.faturasCustodia).toHaveLength(1)
  })

  it('debita do saldo e nasce paga quando o cliente tem dinheiro em conta', () => {
    const s = estado(1000, [moeda('RO-000001')])
    const f = cobrarEntradaNoAcervo(s, DONO, ['RO-000001'], { custodiaMensalPorMoeda: 200 }, AGORA)

    expect(f!.status).toBe('paga')
    expect(f!.formaPagamento).toBe('saldo')
    expect(s.users[DONO]!.balance).toBe(800)
  })

  it('fica pendente quando o saldo não cobre a fatura inteira', () => {
    const s = estado(199, [moeda('RO-000001')])
    const f = cobrarEntradaNoAcervo(s, DONO, ['RO-000001'], { custodiaMensalPorMoeda: 200 }, AGORA)

    expect(f!.status).toBe('pendente')
    expect(s.users[DONO]!.balance).toBe(199)
  })

  it('não cobra de novo a moeda que já está em fatura aberta da mesma competência', () => {
    const s = estado(0, [moeda('RO-000001')])
    cobrarEntradaNoAcervo(s, DONO, ['RO-000001'], { custodiaMensalPorMoeda: 200 }, AGORA)
    const segunda = cobrarEntradaNoAcervo(s, DONO, ['RO-000001'], { custodiaMensalPorMoeda: 200 }, AGORA)

    expect(segunda).toBeNull()
    expect(s.faturasCustodia).toHaveLength(1)
  })

  it('não cobra a moeda cuja competência já foi paga pelo vendedor — comprou no meio do mês', () => {
    const s = estado(0, [moeda('RO-000001')])
    const paga: FaturaCustodia = {
      id: 'FAT-ANTIGA',
      userEmail: 'vendedor@exemplo.com.br',
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: ['RO-000001'],
      valorCents: 200,
      status: 'paga',
      dataEmissao: AGORA - 1000,
      dataVencimento: AGORA + 1000,
      dataPagamento: AGORA - 900,
      formaPagamento: 'saldo',
      origem: 'ciclo_mensal',
    }
    s.faturasCustodia = [paga]

    expect(cobrarEntradaNoAcervo(s, DONO, ['RO-000001'], { custodiaMensalPorMoeda: 200 }, AGORA)).toBeNull()
  })

  it('cobra só a parte não resolvida de um lote misto', () => {
    const s = estado(0, [moeda('RO-000001'), moeda('RO-000002')])
    s.faturasCustodia = [
      {
        id: 'FAT-ANTIGA',
        userEmail: DONO,
        competencia: '2026-09',
        quantidadeMoedas: 1,
        moedaIds: ['RO-000001'],
        valorCents: 200,
        status: 'paga',
        dataEmissao: AGORA - 1000,
        dataVencimento: AGORA + 1000,
        dataPagamento: AGORA - 900,
        formaPagamento: 'saldo',
        origem: 'ciclo_mensal',
      },
    ]

    const f = cobrarEntradaNoAcervo(s, DONO, ['RO-000001', 'RO-000002'], { custodiaMensalPorMoeda: 200 }, AGORA)
    expect(f!.moedaIds).toEqual(['RO-000002'])
    expect(f!.valorCents).toBe(200)
  })

  it('devolve null para conta inexistente, sem criar fatura órfã', () => {
    const s = estado(0, [])
    expect(cobrarEntradaNoAcervo(s, 'fantasma@exemplo.com.br', ['RO-000001'], {}, AGORA)).toBeNull()
    expect(s.faturasCustodia).toHaveLength(0)
  })
})

describe('custodiaResolvidaNaCompetencia', () => {
  it('reconhece plano vigente pago além da competência consultada', () => {
    const s = estado(0, [moeda('RO-000001')])
    const plano: PlanoCustodia = {
      id: 'PLC-1',
      userEmail: DONO,
      protocoloEnvio: 'RO-ENV-0001',
      modalidade: 'mensal',
      quantidadeContratada: 1,
      moedaIds: ['RO-000001'],
      valorPorMoedaCents: 200,
      valorTotalCents: 200,
      parcelasMax: 1,
      inicioCompetencia: '2026-09',
      pagoAteCompetencia: '2026-10',
      status: 'vigente',
      formaPagamento: 'saldo',
      paymentIntentRef: null,
      assinaturaId: null,
      estornadoCents: 0,
      criadoEm: AGORA,
      atualizadoEm: AGORA,
    }
    s.planosCustodia = [plano]

    expect(custodiaResolvidaNaCompetencia(s, 'RO-000001', '2026-09')).toBe(true)
    expect(custodiaResolvidaNaCompetencia(s, 'RO-000002', '2026-09')).toBe(false)
  })

  it('fatura cancelada não conta como cobrança resolvida', () => {
    const s = estado(0, [moeda('RO-000001')])
    s.faturasCustodia = [
      {
        id: 'FAT-CANCELADA',
        userEmail: DONO,
        competencia: '2026-09',
        quantidadeMoedas: 1,
        moedaIds: ['RO-000001'],
        valorCents: 200,
        status: 'cancelada',
        dataEmissao: AGORA,
        dataVencimento: AGORA,
        origem: 'entrada_no_acervo',
      },
    ]
    expect(custodiaResolvidaNaCompetencia(s, 'RO-000001', '2026-09')).toBe(false)
  })
})

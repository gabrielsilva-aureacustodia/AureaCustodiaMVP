import { describe, expect, it } from 'vitest'

import { resumoDaCustodia, rotuloDaOrigem } from '@/domain/custodia-do-cliente'
import type { AppState, Coin, FaturaCustodia, PlanoCustodia, User } from '@/domain/types'

const AGORA = Date.UTC(2026, 8, 25, 12)
const DONO = 'dono@exemplo.com.br'
const DIA = 86_400_000

function moeda(id: string, statusRecibo: 'Ativo' | 'Extinto' = 'Ativo'): Coin {
  return {
    id,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2012,
    entrada: '25/09/2026',
    statusFisico: 'Armazenado',
    statusDigital: 'Validado',
    valorEstimado: 28000,
    protocolo: 'RO-ENV-0001',
    recibo: { codigo: `REC-${id}`, hash: 'h', dataEmissao: '25/09/2026', status: statusRecibo },
  }
}

function fatura(p: Partial<FaturaCustodia> & Pick<FaturaCustodia, 'id' | 'status'>): FaturaCustodia {
  return {
    userEmail: DONO,
    competencia: '2026-09',
    quantidadeMoedas: 1,
    moedaIds: [],
    valorCents: 200,
    dataEmissao: AGORA - DIA,
    dataVencimento: AGORA + DIA,
    ...p,
  }
}

function estado(moedas: Coin[], faturas: FaturaCustodia[] = [], planos: PlanoCustodia[] = []): AppState {
  const user: User = { name: 'Dono', balance: 0, coins: moedas, inadimplente: false }
  return {
    users: { [DONO]: user },
    sellOffers: [],
    buyOrders: [],
    trades: [],
    envios: [],
    seq: { coin: 0, envio: 0 },
    deposits: [],
    analises: [],
    faturasCustodia: faturas,
    planosCustodia: planos,
  }
}

describe('resumoDaCustodia', () => {
  it('a mensalidade acompanha o ACERVO, não a soma dos planos', () => {
    const s = estado([moeda('RO-000001'), moeda('RO-000002'), moeda('RO-000003')])
    const r = resumoDaCustodia(s, DONO, 200, AGORA)

    expect(r.moedasGuardadas).toBe(3)
    expect(r.mensalidadeCents).toBe(600)
    expect(r.porMoedaCents).toBe(200)
  })

  it('moeda com recibo extinto (retirada física) sai da conta', () => {
    const s = estado([moeda('RO-000001'), moeda('RO-000002', 'Extinto')])
    expect(resumoDaCustodia(s, DONO, 200, AGORA).moedasGuardadas).toBe(1)
  })

  it('aponta a competência corrente e a próxima, virando o ano quando precisa', () => {
    const s = estado([])
    expect(resumoDaCustodia(s, DONO, 200, AGORA).proximaCompetencia).toBe('2026-10')

    const dezembro = Date.UTC(2026, 11, 20)
    expect(resumoDaCustodia(s, DONO, 200, dezembro).competencia).toBe('2026-12')
    expect(resumoDaCustodia(s, DONO, 200, dezembro).proximaCompetencia).toBe('2027-01')
  })

  it('o próximo vencimento é o da fatura aberta mais antiga', () => {
    const s = estado(
      [moeda('RO-000001')],
      [
        fatura({ id: 'F2', status: 'pendente', dataVencimento: AGORA + 10 * DIA, valorCents: 400 }),
        fatura({ id: 'F1', status: 'pendente', dataVencimento: AGORA + 2 * DIA, valorCents: 200 }),
      ],
    )
    const r = resumoDaCustodia(s, DONO, 200, AGORA)

    expect(r.proximoVencimento).toBe(AGORA + 2 * DIA)
    expect(r.emAbertoCents).toBe(600)
    expect(r.vencida).toBe(false)
  })

  it('marca como vencida a fatura cujo prazo passou, mesmo com status ainda pendente', () => {
    const s = estado(
      [moeda('RO-000001')],
      [fatura({ id: 'F1', status: 'pendente', dataVencimento: AGORA - DIA })],
    )
    expect(resumoDaCustodia(s, DONO, 200, AGORA).vencida).toBe(true)
  })

  it('o extrato soma só as faturas pagas, da mais recente para a mais antiga', () => {
    const s = estado(
      [moeda('RO-000001')],
      [
        fatura({ id: 'F-ANTIGA', status: 'paga', dataPagamento: AGORA - 40 * DIA, valorCents: 200 }),
        fatura({ id: 'F-NOVA', status: 'paga', dataPagamento: AGORA - DIA, valorCents: 400 }),
        fatura({ id: 'F-CANCELADA', status: 'cancelada', valorCents: 999 }),
        fatura({ id: 'F-ABERTA', status: 'pendente', valorCents: 999 }),
      ],
    )
    const r = resumoDaCustodia(s, DONO, 200, AGORA)

    expect(r.pagas.map((f) => f.id)).toEqual(['F-NOVA', 'F-ANTIGA'])
    expect(r.totalPagoCents).toBe(600)
    // Cancelada não é dívida: não entra no "em aberto" nem no total pago.
    expect(r.emAberto.map((f) => f.id)).toEqual(['F-ABERTA'])
  })

  it('não mistura a custódia de outra conta', () => {
    const s = estado([moeda('RO-000001')], [fatura({ id: 'F-ALHEIA', status: 'pendente', userEmail: 'outro@exemplo.com.br' })])
    expect(resumoDaCustodia(s, DONO, 200, AGORA).emAberto).toHaveLength(0)
  })

  it('conta inexistente devolve resumo zerado em vez de estourar', () => {
    const r = resumoDaCustodia(estado([]), 'fantasma@exemplo.com.br', 200, AGORA)
    expect(r.moedasGuardadas).toBe(0)
    expect(r.mensalidadeCents).toBe(0)
  })
})

describe('rotuloDaOrigem', () => {
  it('traduz cada origem para o que o cliente entende', () => {
    expect(rotuloDaOrigem('contratacao')).toBe('Contratação do plano')
    expect(rotuloDaOrigem('entrada_no_acervo')).toBe('Entrada de moeda na custódia')
    expect(rotuloDaOrigem('ciclo_mensal')).toBe('Mensalidade de custódia')
    expect(rotuloDaOrigem(undefined)).toBe('Mensalidade de custódia')
  })
})

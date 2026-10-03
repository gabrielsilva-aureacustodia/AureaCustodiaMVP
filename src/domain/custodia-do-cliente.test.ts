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

  describe('próxima cobrança e cobertura contam o que JÁ foi cobrado (03/10/2026)', () => {
    // O caso do Rogério: moeda aceita em 21/09, paga na entrada, e cobrada de novo em 01/10 pela
    // regra antiga (competência 2026-10). A tela mostrava 21/10; o cron só cobra de novo em 21/11.
    const rogerio = { ...moeda('RO-000001'), entrada: '21/09/2026' }
    const AGORA_3_10 = Date.UTC(2026, 9, 3, 12)
    const paga = (id: string, competencia: string): FaturaCustodia =>
      fatura({ id, status: 'paga', competencia, moedaIds: ['RO-000001'], dataPagamento: AGORA_3_10 - DIA })

    it('com outubro já pago pela cobrança de 01/10, a próxima é 21/11 — não 21/10', () => {
      const s = estado([rogerio], [paga('F-ENTRADA', '2026-09'), paga('F-01-10', '2026-10')])
      const r = resumoDaCustodia(s, DONO, 200, AGORA_3_10)

      expect(r.proximaCobrancaEm).toBe(Date.UTC(2026, 10, 21, 3)) // 21/11, 00:00 de Brasília
      // e a guarda paga vai até o fim do ciclo de outubro (20/11), não até 31/10
      expect(r.cobertaAte).toBe(Date.UTC(2026, 10, 21, 3) - 1)
    })

    it('só com a entrada paga (sem a de 01/10), a próxima é 21/10', () => {
      const s = estado([rogerio], [paga('F-ENTRADA', '2026-09')])
      const r = resumoDaCustodia(s, DONO, 200, AGORA_3_10)

      expect(r.proximaCobrancaEm).toBe(Date.UTC(2026, 9, 21, 3))
      expect(r.cobertaAte).toBe(Date.UTC(2026, 9, 21, 3) - 1)
    })

    it('fatura em aberto resolve o ciclo para a próxima cobrança, mas não conta como guarda paga', () => {
      const aberta = fatura({ id: 'F-ABERTA', status: 'pendente', competencia: '2026-10', moedaIds: ['RO-000001'] })
      const r = resumoDaCustodia(estado([rogerio], [paga('F-ENTRADA', '2026-09'), aberta]), DONO, 200, AGORA_3_10)

      expect(r.proximaCobrancaEm).toBe(Date.UTC(2026, 10, 21, 3))
      expect(r.cobertaAte).toBe(Date.UTC(2026, 9, 21, 3) - 1) // paga: só a de setembro
    })

    it('várias moedas: vale a mais próxima, e a cobertura é a da primeira a lapsar', () => {
      const outra = { ...moeda('RO-000002'), entrada: '28/09/2026' }
      const s = estado(
        [rogerio, outra],
        [
          paga('F-A', '2026-10'),
          fatura({ id: 'F-B', status: 'paga', competencia: '2026-10', moedaIds: ['RO-000002'], dataPagamento: AGORA_3_10 }),
        ],
      )
      const r = resumoDaCustodia(s, DONO, 200, AGORA_3_10)

      expect(r.proximaCobrancaEm).toBe(Date.UTC(2026, 10, 21, 3)) // 21/11 vem antes de 28/11
      expect(r.cobertaAte).toBe(Date.UTC(2026, 10, 21, 3) - 1)
    })
  })

  it('sem moeda sob guarda não há próxima cobrança', () => {
    expect(resumoDaCustodia(estado([]), DONO, 200, AGORA).proximaCobrancaEm).toBeNull()
    expect(resumoDaCustodia(estado([moeda('RO-000001', 'Extinto')]), DONO, 200, AGORA).proximaCobrancaEm).toBeNull()
  })

  it('a competência corrente vira o ano quando precisa', () => {
    const dezembro = Date.UTC(2026, 11, 20)
    expect(resumoDaCustodia(estado([]), DONO, 200, dezembro).competencia).toBe('2026-12')
  })

  it('a cobertura de uma fatura do ciclo por moeda é o instante exato em que o ciclo termina', () => {
    const fim = Date.UTC(2026, 10, 21, 3) // 21/11 00:00 em Brasília
    const s = estado(
      [moeda('RO-000001')],
      [fatura({ id: 'F-CICLO', status: 'paga', competencia: '2026-10', dataPagamento: AGORA, dataVencimento: fim, coberturaAte: fim - 1 })],
    )
    expect(resumoDaCustodia(s, DONO, 200, AGORA).cobertaAte).toBe(fim - 1)
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

  it('separa a COBERTURA do prazo de pagamento — a confusão de 27/09/2026', () => {
    // Fatura emitida em 25/09 com 10 dias de tolerância: prazo para pagar em
    // 05/10, guarda coberta só até 30/09. Ver as duas na mesma coluna fazia a
    // custódia parecer expirar dez dias depois de ser paga.
    const emitida = Date.UTC(2026, 8, 25, 15)
    const s = estado(
      [moeda('RO-000001')],
      [
        fatura({
          id: 'F-PAGA',
          status: 'paga',
          competencia: '2026-09',
          dataEmissao: emitida,
          dataVencimento: emitida + 10 * DIA,
          dataPagamento: emitida,
        }),
      ],
    )
    const r = resumoDaCustodia(s, DONO, 200, AGORA)

    expect(r.pagaAteCompetencia).toBe('2026-09')
    // 30/09/2026, e não 05/10 — o prazo de pagamento é cortesia, não guarda.
    expect(new Date(r.cobertaAte!).getUTCMonth()).toBe(8)
    expect(new Date(r.cobertaAte!).getUTCDate()).toBe(30)
    expect(r.cobertaAte!).toBeLessThan(emitida + 10 * DIA)
  })

  it('plano vigente adianta a cobertura além das faturas pagas', () => {
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
      pagoAteCompetencia: '2026-11',
      status: 'vigente',
      formaPagamento: 'saldo',
      paymentIntentRef: null,
      assinaturaId: null,
      estornadoCents: 0,
      criadoEm: AGORA,
      atualizadoEm: AGORA,
    }
    const r = resumoDaCustodia(estado([moeda('RO-000001')], [], [plano]), DONO, 200, AGORA)
    expect(r.pagaAteCompetencia).toBe('2026-11')
  })

  it('sem nada pago, a cobertura é nula em vez de uma data inventada', () => {
    const r = resumoDaCustodia(estado([moeda('RO-000001')]), DONO, 200, AGORA)
    expect(r.pagaAteCompetencia).toBeNull()
    expect(r.cobertaAte).toBeNull()
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

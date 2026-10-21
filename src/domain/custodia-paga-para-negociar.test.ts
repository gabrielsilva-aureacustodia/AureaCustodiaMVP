/**
 * Moeda só se negocia com a custódia PAGA (12/10/2026).
 *
 * O caso que originou: o Sidnei Pena teve uma moeda aceita às 11:25, publicou a oferta às 11:32 e a
 * vendeu às 19:25 — com a fatura de entrada (R$ 2,00) ainda pendente, mas "dentro do prazo". Desde
 * 27/09 fatura em aberto dentro do prazo "não era dívida", e cada ponto de venda perguntava uma coisa
 * diferente. Agora todos perguntam a mesma: `custodiaImpedeNegociar`.
 *
 * A regra do Gabriel (02/10 e 12/10): 1) nunca paga = não negocia, ainda que a fatura esteja no prazo;
 * 2) paga, segue negociável até as 23:59 do dia da próxima cobrança; depois disso, só pagando.
 */

import { describe, expect, it } from 'vitest'

import {
  casarOrdensRespeitandoPendencia,
  coberturaPagaDaMoeda,
  custodiaImpedeNegociar,
  expurgarOfertasSemCustodia,
  moedaComCustodiaNaoPagaNoEstado,
} from '@/domain/bloqueio-por-debito'
import { TAXAS_PADRAO } from '@/domain/fees'
import { availableCoinsForSell, lotsFromOffers } from '@/domain/market'
import { BAN, compra, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'
import type { AppState, FaturaCustodia } from '@/domain/types'

const SIDNEI = 'sidnei@exemplo.com.br'
const COMPRADOR = 'comprador@exemplo.com.br'
const COIN = 'RO-000179'

/** 00:00 de Brasília do dia (UTC-3). */
const brasilia = (ano: number, mes: number, dia: number, hora = 0, min = 0): number => Date.UTC(ano, mes - 1, dia, hora + 3, min)

const ENTRADA = brasilia(2026, 10, 12, 11, 25)
/** O fim do primeiro ciclo: 12/11, 00:00 de Brasília — a data da próxima cobrança. */
const FIM_DO_CICLO = brasilia(2026, 11, 12)

function fatura(parcial: Partial<FaturaCustodia> & Pick<FaturaCustodia, 'id' | 'status'>): FaturaCustodia {
  return {
    userEmail: SIDNEI,
    competencia: '2026-10',
    quantidadeMoedas: 1,
    moedaIds: [COIN],
    valorCents: 200,
    dataEmissao: ENTRADA,
    dataVencimento: FIM_DO_CICLO,
    dataPagamento: null,
    origem: 'entrada_no_acervo',
    ...parcial,
  }
}

/** Estado SEM a custódia em dia que `estado()` dá por padrão: o cenário é a custódia de verdade. */
function cenario(faturas: FaturaCustodia[]): AppState {
  const s = estado({
    [SIDNEI]: usuario('Sidnei', 0, [moeda(COIN, BAN)]),
    [COMPRADOR]: usuario('Comprador', 1_000_000, []),
  })
  s.planosCustodia = []
  s.faturasCustodia = faturas
  return s
}

const PENDENTE_NO_PRAZO = fatura({ id: 'FAT-ENT', status: 'pendente' })
const PAGA_DO_CICLO_1 = fatura({ id: 'FAT-ENT', status: 'paga', dataPagamento: ENTRADA + 3_600_000, coberturaAte: FIM_DO_CICLO - 1 })

describe('o caso do Sidnei: fatura de entrada pendente e dentro do prazo', () => {
  const agora = brasilia(2026, 10, 12, 19, 25) // a hora em que a moeda foi vendida

  it('a moeda NÃO se negocia, ainda que a fatura esteja no prazo', () => {
    const s = cenario([PENDENTE_NO_PRAZO])

    expect(coberturaPagaDaMoeda(s, COIN)).toBeNull()
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(true)
    expect(moedaComCustodiaNaoPagaNoEstado(s, SIDNEI, COIN, agora)).toBe(true)
  })

  it('não aparece entre as moedas que o dono pode anunciar', () => {
    const s = cenario([PENDENTE_NO_PRAZO])
    expect(availableCoinsForSell(s, s.users[SIDNEI]!, BAN).map((c) => c.id)).toEqual([])
  })

  it('oferta dessa moeda que já esteja no livro é derrubada, some da vitrine e não casa', () => {
    const s = cenario([PENDENTE_NO_PRAZO])
    s.sellOffers = [venda('OF-1', COIN, SIDNEI, 20_000, BAN, agora)]
    s.buyOrders = [compra('BO-1', COMPRADOR, 20_000, 1, BAN, agora + 1)]

    expect(lotsFromOffers(s, BAN)).toEqual([])

    const r = casarOrdensRespeitandoPendencia(s, TAXAS_PADRAO, agora, new Set())
    expect(r.matched).toBe(false)
    expect(s.sellOffers).toEqual([])
    expect(s.users[SIDNEI]!.coins.map((c) => c.id)).toEqual([COIN]) // a moeda continua com o dono
    expect(s.users[SIDNEI]!.balance).toBe(0)
  })

  it('o expurgo também a tira do livro', () => {
    const s = cenario([PENDENTE_NO_PRAZO])
    s.sellOffers = [venda('OF-1', COIN, SIDNEI, 20_000, BAN, agora)]
    expurgarOfertasSemCustodia(s)
    expect(s.sellOffers).toEqual([])
  })

  it('pagou: a mesma moeda passa a ser negociável na hora, e a venda acontece', () => {
    const s = cenario([PAGA_DO_CICLO_1])

    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(false)
    expect(availableCoinsForSell(s, s.users[SIDNEI]!, BAN).map((c) => c.id)).toEqual([COIN])

    s.sellOffers = [venda('OF-1', COIN, SIDNEI, 20_000, BAN, agora)]
    s.buyOrders = [compra('BO-1', COMPRADOR, 20_000, 1, BAN, agora + 1)]
    const r = casarOrdensRespeitandoPendencia(s, TAXAS_PADRAO, agora, new Set())
    expect(r.matched).toBe(true)
    expect(s.users[COMPRADOR]!.coins.map((c) => c.id)).toEqual([COIN])
  })
})

describe('os ciclos seguintes: negociável até as 23:59 do dia da cobrança, depois só pagando', () => {
  const s = cenario([PAGA_DO_CICLO_1])

  it('durante o ciclo pago, livre', () => {
    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 11, 5))).toBe(false)
  })

  it('no dia da cobrança (12/11), mesmo sem pagar a nova, ainda negocia — até 23:59', () => {
    expect(custodiaImpedeNegociar(s, COIN, FIM_DO_CICLO)).toBe(false)
    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 11, 12, 23, 59))).toBe(false)
  })

  it('à meia-noite do dia seguinte (13/11, 00:00) trava', () => {
    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 11, 13, 0, 1))).toBe(true)
  })

  it('travou mesmo SEM fatura nova emitida: se o cron falhar, a moeda não negocia de graça', () => {
    // só existe a fatura paga do ciclo 1 — nenhuma do ciclo 2 foi emitida
    expect(s.faturasCustodia).toHaveLength(1)
    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 12, 20))).toBe(true)
  })

  it('pagou o ciclo 2: destrava, e a próxima trava vai para 13/12', () => {
    const pago2 = fatura({
      id: 'FAT-CICLO-2',
      status: 'paga',
      origem: 'ciclo_mensal',
      competencia: '2026-11',
      dataEmissao: FIM_DO_CICLO,
      dataVencimento: brasilia(2026, 12, 12),
      dataPagamento: brasilia(2026, 11, 14),
      coberturaAte: brasilia(2026, 12, 12) - 1,
    })
    const depois = cenario([PAGA_DO_CICLO_1, pago2])

    expect(custodiaImpedeNegociar(depois, COIN, brasilia(2026, 11, 14, 10))).toBe(false)
    expect(custodiaImpedeNegociar(depois, COIN, brasilia(2026, 12, 12, 23, 59))).toBe(false)
    expect(custodiaImpedeNegociar(depois, COIN, brasilia(2026, 12, 13, 0, 1))).toBe(true)
  })
})

describe('outras formas de a custódia estar paga — ou não', () => {
  const agora = brasilia(2026, 10, 20)

  it('fatura cancelada não cobre nada', () => {
    const s = cenario([fatura({ id: 'F', status: 'cancelada', dataPagamento: ENTRADA, coberturaAte: FIM_DO_CICLO - 1 })])
    expect(coberturaPagaDaMoeda(s, COIN)).toBeNull()
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(true)
  })

  it('custódia paga pelo dono anterior NÃO vale para quem comprou a moeda (21/10/2026)', () => {
    // Até 20/10 valia — foi por esse buraco que o "Gerais" comprou moeda já paga pelo vendedor e a
    // anunciou sem pagar nada. A custódia é sempre do dono atual.
    // cópia: a constante é compartilhada pelos outros testes
    const s = cenario([{ ...PAGA_DO_CICLO_1 }])
    s.faturasCustodia![0]!.userEmail = 'vendedor.anterior@exemplo.com.br'
    expect(coberturaPagaDaMoeda(s, COIN)).toBeNull()
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(true)
  })

  it('o plano do dono anterior também não vale para o dono novo', () => {
    const s = cenario([])
    s.planosCustodia = [
      {
        id: 'PLC-ANTERIOR',
        userEmail: 'vendedor.anterior@exemplo.com.br',
        protocoloEnvio: 'RO-ENV-0001',
        modalidade: 'mensal',
        quantidadeContratada: 1,
        moedaIds: [COIN],
        valorPorMoedaCents: 200,
        valorTotalCents: 200,
        parcelasMax: 1,
        inicioCompetencia: '2026-10',
        pagoAteCompetencia: '2026-12',
        status: 'vigente',
        formaPagamento: 'saldo',
        paymentIntentRef: null,
        assinaturaId: null,
        estornadoCents: 0,
        criadoEm: ENTRADA,
        atualizadoEm: ENTRADA,
      },
    ]
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(true)
  })

  it('moeda COMPRADA: só vale a fatura emitida depois da compra, em nome de quem comprou', () => {
    const s = cenario([])
    s.users[SIDNEI]!.coins[0]!.transferido = true
    s.users[SIDNEI]!.coins[0]!.entrada = '12/10/2026'
    // paga pelo mesmo Sidnei ANTES de ele comprar a moeda (quando ela era de outra pessoa, ou antes de vendê-la e recomprá-la)
    s.faturasCustodia = [fatura({ id: 'F-ANTES', status: 'paga', dataEmissao: brasilia(2026, 10, 1), dataPagamento: brasilia(2026, 10, 1), coberturaAte: FIM_DO_CICLO - 1 })]
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(true)
    // a embutida na compra, emitida no dia da compra, vale
    s.faturasCustodia.push(fatura({ id: 'F-COMPRA', status: 'paga', origem: 'compra', dataEmissao: ENTRADA, dataPagamento: ENTRADA, coberturaAte: FIM_DO_CICLO - 1 }))
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(false)
  })

  it('plano vigente pago cobre; plano aguardando pagamento não cobre', () => {
    const plano = {
      id: 'PLC-1',
      userEmail: SIDNEI,
      protocoloEnvio: 'RO-ENV-0001',
      modalidade: 'mensal' as const,
      quantidadeContratada: 1,
      moedaIds: [COIN],
      valorPorMoedaCents: 200,
      valorTotalCents: 200,
      parcelasMax: 1,
      inicioCompetencia: '2026-10',
      pagoAteCompetencia: '2026-10',
      status: 'vigente' as const,
      formaPagamento: 'saldo' as const,
      paymentIntentRef: null,
      assinaturaId: null,
      estornadoCents: 0,
      criadoEm: ENTRADA,
      atualizadoEm: ENTRADA,
    }
    const s = cenario([])
    s.planosCustodia = [plano]
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(false)

    s.planosCustodia = [{ ...plano, status: 'aguardando_pagamento', pagoAteCompetencia: null }]
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(true)
  })

  it('fatura antiga sem cobertura gravada cobre até o fim do mês da competência', () => {
    const s = cenario([fatura({ id: 'F', status: 'paga', competencia: '2026-10', dataPagamento: ENTRADA })])
    expect(coberturaPagaDaMoeda(s, COIN)).toBe(Date.UTC(2026, 10, 0, 12)) // 31/10, meio-dia UTC
    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 10, 31, 20))).toBe(false)
    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 11, 3))).toBe(true)
  })

  it('a fatura vencida do dono continua bloqueando, como sempre bloqueou', () => {
    const vencida = fatura({
      id: 'F-VENCIDA',
      status: 'pendente',
      origem: 'ciclo_mensal',
      competencia: '2026-11',
      dataVencimento: brasilia(2026, 11, 10),
    })
    const s = cenario([PAGA_DO_CICLO_1, vencida])
    // coberturas ainda valendo, mas há fatura do dono vencida há mais de um dia
    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 11, 12, 12))).toBe(false)
    expect(moedaComCustodiaNaoPagaNoEstado(s, SIDNEI, COIN, brasilia(2026, 11, 12, 12))).toBe(true)
  })
})

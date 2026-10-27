/**
 * Moeda comprada ANTES de 21/10/2026: o ciclo do dono novo começa no dia em que ele paga pela primeira vez
 * (Gabriel, 26/10/2026).
 *
 * O caso que originou: o Rogério comprou a RO-000104 em 28/09, quando o primeiro mês ainda não vinha
 * embutido na compra. A cobrança de 26/10 cobriu só o resto do ciclo da compra (28/09 a 27/10), e a tela
 * mostrou a próxima cobrança em 28/10 — R$ 2,00 por dois dias de guarda.
 */

import { describe, expect, it } from 'vitest'

import { coberturaPagaDaMoeda, custodiaImpedeNegociar } from '@/domain/bloqueio-por-debito'
import { inicioDoCicloQueTerminaEm } from '@/domain/ciclo-custodia'
import { emitirFaturasDosCiclos, proximaCobrancaDaMoeda } from '@/domain/cobranca-de-entrada'
import { recomecarCicloNoPrimeiroPagamento } from '@/domain/custodia-da-compra'
import { periodoDaFatura } from '@/domain/nfse/pedidos'
import { BAN, estado, moeda, usuario } from '@/domain/testing/fixtures'
import type { AppState, Coin, FaturaCustodia } from '@/domain/types'

const ROGERIO = 'rogerio@exemplo.com.br'
const COIN = 'RO-000104'

/** Instante em Brasília (UTC-3). */
const brasilia = (ano: number, mes: number, dia: number, hora = 0, min = 0): number => Date.UTC(ano, mes - 1, dia, hora + 3, min)

const HOJE = brasilia(2026, 10, 26, 11, 0)

function cenario(transferida: boolean, saldo = 10_000, faturas: FaturaCustodia[] = []): AppState {
  const m: Coin = { ...moeda(COIN, BAN), entrada: '28/09/2026', transferido: transferida }
  const s = estado({ [ROGERIO]: usuario('Rogério', saldo, [m]) })
  s.planosCustodia = []
  s.faturasCustodia = faturas
  return s
}

const moedaDe = (s: AppState): Coin => s.users[ROGERIO]!.coins[0]!

describe('a compra antiga, cobrada pelo cron com saldo', () => {
  it('o ciclo recomeça no dia do pagamento e a fatura cobre o mês inteiro dali', () => {
    const s = cenario(true)
    const [f] = emitirFaturasDosCiclos(s, ROGERIO, 'ciclo_mensal', undefined, HOJE)

    expect(f?.status).toBe('paga')
    expect(moedaDe(s).entrada).toBe('26/10/2026')
    expect(f?.competencia).toBe('2026-10')
    expect(f?.dataVencimento).toBe(brasilia(2026, 11, 26))
    expect(f?.coberturaAte).toBe(brasilia(2026, 11, 26) - 1)
    expect(proximaCobrancaDaMoeda(s, moedaDe(s), HOJE)).toBe(brasilia(2026, 11, 26))
    expect(custodiaImpedeNegociar(s, COIN, HOJE)).toBe(false)
  })

  it('o cron do dia seguinte não cobra de novo', () => {
    const s = cenario(true)
    emitirFaturasDosCiclos(s, ROGERIO, 'ciclo_mensal', undefined, HOJE)
    expect(emitirFaturasDosCiclos(s, ROGERIO, 'ciclo_mensal', undefined, brasilia(2026, 10, 28, 5))).toEqual([])
  })

  it('a nota fiscal descreve o período novo', () => {
    const s = cenario(true)
    const [f] = emitirFaturasDosCiclos(s, ROGERIO, 'ciclo_mensal', undefined, HOJE)
    expect(periodoDaFatura(f!)).toBe('26/10/2026 A 26/11/2026')
  })
})

describe('a compra antiga sem saldo: fatura emitida num dia, paga em outro', () => {
  it('o ciclo começa no dia em que ela é PAGA, e a fatura emitida antes continua valendo', () => {
    const s = cenario(true, 0)
    const [f] = emitirFaturasDosCiclos(s, ROGERIO, 'ciclo_mensal', undefined, HOJE)
    expect(f?.status).toBe('pendente')
    expect(moedaDe(s).entrada).toBe('28/09/2026') // pendente não mexe no ciclo

    const pagamento = brasilia(2026, 10, 30, 14, 0)
    f!.status = 'paga'
    f!.dataPagamento = pagamento
    expect(recomecarCicloNoPrimeiroPagamento(s, f!, pagamento)).toEqual([COIN])

    expect(moedaDe(s).entrada).toBe('30/10/2026')
    expect(f!.coberturaAte).toBe(brasilia(2026, 11, 30) - 1)
    // A fatura foi emitida em 26/10, antes do novo começo da guarda (30/10), e ainda assim é dele.
    expect(coberturaPagaDaMoeda(s, COIN)).toBe(brasilia(2026, 11, 30) - 1)
    expect(custodiaImpedeNegociar(s, COIN, pagamento)).toBe(false)
    expect(periodoDaFatura(f!)).toBe('30/10/2026 A 30/11/2026')
  })
})

describe('o que NÃO muda', () => {
  it('moeda que não foi comprada (a do próprio envio) segue o aniversário da aceitação', () => {
    const s = cenario(false)
    const [f] = emitirFaturasDosCiclos(s, ROGERIO, 'ciclo_mensal', undefined, HOJE)
    expect(moedaDe(s).entrada).toBe('28/09/2026')
    expect(f?.coberturaAte).toBe(brasilia(2026, 10, 28) - 1)
  })

  it('a renovação de quem já pagou um ciclo como dono novo segue o aniversário', () => {
    const jaPaga: FaturaCustodia = {
      id: 'FAT-ANTES', userEmail: ROGERIO, competencia: '2026-09', quantidadeMoedas: 1, moedaIds: [COIN],
      valorCents: 200, status: 'paga', dataEmissao: brasilia(2026, 9, 28, 12), dataVencimento: brasilia(2026, 10, 28),
      dataPagamento: brasilia(2026, 9, 28, 12), formaPagamento: 'saldo', paymentIntentId: null, planoId: null,
      origem: 'ciclo_mensal', coberturaAte: brasilia(2026, 10, 28) - 1,
    }
    const s = cenario(true, 10_000, [jaPaga])
    const [f] = emitirFaturasDosCiclos(s, ROGERIO, 'ciclo_mensal', undefined, brasilia(2026, 10, 28, 5))
    expect(moedaDe(s).entrada).toBe('28/09/2026')
    expect(f?.coberturaAte).toBe(brasilia(2026, 11, 28) - 1)
  })
})

describe('inicioDoCicloQueTerminaEm', () => {
  it('é o mesmo dia, um mês antes', () => {
    expect(inicioDoCicloQueTerminaEm(brasilia(2026, 11, 21))).toBe(brasilia(2026, 10, 21))
  })
  it('dia que não existe no mês anterior cai no último dia dele', () => {
    expect(inicioDoCicloQueTerminaEm(brasilia(2026, 3, 31))).toBe(brasilia(2026, 2, 28))
  })
})

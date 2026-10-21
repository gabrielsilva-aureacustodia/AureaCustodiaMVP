/**
 * Moeda comprada nasce com o primeiro mês de custódia PAGO em nome do comprador (21/10/2026).
 *
 * O caso que originou: o "Gerais" comprou moeda que o vendedor já tinha pago, o sistema contou a cobertura
 * do vendedor como se fosse dele, e ele anunciou a moeda sem pagar nada. A regra do Gabriel: TODA moeda tem
 * a custódia do DONO ATUAL paga — inclusive a comprada —, e o primeiro mês entra na própria compra.
 */

import { describe, expect, it } from 'vitest'

import { custodiaImpedeNegociar, coberturaPagaDaMoeda, moedaComCustodiaNaoPagaNoEstado } from '@/domain/bloqueio-por-debito'
import { emitirFaturasDosCiclos } from '@/domain/cobranca-de-entrada'
import { casarOrdensRespeitandoPendencia } from '@/domain/bloqueio-por-debito'
import { TAXAS_PADRAO } from '@/domain/fees'
import { availableCoinsForSell, matchOrders, transferCoin } from '@/domain/market'
import { BAN, compra, custodiaEmDia, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'
import type { AppState, FaturaCustodia } from '@/domain/types'

const VENDEDOR = 'vendedor@exemplo.com.br'
const GERAIS = 'gerais@exemplo.com.br'
const COIN = 'RO-000011'

/** 00:00 de Brasília do dia (UTC-3). */
const brasilia = (ano: number, mes: number, dia: number, hora = 0, min = 0): number => Date.UTC(ano, mes - 1, dia, hora + 3, min)

/** O vendedor tem a moeda com a custódia PAGA por ele (a fatura do ciclo), como o Rogério tinha. */
function cenario(saldoDoComprador: number): AppState {
  const s = estado({
    [VENDEDOR]: usuario('Vendedor', 0, [moeda(COIN, BAN)]),
    [GERAIS]: usuario('Gerais', saldoDoComprador, []),
  })
  s.planosCustodia = []
  const pagaPeloVendedor: FaturaCustodia = {
    id: 'FAT-DO-VENDEDOR',
    userEmail: VENDEDOR,
    competencia: '2026-10',
    quantidadeMoedas: 1,
    moedaIds: [COIN],
    valorCents: 200,
    status: 'paga',
    dataEmissao: brasilia(2026, 10, 1),
    dataVencimento: brasilia(2026, 11, 1),
    dataPagamento: brasilia(2026, 10, 1),
    coberturaAte: brasilia(2026, 11, 1) - 1,
    formaPagamento: 'saldo',
    origem: 'ciclo_mensal',
  }
  s.faturasCustodia = [pagaPeloVendedor]
  return s
}

function comprar(s: AppState, preco = 20_000): void {
  s.sellOffers.push(venda('OF-1', COIN, VENDEDOR, preco, BAN, 1000))
  s.buyOrders.push(compra('BID-1', GERAIS, preco, 1, BAN, 2000))
  expect(matchOrders(s).matched).toBe(true)
}

describe('o caso do Gerais: comprou moeda que o vendedor já tinha pago', () => {
  it('a custódia paga pelo vendedor NÃO vale para o comprador: só o transporte da moeda a deixa travada', () => {
    const s = cenario(1_000_000)
    // Transferência "nua", sem passar pela compra: o dono novo não tem custódia nenhuma em nome dele.
    transferCoin(s.users[VENDEDOR]!, s.users[GERAIS]!, COIN)

    expect(coberturaPagaDaMoeda(s, COIN)).toBeNull()
    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 10, 21))).toBe(true)
    expect(availableCoinsForSell(s, s.users[GERAIS]!, BAN)).toEqual([])
  })

  it('a COMPRA embute o primeiro mês: o comprador paga preço + comissão + R$ 2,00 e a moeda já nasce negociável', () => {
    const s = cenario(1_000_000)
    comprar(s)

    // preço 20.000 + comissão de compra 200 + custódia 200
    expect(s.users[GERAIS]!.balance).toBe(1_000_000 - 20_000 - 200 - 200)
    const fatura = s.faturasCustodia!.find((f) => f.userEmail === GERAIS)!
    expect(fatura).toMatchObject({ moedaIds: [COIN], valorCents: 200, status: 'paga', origem: 'compra', formaPagamento: 'saldo' })

    // negociável AGORA, no mesmo instante da compra
    const agora = Date.now()
    expect(custodiaImpedeNegociar(s, COIN, agora)).toBe(false)
    expect(moedaComCustodiaNaoPagaNoEstado(s, GERAIS, COIN, agora)).toBe(false)
    expect(availableCoinsForSell(s, s.users[GERAIS]!, BAN).map((c) => c.id)).toEqual([COIN])
  })

  it('a fatura embutida cobre os 30 dias seguintes à compra, e depois só pagando', () => {
    const s = cenario(1_000_000)
    comprar(s)
    const fatura = s.faturasCustodia!.find((f) => f.userEmail === GERAIS)!
    const compradaEm = fatura.dataEmissao
    const hoje = new Date(compradaEm - 3 * 3_600_000)
    const mes = hoje.getUTCMonth() // mês de Brasília no dia da compra (0-11)
    const ano = hoje.getUTCFullYear()
    const dia = hoje.getUTCDate()
    const aniversario = Date.UTC(ano, mes + 1, Math.min(dia, new Date(Date.UTC(ano, mes + 2, 0)).getUTCDate())) + 3 * 3_600_000

    // cobertura termina no instante anterior ao aniversário do mês seguinte
    expect(fatura.coberturaAte).toBe(aniversario - 1)
    expect(custodiaImpedeNegociar(s, COIN, aniversario + 23 * 3_600_000)).toBe(false) // dia do aniversário, até 23:59
    expect(custodiaImpedeNegociar(s, COIN, aniversario + 25 * 3_600_000)).toBe(true) // depois, só pagando
  })

  it('o ciclo seguinte cobra o comprador (o dono novo), e no dia da compra o cron NÃO cobra de novo', () => {
    const s = cenario(1_000_000)
    comprar(s)
    const fatura = s.faturasCustodia!.find((f) => f.userEmail === GERAIS)!

    // no dia da compra: a custódia do ciclo já está paga, nada a emitir
    expect(emitirFaturasDosCiclos(s, GERAIS, 'ciclo_mensal', { custodiaMensalPorMoeda: TAXAS_PADRAO.custodiaMensalPorMoeda }, fatura.dataEmissao + 3_600_000)).toEqual([])

    // um mês depois: o ciclo seguinte é do Gerais
    const novas = emitirFaturasDosCiclos(s, GERAIS, 'ciclo_mensal', { custodiaMensalPorMoeda: TAXAS_PADRAO.custodiaMensalPorMoeda }, fatura.coberturaAte! + 3_600_000)
    expect(novas).toHaveLength(1)
    expect(novas[0]).toMatchObject({ userEmail: GERAIS, moedaIds: [COIN], origem: 'ciclo_mensal' })
  })

  it('o comprador que tem saldo para o preço e a comissão, mas NÃO para a custódia, não compra', () => {
    // 20.000 + 200 = 20.200 cobrem preço e comissão; falta o R$ 2,00 da custódia.
    const s = cenario(20_200)
    s.sellOffers.push(venda('OF-1', COIN, VENDEDOR, 20_000, BAN, 1000))
    s.buyOrders.push(compra('BID-1', GERAIS, 20_000, 1, BAN, 2000))

    const r = matchOrders(s)

    expect(r.matched).toBe(false)
    expect(s.users[GERAIS]!.coins).toHaveLength(0)
    expect(s.users[VENDEDOR]!.coins.map((c) => c.id)).toEqual([COIN])
    expect(s.users[GERAIS]!.balance).toBe(20_200) // nada foi mexido
  })

  it('a custódia embutida é receita de custódia no livro-razão: entra como fatura paga, não como comissão', () => {
    const s = cenario(1_000_000)
    comprar(s)
    const trade = s.trades[s.trades.length - 1]!
    // a comissão do histórico continua sendo só a de corretagem
    expect(trade.feeComprador).toBe(200)
    expect(trade.fee).toBe(400)
    expect(s.faturasCustodia!.filter((f) => f.origem === 'compra')).toHaveLength(1)
  })

  it('várias moedas na mesma compra: uma fatura paga por moeda, e o saldo desce R$ 2,00 por moeda', () => {
    const s = estado({
      [VENDEDOR]: usuario('Vendedor', 0, [moeda('RO-000001', BAN), moeda('RO-000002', BAN), moeda('RO-000003', BAN)]),
      [GERAIS]: usuario('Gerais', 1_000_000, []),
    })
    // o vendedor tem a custódia em dia (o plano que `estado()` já dá); o comprador começa sem nada
    s.faturasCustodia = []
    for (const [i, id] of ['RO-000001', 'RO-000002', 'RO-000003'].entries()) {
      s.sellOffers.push(venda(`OF-${i}`, id, VENDEDOR, 20_000, BAN, 1000 + i))
    }
    s.buyOrders.push(compra('BID-1', GERAIS, 20_000, 3, BAN, 2000))

    expect(matchOrders(s).matched).toBe(true)

    expect(s.users[GERAIS]!.coins).toHaveLength(3)
    expect(s.users[GERAIS]!.balance).toBe(1_000_000 - 3 * (20_000 + 200 + 200))
    const faturas = s.faturasCustodia!.filter((f) => f.userEmail === GERAIS)
    expect(faturas.map((f) => f.moedaIds[0]).sort()).toEqual(['RO-000001', 'RO-000002', 'RO-000003'])
    expect(new Set(faturas.map((f) => f.id)).size).toBe(3)
  })

  it('o vendedor que não pagou continua não vendendo, e a compra do livro respeita isso', () => {
    const s = cenario(1_000_000)
    s.faturasCustodia = [] // o vendedor nunca pagou
    s.sellOffers.push(venda('OF-1', COIN, VENDEDOR, 20_000, BAN, 1000))
    s.buyOrders.push(compra('BID-1', GERAIS, 20_000, 1, BAN, 2000))

    const r = casarOrdensRespeitandoPendencia(s, TAXAS_PADRAO, Date.now(), new Set())

    expect(r.matched).toBe(false)
    expect(s.sellOffers).toEqual([])
    expect(s.users[GERAIS]!.balance).toBe(1_000_000)
  })

  it('quem recompra a própria moeda depois de vender não herda a fatura da primeira guarda', () => {
    const s = cenario(1_000_000)
    comprar(s) // Gerais compra

    // Gerais vende de volta (a moeda volta a ser do vendedor) e recompra depois: a fatura embutida da
    // primeira compra é de um período de guarda anterior e não vale para o segundo.
    transferCoin(s.users[GERAIS]!, s.users[VENDEDOR]!, COIN)
    s.users[VENDEDOR]!.coins[0]!.entrada = '05/11/2026'
    transferCoin(s.users[VENDEDOR]!, s.users[GERAIS]!, COIN)
    s.users[GERAIS]!.coins[0]!.entrada = '30/12/2026'
    const primeira = s.faturasCustodia!.find((f) => f.userEmail === GERAIS)!
    primeira.dataEmissao = brasilia(2026, 10, 21)

    expect(custodiaImpedeNegociar(s, COIN, brasilia(2026, 12, 31))).toBe(true)
  })
})

describe('moeda sem dono encontrado', () => {
  it('não há dono, não há custódia paga: nada a negociar', () => {
    const s = custodiaEmDia(estado({ [VENDEDOR]: usuario('Vendedor', 0, []) }))
    expect(custodiaImpedeNegociar(s, 'RO-INEXISTENTE')).toBe(true)
  })
})

/**
 * OS TOTAIS DO EXTRATO COM A CONTA DO ROGÉRIO (22/11/2026).
 *
 * O Rogério olhou a ficha dele no painel e disse que a conta não fechava: depósito 1.200,00, compras 1.600,00,
 * vendas 1.140,00, comissões 26,70 e custódia paga 528,00 deixavam o saldo em 185,30, mas a caixinha "Taxas
 * pagas" mostrava só 26,70. Não era erro de cálculo — o saldo sempre esteve certo; a custódia paga é que não
 * entrava no total de taxas. Este teste fixa os números dele para o total, a decomposição e o saldo nunca mais
 * se separarem: taxas pagas = comissões + custódia + tarifas, e
 *
 *     saldo = depósitos − compras + vendas − taxas pagas
 *
 * Fatura em aberto não é paga (não entra), e fatura paga e depois estornada devolve o que tinha tirado.
 */

import { describe, expect, it } from 'vitest'

import { statementTotals, userStatement } from '@/domain/statement'
import { BAN, estado, usuario } from '@/domain/testing/fixtures'
import type { AppState, FaturaCustodia, Trade } from '@/domain/types'

const EU = 'rogerio'
const OUTRO = 'outro'
const DIA = 86_400_000
const T0 = new Date(2026, 10, 1, 12).getTime()

function trade(buyer: string, seller: string, price: number, t: number, feeComprador: number, feeVendedor: number): Trade {
  return { price, qty: 1, date: t, buyer, seller, tipoMoeda: BAN, feeComprador, feeVendedor, fee: feeComprador + feeVendedor }
}

function fatura(id: string, valor: number, status: FaturaCustodia['status'], t: number): FaturaCustodia {
  return {
    id,
    userEmail: EU,
    competencia: '2026-11',
    quantidadeMoedas: valor / 200,
    moedaIds: [],
    valorCents: valor,
    status,
    dataEmissao: t,
    dataVencimento: t + 30 * DIA,
    dataPagamento: status === 'paga' ? t + 1000 : null,
    formaPagamento: status === 'paga' ? 'saldo' : null,
    paymentIntentId: null,
    planoId: null,
    origem: 'ciclo_mensal',
  }
}

/** A conta do Rogério, em centavos: 1.200 − 1.600 + 1.140 − 26,70 − 528 = 185,30. */
function contaDoRogerio(): AppState {
  const s = estado({ [EU]: usuario('Rogério', 18_530, []), [OUTRO]: usuario('Outro', 0, []) })
  s.deposits = [{ userEmail: EU, valor: 120_000, date: T0 } as AppState['deposits'][number]]
  // 7 compras = 1.600,00 (6 × 200 + 1 × 400), comissão de compra 15,00 no total.
  const compras = [...Array(6)].map((_, i) => trade(EU, OUTRO, 20_000, T0 + (i + 1) * DIA, 200, 0))
  compras.push(trade(EU, OUTRO, 40_000, T0 + 7 * DIA, 300, 0))
  // 6 vendas = 1.140,00 (6 × 190), comissão de venda 11,70 no total.
  const vendas = [...Array(6)].map((_, i) => trade(OUTRO, EU, 19_000, T0 + (i + 8) * DIA, 0, 195))
  s.trades = [...compras, ...vendas]
  s.faturasCustodia = [fatura('FAT-A', 26_400, 'paga', T0 + 15 * DIA), fatura('FAT-B', 26_400, 'paga', T0 + 16 * DIA)]
  return s
}

describe('totais do extrato — a conta do Rogério', () => {
  it('as taxas pagas somam comissões e custódia, e o saldo fecha', () => {
    const s = contaDoRogerio()
    const linhas = userStatement(s, EU)
    const t = statementTotals(linhas)

    expect(t.depositado).toBe(120_000)
    expect(t.compradoValor).toBe(160_000)
    expect(t.compradoQtd).toBe(7)
    expect(t.vendidoValor).toBe(114_000)
    expect(t.vendidoQtd).toBe(6)

    expect(t.comissoesPagas).toBe(2_670) // R$ 26,70
    expect(t.custodiaPaga).toBe(52_800) // R$ 528,00
    expect(t.outrasTarifas).toBe(0)
    expect(t.taxasPagas).toBe(55_470) // R$ 554,70
    expect(t.taxasPagas).toBe(t.comissoesPagas + t.custodiaPaga + t.outrasTarifas)

    // A conta que o Rogério faz de cabeça, agora fechando.
    const saldo = t.depositado - t.compradoValor + t.vendidoValor - t.taxasPagas
    expect(saldo).toBe(18_530) // R$ 185,30
    expect(saldo).toBe(s.users[EU].balance)
    expect(t.variacaoSaldo).toBe(18_530)
    expect(linhas[linhas.length - 1].saldoApos).toBe(18_530)
  })

  it('fatura em aberto não é custódia paga', () => {
    const s = contaDoRogerio()
    s.faturasCustodia = [...(s.faturasCustodia ?? []), fatura('FAT-C', 5_200, 'pendente', T0 + 20 * DIA)]
    const t = statementTotals(userStatement(s, EU))
    expect(t.custodiaPaga).toBe(52_800)
    expect(t.taxasPagas).toBe(55_470)
  })

  it('custódia paga e depois estornada devolve o que tirou das taxas pagas', () => {
    const s = contaDoRogerio()
    // A fatura B foi paga e cancelada: o extrato mostra a saída e o estorno, e a soma líquida é uma só fatura.
    const b = (s.faturasCustodia ?? [])[1]
    b.status = 'cancelada'
    s.users[EU].balance += 26_400
    const t = statementTotals(userStatement(s, EU))
    expect(t.custodiaPaga).toBe(26_400)
    expect(t.taxasPagas).toBe(2_670 + 26_400)
  })
})

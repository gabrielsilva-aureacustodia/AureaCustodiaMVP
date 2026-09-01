/**
 * Testes do extrato — consistência contábil.
 *
 * O invariante central: saldo inicial + soma dos impactos do extrato = saldo
 * atual da conta. É o que faz o extrato ser um documento conferível em vez de
 * uma lista bonita.
 */

import { describe, expect, it } from 'vitest'

import { matchOrders } from '@/domain/market'
import { tradeFee } from '@/domain/fees'
import { statementTotals, userStatement } from '@/domain/statement'
import { BAN, compra, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'

describe('userStatement', () => {
  it('depósito + venda: o extrato fecha com o saldo real, ao centavo', () => {
    const s = estado({
      eu: usuario('Eu', 100_000, [moeda('RO-000001', BAN)]),
      outro: usuario('Outro', 100_000, []),
    })
    const saldoInicial = s.users.eu.balance

    // Depósito simulado, do jeito que a server action grava.
    s.users.eu.balance += 50_000
    s.deposits.push({ userEmail: 'eu', valor: 50_000, date: 1000 })

    // Venda casada pelo motor — o caminho real, não um trade montado à mão.
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'eu', 28_500, BAN, 2000))
    s.buyOrders.push(compra('BID-1', 'outro', 28_500, 1, BAN, 2000))
    matchOrders(s)

    const linhas = userStatement(s, 'eu')
    const tot = statementTotals(linhas)

    expect(linhas).toHaveLength(2)
    expect(linhas[0].kind).toBe('Depósito') // ordem crescente: extrato se soma de cima para baixo
    expect(saldoInicial + tot.variacaoSaldo).toBe(s.users.eu.balance)
  })

  it('a comissão aparece só na venda, e é a mesma do motor', () => {
    const s = estado({
      eu: usuario('Eu', 100_000, [moeda('RO-000001', BAN)]),
      outro: usuario('Outro', 100_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'eu', 28_500, BAN, 2000))
    s.buyOrders.push(compra('BID-1', 'outro', 28_500, 1, BAN, 2000))
    matchOrders(s)

    const doVendedor = statementTotals(userStatement(s, 'eu'))
    const doComprador = statementTotals(userStatement(s, 'outro'))

    expect(doVendedor.taxasPagas).toBe(tradeFee(28_500))
    expect(doComprador.taxasPagas).toBe(0) // o comprador paga o preço cheio, sem comissão
    expect(doComprador.compradoValor).toBe(28_500)
  })

  it('cobrança de custódia e envio entram com impacto ZERO — não movem saldo', () => {
    const s = estado({ eu: usuario('Eu', 100_000, []) })
    s.custodyCharges['eu'] = {
      totalMoedas: 3,
      valorCobrado: 1_500,
      dataCobranca: '20/06/2026',
      statusPagamento: 'Pendente',
    }
    s.envios.push({
      protocolo: 'RO-ENV-0001',
      userEmail: 'eu',
      tipoMoeda: BAN,
      ano: 2012,
      quantidade: 2,
      codigoRastreio: null,
      dataPostagem: null,
      dataRecebimento: null,
      etapaAtual: 'Protocolo gerado',
      createdAt: Date.now(),
      codigosAtivosGerados: [],
    })

    const linhas = userStatement(s, 'eu')
    const tot = statementTotals(linhas)

    expect(linhas).toHaveLength(2)
    expect(linhas.every((l) => l.impacto === 0)).toBe(true)
    // O valor da cobrança aparece como taxa informativa, não como saída de caixa:
    // no MVP nenhuma ação debita a custódia do saldo.
    expect(tot.variacaoSaldo).toBe(0)
  })
})

/**
 * O ledger só vale alguma coisa se duas propriedades forem verdadeiras sempre:
 * a soma dos lançamentos de uma conta é o saldo dela, e uma linha alterada no
 * meio da cadeia é detectável. Os testes afirmam as duas.
 */

import { describe, expect, it } from 'vitest'

import { tradeFee } from '@/domain/fees'
import { GENESIS } from '@/domain/hash'
import {
  encadear,
  lancamentoDeDeposito,
  lancamentoDeSaldoInicial,
  lancamentosDeTrade,
  saldoPorSoma,
  verificarCadeia,
} from '@/domain/ledger'
import { matchOrders } from '@/domain/market'
import { BAN, compra, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'

describe('ledger', () => {
  it('negociação: três lançamentos, e a soma de cada lado bate com o saldo do motor', () => {
    const s = estado({
      eu: usuario('Eu', 100_000, [moeda('RO-000001', BAN)]),
      outro: usuario('Outro', 100_000, []),
    })
    s.sellOffers.push(venda('OF-1', 'RO-000001', 'eu', 28_500, BAN, 2000))
    s.buyOrders.push(compra('BID-1', 'outro', 28_500, 1, BAN, 2000))
    const { trades } = matchOrders(s)

    const pendentes = [
      lancamentoDeSaldoInicial('eu', 100_000, 1000, 'abertura'),
      lancamentoDeSaldoInicial('outro', 100_000, 1000, 'abertura'),
      ...lancamentosDeTrade(trades[0], tradeFee(28_500), 'TRADE-1'),
    ]
    const { lancamentos, saldos } = encadear(pendentes, {}, GENESIS)

    expect(lancamentos.map((l) => l.tipo)).toEqual(['saldo_inicial', 'saldo_inicial', 'compra', 'venda', 'comissao'])
    expect(saldos.eu).toBe(s.users.eu.balance)
    expect(saldos.outro).toBe(s.users.outro.balance)
    expect(saldoPorSoma(lancamentos, 'eu')).toBe(s.users.eu.balance)
    // a receita da Áurea é o lançamento de comissão, com o valor cobrado congelado
    expect(lancamentos[4]).toMatchObject({ tipo: 'comissao', valor: tradeFee(28_500), sinal: -1, userEmail: 'eu' })
  })

  it('a cadeia confere, e adulterar uma linha do meio quebra a verificação', () => {
    const pendentes = [
      lancamentoDeSaldoInicial('eu', 1_000, 1, 'abertura'),
      lancamentoDeDeposito({ userEmail: 'eu', valor: 500, date: 2 }, 'DEP-1'),
      lancamentoDeDeposito({ userEmail: 'eu', valor: 250, date: 3 }, 'DEP-2'),
    ]
    const { lancamentos } = encadear(pendentes, {}, GENESIS)
    expect(verificarCadeia(lancamentos, GENESIS).ok).toBe(true)
    expect(lancamentos[0].hashAnterior).toBe(GENESIS)
    expect(lancamentos[1].hashAnterior).toBe(lancamentos[0].hash)

    const adulterado = lancamentos.map((l) => ({ ...l }))
    adulterado[1].valor = 5_000 // alguém "corrigiu" o depósito na mão
    const v = verificarCadeia(adulterado, GENESIS)
    expect(v.ok).toBe(false)
    expect(v.primeiraQuebra).toBe(1)
  })

  it('o mesmo conjunto de dados produz o mesmo hash — determinismo entre máquinas', () => {
    const p = [lancamentoDeSaldoInicial('eu', 1_000, 1, 'abertura')]
    const a = encadear(p, {}, GENESIS).lancamentos[0].hash
    const b = encadear(p, {}, GENESIS).lancamentos[0].hash
    expect(a).toBe(b)
    // Valor fixado: se este teste quebrar, a fórmula do hash mudou — e isso
    // exige migration de recálculo, não um ajuste no teste.
    expect(a).toBe('056de1df9f41d65220f40fb69e162e89b1036b7b1b3519d5beb8a2e0dc0ba63b')
  })

  it('recusa valor negativo ou fracionário: o sentido é o sinal, o valor é sempre inteiro >= 0', () => {
    expect(() =>
      encadear([{ ...lancamentoDeSaldoInicial('eu', 1, 1, 'x'), valor: -1 }], {}, GENESIS),
    ).toThrow()
    expect(() =>
      encadear([{ ...lancamentoDeSaldoInicial('eu', 1, 1, 'x'), valor: 1.5 }], {}, GENESIS),
    ).toThrow()
  })
})

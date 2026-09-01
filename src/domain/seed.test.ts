/**
 * Testes do seed — invariantes, nunca valores sorteados.
 *
 * O seed usa Math.random() de propósito (a "cara" da demonstração varia a cada
 * reinício). Por isso NENHUM teste aqui afirma um valor sorteado: afirmam-se
 * faixas e propriedades que valem em todo sorteio. Teste que depende de sorte
 * falha um dia em vinte, e teste que falha sozinho é teste que a equipe
 * aprende a ignorar — o que é pior que não ter teste.
 */

import { describe, expect, it } from 'vitest'

import { faixaValor } from '@/domain/constants'
import { custodyFeeForCount } from '@/domain/fees'
import { seedState } from '@/domain/seed'
import { BAN, DH } from '@/domain/testing/fixtures'

/** Contagens fixadas em usersDef — determinísticas, podem ser afirmadas. */
const CONTAGEM_ESPERADA: Record<string, number> = {
  'rogeriopena@testeaurea.com.br': 15,
  'gabrielsilva@testeaurea.com.br': 13,
  'alex@testeaurea.com.br': 9,
  'pegge@testeaurea.com.br': 10,
  'rozane@testeaurea.com.br': 8,
  'goturuba@testeaurea.com.br': 21,
  'solares@testeaurea.com.br': 11,
}

describe('seedState', () => {
  const s = seedState()

  it('as 7 contas existem com as contagens de moedas do usersDef', () => {
    expect(Object.keys(s.users).sort()).toEqual(Object.keys(CONTAGEM_ESPERADA).sort())
    for (const [email, esperado] of Object.entries(CONTAGEM_ESPERADA)) {
      expect(s.users[email].coins).toHaveLength(esperado)
    }
  })

  it('toda conta tem de 1 a 3 Direitos Humanos E ao menos 1 Bandeira', () => {
    for (const u of Object.values(s.users)) {
      const dh = u.coins.filter((c) => c.tipoMoeda === DH).length
      const ban = u.coins.filter((c) => c.tipoMoeda === BAN).length
      expect(dh).toBeGreaterThanOrEqual(1)
      expect(dh).toBeLessThanOrEqual(3)
      expect(ban).toBeGreaterThanOrEqual(1)
    }
  })

  it('os valores das DH ficam na faixa pesquisada, em múltiplos de R$ 5,00', () => {
    const { min, max } = faixaValor(DH)
    for (const u of Object.values(s.users)) {
      for (const c of u.coins.filter((x) => x.tipoMoeda === DH)) {
        expect(c.valorEstimado).toBeGreaterThanOrEqual(min)
        expect(c.valorEstimado).toBeLessThanOrEqual(max)
        expect(c.valorEstimado % 500).toBe(0)
      }
    }
  })

  it('o histórico tem negociações dos DOIS ativos, em ordem cronológica global', () => {
    expect(s.trades.some((t) => t.tipoMoeda === BAN)).toBe(true)
    expect(s.trades.some((t) => t.tipoMoeda === DH)).toBe(true)
    for (let i = 1; i < s.trades.length; i++) {
      expect(s.trades[i - 1].date).toBeLessThanOrEqual(s.trades[i].date)
    }
  })

  it('toda negociação do seed carrega tipoMoeda — nenhum registro v5 escondido', () => {
    expect(s.trades.every((t) => typeof t.tipoMoeda === 'string' && t.tipoMoeda.length > 0)).toBe(
      true,
    )
  })

  it('deposits nasce vazio: saldo inicial não é depósito', () => {
    expect(s.deposits).toEqual([])
  })

  it('a cobrança de custódia de cada conta bate a faixa da contagem final', () => {
    for (const [email, u] of Object.entries(s.users)) {
      const cobranca = s.custodyCharges[email]
      expect(cobranca.totalMoedas).toBe(u.coins.length)
      expect(cobranca.valorCobrado).toBe(custodyFeeForCount(u.coins.length))
      expect(cobranca.statusPagamento).toBe('Pago')
    }
  })

  it('códigos de ativo são únicos entre TODAS as contas', () => {
    const ids = Object.values(s.users).flatMap((u) => u.coins.map((c) => c.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

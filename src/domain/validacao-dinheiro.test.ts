import { describe, expect, it } from 'vitest'
import { DEPOSITO_MINIMO_CENTS, motivoOfertaDeCompraInvalida, somenteNumerico, validarDeposito } from './validacao-dinheiro'

const f = (c: number): string => `R$ ${(c / 100).toFixed(2)}`

describe('depósito (B07)', () => {
  it('mínimo desligado até o Gabriel decidir', () => expect(DEPOSITO_MINIMO_CENTS).toBe(0))
  it('R$ 0,01 passa enquanto não há mínimo', () => expect(validarDeposito(1, 10_000_000, f).valido).toBe(true))
  it('acima do máximo: um motivo e valido=false', () => {
    const r = validarDeposito(10_000_001, 10_000_000, f)
    expect(r.valido).toBe(false)
    if (!r.valido) expect(r.motivo).toContain('máximo')
  })
  it('vazio, zero e negativo não reclamam nem calculam', () => {
    for (const c of [0, -100, NaN]) {
      const r = validarDeposito(c, 10_000_000, f)
      expect(r).toEqual({ valido: false, cents: 0, motivo: null })
    }
  })
  it('mínimo ligado bloqueia abaixo dele', () => {
    const r = validarDeposito(500, 10_000_000, f, 1000)
    expect(r.valido).toBe(false)
  })
  it('campo só numérico: tira letras e o sinal de menos', () => {
    expect(somenteNumerico('-12a3,5x')).toBe('123,5')
  })
})

describe('oferta de compra (S04)', () => {
  const base = { quantidade: 1, precoCents: 15000, comSaldo: true, saldoCents: 20000, custoTotalCents: 15500, formatarBRL: f }
  it('válida', () => expect(motivoOfertaDeCompraInvalida(base)).toBeNull())
  it('sem saldo', () => expect(motivoOfertaDeCompraInvalida({ ...base, saldoCents: 0 })).toContain('saldo'))
  it('pré-paga não olha o saldo', () => expect(motivoOfertaDeCompraInvalida({ ...base, comSaldo: false, saldoCents: 0 })).toBeNull())
  it('quantidade 0, negativa ou fracionária', () => {
    for (const q of [0, -1, 1.5, NaN]) expect(motivoOfertaDeCompraInvalida({ ...base, quantidade: q })).toContain('quantidade')
  })
  it('preço 0 ou inválido', () => {
    for (const p of [0, -5, NaN]) expect(motivoOfertaDeCompraInvalida({ ...base, precoCents: p })).toContain('preço')
  })
})

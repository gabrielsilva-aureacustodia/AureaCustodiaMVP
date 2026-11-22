import { describe, expect, it } from 'vitest'
import { calcularDataLimiteSaque } from './dates'
import { dataDeBrasilia, ehDiaUtil, feriadosNacionais, somarDiasUteis } from './dias-uteis'

// Meio-dia de Brasília (15:00 UTC) do dia civil.
const meioDia = (a: number, m: number, d: number): number => Date.UTC(a, m - 1, d, 15, 0, 0)
const dia = (ts: number): string => {
  const x = dataDeBrasilia(ts)
  return `${x.ano}-${String(x.mes).padStart(2, '0')}-${String(x.dia).padStart(2, '0')}`
}

describe('feriados nacionais', () => {
  it('móveis de 2026 (Páscoa 05/04)', () => {
    const f = feriadosNacionais(2026)
    expect(f.has('2026-02-16')).toBe(true) // segunda de Carnaval
    expect(f.has('2026-02-17')).toBe(true)
    expect(f.has('2026-04-03')).toBe(true) // Sexta-feira Santa
    expect(f.has('2026-06-04')).toBe(true) // Corpus Christi
    expect(f.has('2026-11-20')).toBe(true) // Consciência Negra
  })
  it('Páscoa de 2027 (28/03): Sexta-feira Santa 26/03', () => {
    expect(feriadosNacionais(2027).has('2027-03-26')).toBe(true)
  })
})

describe('somarDiasUteis', () => {
  it('B06: pedido na sexta 20/11/2026 (feriado) → 3º dia útil é quarta 25/11', () => {
    expect(dia(somarDiasUteis(meioDia(2026, 11, 20), 3))).toBe('2026-11-25')
  })
  it('pedido numa quinta comum pula o fim de semana', () => {
    expect(dia(somarDiasUteis(meioDia(2026, 11, 26), 3))).toBe('2026-12-01')
  })
  it('sábado e domingo não são dias úteis', () => {
    expect(ehDiaUtil(meioDia(2026, 11, 21))).toBe(false)
    expect(ehDiaUtil(meioDia(2026, 11, 22))).toBe(false)
    expect(ehDiaUtil(meioDia(2026, 11, 23))).toBe(true)
  })
  it('o dia de Brasília vale, não o do servidor (01:00 UTC ainda é o dia anterior)', () => {
    expect(dia(Date.UTC(2026, 10, 24, 1, 0, 0))).toBe('2026-11-23')
  })
  it('calcularDataLimiteSaque usa dias úteis', () => {
    expect(dia(calcularDataLimiteSaque(meioDia(2026, 11, 20)).timestamp)).toBe('2026-11-25')
  })
})

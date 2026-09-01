/**
 * Testes de parsePrice e brl — dinheiro na fronteira com o humano.
 *
 * parsePrice é a divergência autorizada nº 1 do port: o MVP original apagava
 * todos os pontos antes de tratar a vírgula, e '250.00' digitado no padrão
 * americano virava R$ 25.000,00 em silêncio — erro de 100x num campo cujo
 * valor vira ordem de venda real. Estes casos congelam a regra de
 * desambiguação corrigida. Se alguém "simplificar" a função, é aqui que
 * quebra primeiro.
 */

import { describe, expect, it } from 'vitest'

import { brl, parsePrice } from '@/domain/money'

describe('parsePrice — padrão brasileiro (vírgula manda)', () => {
  it("'1.234,56' → 123456 (ponto é milhar)", () => {
    expect(parsePrice('1.234,56')).toBe(123_456)
  })
  it("'150,00' → 15000", () => {
    expect(parsePrice('150,00')).toBe(15_000)
  })
  it("'450,00' → 45000", () => {
    expect(parsePrice('450,00')).toBe(45_000)
  })
})

describe('parsePrice — sem vírgula, o último grupo decide', () => {
  it("'250.00' → 25000 — o caso do erro de 100x do original", () => {
    expect(parsePrice('250.00')).toBe(25_000)
  })
  it("'1.500' → 150000 (grupo de 3 dígitos é milhar)", () => {
    expect(parsePrice('1.500')).toBe(150_000)
  })
  it("'10.5' → 1050 (grupo de 1 dígito é decimal)", () => {
    expect(parsePrice('10.5')).toBe(1_050)
  })
  it("'1.50' → 150 — R$ 1,50, não R$ 150,00 (o caso que mudou de resultado)", () => {
    expect(parsePrice('1.50')).toBe(150)
  })
  it("'1.234.56' → 123456 (múltiplos pontos: anteriores milhar, último decimal)", () => {
    expect(parsePrice('1.234.56')).toBe(123_456)
  })
  it("'150' → 15000 (inteiro puro)", () => {
    expect(parsePrice('150')).toBe(15_000)
  })
})

describe('parsePrice — entrada inválida devolve 0, que a camada de cima recusa', () => {
  it('vazio, espaços, lixo, negativo e zero', () => {
    expect(parsePrice('')).toBe(0)
    expect(parsePrice('   ')).toBe(0)
    expect(parsePrice('abc')).toBe(0)
    expect(parsePrice('-5')).toBe(0)
    expect(parsePrice('0')).toBe(0)
  })
})

describe('brl — centavos para exibição', () => {
  it('28500 → contém 285,00 (o separador de milhar e o espaço são do Intl)', () => {
    // Não se afirma a string exata: o Intl usa espaço não separável entre
    // "R$" e o número, e isso varia entre versões do ICU. O que importa —
    // valor e casas decimais — está aqui.
    expect(brl(28_500)).toContain('285,00')
    expect(brl(28_500)).toContain('R$')
  })
  it('45000 → contém 450,00', () => {
    expect(brl(45_000)).toContain('450,00')
  })
})

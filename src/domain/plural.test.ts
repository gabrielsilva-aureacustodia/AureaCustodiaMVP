import { describe, expect, it } from 'vitest'

import { palavraNoPlural, quantidadeComUnidade } from '@/domain/plural'

describe('plural', () => {
  it('só 1 é singular', () => {
    expect(quantidadeComUnidade(1, 'unidade', 'unidades')).toBe('1 unidade')
    expect(quantidadeComUnidade(0, 'anúncio', 'anúncios')).toBe('0 anúncios')
    expect(quantidadeComUnidade(4, 'anúncio', 'anúncios')).toBe('4 anúncios')
  })
  it('palavra solta', () => {
    expect(palavraNoPlural(1, 'moeda', 'moedas')).toBe('moeda')
    expect(palavraNoPlural(2, 'moeda', 'moedas')).toBe('moedas')
  })
})

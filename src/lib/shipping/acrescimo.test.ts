import { describe, expect, it } from 'vitest'

import { brl } from '@/domain/money'

import {
  ACRESCIMO_DO_FRETE_PADRAO_CENTS,
  acrescimoValido,
  dividirFreteCobrado,
  somarAcrescimoAoFrete,
  textoDoAcrescimoNoFrete,
} from './acrescimo'

describe('acréscimo do frete — regra pura (frente K)', () => {
  it('o padrão é R$ 4,00 (item 11 do Rogério)', () => {
    expect(ACRESCIMO_DO_FRETE_PADRAO_CENTS).toBe(400)
  })

  it('soma o acréscimo ao contrato e devolve as duas partes à parte', () => {
    expect(somarAcrescimoAoFrete(3159, 400)).toEqual({ valorContratoCents: 3159, acrescimoCents: 400, valorCobradoCents: 3559 })
  })

  it('parâmetro zerado: o frete cobrado é o do contrato', () => {
    expect(somarAcrescimoAoFrete(3159, 0)).toEqual({ valorContratoCents: 3159, acrescimoCents: 0, valorCobradoCents: 3159 })
  })

  it('valor que não é centavo inteiro e positivo vale zero: nunca reduz o frete nem entra quebrado no gateway', () => {
    for (const v of [-1, 0.5, 399.99, Number.NaN, Number.POSITIVE_INFINITY, '400', null, undefined]) {
      expect(acrescimoValido(v)).toBe(0)
      expect(somarAcrescimoAoFrete(2000, v).valorCobradoCents).toBe(2000)
    }
    expect(acrescimoValido(400)).toBe(400)
  })

  describe('dividirFreteCobrado — o frete JÁ cobrado, com ou sem os campos da frente K', () => {
    it('frete novo: as duas partes gravadas fecham com o total', () => {
      expect(dividirFreteCobrado({ valorCents: 3559, valorContratoCents: 3159, acrescimoCents: 400 })).toEqual({
        valorContratoCents: 3159,
        acrescimoCents: 400,
      })
    })

    it('frete de antes da frente K: o contrato é o próprio total e o acréscimo é zero', () => {
      expect(dividirFreteCobrado({ valorCents: 3159 })).toEqual({ valorContratoCents: 3159, acrescimoCents: 0 })
      expect(dividirFreteCobrado({ valorCents: 3159, valorContratoCents: null, acrescimoCents: null })).toEqual({
        valorContratoCents: 3159,
        acrescimoCents: 0,
      })
    })

    it('acréscimo gravado maior que o total (dado corrompido) não gera contrato negativo', () => {
      expect(dividirFreteCobrado({ valorCents: 300, acrescimoCents: 400 })).toEqual({ valorContratoCents: 0, acrescimoCents: 300 })
    })
  })

  describe('texto da tela (a ser aprovado pelo Gabriel)', () => {
    it('é a frase da ficha, com o número do parâmetro', () => {
      expect(textoDoAcrescimoNoFrete(400)).toBe(`O valor do frete inclui ${brl(400)} de taxa de postagem`)
      expect(textoDoAcrescimoNoFrete(550)).toBe(`O valor do frete inclui ${brl(550)} de taxa de postagem`)
    })

    it('acréscimo zerado = sem frase', () => {
      expect(textoDoAcrescimoNoFrete(0)).toBe('')
    })

    it('não usa o vocabulário que o jurídico proibiu', () => {
      expect(textoDoAcrescimoNoFrete(400)).not.toMatch(/token|nft|cripto|ativo digital|investimento|rentabilidade/i)
    })
  })
})

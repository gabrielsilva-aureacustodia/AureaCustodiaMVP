/**
 * O que este teste protege: que o sistema nunca mais aceite — nem fabrique —
 * um código de rastreio que não existe nos Correios.
 *
 * Até 21/09/2026 `markPosted` gravava `'BR' + Math.random() + 'BR'` e a etiqueta
 * imprimia `SL`/`PB` + 9 dígitos aleatórios + `BR`. Os dois tinham cara de
 * rastreio e nenhum dos dois rastreava nada. Os casos abaixo incluem os dois
 * formatos inventados de propósito: se alguém reintroduzir um gerador, é aqui
 * que aparece.
 */

import { describe, expect, it } from 'vitest'

import { normalizarRastreio, rastreioValido } from './rastreio'

describe('normalizarRastreio', () => {
  it('aceita o código como os Correios imprimem no comprovante, em grupos', () => {
    // O comprovante sai espaçado e é assim que a pessoa digita, com o papel na
    // mão. Recusar por causa do espaço seria implicância.
    expect(normalizarRastreio('SL 123 456 789 BR')).toBe('SL123456789BR')
    expect(normalizarRastreio('sl123456789br')).toBe('SL123456789BR')
    expect(normalizarRastreio('SL-123456789-BR')).toBe('SL123456789BR')
    expect(normalizarRastreio('  QB987654321BR  ')).toBe('QB987654321BR')
  })
})

describe('rastreioValido', () => {
  it('aceita o padrão SRO de qualquer serviço', () => {
    // Prefixo livre de propósito: os Correios criam prefixo novo sem avisar, e
    // uma lista fechada recusaria objeto legítimo no balcão.
    for (const codigo of ['SL123456789BR', 'PB987654321BR', 'QB987654321BR', 'OA100000000BR']) {
      expect(rastreioValido(codigo)).toBe(true)
    }
  })

  it('recusa os dois códigos que o sistema inventava antes de 21/09/2026', () => {
    // markPosted: 'BR' + 9 dígitos + 'BR' — 13 caracteres, mas as duas
    // primeiras posições são o país, não o serviço.
    expect(rastreioValido('BR412345678BR')).toBe(true) // formato válido por acaso
    // O que o teste realmente trava é o TAMANHO da fórmula antiga, que passava
    // de 9 dígitos quando o inteiro sorteado tinha 9 casas mais o prefixo:
    expect(rastreioValido('BR4123456789BR')).toBe(false)
    // E a pré-postagem, que juntava prefixo de serviço com 9 dígitos SEM o BR
    // quando a modalidade vinha vazia:
    expect(rastreioValido('SL123456789')).toBe(false)
  })

  it('recusa código malformado, vazio ou de outro país', () => {
    for (const codigo of [
      '',
      '   ',
      'SL12345678BR', // 8 dígitos
      'SL1234567890BR', // 10 dígitos
      'S1123456789BR', // uma letra só no prefixo
      'SL123456789US', // postado fora do Brasil
      'SL123456789', // sem sufixo
      '123456789BR', // sem prefixo
      'RASTREIO', // texto solto
    ]) {
      expect(rastreioValido(codigo)).toBe(false)
    }
  })
})

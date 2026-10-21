/**
 * A linha da custódia nos pop-ups de compra e o sinal (i) que a explica (21/10/2026).
 *
 * O balão abre ao passar o mouse, então a renderização estática mostra o que está sempre na tela: o rótulo,
 * o valor e o botão (i) acessível. O texto do balão e o caminho da tabela de taxas são constantes
 * exportadas, conferidas aqui — a frase é a que o Gabriel pediu, e o link é o que leva à tabela pública.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EXPLICACAO_DA_CUSTODIA_NA_COMPRA, LINK_DA_TABELA_DE_TAXAS, LinhaCustodiaNaCompra } from './LinhaCustodiaNaCompra'

describe('LinhaCustodiaNaCompra', () => {
  it('mostra o rótulo, o valor com o sinal de + e o botão (i) acessível', () => {
    const html = renderToStaticMarkup(createElement(LinhaCustodiaNaCompra, { cents: 400 }))
    expect(html).toContain('Custódia (1º mês)')
    expect(html).toContain('+ R$')
    expect(html).toContain('4,00')
    expect(html).toContain('aria-label="Saiba mais: custódia da moeda"')
    expect(html).toContain('class="infotip-btn"')
  })

  it('o balão nasce fechado: a explicação só aparece ao passar o mouse, focar ou tocar', () => {
    const html = renderToStaticMarkup(createElement(LinhaCustodiaNaCompra, { cents: 200 }))
    expect(html).not.toContain('role="tooltip"')
    expect(html).toContain('aria-expanded="false"')
  })

  it('a frase do sinal (i) é uma só e é a pedida: a custódia mensal da moeda, em nome do cliente, no armazenamento seguro', () => {
    expect(EXPLICACAO_DA_CUSTODIA_NA_COMPRA).toBe('O valor mensal da custódia da moeda em seu nome, no nosso armazenamento seguro.')
    expect(EXPLICACAO_DA_CUSTODIA_NA_COMPRA.match(/\./g)).toHaveLength(1)
  })

  it('o link leva à tabela pública de preços e taxas', () => {
    expect(LINK_DA_TABELA_DE_TAXAS).toBe('/taxas')
  })
})

/**
 * O resumo do pagamento do envio (frente B, 17/11/2026): três linhas — Frete, Custódia (1º mês) com o sinal (i)
 * e Total — e a variante do envio antigo, em que o mês já foi pago.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ResumoDoPagamentoDoEnvio } from './ResumoDoPagamentoDoEnvio'

const base = { rotuloDoFrete: 'Frete SEDEX (contrato dos Correios)', freteCents: 2_114 }

describe('ResumoDoPagamentoDoEnvio', () => {
  it('mostra o frete, o 1º mês com o sinal (i) e o total (a soma dos dois)', () => {
    const html = renderToStaticMarkup(
      createElement(ResumoDoPagamentoDoEnvio, { ...base, primeiroMesCents: 600, primeiroMesJaPago: false, totalCents: 2_714 }),
    )
    expect(html).toContain('Frete SEDEX (contrato dos Correios)')
    expect(html).toContain('21,14')
    expect(html).toContain('Custódia (1º mês)')
    expect(html).toContain('+ R$')
    expect(html).toContain('6,00')
    expect(html).toContain('aria-label="Saiba mais: custódia da moeda"')
    expect(html).toContain('Total a pagar')
    expect(html).toContain('27,14')
  })

  it('não oferece "não contratar": o mês é uma linha do total, sem caixa de marcar', () => {
    const html = renderToStaticMarkup(
      createElement(ResumoDoPagamentoDoEnvio, { ...base, primeiroMesCents: 200, primeiroMesJaPago: false, totalCents: 2_314 }),
    )
    expect(html).not.toContain('type="checkbox"')
    expect(html).not.toContain('type="radio"')
  })

  it('envio com o mês já pago: a linha diz "já pago" e o total é só o frete', () => {
    const html = renderToStaticMarkup(
      createElement(ResumoDoPagamentoDoEnvio, { ...base, primeiroMesCents: 0, primeiroMesJaPago: true, totalCents: 2_114 }),
    )
    expect(html).toContain('já pago')
    expect(html).not.toContain('+ R$')
    expect(html).toContain('21,14')
  })
})

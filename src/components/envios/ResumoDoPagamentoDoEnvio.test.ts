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

  it('com o acréscimo do frete (frente K): diz que o valor o inclui, sem criar uma linha a mais no total', () => {
    const html = renderToStaticMarkup(
      createElement(ResumoDoPagamentoDoEnvio, {
        rotuloDoFrete: 'Frete SEDEX',
        freteCents: 3_559,
        acrescimoCents: 400,
        primeiroMesCents: 600,
        primeiroMesJaPago: false,
        totalCents: 4_159,
      }),
    )
    expect(html).toContain('data-testid="frete-acrescimo"')
    expect(html).toContain('O valor do frete inclui')
    expect(html).toContain('4,00')
    expect(html).toContain('de taxa de postagem')
    expect(html).toContain('35,59')
    expect(html).toContain('41,59')
    // O acréscimo já está dentro do frete e do total: não vira uma linha de valor a mais (nada de "R$ 4,00" em `.v`).
    const semAcrescimo = renderToStaticMarkup(
      createElement(ResumoDoPagamentoDoEnvio, { rotuloDoFrete: 'Frete SEDEX', freteCents: 3_559, primeiroMesCents: 600, primeiroMesJaPago: false, totalCents: 4_159 }),
    )
    expect(html.match(/summary-row/g)).toHaveLength(semAcrescimo.match(/summary-row/g)!.length)
  })

  it('acréscimo zerado ou ausente: nenhuma frase sobre ele (o frete é só o do contrato)', () => {
    for (const acrescimoCents of [0, undefined]) {
      const html = renderToStaticMarkup(
        createElement(ResumoDoPagamentoDoEnvio, { ...base, acrescimoCents, primeiroMesCents: 600, primeiroMesJaPago: false, totalCents: 2_714 }),
      )
      expect(html).not.toContain('frete-acrescimo')
      expect(html).not.toContain('taxa de postagem')
    }
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

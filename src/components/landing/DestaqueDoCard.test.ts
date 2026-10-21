/**
 * O destaque de preço dos cartões da landing (21/10/2026): maior oferta de compra em primeiro plano, média de
 * mercado e referência de mercado externo (flor de cunho) com o rótulo exato.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { destaqueDeMercado } from '@/domain/destaques-de-mercado'
import { BAN, compra, estado, usuario } from '@/domain/testing/fixtures'

import { DestaqueDoCard } from './DestaqueDoCard'

function html(destaque: ReturnType<typeof destaqueDeMercado> | undefined): string {
  return renderToStaticMarkup(createElement(DestaqueDoCard, { destaque, demanda: 'Alta liquidez' }))
}

describe('DestaqueDoCard', () => {
  it('põe a maior oferta de compra em destaque, com a média e a referência externa abaixo', () => {
    const s = estado({ c: usuario('Comprador', 10_000_000, []) })
    s.buyOrders.push(compra('B1', 'c', 27_500, 1, BAN, 1000))

    const m = html(destaqueDeMercado(s, BAN))

    expect(m).toContain('Maior oferta de compra')
    expect(m).toContain('data-destaque="maior-oferta-de-compra"')
    expect(m).toContain('landing-market-price-destaque')
    expect(m).toContain('275,00')
    expect(m).toContain('Média de mercado')
    expect(m).toContain('Referência de mercado externo — flor de cunho')
    expect(m).toContain('260,00')
    expect(m).toContain('cotado em')
    expect(m).toContain('Alta liquidez')
  })

  it('sem oferta de compra diz isso, em vez de mostrar zero', () => {
    const m = html(destaqueDeMercado(estado({}), BAN))
    expect(m).toContain('Sem ofertas de compra no momento')
    expect(m).not.toContain('R$ 0,00')
    expect(m).toContain('Sem negociações ainda')
    // a referência externa não depende do mercado da plataforma
    expect(m).toContain('260,00')
  })

  it('sem dados do servidor (leitura falhou), a vitrine continua inteira', () => {
    const m = html(undefined)
    expect(m).toContain('Sem ofertas de compra no momento')
    expect(m).toContain('Maior oferta de compra')
  })
})

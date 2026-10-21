/**
 * BlocosDeMoedas: os dois cartões das moedas negociáveis no Início. Confere o
 * texto, a tiragem vinda de COIN_TYPES, a média vinda da mediana por tipo, a
 * MAIOR OFERTA DE COMPRA em destaque e a referência de mercado externo (flor de
 * cunho) — 21/10/2026 — e que as fotos referenciadas existem em public/moedas.
 */
import { existsSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { brl } from '@/domain/money'
import { seedState } from '@/domain/seed'

const { useAppMock } = vi.hoisted(() => ({ useAppMock: vi.fn() }))
vi.mock('@/components/providers/AppProvider', () => ({ useApp: useAppMock }))

import { BlocosDeMoedas } from './BlocosDeMoedas'

describe('BlocosDeMoedas', () => {
  it('mostra os dois cartões com tiragem, valor médio e fotos existentes', () => {
    const state = seedState()
    state.sellOffers = [
      { ...state.sellOffers[0], tipoMoeda: 'Direitos Humanos', price: 45000, createdAt: Date.now() },
    ]
    state.trades = []
    useAppMock.mockReturnValue({ state })
    const html = renderToStaticMarkup(createElement(BlocosDeMoedas))

    expect(html).toContain('Moeda dos Direitos Humanos')
    expect(html).toContain('Moeda da Entrega da Bandeira')
    expect(html).toContain('Tiragem 600.000')
    expect(html).toContain('Tiragem 2.016.000')
    // a média de mercado de Direitos Humanos vem da única oferta de venda; a Bandeira não tem negociação
    expect(html).toContain('Média de mercado')
    expect(html).toContain(brl(45000))
    expect(html).toContain('Sem negociações ainda')
    // sem oferta de compra de nenhum tipo: o destaque diz isso
    expect(html).toContain('Sem ofertas de compra no momento')

    for (const f of html.match(/\/moedas\/[a-z0-9-]+\.png/g) ?? []) {
      expect(existsSync(`public${f}`)).toBe(true)
    }
  })

  it('cada moeda mostra a MAIOR oferta de compra do próprio tipo em destaque, e a referência externa com o rótulo exato', () => {
    const state = seedState()
    state.sellOffers = []
    state.trades = []
    const base = { buyer: 'x', createdAt: 1, qty: 1 }
    state.buyOrders = [
      { ...base, id: 'B1', price: 27_500, tipoMoeda: 'Entrega da Bandeira Olímpica' },
      { ...base, id: 'B2', price: 31_000, tipoMoeda: 'Entrega da Bandeira Olímpica' },
      { ...base, id: 'B3', price: 61_000, tipoMoeda: 'Direitos Humanos' },
    ]
    useAppMock.mockReturnValue({ state })
    const html = renderToStaticMarkup(createElement(BlocosDeMoedas))

    expect(html.match(/data-destaque="maior-oferta-de-compra"/g)).toHaveLength(2)
    expect(html).toContain(brl(31_000)) // a maior da Bandeira, não a menor
    expect(html).toContain(brl(61_000))
    expect(html).not.toContain(brl(27_500))
    expect(html).toContain('Referência de mercado externo — flor de cunho')
    expect(html).toContain(brl(26_000))
    expect(html).toContain(brl(60_000))
  })
})

/**
 * BlocosDeMoedas: os dois cartões das moedas negociáveis no Início. Confere o
 * texto, a tiragem vinda de COIN_TYPES, o valor vindo da mediana por tipo e que
 * as fotos referenciadas existem em public/moedas.
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
    expect(html).toContain(brl(45000))
    expect(html).toContain('Sem ofertas no momento')

    for (const f of html.match(/\/moedas\/[a-z0-9-]+\.png/g) ?? []) {
      expect(existsSync(`public${f}`)).toBe(true)
    }
  })
})

/**
 * A entrada do painel renderizada no servidor: prova que o Vitest transforma JSX (o bloco
 * `oxc` de vitest.config.mts) e que a conta fora da equipe recebe a explicação, e não o
 * formulário.
 */

import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/server/actions/auth', () => ({ login: vi.fn(), loginWithGoogle: vi.fn(), logout: vi.fn() }))

import { EntradaDoPainel } from './EntradaDoPainel'

describe('entrada do painel', () => {
  it('sem sessão mostra o formulário de entrada no painel', () => {
    const html = renderToStaticMarkup(createElement(EntradaDoPainel, { contaSemAcesso: null }))
    expect(html).toContain('Entrar no painel')
    expect(html).toContain('Entrar com Google')
  })

  it('conta fora da equipe vê qual é a conta e o botão de sair, sem formulário', () => {
    const html = renderToStaticMarkup(createElement(EntradaDoPainel, { contaSemAcesso: 'cliente@exemplo.com.br' }))
    expect(html).toContain('cliente@exemplo.com.br')
    expect(html).toContain('Sair e entrar com outra conta')
    expect(html).not.toContain('Entrar no painel')
  })
})

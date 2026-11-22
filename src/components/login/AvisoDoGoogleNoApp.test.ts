/**
 * Aviso do Google dentro do app instalado (T6). Suíte sem DOM: o servidor/aba comum não renderiza nada; o texto é
 * conferido pelo componente visível; a ligação ao `lerStandalone()` e a presença na tela de entrar são travadas
 * lendo o código, como o resto de FormulariosDeAcesso.test.ts.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('@/server/actions/auth', () => ({ login: vi.fn(), loginWithGoogle: vi.fn() }))
vi.mock('@/server/actions/conta-acesso', () => ({ solicitarRedefinicaoDeSenha: vi.fn(), reenviarLinkDeAcesso: vi.fn() }))

import { AvisoDoGoogleNoApp, AvisoDoGoogleNoAppVisivel, TEXTO_AVISO_GOOGLE_NO_APP } from './AvisoDoGoogleNoApp'
import { LoginForm } from './LoginForm'

const fonte = (arq: string): string => readFileSync(join(__dirname, arq), 'utf8')

describe('aviso do Google no app instalado', () => {
  it('numa aba comum (e no servidor) não aparece', () => {
    expect(renderToStaticMarkup(createElement(AvisoDoGoogleNoApp))).toBe('')
    const tela = renderToStaticMarkup(createElement(LoginForm, { registrationOpen: true }))
    expect(tela).not.toContain('google-no-app')
  })

  it('o texto é curto, em português leigo e dá a saída: e-mail e senha e link pelo atendimento', () => {
    const html = renderToStaticMarkup(createElement(AvisoDoGoogleNoAppVisivel))
    expect(html).toContain('Se o Google não abrir ou voltar sem entrar, use e-mail e senha')
    expect(html).toContain('atendimento')
    expect(TEXTO_AVISO_GOOGLE_NO_APP.length).toBeLessThan(260)
    // O botão "Esqueci minha senha" passou a existir (S01, QA Davi 22/11/2026): o texto pode citá-lo. Palavras proibidas
    // pelo jurídico continuam fora.
    expect(TEXTO_AVISO_GOOGLE_NO_APP).toContain('Esqueci minha senha')
    expect(TEXTO_AVISO_GOOGLE_NO_APP).not.toMatch(/token|nft|cripto/i)
  })

  it('só liga pelo modo app do navegador e fica sob o botão do Google, que não é escondido', () => {
    const aviso = fonte('AvisoDoGoogleNoApp.tsx')
    expect(aviso).toContain('lerStandalone()')
    const login = fonte('LoginForm.tsx')
    const iBotao = login.indexOf('<GoogleButton')
    const iAviso = login.indexOf('<AvisoDoGoogleNoApp />')
    expect(iBotao).toBeGreaterThan(-1)
    expect(iAviso).toBeGreaterThan(iBotao)
    expect(login).not.toMatch(/lerStandalone|\{emApp/)
  })

  it('a tela de entrar continua com o botão do Google e o e-mail e senha', () => {
    const tela = renderToStaticMarkup(createElement(LoginForm, { registrationOpen: true }))
    expect(tela).toContain('Entrar com o Google')
    expect(tela).toContain('loginPass')
  })
})

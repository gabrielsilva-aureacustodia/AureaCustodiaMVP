/**
 * Testes da regra de acesso aos relatórios financeiros — quem é administrador
 * e quando o token de integração vale.
 *
 * Paga parte do RA-16.c ("rotas de relatório sem teste"): a decisão de acesso
 * é a mesma função nas três rotas de `/api/relatorios`, em `/relatorios` e em
 * `/api/admin/conciliacao`, então testá-la aqui cobre a barreira de todas.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { autorizarRelatorio, ehAdmin, tokenDeIntegracaoValido } from './acesso'

const SOCIO = 'gabrielsilva@testeaurea.com.br'
const VISITANTE = 'visitante@exemplo.com.br'
const TOKEN = 'token-de-integracao-com-mais-de-16-chars'

afterEach(() => {
  delete process.env.AUREA_ADMIN_EMAILS
  delete process.env.AUREA_RELATORIOS_TOKEN
})

describe('ehAdmin', () => {
  it('sem AUREA_ADMIN_EMAILS, os sócios do seed são administradores e mais ninguém', () => {
    expect(ehAdmin(SOCIO)).toBe(true)
    expect(ehAdmin('GabrielSilva@TesteAurea.com.br ')).toBe(true)
    expect(ehAdmin(VISITANTE)).toBe(false)
    expect(ehAdmin(null)).toBe(false)
    expect(ehAdmin('')).toBe(false)
  })

  it('com AUREA_ADMIN_EMAILS, vale só a lista — o seed deixa de valer', () => {
    process.env.AUREA_ADMIN_EMAILS = ' Contador@Exemplo.com.br , outro@exemplo.com.br '
    expect(ehAdmin('contador@exemplo.com.br')).toBe(true)
    expect(ehAdmin(SOCIO)).toBe(false)
  })
})

describe('tokenDeIntegracaoValido', () => {
  it('fica DESLIGADO sem a variável, ou com token curto demais', () => {
    expect(tokenDeIntegracaoValido('qualquer')).toBe(false)
    process.env.AUREA_RELATORIOS_TOKEN = 'curto'
    expect(tokenDeIntegracaoValido('curto')).toBe(false)
  })

  it('aceita só o valor exato', () => {
    process.env.AUREA_RELATORIOS_TOKEN = TOKEN
    expect(tokenDeIntegracaoValido(TOKEN)).toBe(true)
    expect(tokenDeIntegracaoValido(TOKEN.slice(0, -1) + 'x')).toBe(false)
    expect(tokenDeIntegracaoValido(TOKEN + 'x')).toBe(false)
    expect(tokenDeIntegracaoValido(null)).toBe(false)
  })
})

describe('autorizarRelatorio', () => {
  it('sessão de administrador entra, com ou sem token', () => {
    expect(autorizarRelatorio(SOCIO, null)).toEqual({ ok: true, ator: SOCIO, via: 'sessao' })
    expect(autorizarRelatorio(SOCIO, 'token-errado')).toMatchObject({ ok: true, via: 'sessao' })
  })

  it('sessão comum sem token recebe 403, não 401', () => {
    expect(autorizarRelatorio(VISITANTE, null)).toMatchObject({ ok: false, status: 403 })
  })

  it('sem sessão, só o token de integração abre — e como ator de integração', () => {
    expect(autorizarRelatorio(null, null)).toMatchObject({ ok: false, status: 401 })
    process.env.AUREA_RELATORIOS_TOKEN = TOKEN
    expect(autorizarRelatorio(null, TOKEN)).toEqual({ ok: true, ator: 'integracao:token', via: 'token' })
    expect(autorizarRelatorio(null, 'errado')).toMatchObject({ ok: false, status: 401 })
  })

  it('sessão comum COM token válido entra pelo token', () => {
    process.env.AUREA_RELATORIOS_TOKEN = TOKEN
    expect(autorizarRelatorio(VISITANTE, TOKEN)).toMatchObject({ ok: true, via: 'token' })
  })
})

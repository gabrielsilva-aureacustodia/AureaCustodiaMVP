/**
 * A09 (22/11/2026): a API de Conversões só manda o evento de cadastro com o "Aceitar" do visitante (cookie `ro_cookies`).
 * Sem escolha ou recusado, nada sai para a Meta — e o cadastro em si continua devolvendo o ID normalmente.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

const enviar = vi.fn()
vi.mock('./conversions-api', async (original) => ({
  ...(await original<typeof import('./conversions-api')>()),
  enviarEventoDoServidor: (...args: unknown[]) => enviar(...args),
}))

import { registrarCadastroNaMeta } from './cadastro'

function registrar(cookie: string | null): string {
  return registrarCadastroNaMeta({
    metodo: 'cadastro_email',
    email: 'teste@exemplo.com',
    cabecalhos: new Headers(cookie ? { cookie } : {}),
    paginaPadrao: '/cadastrar',
  })
}

describe('API de Conversões só com o "Aceitar"', () => {
  beforeEach(() => enviar.mockClear())

  it('sem escolha: nada vai à Meta, mas o ID do evento ainda é devolvido', () => {
    expect(registrar(null)).toBeTruthy()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('recusado: nada vai à Meta, mesmo com o _fbp no navegador', () => {
    registrar('ro_cookies=recusado; _fbp=fb.1.2.3')
    expect(enviar).not.toHaveBeenCalled()
  })

  it('aceito: o evento sai uma vez, com o _fbp', () => {
    registrar('ro_cookies=aceito; _fbp=fb.1.2.3')
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar.mock.calls[0][0].usuario.fbp).toBe('fb.1.2.3')
  })
})

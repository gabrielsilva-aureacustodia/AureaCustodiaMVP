/**
 * O destino do login: só o painel é alternativa ao site do cliente. Um valor livre aqui seria
 * redirecionamento aberto — o callback mandaria para qualquer endereço gravado no cookie.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { jar } = vi.hoisted(() => {
  const valores = new Map<string, string>()
  return {
    jar: {
      valores,
      get: vi.fn((nome: string) => (valores.has(nome) ? { value: valores.get(nome) } : undefined)),
      set: vi.fn((nome: string, valor: string) => void valores.set(nome, valor)),
      delete: vi.fn((nome: string) => void valores.delete(nome)),
    },
  }
})
vi.mock('next/headers', () => ({ cookies: async () => jar }))

import { COOKIE_DESTINO_DO_LOGIN, consumirDestinoDoLogin, destinoPermitido, lembrarDestinoDoLogin } from './destino'

beforeEach(() => {
  jar.valores.clear()
  vi.clearAllMocks()
})

describe('destino do login', () => {
  it('só /admin é aceito; qualquer outro valor vira /inicio', () => {
    expect(destinoPermitido('/admin')).toBe('/admin')
    expect(destinoPermitido('/inicio')).toBe('/inicio')
    expect(destinoPermitido('https://exemplo.com')).toBe('/inicio')
    expect(destinoPermitido('//exemplo.com')).toBe('/inicio')
    expect(destinoPermitido('/admin/../conta')).toBe('/inicio')
    expect(destinoPermitido(undefined)).toBe('/inicio')
  })

  it('o login pela entrada do painel volta para /admin uma vez só', async () => {
    await lembrarDestinoDoLogin('/admin')
    expect(jar.valores.get(COOKIE_DESTINO_DO_LOGIN)).toBe('/admin')
    expect(await consumirDestinoDoLogin()).toBe('/admin')
    expect(await consumirDestinoDoLogin()).toBe('/inicio')
  })

  it('login comum depois de um pelo painel apaga o destino antigo', async () => {
    await lembrarDestinoDoLogin('/admin')
    await lembrarDestinoDoLogin('/inicio')
    expect(await consumirDestinoDoLogin()).toBe('/inicio')
  })
})

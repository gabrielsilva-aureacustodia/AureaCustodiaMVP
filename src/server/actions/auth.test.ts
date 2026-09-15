/**
 * Testes unitários das Server Actions de autenticação em `src/server/actions/auth.ts`.
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
vi.mock('next/headers', () => ({
  cookies: async () => jar,
  headers: async () => new Headers(),
}))

vi.mock('@/server/state', () => ({
  getState: vi.fn(),
  mutateState: vi.fn(),
}))

vi.mock('@/server/session', () => ({
  getSessionEmail: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
}))

vi.mock('@/server/auth/client', () => ({
  createAuthClient: vi.fn(),
}))

vi.mock('@/server/auth/conta-desativada', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/auth/conta-desativada')>()
  return {
    ...actual,
    barrarContaDesativada: vi.fn(),
  }
})

vi.mock('@/server/auth/authorization', () => ({
  authorizeProvisionedUser: vi.fn(),
}))

vi.mock('@/server/auth/provisioning', () => ({
  provisionAuthenticatedUser: vi.fn(),
}))

vi.mock('@/server/documentos/aceites', () => ({
  registrarAceitesFormais: vi.fn(),
}))

vi.mock('@/server/auth/destino', () => ({
  lembrarDestinoDoLogin: vi.fn(),
  destinoPermitido: vi.fn((d) => d || '/inicio'),
}))

import type { AppState } from '@/domain/types'
import { login } from './auth'
import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { createAuthClient } from '@/server/auth/client'
import {
  barrarContaDesativada,
  MENSAGEM_CONTA_DESATIVADA,
} from '@/server/auth/conta-desativada'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'
import { setSession } from '@/server/session'
import { getState, mutateState } from '@/server/state'

describe('login() — portas 1 e 2 (P-C2-04)', () => {
  const mockSignInWithPassword = vi.fn()
  const mockSignOut = vi.fn().mockResolvedValue({})

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(getState).mockResolvedValue({
      users: {
        'rogeriopena@testeaurea.com.br': {
          name: 'Rogério Pena',
          balance: 6200000,
          pass: '12345678',
          coins: [],
        },
      },
      seq: { coin: 0, envio: 0, analise: 0, planoCustodia: 0 },
    } as unknown as AppState)

    vi.mocked(createAuthClient).mockResolvedValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
      },
    } as unknown as ReturnType<typeof createAuthClient> extends Promise<infer T> ? T : never)

    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    vi.mocked(authorizeProvisionedUser).mockResolvedValue(true)
  })

  it('catálogo: conta desativada com a senha certa é recusada sem sessão e sem gravar acesso', async () => {
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)

    const res = await login('rogeriopena@testeaurea.com.br', '12345678')

    expect(res.ok).toBe(false)
    expect(res.error).toBe(MENSAGEM_CONTA_DESATIVADA)
    expect(setSession).not.toHaveBeenCalled()
    expect(mutateState).not.toHaveBeenCalled()
  })

  it('catálogo: senha errada responde credenciais inválidas sem perguntar a situação', async () => {
    const res = await login('rogeriopena@testeaurea.com.br', 'senha_errada')

    expect(res.ok).toBe(false)
    expect(res.error).toContain('E-mail ou senha incorretos')
    expect(barrarContaDesativada).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
  })

  it('catálogo: conta ativa entra como antes', async () => {
    const res = await login('rogeriopena@testeaurea.com.br', '12345678')

    expect(res.ok).toBe(true)
    expect(setSession).toHaveBeenCalledWith('rogeriopena@testeaurea.com.br')
    expect(mutateState).toHaveBeenCalled()
  })

  it('Supabase: identidade bloqueada pelo painel recebe a frase de conta desativada', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'user_banned', message: 'User is banned' },
    })

    const res = await login('externo@teste.com', 'qualquer_senha')

    expect(res.ok).toBe(false)
    expect(res.error).toBe(MENSAGEM_CONTA_DESATIVADA)
    expect(setSession).not.toHaveBeenCalled()
  })

  it('Supabase: conta desativada sem bloqueio no Supabase sai sem sessão e sem provisionar', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { email: 'externo@teste.com', user_metadata: {} } },
      error: null,
    })
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)
    vi.mocked(authorizeProvisionedUser).mockResolvedValue(false)

    const res = await login('externo@teste.com', 'senha_valida')

    expect(res.ok).toBe(false)
    expect(res.error).toBe(MENSAGEM_CONTA_DESATIVADA)
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(setSession).not.toHaveBeenCalled()
    expect(provisionAuthenticatedUser).not.toHaveBeenCalled()
  })

  it('Supabase: conta ativa entra como antes', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { email: 'externo@teste.com', user_metadata: { full_name: 'Externo' } } },
      error: null,
    })
    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    vi.mocked(authorizeProvisionedUser).mockResolvedValue(true)

    const res = await login('externo@teste.com', 'senha_valida')

    expect(res.ok).toBe(true)
    expect(setSession).toHaveBeenCalledWith('externo@teste.com')
  })
})

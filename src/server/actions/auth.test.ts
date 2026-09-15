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
import { definirNovaSenha, login } from './auth'
import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { createAuthClient } from '@/server/auth/client'
import {
  barrarContaDesativada,
  MENSAGEM_CONTA_DESATIVADA,
} from '@/server/auth/conta-desativada'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'
import { getSessionEmail, setSession } from '@/server/session'
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

describe('definirNovaSenha() — link de redefinição (P-C2-05)', () => {
  const mockGetUser = vi.fn()
  const mockUpdateUser = vi.fn()
  const mockSignInWithPassword = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSessionEmail).mockResolvedValue('externo@teste.com')
    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'externo@teste.com' } },
      error: null,
    })
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null })
    vi.mocked(createAuthClient).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        updateUser: mockUpdateUser,
        signInWithPassword: mockSignInWithPassword,
      },
    } as unknown as ReturnType<typeof createAuthClient> extends Promise<infer T> ? T : never)
  })

  it('sem sessão pede link novo', async () => {
    vi.mocked(getSessionEmail).mockResolvedValue(null)

    const res = await definirNovaSenha('senha-nova', 'senha-nova')

    expect(res).toEqual({
      ok: false,
      error: 'O link de redefinição expirou ou já foi usado. Peça um novo ao atendimento.',
    })
    expect(createAuthClient).not.toHaveBeenCalled()
  })

  it('confirmação diferente não chama o Supabase', async () => {
    const res = await definirNovaSenha('senha-nova', 'outra-senha')

    expect(res).toEqual({ ok: false, error: 'A confirmação da nova senha não confere.' })
    expect(createAuthClient).not.toHaveBeenCalled()
  })

  it('sessão do Supabase de outro e-mail é recusada', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { email: 'outra@teste.com' } },
      error: null,
    })

    const res = await definirNovaSenha('senha-nova', 'senha-nova')

    expect(res.ok).toBe(false)
    expect(res.error).toContain('link de redefinição expirou')
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('conta desativada é recusada', async () => {
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)

    const res = await definirNovaSenha('senha-nova', 'senha-nova')

    expect(res).toEqual({ ok: false, error: MENSAGEM_CONTA_DESATIVADA })
    expect(createAuthClient).not.toHaveBeenCalled()
  })

  it('senha repetida e senha fraca viram frase em português', async () => {
    mockUpdateUser
      .mockResolvedValueOnce({
        data: { user: null },
        error: { code: 'same_password', message: 'New password should be different' },
      })
      .mockResolvedValueOnce({
        data: { user: null },
        error: { code: 'weak_password', message: 'Password should be at least 8 characters' },
      })

    await expect(definirNovaSenha('senha-nova', 'senha-nova')).resolves.toEqual({
      ok: false,
      error: 'A senha nova precisa ser diferente da anterior.',
    })
    await expect(definirNovaSenha('curta', 'curta')).resolves.toEqual({
      ok: false,
      error: 'Senha fraca: Password should be at least 8 characters',
    })
  })

  it('troca a senha sem pedir a atual', async () => {
    const res = await definirNovaSenha('senha-nova', 'senha-nova')

    expect(res).toEqual({ ok: true, message: 'Senha nova salva. Use-a no próximo login.' })
    expect(mockUpdateUser).toHaveBeenCalledTimes(1)
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'senha-nova' })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })
})

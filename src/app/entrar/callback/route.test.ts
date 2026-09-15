/**
 * Testes unitários do Route Handler GET /entrar/callback.
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

vi.mock('@/server/auth/client', () => ({
  createAuthClient: vi.fn(),
}))

vi.mock('@/server/session', () => ({
  setSession: vi.fn(),
}))

vi.mock('@/server/auth/conta-desativada', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/auth/conta-desativada')>()
  return {
    ...actual,
    barrarContaDesativada: vi.fn(),
  }
})

vi.mock('@/server/auth/authorization', () => ({
  authorizeProvisionedUser: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/server/auth/provisioning', () => ({
  provisionAuthenticatedUser: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/server/auth/legal', () => ({
  consumePendingLegalAcceptance: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/server/documentos/aceites', () => ({
  registrarAceitesFormais: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from './route'
import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { createAuthClient } from '@/server/auth/client'
import {
  barrarContaDesativada,
  STATUS_CONTA_DESATIVADA,
} from '@/server/auth/conta-desativada'
import { COOKIE_DESTINO_DO_LOGIN } from '@/server/auth/destino'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'
import { setSession } from '@/server/session'

describe('GET /entrar/callback', () => {
  const mockSignOut = vi.fn().mockResolvedValue({})
  const mockSetSession = vi.fn()
  const mockExchangeCode = vi.fn()
  const mockVerifyOtp = vi.fn()

  const fakeUser = {
    id: 'user-123',
    email: 'cliente@teste.com',
    user_metadata: { full_name: 'Cliente Teste' },
    app_metadata: { provider: 'email' },
  }

  beforeEach(() => {
    jar.valores.clear()
    vi.clearAllMocks()

    mockSetSession.mockResolvedValue({ data: { user: fakeUser }, error: null })
    mockExchangeCode.mockResolvedValue({ data: { user: fakeUser }, error: null })
    mockVerifyOtp.mockResolvedValue({ data: { user: fakeUser }, error: null })

    vi.mocked(createAuthClient).mockResolvedValue({
      auth: {
        signOut: mockSignOut,
        setSession: mockSetSession,
        exchangeCodeForSession: mockExchangeCode,
        verifyOtp: mockVerifyOtp,
        updateUser: vi.fn().mockResolvedValue({}),
      },
    } as unknown as ReturnType<typeof createAuthClient> extends Promise<infer T> ? T : never)

    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    vi.mocked(authorizeProvisionedUser).mockResolvedValue(true)
  })

  it('login pelo Google começado no painel volta para /admin', async () => {
    jar.valores.set(COOKIE_DESTINO_DO_LOGIN, '/admin')

    const req = new Request('http://localhost:3101/entrar/callback?code=abc')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toBe('http://localhost:3101/admin')
    expect(jar.valores.has(COOKIE_DESTINO_DO_LOGIN)).toBe(false)
  })

  it('confirmação de e-mail sem destino vai para /inicio', async () => {
    const req = new Request('http://localhost:3101/entrar/callback?token_hash=h&type=email')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toBe('http://localhost:3101/inicio')
  })

  it('link de recuperação vai para a tela de nova senha, com sessão aberta', async () => {
    const req = new Request('http://localhost:3101/entrar/callback?access_token=a&refresh_token=b&type=recovery')
    const res = await GET(req)

    expect(setSession).toHaveBeenCalledWith('cliente@teste.com')
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toBe('http://localhost:3101/entrar/nova-senha')
  })

  it('recuperação por token_hash também vai para a tela de nova senha', async () => {
    const req = new Request('http://localhost:3101/entrar/callback?token_hash=h&type=recovery')
    const res = await GET(req)

    expect(setSession).toHaveBeenCalledWith('cliente@teste.com')
    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toBe('http://localhost:3101/entrar/nova-senha')
  })

  it('recuperação começada com destino do painel leva o destino adiante', async () => {
    jar.valores.set(COOKIE_DESTINO_DO_LOGIN, '/admin')

    const req = new Request('http://localhost:3101/entrar/callback?token_hash=h&type=recovery')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toBe('http://localhost:3101/entrar/nova-senha?destino=%2Fadmin')
    expect(jar.valores.has(COOKIE_DESTINO_DO_LOGIN)).toBe(false)
  })

  it('conta desativada não abre sessão e descarta o destino', async () => {
    jar.valores.set(COOKIE_DESTINO_DO_LOGIN, '/admin')
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)
    vi.mocked(authorizeProvisionedUser).mockResolvedValue(false)

    const req = new Request('http://localhost:3101/entrar/callback?code=abc')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain(`/entrar?status=${STATUS_CONTA_DESATIVADA}`)
    expect(setSession).not.toHaveBeenCalled()
    expect(provisionAuthenticatedUser).not.toHaveBeenCalled()
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(jar.valores.has(COOKIE_DESTINO_DO_LOGIN)).toBe(false)
  })

  it('conta desativada vence o link de recuperação', async () => {
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)

    const req = new Request('http://localhost:3101/entrar/callback?access_token=a&refresh_token=b&type=recovery')
    const res = await GET(req)

    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain(`/entrar?status=${STATUS_CONTA_DESATIVADA}`)
    expect(setSession).not.toHaveBeenCalled()
  })

  it('identidade bloqueada devolvida pelo Supabase vira o aviso de conta desativada', async () => {
    // Caso 1: Supabase devolve na query
    const reqQuery = new Request(
      'http://localhost:3101/entrar/callback?error=access_denied&error_description=User%20is%20banned',
    )
    const resQuery = await GET(reqQuery)
    expect(resQuery.status).toBe(307)
    expect(resQuery.headers.get('location')).toContain(`/entrar?status=${STATUS_CONTA_DESATIVADA}`)

    // Caso 2: setSession falha com User is banned
    mockSetSession.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User is banned' },
    })
    const reqSession = new Request(
      'http://localhost:3101/entrar/callback?access_token=a&refresh_token=b',
    )
    const resSession = await GET(reqSession)
    expect(resSession.status).toBe(307)
    expect(resSession.headers.get('location')).toContain(`/entrar?status=${STATUS_CONTA_DESATIVADA}`)
  })

  it('outros erros continuam com o motivo real', async () => {
    const req = new Request(
      'http://localhost:3101/entrar/callback?error_description=Link%20expirado',
    )
    const res = await GET(req)

    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('/entrar?erro=callback&motivo=Link+expirado')
  })
})

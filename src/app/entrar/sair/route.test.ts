/**
 * Testes unitários do Route Handler GET /entrar/sair.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/server/session', () => ({
  clearSession: vi.fn(),
  getSessionEmail: vi.fn(),
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

import { GET } from './route'
import { createAuthClient } from '@/server/auth/client'
import { AuthConfigurationError } from '@/server/auth/config'
import { barrarContaDesativada, STATUS_CONTA_DESATIVADA } from '@/server/auth/conta-desativada'
import { clearSession, getSessionEmail } from '@/server/session'

describe('GET /entrar/sair', () => {
  const mockSignOut = vi.fn().mockResolvedValue({})

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createAuthClient).mockResolvedValue({
      auth: { signOut: mockSignOut },
    } as unknown as ReturnType<typeof createAuthClient> extends Promise<infer T> ? T : never)
  })

  it('conta desativada: apaga a sessão e mostra o aviso', async () => {
    vi.mocked(getSessionEmail).mockResolvedValue('desativada@teste.com')
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)

    const req = new Request('http://localhost:3101/entrar/sair')
    const res = await GET(req)

    expect(clearSession).toHaveBeenCalled()
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain(`/entrar?status=${STATUS_CONTA_DESATIVADA}`)
    expect(res.headers.get('Cache-Control')).toContain('no-store')
  })

  it('conta ativa: apaga a sessão e vai para /entrar sem aviso', async () => {
    vi.mocked(getSessionEmail).mockResolvedValue('ativa@teste.com')
    vi.mocked(barrarContaDesativada).mockResolvedValue(false)

    const req = new Request('http://localhost:3101/entrar/sair')
    const res = await GET(req)

    expect(clearSession).toHaveBeenCalled()
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toBe('http://localhost:3101/entrar')
    expect(loc).not.toContain(STATUS_CONTA_DESATIVADA)
  })

  it('sem sessão: vai para /entrar sem perguntar a situação', async () => {
    vi.mocked(getSessionEmail).mockResolvedValue(null)

    const req = new Request('http://localhost:3101/entrar/sair')
    const res = await GET(req)

    expect(clearSession).toHaveBeenCalled()
    expect(barrarContaDesativada).not.toHaveBeenCalled()
    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toBe('http://localhost:3101/entrar')
  })

  it('Supabase não configurado não impede a saída', async () => {
    vi.mocked(getSessionEmail).mockResolvedValue('qualquer@teste.com')
    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    vi.mocked(createAuthClient).mockRejectedValue(new AuthConfigurationError())

    const req = new Request('http://localhost:3101/entrar/sair')
    const res = await GET(req)

    expect(clearSession).toHaveBeenCalled()
    expect(res.status).toBe(307)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toBe('http://localhost:3101/entrar')
  })
})

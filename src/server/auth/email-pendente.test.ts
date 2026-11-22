import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/server/auth/client', () => ({ createAuthClient: vi.fn() }))

import { marcaDeEmailPendente } from './email-pendente'

describe('marca de e-mail pendente (B02)', () => {
  it('só vale com email_pendente exatamente true', () => {
    expect(marcaDeEmailPendente({ email_pendente: true })).toBe(true)
  })
  it('conta sem a marca — sócios, Google, painel — vale como verificada', () => {
    expect(marcaDeEmailPendente({})).toBe(false)
    expect(marcaDeEmailPendente(undefined)).toBe(false)
    expect(marcaDeEmailPendente(null)).toBe(false)
  })
  it('depois do clique a marca vira false', () => {
    expect(marcaDeEmailPendente({ email_pendente: false, email_confirmado_em: '2026-11-22T00:00:00Z' })).toBe(false)
    expect(marcaDeEmailPendente({ email_pendente: 'true' })).toBe(false)
  })
})

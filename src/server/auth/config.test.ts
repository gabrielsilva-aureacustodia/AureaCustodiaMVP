import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { AuthConfigurationError, getAuthConfig, getRegistrationStatus } from './config'

const AUTH_ENV = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'AUREA_SIGNUP_ENABLED',
  'AUREA_TERMS_VERSION',
  'AUREA_PRIVACY_VERSION',
] as const

function limparAuthEnv(): void {
  for (const name of AUTH_ENV) vi.stubEnv(name, '')
}

afterEach(() => vi.unstubAllEnvs())

describe('configuração do Supabase Auth', () => {
  it('falha de forma controlada quando URL ou chave pública não existem', () => {
    limparAuthEnv()
    expect(() => getAuthConfig()).toThrow(AuthConfigurationError)
    expect(getRegistrationStatus()).toMatchObject({ enabled: false, authConfigured: false })
  })

  it('abre o cadastro somente com Auth, decisão explícita e versões legais', () => {
    limparAuthEnv()
    vi.stubEnv('SUPABASE_URL', 'https://projeto.supabase.co')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
    vi.stubEnv('AUREA_SIGNUP_ENABLED', 'true')
    vi.stubEnv('AUREA_TERMS_VERSION', 'teste-2026-09-06')
    vi.stubEnv('AUREA_PRIVACY_VERSION', 'teste-2026-09-06')

    expect(getAuthConfig()).toEqual({
      url: 'https://projeto.supabase.co',
      anonKey: 'sb_publishable_teste',
    })
    expect(getRegistrationStatus()).toMatchObject({
      enabled: true,
      authConfigured: true,
      termsUrl: '/termos',
      privacyUrl: '/privacidade',
    })
  })

  it('mantém cadastro fechado quando faltam as versões legais', () => {
    limparAuthEnv()
    vi.stubEnv('SUPABASE_URL', 'https://projeto.supabase.co')
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
    vi.stubEnv('AUREA_SIGNUP_ENABLED', 'true')

    expect(getRegistrationStatus()).toMatchObject({ enabled: false, authConfigured: true })
  })
})

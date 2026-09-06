import { afterEach, describe, expect, it, vi } from 'vitest'

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ headers: headersMock }))

import { authCallbackUrl } from './origin'

afterEach(() => {
  vi.unstubAllEnvs()
  headersMock.mockReset()
})

describe('authCallbackUrl', () => {
  it('usa a origem configurada para produção', async () => {
    vi.stubEnv('AUREA_SITE_URL', 'https://aurea-custodia-mvp.vercel.app')
    expect(await authCallbackUrl()).toBe(
      'https://aurea-custodia-mvp.vercel.app/entrar/callback',
    )
    expect(headersMock).not.toHaveBeenCalled()
  })

  it('deriva a origem do preview da Vercel quando não há URL fixa', async () => {
    vi.stubEnv('AUREA_SITE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    const values = new Map([
      ['x-forwarded-host', 'preview-aurea.vercel.app'],
      ['x-forwarded-proto', 'https'],
    ])
    headersMock.mockResolvedValue({ get: (name: string) => values.get(name) ?? null })

    expect(await authCallbackUrl()).toBe('https://preview-aurea.vercel.app/entrar/callback')
  })
})

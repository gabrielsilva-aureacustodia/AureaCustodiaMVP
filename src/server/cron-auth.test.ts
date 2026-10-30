import { afterEach, describe, expect, it, vi } from 'vitest'

import { conferirAuthCron } from './cron-auth'

describe('conferirAuthCron', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('com segredo: só o Bearer exato passa', () => {
    vi.stubEnv('CRON_SECRET', 'segredo-de-teste')
    expect(conferirAuthCron('Bearer segredo-de-teste')).toBe('ok')
    expect(conferirAuthCron('Bearer outro')).toBe('negado')
    expect(conferirAuthCron('segredo-de-teste')).toBe('negado')
    expect(conferirAuthCron(null)).toBe('negado')
  })

  it('produção sem segredo fecha, inclusive para "Bearer undefined"', () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect(conferirAuthCron(null)).toBe('sem-segredo')
    expect(conferirAuthCron('Bearer undefined')).toBe('sem-segredo')
  })

  it('desenvolvimento sem segredo segue aberto (como antes)', () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('NODE_ENV', 'development')
    expect(conferirAuthCron(null)).toBe('ok')
  })
})

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import * as rota from './route'

const { GET } = rota

describe('Cron Shipping Route — GET /api/cron/shipping', () => {
  const cronSecretTeste = 'segredo_cron_123456'
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = cronSecretTeste
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
  })

  it('rejeita com 401 se o header Authorization não for fornecido ou estiver incorreto', async () => {
    const reqSemAuth = new NextRequest('http://localhost:3000/api/cron/shipping')
    const resSemAuth = await GET(reqSemAuth)
    expect(resSemAuth.status).toBe(401)

    const reqAuthIncorreta = new NextRequest('http://localhost:3000/api/cron/shipping', {
      headers: { Authorization: 'Bearer token_errado' },
    })
    const resAuthIncorreta = await GET(reqAuthIncorreta)
    expect(resAuthIncorreta.status).toBe(401)
  })

  it('retorna 200 com status ok quando o secret estiver correto', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/shipping', {
      headers: { Authorization: `Bearer ${cronSecretTeste}` },
    })

    const res = await GET(req)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.verificados).toBe(0)
    expect(data.codigos).toEqual([])
  })

  it('sem CRON_SECRET em produção a rota fecha: nem "Bearer undefined" passa, e o log diz o motivo', async () => {
    delete process.env.CRON_SECRET
    vi.stubEnv('NODE_ENV', 'production')
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      for (const auth of [undefined, 'Bearer undefined', 'Bearer ']) {
        const req = new NextRequest('http://localhost:3000/api/cron/shipping', auth ? { headers: { Authorization: auth } } : {})
        expect((await GET(req)).status).toBe(401)
      }
      expect(erro.mock.calls[0][0]).toContain('CRON_SECRET ausente em produção')
    } finally {
      erro.mockRestore()
      vi.unstubAllEnvs()
    }
  })

  it('o rastreio diário está agendado em vercel.json (0 9 * * * UTC = 06:00 em Brasília) e a rota exporta GET', () => {
    const cfg = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons?: { path: string; schedule: string }[]
    }
    const cron = cfg.crons?.filter((c) => c.path === '/api/cron/shipping') ?? []
    expect(cron).toEqual([{ path: '/api/cron/shipping', schedule: '0 9 * * *' }])
    expect(typeof rota.GET).toBe('function')
  })
})

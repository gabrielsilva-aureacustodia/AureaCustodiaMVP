import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { GET } from './route'

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
    expect(data.totalVerificados).toBe(0)
    expect(data.resultados).toBeDefined()
  })
})

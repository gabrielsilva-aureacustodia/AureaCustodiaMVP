import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { GET } from './route'

describe('Label Route — GET /api/envios/etiqueta/[protocolo]', () => {
  it('rejeita com 401 se o usuário não estiver autenticado', async () => {
    const req = new NextRequest('http://localhost:3000/api/envios/etiqueta/ENV-2026-0001')
    const res = await GET(req, { params: Promise.resolve({ protocolo: 'ENV-2026-0001' }) })
    expect(res.status).toBe(401)
  })
})

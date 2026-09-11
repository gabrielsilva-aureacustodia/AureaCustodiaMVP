import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { GET } from './route'

describe('Outbound Label Route — GET /api/retiradas/etiqueta/[id]', () => {
  it('rejeita com 401 se o usuário não estiver autenticado', async () => {
    const req = new NextRequest('http://localhost:3000/api/retiradas/etiqueta/RET-001')
    const res = await GET(req, { params: Promise.resolve({ id: 'RET-001' }) })
    expect(res.status).toBe(401)
  })
})

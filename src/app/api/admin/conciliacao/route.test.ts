import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { GET } from './route'

describe('Admin Conciliação Route — GET /api/admin/conciliacao', () => {
  it('rejeita com 401 se o usuário não estiver autenticado', async () => {
    const res = await GET()
    expect(res.status).toBe(401)
  })
})

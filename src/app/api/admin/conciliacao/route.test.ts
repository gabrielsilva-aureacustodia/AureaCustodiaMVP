import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// A sessão é o único insumo da autorização; o dublê deixa cada caso escolher
// quem está logado sem montar cookie assinado.
const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import { GET } from './route'

describe('Admin Conciliação Route — GET /api/admin/conciliacao', () => {
  beforeEach(() => {
    getSessionEmail.mockReset()
    delete process.env.AUREA_ADMIN_EMAILS
  })

  it('rejeita com 401 sem sessão', async () => {
    getSessionEmail.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('rejeita com 403 uma sessão que não é de administrador (conta de /criar-conta)', async () => {
    getSessionEmail.mockResolvedValue('visitante@exemplo.com.br')
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.ok).toBe(false)
  })

  it('devolve o relatório para um sócio do seed (administrador sem variável)', async () => {
    getSessionEmail.mockResolvedValue('gabrielsilva@testeaurea.com.br')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.financeiro).toBeDefined()
    expect(body.data.moedasECustodia.totalMoedasCustodiadas).toBeGreaterThan(0)
    expect(res.headers.get('cache-control')).toContain('no-store')
  })

  it('respeita AUREA_ADMIN_EMAILS quando definida', async () => {
    process.env.AUREA_ADMIN_EMAILS = 'contador@exemplo.com.br'
    getSessionEmail.mockResolvedValue('gabrielsilva@testeaurea.com.br')
    expect((await GET()).status).toBe(403)
    getSessionEmail.mockResolvedValue('contador@exemplo.com.br')
    expect((await GET()).status).toBe(200)
  })
})

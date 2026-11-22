/**
 * Testes da rota /api/state para contas desativadas.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/server/session', () => ({
  getSessionEmail: vi.fn(),
}))

vi.mock('@/server/state', () => ({
  getState: vi.fn(),
}))

vi.mock('@/server/config/carregar', () => ({
  carregarConfiguracaoDoSite: vi.fn().mockResolvedValue({}),
  configDoCliente: vi.fn().mockReturnValue({}),
}))

vi.mock('@/server/config/documentos', () => ({
  documentosPendentesDeAceite: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/server/auth/conta-desativada', () => ({
  barrarContaDesativada: vi.fn(),
}))

import { estadoVazio } from '@/domain/estado-vazio'
import type { AppState } from '@/domain/types'
import { GET } from './route'
import { barrarContaDesativada } from '@/server/auth/conta-desativada'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

describe('GET /api/state — conta desativada', () => {
  it('sessão de conta desativada recebe 401 sem ler o estado', async () => {
    vi.mocked(getSessionEmail).mockResolvedValue('desativada@teste.com')
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)
    vi.mocked(getState).mockClear()

    const res = await GET()
    expect(res.status).toBe(401)
    expect(res.headers.get('Cache-Control')).toContain('no-store')
    expect(getState).not.toHaveBeenCalled()
  })

  it('sessão de conta ativa continua recebendo o estado', async () => {
    vi.mocked(getSessionEmail).mockResolvedValue('ativa@teste.com')
    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    const mockState = estadoVazio()
    vi.mocked(getState).mockResolvedValue(mockState as AppState)

    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    // B01: o cliente recebe a VISÃO dele (com o resumo público), nunca o estado inteiro.
    expect(data.state.users).toEqual({})
    expect(data.state.publico).toBeDefined()
    expect(data.session).toBe('ativa@teste.com')
  })
})

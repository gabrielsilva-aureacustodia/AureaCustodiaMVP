/**
 * Testes de `POST /api/eventos`: quem grava é a sessão, o que grava já chega limpo, e
 * nada disso depende do navegador olhar a resposta.
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail, gravarEventosDeUso, bancoConfigurado } = vi.hoisted(() => ({
  getSessionEmail: vi.fn(),
  gravarEventosDeUso: vi.fn(),
  bancoConfigurado: vi.fn(),
}))
vi.mock('@/server/session', () => ({ getSessionEmail }))
vi.mock('@/server/admin/uso', () => ({ gravarEventosDeUso }))
vi.mock('@/server/db/client', () => ({ bancoConfigurado, executarNoBanco: vi.fn() }))

import { POST } from './route'

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36'

function requisicao(corpo: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/eventos', {
    method: 'POST',
    body: corpo,
    headers: { 'Content-Type': 'application/json', 'User-Agent': ANDROID },
  })
}

beforeEach(() => {
  getSessionEmail.mockReset()
  gravarEventosDeUso.mockReset()
  gravarEventosDeUso.mockResolvedValue(1)
  bancoConfigurado.mockReset()
  bancoConfigurado.mockReturnValue(true)
})

describe('POST /api/eventos', () => {
  it('corpo que não é lote: 400, nada gravado', async () => {
    getSessionEmail.mockResolvedValue('gabrielsilva@testeaurea.com.br')
    expect((await POST(requisicao('não é json'))).status).toBe(400)
    expect((await POST(requisicao('{"eventos":"x"}'))).status).toBe(400)
    expect(gravarEventosDeUso).not.toHaveBeenCalled()
  })

  it('sem sessão: 204 e nada gravado', async () => {
    getSessionEmail.mockResolvedValue(null)
    const res = await POST(requisicao(JSON.stringify({ eventos: [{ tipo: 'pagina', rota: '/mercado' }] })))
    expect(res.status).toBe(204)
    expect(gravarEventosDeUso).not.toHaveBeenCalled()
  })

  it('sem banco: 204 e nada gravado — o registro nunca vira erro', async () => {
    getSessionEmail.mockResolvedValue('gabrielsilva@testeaurea.com.br')
    bancoConfigurado.mockReturnValue(false)
    expect((await POST(requisicao(JSON.stringify({ eventos: [{ tipo: 'pagina', rota: '/mercado' }] })))).status).toBe(204)
    expect(gravarEventosDeUso).not.toHaveBeenCalled()
  })

  it('com sessão: grava o lote limpo, com a plataforma resumida e sem o user agent', async () => {
    getSessionEmail.mockResolvedValue('gabrielsilva@testeaurea.com.br')
    const corpo = { sessao: 'aba-12345678', eventos: [{ tipo: 'pagina', rota: '/recibos/RO-000042?x=1' }, { tipo: 'x', rota: '/a' }] }
    const res = await POST(requisicao(JSON.stringify(corpo)))
    expect(res.status).toBe(204)
    await vi.waitFor(() => expect(gravarEventosDeUso).toHaveBeenCalledTimes(1))
    const [, email, lote, plataforma] = gravarEventosDeUso.mock.calls[0]
    expect(email).toBe('gabrielsilva@testeaurea.com.br')
    expect(plataforma).toBe('android')
    expect(lote.sessao).toBe('aba-12345678')
    expect(lote.eventos).toHaveLength(1)
    expect(lote.eventos[0]).toMatchObject({ tipo: 'pagina', rota: '/recibos/[id]' })
    expect(JSON.stringify(gravarEventosDeUso.mock.calls[0])).not.toContain('Pixel')
  })

  it('falha ao gravar não muda a resposta', async () => {
    getSessionEmail.mockResolvedValue('gabrielsilva@testeaurea.com.br')
    gravarEventosDeUso.mockRejectedValue(new Error('banco fora'))
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const res = await POST(requisicao(JSON.stringify({ eventos: [{ tipo: 'pagina', rota: '/inicio' }] })))
    expect(res.status).toBe(204)
    await vi.waitFor(() => expect(erro).toHaveBeenCalled())
    erro.mockRestore()
  })
})

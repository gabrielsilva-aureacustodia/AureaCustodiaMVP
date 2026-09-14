/**
 * Testes de `POST /api/webhooks/whatsapp`: a ordem dos passos — provedor, assinatura, JSON,
 * eventos, banco — e o que cada recusa responde. O provedor e o serviço são dublês; a
 * tradução do formato da Evolution está em src/lib/mensageria/evolution.test.ts e a gravação
 * em src/server/admin/banco.test.ts.
 */

import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const m = vi.hoisted(() => ({
  provedorDoAmbiente: vi.fn(),
  receberEventos: vi.fn(),
  bancoConfigurado: vi.fn(),
  conferirAssinatura: vi.fn(),
  normalizarEvento: vi.fn(),
}))
vi.mock('@/lib/mensageria', () => ({ provedorDoAmbiente: m.provedorDoAmbiente }))
vi.mock('@/server/admin/cs', () => ({ receberEventos: m.receberEventos }))
vi.mock('@/server/db/client', () => ({ bancoConfigurado: m.bancoConfigurado, executarNoBanco: vi.fn() }))

import { POST } from './route'

const EVENTO = { tipo: 'mensagem', idNoProvedor: 'X1', direcao: 'entrada', telefone: '+5511999998888', nomeDoContato: 'Ana', corpo: 'oi', midiaUrl: null, midiaTipo: null, em: 1 }

function requisicao(corpo: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/whatsapp', { method: 'POST', body: corpo, headers: { authorization: 'Bearer x' } })
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset()
  m.provedorDoAmbiente.mockReturnValue({
    nome: 'evolution',
    identificador: 'cs',
    entregaDeVerdade: true,
    pendencias: [],
    conferirAssinatura: m.conferirAssinatura,
    normalizarEvento: m.normalizarEvento,
  })
  m.conferirAssinatura.mockReturnValue(true)
  m.normalizarEvento.mockReturnValue([EVENTO])
  m.bancoConfigurado.mockReturnValue(true)
  m.receberEventos.mockResolvedValue({ mensagens: 1, repetidas: 0, status: 0 })
})

describe('POST /api/webhooks/whatsapp', () => {
  it('sem provedor configurado: 503 dizendo o que falta, e nada lido', async () => {
    m.provedorDoAmbiente.mockReturnValue({ nome: 'registro-local', entregaDeVerdade: false, pendencias: ['EVOLUTION_API_URL'], conferirAssinatura: m.conferirAssinatura, normalizarEvento: m.normalizarEvento })
    const res = await POST(requisicao('{}'))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toContain('EVOLUTION_API_URL')
    expect(m.conferirAssinatura).not.toHaveBeenCalled()
  })

  it('autenticação inválida: 401 antes de interpretar o corpo', async () => {
    m.conferirAssinatura.mockReturnValue(false)
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect((await POST(requisicao('não é json'))).status).toBe(401)
    expect(m.normalizarEvento).not.toHaveBeenCalled()
    aviso.mockRestore()
  })

  it('corpo que não é JSON: 400', async () => {
    expect((await POST(requisicao('não é json'))).status).toBe(400)
    expect(m.receberEventos).not.toHaveBeenCalled()
  })

  it('evento que não é mensagem: 200 sem tocar no banco', async () => {
    m.normalizarEvento.mockReturnValue([])
    const res = await POST(requisicao('{"event":"connection.update"}'))
    expect(res.status).toBe(200)
    expect(m.bancoConfigurado).not.toHaveBeenCalled()
    expect(m.receberEventos).not.toHaveBeenCalled()
  })

  it('mensagem: grava antes de responder 200, com o resumo', async () => {
    const res = await POST(requisicao('{"event":"messages.upsert"}'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, mensagens: 1, repetidas: 0, status: 0 })
    expect(m.receberEventos).toHaveBeenCalledTimes(1)
    expect(m.receberEventos.mock.calls[0][2]).toEqual([EVENTO])
  })

  it('sem banco: 503; falha ao gravar: 500 — as duas fazem o provedor reenviar', async () => {
    m.bancoConfigurado.mockReturnValue(false)
    expect((await POST(requisicao('{}'))).status).toBe(503)
    m.bancoConfigurado.mockReturnValue(true)
    m.receberEventos.mockRejectedValue(new Error('banco caiu'))
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect((await POST(requisicao('{}'))).status).toBe(500)
    erro.mockRestore()
  })
})

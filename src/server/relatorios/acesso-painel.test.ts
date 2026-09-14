/**
 * Testes de `autorizarRelatorioNoPainel` — a porta dos relatórios depois da C1.
 *
 * O membro do painel é um dublê: aqui importa a DECISÃO (ler × exportar, sessão ×
 * token), não de onde o papel veio. De onde ele vem está testado em
 * src/server/admin/banco.test.ts, contra o Postgres embutido.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { carregarMembro } = vi.hoisted(() => ({ carregarMembro: vi.fn() }))
vi.mock('@/server/admin/acesso', () => ({ carregarMembro }))

import { autorizarRelatorioNoPainel } from './acesso'

const TOKEN = 'token-de-integracao-com-mais-de-16-chars'
const CONTADOR = 'contador@exemplo.com.br'

function membroCom(...permissoes: string[]) {
  return { email: CONTADOR, nome: 'Contador', papel: { slug: 'contador', nome: 'Contador', rank: 30, variantePainel: 'gestao' }, permissoes, origem: 'tabela' }
}

beforeEach(() => {
  carregarMembro.mockReset()
})

afterEach(() => {
  delete process.env.AUREA_RELATORIOS_TOKEN
})

describe('autorizarRelatorioNoPainel', () => {
  it('membro com resultados.ver lê, mas sem resultados.exportar não baixa arquivo', async () => {
    carregarMembro.mockResolvedValue(membroCom('resultados.ver'))
    expect(await autorizarRelatorioNoPainel(CONTADOR, null)).toEqual({ ok: true, ator: CONTADOR, via: 'sessao' })
    expect(await autorizarRelatorioNoPainel(CONTADOR, null, 'resultados.exportar')).toMatchObject({ ok: false, status: 403 })
  })

  it('membro com as duas permissões exporta pela sessão', async () => {
    carregarMembro.mockResolvedValue(membroCom('resultados.ver', 'resultados.exportar'))
    expect(await autorizarRelatorioNoPainel(CONTADOR, null, 'resultados.exportar')).toMatchObject({ ok: true, via: 'sessao' })
  })

  it('quem não é da equipe recebe 403 logado e 401 sem sessão — como antes', async () => {
    carregarMembro.mockResolvedValue(null)
    expect(await autorizarRelatorioNoPainel('cliente@exemplo.com.br', null)).toMatchObject({ ok: false, status: 403 })
    expect(await autorizarRelatorioNoPainel(null, null)).toMatchObject({ ok: false, status: 401 })
    expect(carregarMembro).toHaveBeenCalledTimes(1)
  })

  it('o token de integração continua abrindo leitura e exportação, com ou sem sessão', async () => {
    process.env.AUREA_RELATORIOS_TOKEN = TOKEN
    carregarMembro.mockResolvedValue(membroCom('resultados.ver'))
    expect(await autorizarRelatorioNoPainel(CONTADOR, TOKEN, 'resultados.exportar')).toEqual({ ok: true, ator: 'integracao:token', via: 'token' })
    expect(await autorizarRelatorioNoPainel(null, TOKEN, 'resultados.exportar')).toMatchObject({ ok: true, via: 'token' })
    expect(await autorizarRelatorioNoPainel(null, 'errado')).toMatchObject({ ok: false, status: 401 })
  })
})

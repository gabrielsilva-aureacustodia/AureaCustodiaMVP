/**
 * Testes da regra de acesso aos relatórios financeiros — quem é administrador
 * pela lista do ambiente, a chave de integração e o que o módulo exporta.
 *
 * A decisão com papéis do painel está testada em acesso-painel.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { carregarMembro } = vi.hoisted(() => ({ carregarMembro: vi.fn() }))
vi.mock('@/server/admin/acesso', () => ({ carregarMembro }))

import { autorizarRelatorioNoPainel, ehAdmin, tokenDeIntegracaoValido } from './acesso'

const SOCIO = 'gabrielsilva@testeaurea.com.br'
const VISITANTE = 'visitante@exemplo.com.br'
const TOKEN = 'token-de-integracao-com-mais-de-16-chars'
const EMAIL = 'contador@exemplo.com.br'

function membroCom(...permissoes: string[]) {
  return {
    email: EMAIL,
    nome: 'Contador',
    papel: { slug: 'contador', nome: 'Contador', rank: 30, variantePainel: 'gestao' },
    permissoes,
    origem: 'tabela',
  }
}

beforeEach(() => {
  carregarMembro.mockReset()
})

afterEach(() => {
  delete process.env.AUREA_ADMIN_EMAILS
  delete process.env.AUREA_RELATORIOS_TOKEN
})

describe('ehAdmin', () => {
  it('sem AUREA_ADMIN_EMAILS, os sócios do seed são administradores e mais ninguém', () => {
    expect(ehAdmin(SOCIO)).toBe(true)
    expect(ehAdmin('GabrielSilva@TesteAurea.com.br ')).toBe(true)
    expect(ehAdmin(VISITANTE)).toBe(false)
    expect(ehAdmin(null)).toBe(false)
    expect(ehAdmin('')).toBe(false)
  })

  it('com AUREA_ADMIN_EMAILS, vale só a lista — o seed deixa de valer', () => {
    process.env.AUREA_ADMIN_EMAILS = ' Contador@Exemplo.com.br , outro@exemplo.com.br '
    expect(ehAdmin('contador@exemplo.com.br')).toBe(true)
    expect(ehAdmin(SOCIO)).toBe(false)
  })
})

describe('tokenDeIntegracaoValido', () => {
  it('fica DESLIGADO sem a variável, ou com token curto demais', () => {
    expect(tokenDeIntegracaoValido('qualquer')).toBe(false)
    process.env.AUREA_RELATORIOS_TOKEN = 'curto'
    expect(tokenDeIntegracaoValido('curto')).toBe(false)
  })

  it('aceita só o valor exato', () => {
    process.env.AUREA_RELATORIOS_TOKEN = TOKEN
    expect(tokenDeIntegracaoValido(TOKEN)).toBe(true)
    expect(tokenDeIntegracaoValido(TOKEN.slice(0, -1) + 'x')).toBe(false)
    expect(tokenDeIntegracaoValido(TOKEN + 'x')).toBe(false)
    expect(tokenDeIntegracaoValido(null)).toBe(false)
  })
})

describe('o que sobrou do acesso aos relatórios', () => {
  it('o módulo exporta só a lista do ambiente, a chave de integração e a decisão do painel', async () => {
    const modulo = await import('./acesso')
    expect(Object.keys(modulo).filter((k) => !k.startsWith('__')).sort()).toEqual([
      'autorizarRelatorioNoPainel',
      'ehAdmin',
      'tokenDeIntegracaoValido',
    ])
    expect(['autorizar', 'Relatorio'].join('') in modulo).toBe(false)
  })

  it('quem entra pela sessão com a permissão continua entrando mesmo com chave errada na URL', async () => {
    carregarMembro.mockResolvedValue(membroCom('resultados.ver'))
    process.env.AUREA_RELATORIOS_TOKEN = TOKEN
    expect(await autorizarRelatorioNoPainel(EMAIL, 'errado')).toEqual({
      ok: true,
      ator: EMAIL,
      via: 'sessao',
    })
  })
})

/**
 * O serviço de acesso SEM banco — o caminho de `npm run dev` sem POSTGRES_URL, e o
 * que sobra quando o banco falha: vale o bootstrap do ambiente, e só ele.
 *
 * O que protege: um sócio do seed entra no painel mesmo sem tabela nenhuma; um cliente
 * não entra; e a Server Action recusa por conta própria, com 401 ou 403.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail, redirect } = vi.hoisted(() => ({
  getSessionEmail: vi.fn(),
  // Como o do Next: redirect interrompe a renderização lançando.
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT ${destino}`)
  }),
}))
vi.mock('@/server/session', () => ({ getSessionEmail }))
vi.mock('next/navigation', () => ({ redirect }))

import { CHAVES_PERMISSAO } from '@/domain/admin/permissoes'

import { SESSAO_EXPIRADA, SO_EQUIPE, carregarMembro, exigirPermissao, membroDaPagina, permissaoParaAcao, podeAbrirPainelAdmin } from './acesso'

// Desde 20/09/2026 a lista fixa da equipe tem só o e-mail institucional: as
// outras três entradas eram contas de demonstração, excluídas do banco. Um
// teste que precisa de uma conta DO SEED agindo como equipe declara isso por
// AUREA_ADMIN_EMAILS, que é o mecanismo de verdade — em vez de depender de um
// e-mail estar numa lista fixa que pode encolher de novo.
const SOCIO = 'rogeriopena@testeaurea.com.br'
const CLIENTE = 'cliente@exemplo.com.br'

const salvo = { POSTGRES_URL: process.env.POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL }

beforeEach(() => {
  delete process.env.POSTGRES_URL
  delete process.env.DATABASE_URL
  // Ver a nota no topo: o ator da equipe é declarado, não herdado da lista fixa.
  process.env.AUREA_ADMIN_EMAILS = SOCIO
  getSessionEmail.mockReset()
})

afterEach(() => {
  if (salvo.POSTGRES_URL !== undefined) process.env.POSTGRES_URL = salvo.POSTGRES_URL
  if (salvo.DATABASE_URL !== undefined) process.env.DATABASE_URL = salvo.DATABASE_URL
})

describe('carregarMembro sem banco', () => {
  it('e-mail fixo da equipe é dev pelo ambiente; cliente não é membro', async () => {
    const m = await carregarMembro(SOCIO)
    // O rótulo é o próprio e-mail: o nome de exibição vinha do catálogo local
    // (`ACCOUNTS`), esvaziado em 20/09/2026. Quem entra pelo bootstrap aparece
    // pelo e-mail até ser cadastrado em `admin_membros`, que tem nome próprio.
    expect(m).toMatchObject({ email: SOCIO, nome: SOCIO, origem: 'ambiente', papel: { slug: 'dev' } })
    expect(m?.permissoes).toEqual(CHAVES_PERMISSAO)
    expect(await carregarMembro(CLIENTE)).toBeNull()
    expect(await carregarMembro(null)).toBeNull()
  })

  it('com AUREA_ADMIN_EMAILS vale a lista mais os e-mails fixos da equipe', async () => {
    process.env.AUREA_ADMIN_EMAILS = 'gabriel.silva@aureacustodia.com.br'
    expect(await carregarMembro('Gabriel.Silva@aureacustodia.com.br')).toMatchObject({ papel: { slug: 'dev' } })
    expect(await podeAbrirPainelAdmin('gabriel.silva@aureacustodia.com.br')).toBe(true)
    // Conta de teste fora da lista e fora dos fixos: não é membro.
    expect(await carregarMembro('alex@testeaurea.com.br')).toBeNull()
    expect(await podeAbrirPainelAdmin('alex@testeaurea.com.br')).toBe(false)
    // SOCIO é conta do seed e NÃO está mais na lista fixa: com a variável
    // apontando só para o institucional, ele fica de fora. É a prova de que a
    // variável manda de verdade.
    expect(await podeAbrirPainelAdmin(SOCIO)).toBe(false)
    // O institucional entra com ou sem a variável, para a equipe nunca ficar
    // trancada fora (RA-40).
    delete process.env.AUREA_ADMIN_EMAILS
    expect(await podeAbrirPainelAdmin('gabriel.silva@aureacustodia.com.br')).toBe(true)
  })
})

describe('o guarda das páginas manda para a entrada do painel, nunca para o site do cliente', () => {
  it('sem sessão e com conta fora da equipe: /painel; membro: passa', async () => {
    getSessionEmail.mockResolvedValue(null)
    await expect(membroDaPagina()).rejects.toThrow('REDIRECT /painel')
    getSessionEmail.mockResolvedValue(CLIENTE)
    await expect(membroDaPagina()).rejects.toThrow('REDIRECT /painel')
    getSessionEmail.mockResolvedValue(SOCIO)
    await expect(membroDaPagina()).resolves.toMatchObject({ email: SOCIO })
  })

  it('o e-mail do Gabriel abre o painel mesmo com AUREA_ADMIN_EMAILS sem ele (RA-48)', async () => {
    process.env.AUREA_ADMIN_EMAILS = 'contador@exemplo.com.br'
    getSessionEmail.mockResolvedValue('gabriel.silva@aureacustodia.com.br')
    await expect(membroDaPagina()).resolves.toMatchObject({ papel: { slug: 'dev' } })
  })
})

describe('a recusa no servidor', () => {
  it('sem sessão: 401', async () => {
    getSessionEmail.mockResolvedValue(null)
    expect(await permissaoParaAcao('contabil.lancar')).toEqual({ ok: false, status: 401, erro: SESSAO_EXPIRADA })
  })

  it('sessão de cliente: 403, e exigirPermissao lança', async () => {
    getSessionEmail.mockResolvedValue(CLIENTE)
    expect(await permissaoParaAcao('contabil.lancar')).toEqual({ ok: false, status: 403, erro: SO_EQUIPE })
    await expect(exigirPermissao('resultados.ver')).rejects.toMatchObject({ name: 'ErroDeAcesso', status: 403 })
  })

  it('sessão de sócio do seed: permitido, com o membro resolvido', async () => {
    getSessionEmail.mockResolvedValue(SOCIO)
    const r = await permissaoParaAcao('admin.membros')
    expect(r.ok).toBe(true)
    expect(await exigirPermissao('resultados.exportar')).toMatchObject({ email: SOCIO })
  })
})

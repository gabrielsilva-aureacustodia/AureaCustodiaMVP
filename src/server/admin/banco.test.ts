/**
 * Testes de integração do painel contra um Postgres DE VERDADE (PGlite).
 *
 * Um arquivo só, com uma instância, de propósito — ver `testing/pglite.ts`. Cobre as
 * migrations 020 e 021 e o que o painel grava: catálogo e papéis, membros, a
 * proteção contra ficar sem dev, a trilha `admin.<area>.<verbo>`, o registro de uso e
 * as ações contábeis.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { CHAVES_PERMISSAO } from '@/domain/admin/permissoes'
import { listarAuditoria } from '@/server/db/repositories/auditoria'
import { listarPapeis, substituirPermissoes } from '@/server/db/repositories/admin-rbac'
import type { Executor } from '@/server/db/sql'

import {
  abrePainelNoBanco,
  adicionarMembro,
  alterarMembro,
  alterarPapel,
  carregarEquipe,
  carregarMembroNoBanco,
  criarPapel,
  excluirPapel,
  garantirCatalogosAdmin,
  type Ambiente,
} from './rbac'
import { bancoDeTeste, type BancoDeTeste } from './testing/pglite'

const SEED: Ambiente['contasDoSeed'] = {
  'gabrielsilva@testeaurea.com.br': { name: 'Gabriel Silva' },
  'rogeriopena@testeaurea.com.br': { name: 'Rogério Pena' },
}
const SEM_LISTA: Ambiente = { listaDoAmbiente: undefined, contasDoSeed: SEED }
const SO_GABRIEL: Ambiente = { listaDoAmbiente: 'gabriel.silva@aureacustodia.com.br', contasDoSeed: SEED }

let banco: BancoDeTeste
let executar: Executor

beforeAll(async () => {
  banco = await bancoDeTeste()
  executar = banco.executar
})

afterAll(async () => {
  await banco.fechar()
})

beforeEach(async () => {
  await banco.db.exec(`
    TRUNCATE aurea.admin_membros, aurea.admin_papel_permissoes, aurea.admin_papeis, aurea.admin_permissoes RESTART IDENTITY CASCADE;
    TRUNCATE aurea.audit_log RESTART IDENTITY;
    TRUNCATE aurea.eventos_uso RESTART IDENTITY;
  `)
})

async function acoesNaTrilha(): Promise<string[]> {
  const linhas = await executar((tx) => listarAuditoria(tx, { limite: 50 }))
  return linhas.map((l) => l.acao).reverse()
}

describe('migrations 020 e 021', () => {
  it('criam as cinco tabelas com RLS ligado', async () => {
    const { rows } = await banco.db.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'aurea' AND c.relname IN ('admin_permissoes','admin_papeis','admin_papel_permissoes','admin_membros','eventos_uso')
        ORDER BY c.relname`,
    )
    expect(rows.map((r) => r.relname)).toEqual(['admin_membros', 'admin_papeis', 'admin_papel_permissoes', 'admin_permissoes', 'eventos_uso'])
    expect(rows.every((r) => r.relrowsecurity)).toBe(true)
  })
})

describe('catálogo de papéis e permissões', () => {
  it('semeia as 22 permissões e os três papéis com as concessões iniciais', async () => {
    await executar((tx) => garantirCatalogosAdmin(tx))
    const papeis = await executar((tx) => listarPapeis(tx))
    expect(papeis.map((p) => [p.slug, p.permissoes.length, p.sistema])).toEqual([
      ['dev', 22, true],
      ['socio', 20, true],
      ['operacao', 5, true],
    ])
  })

  it('é idempotente, completa o dev e NÃO devolve ao sócio o que a tela tirou', async () => {
    await executar((tx) => garantirCatalogosAdmin(tx))
    const [dev, socio] = await executar((tx) => listarPapeis(tx))
    await executar(async (tx) => {
      await substituirPermissoes(tx, dev.id, ['resultados.ver'])
      await substituirPermissoes(tx, socio.id, ['resultados.ver'])
    })
    await executar((tx) => garantirCatalogosAdmin(tx))
    const depois = await executar((tx) => listarPapeis(tx))
    expect(depois.find((p) => p.slug === 'dev')?.permissoes).toHaveLength(CHAVES_PERMISSAO.length)
    expect(depois.find((p) => p.slug === 'socio')?.permissoes).toEqual(['resultados.ver'])
  })
})

describe('quem é membro', () => {
  it('tabela vazia: conta do seed entra como dev pelo ambiente; cliente não entra', async () => {
    await executar((tx) => garantirCatalogosAdmin(tx))
    const gabriel = await carregarMembroNoBanco(executar, 'GabrielSilva@testeaurea.com.br', SEM_LISTA)
    expect(gabriel).toMatchObject({ origem: 'ambiente', nome: 'Gabriel Silva', papel: { slug: 'dev' } })
    expect(await carregarMembroNoBanco(executar, 'cliente@exemplo.com.br', SEM_LISTA)).toBeNull()
    expect(await abrePainelNoBanco(executar, 'gabrielsilva@testeaurea.com.br', SEM_LISTA)).toBe(true)
    expect(await abrePainelNoBanco(executar, 'cliente@exemplo.com.br', SEM_LISTA)).toBe(false)
  })

  it('membro adicionado pela tela entra com o papel dele, e a trilha registra quem deu o acesso', async () => {
    const r = await adicionarMembro(executar, 'gabrielsilva@testeaurea.com.br', { email: 'Contador@Exemplo.com.br', nome: 'Contador', papelSlug: 'socio' }, SEM_LISTA)
    expect(r.ok).toBe(true)
    const contador = await carregarMembroNoBanco(executar, 'contador@exemplo.com.br', SEM_LISTA)
    expect(contador).toMatchObject({ origem: 'tabela', nome: 'Contador', papel: { slug: 'socio' } })
    expect(contador?.permissoes).not.toContain('admin.membros')

    const [linha] = await executar((tx) => listarAuditoria(tx, { acao: 'admin.membros.adicionar' }))
    expect(linha).toMatchObject({ ator: 'gabrielsilva@testeaurea.com.br', entidadeId: 'contador@exemplo.com.br' })
    expect(linha.detalhes).toMatchObject({ papel: 'socio' })
  })

  it('membro desativado deixa de entrar na hora — a leitura é refeita a cada requisição', async () => {
    await adicionarMembro(executar, 'gabrielsilva@testeaurea.com.br', { email: 'op@exemplo.com.br', papelSlug: 'operacao' }, SEM_LISTA)
    expect(await abrePainelNoBanco(executar, 'op@exemplo.com.br', SEM_LISTA)).toBe(true)
    const r = await alterarMembro(executar, 'gabrielsilva@testeaurea.com.br', { email: 'op@exemplo.com.br', status: 'inativo' }, SEM_LISTA)
    expect(r.ok).toBe(true)
    expect(await carregarMembroNoBanco(executar, 'op@exemplo.com.br', SEM_LISTA)).toBeNull()
    expect(await abrePainelNoBanco(executar, 'op@exemplo.com.br', SEM_LISTA)).toBe(false)
  })

  it('e-mail repetido não vira segundo membro', async () => {
    await adicionarMembro(executar, 'gabrielsilva@testeaurea.com.br', { email: 'x@exemplo.com.br', papelSlug: 'socio' }, SEM_LISTA)
    const r = await adicionarMembro(executar, 'gabrielsilva@testeaurea.com.br', { email: 'X@exemplo.com.br', papelSlug: 'operacao' }, SEM_LISTA)
    expect(r.ok).toBe(false)
  })
})

describe('o painel nunca fica sem dev', () => {
  it('o único dev do ambiente não consegue se rebaixar nem se desativar', async () => {
    const rebaixar = await alterarMembro(executar, 'gabriel.silva@aureacustodia.com.br', { email: 'gabriel.silva@aureacustodia.com.br', papelSlug: 'socio' }, SO_GABRIEL)
    expect(rebaixar).toMatchObject({ ok: false })
    const desativar = await alterarMembro(executar, 'gabriel.silva@aureacustodia.com.br', { email: 'gabriel.silva@aureacustodia.com.br', status: 'inativo' }, SO_GABRIEL)
    expect(desativar).toMatchObject({ ok: false })
    expect(await carregarMembroNoBanco(executar, 'gabriel.silva@aureacustodia.com.br', SO_GABRIEL)).toMatchObject({ papel: { slug: 'dev' } })
  })

  it('com outro dev ativo na tabela, a mesma mudança passa — e fica na trilha com antes e depois', async () => {
    await adicionarMembro(executar, 'gabriel.silva@aureacustodia.com.br', { email: 'rogerio@aureacustodia.com.br', papelSlug: 'dev' }, SO_GABRIEL)
    const r = await alterarMembro(executar, 'gabriel.silva@aureacustodia.com.br', { email: 'gabriel.silva@aureacustodia.com.br', papelSlug: 'socio' }, SO_GABRIEL)
    expect(r.ok).toBe(true)
    const gabriel = await carregarMembroNoBanco(executar, 'gabriel.silva@aureacustodia.com.br', SO_GABRIEL)
    expect(gabriel).toMatchObject({ origem: 'tabela', papel: { slug: 'socio' } })
    const [linha] = await executar((tx) => listarAuditoria(tx, { acao: 'admin.membros.alterar' }))
    expect(linha.detalhes).toMatchObject({ antes: { papel: 'dev', origem: 'ambiente' }, depois: { papel: 'socio', status: 'ativo' } })
  })
})

describe('papéis', () => {
  it('tirar permissão do dev é recusado; do sócio, aceito e auditado', async () => {
    await executar((tx) => garantirCatalogosAdmin(tx))
    const dev = await alterarPapel(executar, 'gabriel@exemplo.com.br', { slug: 'dev', permissoes: ['resultados.ver'] })
    expect(dev.ok).toBe(false)

    const socio = await alterarPapel(executar, 'gabriel@exemplo.com.br', { slug: 'socio', permissoes: ['resultados.ver', 'resultados.exportar'] })
    expect(socio.ok).toBe(true)
    const equipe = await carregarEquipe(executar, SEM_LISTA)
    expect(equipe.papeis.find((p) => p.slug === 'socio')?.permissoes).toEqual(['resultados.ver', 'resultados.exportar'])
    expect(equipe.papeis.find((p) => p.slug === 'dev')?.permissoes).toHaveLength(22)
    expect(await acoesNaTrilha()).toEqual(['admin.papeis.alterar'])
  })

  it('cria papel customizado com permissões do catálogo e recusa chave inventada', async () => {
    const invalido = await criarPapel(executar, 'gabriel@exemplo.com.br', { slug: 'contador', nome: 'Contador', rank: 30, variantePainel: 'gestao', permissoes: ['resultados.ver', 'dre.apagar'] })
    expect(invalido.ok).toBe(false)
    const ok = await criarPapel(executar, 'gabriel@exemplo.com.br', { slug: 'contador', nome: 'Contador', rank: 30, variantePainel: 'gestao', permissoes: ['contabil.lancar', 'resultados.ver', 'resultados.ver'] })
    expect(ok.ok).toBe(true)
    await adicionarMembro(executar, 'gabriel@exemplo.com.br', { email: 'contador@exemplo.com.br', papelSlug: 'contador' }, SEM_LISTA)
    const m = await carregarMembroNoBanco(executar, 'contador@exemplo.com.br', SEM_LISTA)
    expect(m?.permissoes).toEqual(['resultados.ver', 'contabil.lancar'])
  })

  it('não exclui papel de sistema nem papel com membro; exclui o vazio', async () => {
    await criarPapel(executar, 'g@exemplo.com.br', { slug: 'temporario', nome: 'Temporário', rank: 1, variantePainel: 'operacional', permissoes: [] })
    await adicionarMembro(executar, 'g@exemplo.com.br', { email: 't@exemplo.com.br', papelSlug: 'temporario' }, SEM_LISTA)
    expect((await excluirPapel(executar, 'g@exemplo.com.br', 'socio')).ok).toBe(false)
    expect((await excluirPapel(executar, 'g@exemplo.com.br', 'temporario')).ok).toBe(false)
    await alterarMembro(executar, 'g@exemplo.com.br', { email: 't@exemplo.com.br', papelSlug: 'operacao' }, SEM_LISTA)
    expect((await excluirPapel(executar, 'g@exemplo.com.br', 'temporario')).ok).toBe(true)
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.papeis.'))).toEqual(['admin.papeis.criar', 'admin.papeis.excluir'])
  })
})

/**
 * Testes do catálogo de permissões e da resolução do membro do painel.
 *
 * O que estes testes protegem, em linguagem de sócio: quem entra no painel, com
 * que poderes, e a garantia de que nenhuma mudança pela tela deixa o painel sem
 * alguém capaz de consertar as permissões.
 */

import { describe, expect, it } from 'vitest'

import {
  CHAVES_PERMISSAO,
  MODULOS,
  PAPEIS_DE_SISTEMA,
  PERMISSOES,
  SLUG_DEV,
  devsAtivosDepois,
  ehChavePermissao,
  EMAILS_FIXOS_DA_EQUIPE,
  ehEmailDeBootstrap,
  emailValido,
  emailsDeBootstrap,
  papelDeSistema,
  resolverMembro,
  slugDePapelValido,
  temAlguma,
  temPermissao,
  type PapelGravado,
} from './permissoes'

const SEED = { 'gabrielsilva@testeaurea.com.br': {}, 'rogeriopena@testeaurea.com.br': {} }

function papel(slug: string, permissoes: readonly string[], id = 7): PapelGravado {
  return { id, slug, nome: slug, rank: 20, variantePainel: 'gestao', sistema: false, permissoes }
}

describe('catálogo de permissões', () => {
  it('tem as 22 chaves do plano, sem repetição, cada uma com o prefixo do próprio módulo', () => {
    expect(CHAVES_PERMISSAO).toHaveLength(22)
    expect(new Set(CHAVES_PERMISSAO).size).toBe(22)
    for (const p of PERMISSOES) expect(p.chave.startsWith(`${p.modulo}.`)).toBe(true)
  })

  it('todo módulo usado tem rótulo na tela de papéis', () => {
    const modulos = new Set(PERMISSOES.map((p) => p.modulo))
    expect(new Set(MODULOS.map((m) => m.modulo))).toEqual(modulos)
  })

  it('recusa chave que não está no catálogo', () => {
    expect(ehChavePermissao('resultados.ver')).toBe(true)
    expect(ehChavePermissao('resultados.apagar')).toBe(false)
    expect(ehChavePermissao(42)).toBe(false)
  })
})

describe('papéis de sistema', () => {
  it('dev nasce com tudo; sócio com tudo menos papéis e membros; operação só bancada e logística', () => {
    expect(papelDeSistema('dev')?.permissoesIniciais).toEqual(CHAVES_PERMISSAO)
    const socio = papelDeSistema('socio')?.permissoesIniciais ?? []
    expect(socio).toHaveLength(20)
    expect(socio).not.toContain('admin.papeis')
    expect(socio).not.toContain('admin.membros')
    expect(socio).toContain('admin.auditoria')
    expect(papelDeSistema('operacao')?.permissoesIniciais).toEqual([
      'bancada.ver',
      'bancada.analisar',
      'bancada.auditoria',
      'logistica.ver',
      'logistica.etiquetas',
    ])
  })

  it('os ranks ordenam dev > sócio > operação', () => {
    expect(PAPEIS_DE_SISTEMA.map((p) => [p.slug, p.rank])).toEqual([
      ['dev', 100],
      ['socio', 50],
      ['operacao', 10],
    ])
  })
})

describe('bootstrap pelo ambiente — a mesma regra de ehAdmin', () => {
  it('sem AUREA_ADMIN_EMAILS valem as contas do seed', () => {
    expect(ehEmailDeBootstrap(' GabrielSilva@TesteAurea.com.br ', undefined, SEED)).toBe(true)
    expect(ehEmailDeBootstrap('visitante@exemplo.com.br', undefined, SEED)).toBe(false)
    expect(ehEmailDeBootstrap(null, undefined, SEED)).toBe(false)
    expect(emailsDeBootstrap('', SEED)).toEqual([...new Set([...Object.keys(SEED), ...EMAILS_FIXOS_DA_EQUIPE])])
  })

  it('Rogério e Rozane entram no painel como dev mesmo com uma lista do ambiente sem eles', () => {
    const lista = 'contador@exemplo.com.br'
    for (const e of ['rogerio@aureacustodia.com.br', 'RogerioPena@testeaurea.com.br', 'rozane@testeaurea.com.br']) {
      expect(ehEmailDeBootstrap(e, lista, SEED)).toBe(true)
    }
    // Quem não está na lista fixa continua dependendo da lista do ambiente.
    expect(ehEmailDeBootstrap('alex@testeaurea.com.br', lista, SEED)).toBe(false)
  })

  it('o e-mail do Gabriel entra como dev com ou sem a lista do ambiente (RA-48)', () => {
    expect(ehEmailDeBootstrap(' Gabriel.Silva@AureaCustodia.com.br ', undefined, SEED)).toBe(true)
    expect(ehEmailDeBootstrap('gabriel.silva@aureacustodia.com.br', 'contador@exemplo.com.br', SEED)).toBe(true)
    // Sem repetir quando a lista já o traz.
    expect(emailsDeBootstrap('gabriel.silva@aureacustodia.com.br', SEED)).toEqual([...EMAILS_FIXOS_DA_EQUIPE])
  })

  it('com a lista definida vale só ela — o seed deixa de valer', () => {
    const lista = ' Contador@Exemplo.com.br , gabriel.silva@aureacustodia.com.br '
    expect(ehEmailDeBootstrap('contador@exemplo.com.br', lista, SEED)).toBe(true)
    expect(ehEmailDeBootstrap('gabrielsilva@testeaurea.com.br', lista, SEED)).toBe(false)
    expect(emailsDeBootstrap(lista, SEED)).toEqual(['contador@exemplo.com.br', ...EMAILS_FIXOS_DA_EQUIPE])
  })
})

describe('resolverMembro', () => {
  it('e-mail desconhecido no bootstrap entra como dev, com todas as permissões e origem ambiente', () => {
    const m = resolverMembro({ email: 'GabrielSilva@testeaurea.com.br', membro: null, papel: null, bootstrap: true, nomeAlternativo: 'Gabriel Silva' })
    expect(m).toMatchObject({ email: 'gabrielsilva@testeaurea.com.br', nome: 'Gabriel Silva', origem: 'ambiente' })
    expect(m?.papel.slug).toBe(SLUG_DEV)
    expect(m?.permissoes).toEqual(CHAVES_PERMISSAO)
  })

  it('e-mail desconhecido fora do bootstrap não é membro', () => {
    expect(resolverMembro({ email: 'cliente@exemplo.com.br', membro: null, papel: null, bootstrap: false })).toBeNull()
  })

  it('a linha da tabela vale sobre o bootstrap — inclusive para rebaixar', () => {
    const m = resolverMembro({
      email: 'gabrielsilva@testeaurea.com.br',
      membro: { email: 'gabrielsilva@testeaurea.com.br', nomeExibicao: 'Gabriel', papelId: 7, status: 'ativo' },
      papel: papel('contador', ['resultados.ver', 'contabil.lancar']),
      bootstrap: true,
    })
    expect(m?.origem).toBe('tabela')
    expect(m?.permissoes).toEqual(['resultados.ver', 'contabil.lancar'])
  })

  it('membro inativo não entra, mesmo estando no bootstrap', () => {
    const m = resolverMembro({
      email: 'x@exemplo.com.br',
      membro: { email: 'x@exemplo.com.br', nomeExibicao: '', papelId: 7, status: 'inativo' },
      papel: papel('socio', CHAVES_PERMISSAO),
      bootstrap: true,
    })
    expect(m).toBeNull()
  })

  it('papel dev na tabela recebe o catálogo inteiro, mesmo com concessão incompleta no banco', () => {
    const m = resolverMembro({
      email: 'dev@exemplo.com.br',
      membro: { email: 'dev@exemplo.com.br', nomeExibicao: '', papelId: 1, status: 'ativo' },
      papel: { ...papel(SLUG_DEV, ['resultados.ver'], 1), sistema: true },
      bootstrap: false,
    })
    expect(m?.permissoes).toEqual(CHAVES_PERMISSAO)
    expect(m?.nome).toBe('dev@exemplo.com.br')
  })

  it('chave gravada que saiu do catálogo não vira permissão', () => {
    const m = resolverMembro({
      email: 'y@exemplo.com.br',
      membro: { email: 'y@exemplo.com.br', nomeExibicao: 'Y', papelId: 7, status: 'ativo' },
      papel: papel('estranho', ['resultados.ver', 'coisa.antiga']),
      bootstrap: false,
    })
    expect(m?.permissoes).toEqual(['resultados.ver'])
  })

  it('linha apontando para outro papel não concede nada', () => {
    const m = resolverMembro({
      email: 'z@exemplo.com.br',
      membro: { email: 'z@exemplo.com.br', nomeExibicao: 'Z', papelId: 99, status: 'ativo' },
      papel: papel('socio', CHAVES_PERMISSAO, 7),
      bootstrap: true,
    })
    expect(m).toBeNull()
  })

  it('temPermissao e temAlguma', () => {
    const m = { permissoes: ['resultados.ver'] as const }
    expect(temPermissao({ permissoes: [...m.permissoes] }, 'resultados.ver')).toBe(true)
    expect(temPermissao({ permissoes: [...m.permissoes] }, 'resultados.exportar')).toBe(false)
    expect(temPermissao(null, 'resultados.ver')).toBe(false)
    expect(temAlguma({ permissoes: ['admin.papeis'] }, ['admin.membros', 'admin.papeis'])).toBe(true)
    expect(temAlguma({ permissoes: [] }, ['admin.membros', 'admin.papeis'])).toBe(false)
  })
})

describe('devsAtivosDepois — o painel nunca fica sem dev', () => {
  const bootstrap = ['gabriel.silva@aureacustodia.com.br']

  it('o próprio dev do ambiente se cadastrando como sócio zera os devs', () => {
    expect(devsAtivosDepois([], bootstrap, { email: 'Gabriel.Silva@aureacustodia.com.br', papelSlug: 'socio', status: 'ativo' })).toBe(0)
  })

  it('cadastrar outra pessoa não mexe no dev do ambiente', () => {
    expect(devsAtivosDepois([], bootstrap, { email: 'contador@exemplo.com.br', papelSlug: 'socio', status: 'ativo' })).toBe(1)
  })

  it('desativar o último dev da tabela, sem bootstrap sobrando, zera', () => {
    const membros = [
      { email: 'gabriel.silva@aureacustodia.com.br', papelSlug: 'dev', status: 'ativo' as const },
      { email: 'rogerio@aureacustodia.com.br', papelSlug: 'socio', status: 'ativo' as const },
    ]
    expect(devsAtivosDepois(membros, bootstrap, { email: 'gabriel.silva@aureacustodia.com.br', papelSlug: 'dev', status: 'inativo' })).toBe(0)
    expect(devsAtivosDepois(membros, bootstrap, { email: 'rogerio@aureacustodia.com.br', papelSlug: 'dev', status: 'ativo' })).toBe(2)
  })
})

describe('validação de entrada', () => {
  it('slug de papel', () => {
    expect(slugDePapelValido('contador')).toBe(true)
    expect(slugDePapelValido('operador-bancada_2')).toBe(true)
    expect(slugDePapelValido('C')).toBe(false)
    expect(slugDePapelValido('com espaço')).toBe(false)
    expect(slugDePapelValido('9abc')).toBe(false)
  })

  it('e-mail', () => {
    expect(emailValido('contador@exemplo.com.br')).toBe(true)
    expect(emailValido('sem-arroba')).toBe(false)
    expect(emailValido('a@b')).toBe(false)
  })
})

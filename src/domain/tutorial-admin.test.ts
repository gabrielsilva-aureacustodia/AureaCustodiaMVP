import { describe, expect, it } from 'vitest'

import { CHAVES_PERMISSAO, PAPEIS_DE_SISTEMA } from '@/domain/admin/permissoes'
import {
  PAGINAS_ADMIN_COM_TUTORIAL,
  PERMISSOES_DA_PAGINA,
  atende,
  chaveDoTourAdmin,
  dicasBrutasDaPaginaAdmin,
  paginaDoTutorialAdmin,
  passosBrutosDoTourAdmin,
  passosDoTourAdmin,
  podeVerPagina,
  totalDeEtapasDoTourAdmin,
  tutorialDaPaginaAdmin,
} from '@/domain/tutorial-admin'
import { chaveDoTour } from '@/domain/tutorial'
import { GRUPOS_NAV, TODOS_ITENS, permiteItem } from '@/components/admin/navegacao'

const PAPEIS = Object.fromEntries(PAPEIS_DE_SISTEMA.map((p) => [p.slug, p.permissoesIniciais])) as Record<string, readonly string[]>
const DEV = PAPEIS.dev!
const SOCIO = PAPEIS.socio!
const OPERACAO = PAPEIS.operacao!

/** Texto que o jurídico proibiu em qualquer tela do produto (terminologia-juridica-aurea). */
const PROIBIDAS = /\b(token|tokens|nft|cripto|criptoativo|ativo digital|ativos|investimento|investidor|corretora|rentabilidade)\b/i

describe('rotas do tutorial', () => {
  it('reconhece as telas do menu, as duas fichas e ignora o resto', () => {
    expect(paginaDoTutorialAdmin('/admin')).toBe('/admin')
    expect(paginaDoTutorialAdmin('/admin/saques/')).toBe('/admin/saques')
    expect(paginaDoTutorialAdmin('/admin/usuarios/ana%40x.com')).toBe('ficha-do-cliente')
    expect(paginaDoTutorialAdmin('/admin/moedas/RO-000016')).toBe('ficha-da-moeda')
    expect(paginaDoTutorialAdmin('/admin/moedas/RO-000016/cliente')).toBeNull()
    expect(paginaDoTutorialAdmin('/admin/resultados')).toBeNull()
    expect(paginaDoTutorialAdmin('/inicio')).toBeNull()
  })

  it('guarda o progresso por membro e longe da chave do tutorial do cliente', () => {
    expect(chaveDoTourAdmin('a@x.com')).not.toBe(chaveDoTourAdmin('b@x.com'))
    expect(chaveDoTourAdmin('a@x.com')).not.toBe(chaveDoTour('a@x.com'))
    expect(chaveDoTourAdmin('a@x.com')).toContain('a@x.com')
  })
})

describe('o tutorial acompanha o menu', () => {
  it('toda tela do menu tem tutorial, com a mesma permissão do menu', () => {
    for (const item of TODOS_ITENS) {
      const pagina = item.href as (typeof PAGINAS_ADMIN_COM_TUTORIAL)[number]
      expect(PAGINAS_ADMIN_COM_TUTORIAL, item.href).toContain(pagina)
      expect([...PERMISSOES_DA_PAGINA[pagina]].sort(), item.href).toEqual([...item.permissoes].sort())
    }
  })

  it('não há tutorial de tela que o menu não conhece, fora as duas fichas', () => {
    const hrefs = new Set(TODOS_ITENS.map((i) => i.href))
    const extras = PAGINAS_ADMIN_COM_TUTORIAL.filter((p) => !hrefs.has(p))
    expect(extras).toEqual(['ficha-do-cliente', 'ficha-da-moeda'])
  })

  it('as fichas herdam a permissão da lista que as abre', () => {
    expect(PERMISSOES_DA_PAGINA['ficha-do-cliente']).toEqual(PERMISSOES_DA_PAGINA['/admin/usuarios'])
    expect(PERMISSOES_DA_PAGINA['ficha-da-moeda']).toEqual(PERMISSOES_DA_PAGINA['/admin/moedas'])
  })

  it('os passos do tour que apontam para o menu só existem para quem vê o item', () => {
    for (const passo of passosBrutosDoTourAdmin()) {
      if (!passo.exige) continue
      // Cada passo com alvo no menu usa a mesma exigência do item que ele mostra.
      const item = TODOS_ITENS.find((i) => i.permissoes.length > 0 && i.permissoes.every((c) => passo.exige!.includes(c)))
      expect(item, passo.id).toBeDefined()
    }
  })
})

describe('papel dev', () => {
  it('abre todas as telas e vê o tutorial de cada uma', () => {
    for (const pagina of PAGINAS_ADMIN_COM_TUTORIAL) {
      const t = tutorialDaPaginaAdmin(pagina, DEV)
      expect(t, pagina).not.toBeNull()
      expect(t!.dicas.length, pagina).toBeGreaterThan(0)
    }
  })

  it('percorre o tour inteiro, de Equipe a Saques', () => {
    const ids = passosDoTourAdmin(DEV).map((p) => p.id)
    expect(ids[0]).toBe('boas-vindas')
    expect(ids).toEqual(expect.arrayContaining(['saques', 'bancada', 'financeiro', 'configuracao', 'equipe', 'busca']))
  })
})

describe('papel sócio', () => {
  it('não tem o tutorial da Equipe nem passo dela', () => {
    expect(tutorialDaPaginaAdmin('/admin/equipe', SOCIO)).toBeNull()
    expect(podeVerPagina('/admin/equipe', SOCIO)).toBe(false)
    expect(passosDoTourAdmin(SOCIO).map((p) => p.id)).not.toContain('equipe')
  })

  it('vê Configuração e as ações de taxa', () => {
    const t = tutorialDaPaginaAdmin('/admin/configuracao', SOCIO)
    expect(t!.dicas.map((d) => d.id)).toEqual(expect.arrayContaining(['config-taxas', 'config-catalogo']))
  })
})

describe('papel operação', () => {
  const abertas = PAGINAS_ADMIN_COM_TUTORIAL.filter((p) => podeVerPagina(p, OPERACAO))

  it('só tem tutorial das telas de bancada e logística', () => {
    expect(abertas).toEqual(['/admin', '/admin/bancada', '/admin/logistica', '/admin/moedas', 'ficha-da-moeda'])
  })

  it('não recebe nada de dinheiro, cliente, contabilidade nem configuração', () => {
    for (const fechada of ['/admin/saques', '/admin/usuarios', '/admin/resultados/financeiro', '/admin/resultados/fiscal', '/admin/configuracao', '/admin/equipe'] as const) {
      expect(tutorialDaPaginaAdmin(fechada, OPERACAO), fechada).toBeNull()
    }
  })

  it('o tour é só do que ela abre, com as etapas em sequência', () => {
    const passos = passosDoTourAdmin(OPERACAO)
    const ids = passos.map((p) => p.id)
    for (const naoDeve of ['saques', 'cs', 'usuarios', 'financeiro', 'contabil', 'indicadores', 'configuracao', 'equipe']) {
      expect(ids, naoDeve).not.toContain(naoDeve)
    }
    expect(ids).toEqual(expect.arrayContaining(['central', 'bancada', 'logistica', 'moedas']))
    const etapas = [...new Set(passos.map((p) => p.etapa))]
    expect(etapas).toEqual(etapas.map((_, i) => i))
    expect(totalDeEtapasDoTourAdmin(passos)).toBe(etapas.length - 1)
  })

  it('a bancada some o que exige permissão que ela tem só em parte', () => {
    const ids = tutorialDaPaginaAdmin('/admin/bancada', OPERACAO)!.dicas.map((d) => d.id)
    expect(ids).toContain('bancada-analise')
    expect(ids).not.toContain('bancada-cadastro-direto')
    expect(ids).not.toContain('bancada-so-ver')
  })
})

describe('papel só de leitura', () => {
  const SO_VER = ['saques.ver', 'bancada.ver', 'config.ver']

  it('vê o aviso de que só acompanha, e não as ações', () => {
    const saques = tutorialDaPaginaAdmin('/admin/saques', SO_VER)!.dicas.map((d) => d.id)
    expect(saques).toContain('saques-so-ver')
    expect(saques).not.toContain('saques-aprovar')
    expect(saques).not.toContain('saques-recusar')
    expect(tutorialDaPaginaAdmin('/admin/configuracao', SO_VER)!.dicas.map((d) => d.id)).toContain('config-so-ver')
  })

  it('quem pode pagar saque não vê o aviso de leitura', () => {
    const ids = tutorialDaPaginaAdmin('/admin/saques', ['saques.ver', 'saques.pagar'])!.dicas.map((d) => d.id)
    expect(ids).toContain('saques-aprovar')
    expect(ids).not.toContain('saques-so-ver')
  })

  it('sem nenhuma permissão só sobra a Central de trabalho', () => {
    const abertas = PAGINAS_ADMIN_COM_TUTORIAL.filter((p) => podeVerPagina(p, []))
    expect(abertas).toEqual(['/admin'])
    expect(passosDoTourAdmin([]).map((p) => p.id)).toEqual(['boas-vindas', 'central', 'busca', 'voltar-ao-app', 'ver-tutorial'])
  })
})

describe('consistência do conteúdo', () => {
  it('as chaves de permissão citadas existem no catálogo', () => {
    const conhecidas = new Set<string>(CHAVES_PERMISSAO)
    for (const pagina of PAGINAS_ADMIN_COM_TUTORIAL) {
      for (const d of dicasBrutasDaPaginaAdmin(pagina)) {
        for (const c of d.exige ?? []) expect(conhecidas.has(c), `${pagina} › ${d.id}: ${c}`).toBe(true)
        if (d.semAcesso) expect(conhecidas.has(d.semAcesso), `${pagina} › ${d.id}`).toBe(true)
      }
    }
  })

  it('dica que exige permissão não é mais larga que a própria página', () => {
    // Quem abre a página já tem alguma permissão dela; uma dica exigindo outra é legítima (ação), mas não
    // pode ficar órfã: para algum papel de sistema ela precisa aparecer, senão é texto que ninguém lê.
    for (const pagina of PAGINAS_ADMIN_COM_TUTORIAL) {
      for (const d of dicasBrutasDaPaginaAdmin(pagina)) {
        const aparece = Object.values(PAPEIS).some((perms) => {
          const t = tutorialDaPaginaAdmin(pagina, perms)
          return t?.dicas.some((x) => x.id === d.id) ?? false
        })
        // 'so-ver' só aparece para papel customizado de leitura; os de sistema têm todas as ações da área.
        if (d.semAcesso) continue
        expect(aparece, `${pagina} › ${d.id}`).toBe(true)
      }
    }
  })

  it('ids de dica e de passo são únicos', () => {
    const dicas = PAGINAS_ADMIN_COM_TUTORIAL.flatMap((p) => dicasBrutasDaPaginaAdmin(p).map((d) => d.id))
    expect(new Set(dicas).size).toBe(dicas.length)
    const passos = passosBrutosDoTourAdmin().map((p) => p.id)
    expect(new Set(passos).size).toBe(passos.length)
  })

  it('o item de menu e a exigência do passo concordam (atende)', () => {
    for (const item of TODOS_ITENS) {
      expect(atende(DEV, item.permissoes)).toBe(permiteItem(item, DEV))
      expect(atende(OPERACAO, item.permissoes)).toBe(permiteItem(item, OPERACAO))
    }
    expect(GRUPOS_NAV.length).toBeGreaterThan(0)
  })

  it('nenhum texto usa palavra proibida pelo jurídico nem valor em reais escrito à mão', () => {
    const textos: string[] = []
    for (const p of passosDoTourAdmin(DEV)) textos.push(p.titulo, p.texto)
    for (const pagina of PAGINAS_ADMIN_COM_TUTORIAL) {
      const t = tutorialDaPaginaAdmin(pagina, DEV)!
      textos.push(t.titulo)
      for (const d of dicasBrutasDaPaginaAdmin(pagina)) textos.push(d.titulo, d.texto)
    }
    for (const texto of textos) {
      expect(texto).not.toMatch(PROIBIDAS)
      expect(texto).not.toMatch(/R\$\s?\d/)
      expect(texto).not.toMatch(/\d+(,\d+)?\s?%/)
    }
  })
})

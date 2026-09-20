/**
 * Testes de integração do painel contra um Postgres DE VERDADE (PGlite).
 *
 * Um arquivo só, com uma instância, de propósito — ver `testing/pglite.ts`. Cobre as
 * migrations 020 a 025 e o que o painel grava: catálogo e papéis, membros, a
 * proteção contra ficar sem dev, a trilha `admin.<area>.<verbo>`, o registro de uso,
 * as ações contábeis (C1), o atendimento por WhatsApp e a administração de usuários (C2),
 * a configuração do site, o catálogo de moedas, as caixas e a bancada web (C3).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { FILTRO_PADRAO } from '@/domain/admin/cs'
import { CHAVES_PERMISSAO, EMAILS_FIXOS_DA_EQUIPE } from '@/domain/admin/permissoes'
import { validarLoteDeEventos } from '@/domain/admin/uso'
import type { Cadastro } from '@/domain/types'
import { criarRegistroLocal } from '@/lib/mensageria/registro-local'
import { ErroDoProvedor, type EventoMensageria, type ProvedorMensageria } from '@/lib/mensageria/tipos'
import { lerEstado, mutarEstado } from '@/server/db/estado'
import { contasDesativadas, datasDeCriacao, listarNotasDoUsuario, situacaoDaConta } from '@/server/db/repositories/admin-usuarios'
import { listarAuditoria } from '@/server/db/repositories/auditoria'
import { listarPapeis, substituirPermissoes } from '@/server/db/repositories/admin-rbac'
import { listarLancamentos } from '@/server/db/repositories/ledger'
import { aceitesDaConta, historicoDaFilaDaConta, lerHistoricoDaFila, recebimentosDaConta } from '@/server/db/repositories/painel-leituras'
import type { Executor } from '@/server/db/sql'

import { dataDeBrasilia, tabelaDeTaxasDe, valoresVigentes } from '@/domain/admin/configuracao'
import { documentoTabelaDeTaxas } from '@/domain/admin/documentos'
import { encadearAnalise } from '@/domain/analise'
import { hashDoDocumento } from '@/domain/documentos-legais'
import { GENESIS, sha256Hex } from '@/domain/hash'
import { BAN, estado as estadoDeTeste, moeda as moedaDeTeste, usuario as usuarioDeTeste } from '@/domain/testing/fixtures'
import type { AppState } from '@/domain/types'
import { listarCaixas } from '@/server/db/repositories/caixas'
import { lerConfiguracao, listarHistoricoConfig, listarTiposMoeda } from '@/server/db/repositories/config'
import { buscarDocumentoVigente, garantirDocumentosVigentes, inserirDocumentoLegal } from '@/server/db/repositories/documentos'

import { registrarAcaoAdmin } from './auditar'
import { abrirPelaBancadaWeb, fecharPelaBancadaWeb, salvarCaixa, type PortaDaBancada } from './bancada'
import { publicarDocumentoVigente, salvarGrupoDeConfiguracao, salvarTipoDeMoeda, type PortaDePublicacao } from './configuracao'
import { definirAliquota, estornarManual, lancarManual, verificarLedger } from './contabil'
import {
  abrirConversa,
  anotarConversa,
  atribuirConversa,
  atualizarContato,
  carregarCaixa,
  criarEtiqueta,
  etiquetarConversa,
  iniciarConversa,
  mudarStatusConversa,
  receberEventos,
  responderConversa,
} from './cs'
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
import { carregarUsoNoBanco, gravarEventosDeUso } from './uso'
import {
  ajustarSaldo,
  anotarUsuario,
  criarUsuario,
  editarCadastro,
  editarDadosBancarios,
  marcarInadimplencia,
  mudarSituacaoDaConta,
  portaDeEstadoNoBanco,
  redefinirSenha,
  type PortaDeIdentidade,
} from './usuarios'

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
  // Subir o PGlite e aplicar as 25 migrations passa de 10 s com a suíte inteira em paralelo.
}, 60_000)

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

/**
 * Roda `fn` com as tabelas apagadas, e desfaz tudo no fim.
 *
 * Desde o merge de 14/09/2026 as tabelas das frentes A e B existem no banco de teste, e a
 * leitura defensiva do painel (`to_regclass` → null) só se exercita apagando a tabela. O
 * DROP acontece dentro da transação, e o erro-sentinela no fim a desfaz: os outros testes
 * continuam enxergando as tabelas.
 */
async function semAsTabelas<T>(tabelas: readonly string[], fn: Parameters<Executor>[0]): Promise<T> {
  const DESFAZER = Symbol('desfazer')
  let resultado: T | undefined
  try {
    await executar(async (tx) => {
      for (const t of tabelas) await tx.query(`DROP TABLE aurea.${t} CASCADE`)
      resultado = (await fn(tx)) as T
      throw DESFAZER
    })
  } catch (e) {
    if (e !== DESFAZER) throw e
  }
  return resultado as T
}

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
  it('semeia as 23 permissões e os três papéis com as concessões iniciais', async () => {
    await executar((tx) => garantirCatalogosAdmin(tx))
    const papeis = await executar((tx) => listarPapeis(tx))
    expect(papeis.map((p) => [p.slug, p.permissoes.length, p.sistema])).toEqual([
      ['dev', 23, true],
      ['socio', 21, true],
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
    // Desde 15/09/2026 a lista fixa também traz Rogério e Rozane (RA-48): para o Gabriel ser o
    // único dev, os outros três são rebaixados antes — e voltam a dev no fim, para o próximo teste.
    const outros = EMAILS_FIXOS_DA_EQUIPE.filter((e) => e !== 'gabriel.silva@aureacustodia.com.br')
    for (const email of outros) {
      expect(await alterarMembro(executar, 'gabriel.silva@aureacustodia.com.br', { email, papelSlug: 'socio' }, SO_GABRIEL)).toMatchObject({ ok: true })
    }
    const rebaixar = await alterarMembro(executar, 'gabriel.silva@aureacustodia.com.br', { email: 'gabriel.silva@aureacustodia.com.br', papelSlug: 'socio' }, SO_GABRIEL)
    expect(rebaixar).toMatchObject({ ok: false })
    const desativar = await alterarMembro(executar, 'gabriel.silva@aureacustodia.com.br', { email: 'gabriel.silva@aureacustodia.com.br', status: 'inativo' }, SO_GABRIEL)
    expect(desativar).toMatchObject({ ok: false })
    expect(await carregarMembroNoBanco(executar, 'gabriel.silva@aureacustodia.com.br', SO_GABRIEL)).toMatchObject({ papel: { slug: 'dev' } })
    for (const email of outros) {
      expect(await alterarMembro(executar, 'gabriel.silva@aureacustodia.com.br', { email, papelSlug: 'dev' }, SO_GABRIEL)).toMatchObject({ ok: true })
    }
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
    expect(equipe.papeis.find((p) => p.slug === 'dev')?.permissoes).toHaveLength(23)
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

describe('registro de uso', () => {
  const T0 = Date.UTC(2026, 8, 14, 13, 0, 0)

  it('grava o lote limpo e a tela de Uso lê eventos e trilha do período', async () => {
    const lote = validarLoteDeEventos(
      { sessao: 'aba-00000001', eventos: [{ tipo: 'pagina', rota: '/mercado', em: T0 }, { tipo: 'pagina', rota: '/vender', em: T0 + 60000 }] },
      T0 + 60000,
    )
    expect(lote).not.toBeNull()
    expect(await gravarEventosDeUso(executar, 'Rogeriopena@testeaurea.com.br', lote!, 'android')).toBe(2)
    await executar((tx) => registrarAcaoAdmin(tx, { ator: 'rogeriopena@testeaurea.com.br', area: 'contabil', verbo: 'lancar', agora: T0 + 120000 }))

    const { rows } = await banco.db.query<{ user_email: string; plataforma: string; detalhes: unknown }>(
      `SELECT user_email, plataforma, detalhes FROM aurea.eventos_uso ORDER BY id`,
    )
    expect(rows.map((r) => [r.user_email, r.plataforma])).toEqual([
      ['rogeriopena@testeaurea.com.br', 'android'],
      ['rogeriopena@testeaurea.com.br', 'android'],
    ])

    const dados = await carregarUsoNoBanco(executar, {
      de: T0 - 1,
      ate: T0 + 3600000,
      primeirasVendas: { 'rogeriopena@testeaurea.com.br': T0 + 90000 },
      filtroTrilha: { acaoComeca: 'admin.' },
    })
    expect(dados.resumo).toMatchObject({ paginasVistas: 2, sessoes: 1, contas: 1 })
    expect(dados.resumo.jornadas).toMatchObject({ contasComJornada: 1, medianaMinutos: 2 })
    expect(dados.trilha?.map((t) => t.acao)).toEqual(['admin.contabil.lancar'])
    expect(dados.eventosNoLimite).toBe(false)
  })

  it('sem permissão de auditoria a trilha nem é lida; filtro por ator ignora maiúsculas e trata % como texto', async () => {
    await executar(async (tx) => {
      await registrarAcaoAdmin(tx, { ator: 'gabrielsilva@testeaurea.com.br', area: 'membros', verbo: 'adicionar', agora: T0 })
      await registrarAcaoAdmin(tx, { ator: 'alex@testeaurea.com.br', area: 'membros', verbo: 'adicionar', agora: T0 })
    })
    const semTrilha = await carregarUsoNoBanco(executar, { de: 0, ate: T0 + 1, primeirasVendas: {}, filtroTrilha: null })
    expect(semTrilha.trilha).toBeNull()

    const porAtor = await carregarUsoNoBanco(executar, { de: 0, ate: T0 + 1, primeirasVendas: {}, filtroTrilha: { atorContem: 'GABRIEL' } })
    expect(porAtor.trilha?.map((t) => t.ator)).toEqual(['gabrielsilva@testeaurea.com.br'])
    const curinga = await carregarUsoNoBanco(executar, { de: 0, ate: T0 + 1, primeirasVendas: {}, filtroTrilha: { atorContem: '%' } })
    expect(curinga.trilha).toEqual([])
  })

  it('histórico da fila de ofertas: lista vazia com a tabela da A2, null sem ela', async () => {
    expect(await executar((tx) => lerHistoricoDaFila(tx, 0, T0, 100))).toEqual([])
    expect(await semAsTabelas(['ofertas_historico'], (tx) => lerHistoricoDaFila(tx, 0, T0, 100))).toBeNull()
  })
})

describe('ações contábeis do painel', () => {
  beforeEach(async () => {
    await banco.db.exec(`TRUNCATE aurea.lancamentos_manuais RESTART IDENTITY CASCADE; UPDATE aurea.parametros_contabeis SET valor = NULL;`)
  })

  it('lança, estorna uma vez só, e cada gesto fica na trilha com o ator', async () => {
    const ator = 'contador@exemplo.com.br'
    const lancado = await lancarManual(executar, ator, { dataISO: '2026-09-01', contaCodigo: '4.1.03', descricao: 'Aluguel do cofre', valorCents: 150000 })
    expect(lancado).toMatchObject({ ok: true, dados: { id: 1 } })
    expect((await lancarManual(executar, ator, { dataISO: '2026-09-01', contaCodigo: '3.1.01', descricao: 'Comissão à mão', valorCents: 1 })).ok).toBe(false)

    expect((await estornarManual(executar, ator, 1, 'lançado em duplicidade')).ok).toBe(true)
    expect(await estornarManual(executar, ator, 1, 'de novo')).toMatchObject({ ok: false })
    expect(await estornarManual(executar, ator, 2, 'estorno do estorno')).toMatchObject({ ok: false })

    const trilha = await executar((tx) => listarAuditoria(tx, { ator }))
    expect(trilha.map((t) => t.acao).reverse()).toEqual(['admin.contabil.lancar', 'admin.contabil.estornar'])
    expect(trilha[1].detalhes).toMatchObject({ contaCodigo: '4.1.03', valor: 150000 })
  })

  it('alíquota grava com quem mudou; limpar volta a nulo', async () => {
    expect(await definirAliquota(executar, 'contador@exemplo.com.br', 'issBp', 500)).toMatchObject({ ok: true, mensagem: 'ISS: 5%.' })
    const { rows } = await banco.db.query<{ valor: unknown; atualizado_por: string }>(`SELECT valor, atualizado_por FROM aurea.parametros_contabeis WHERE chave = 'issBp'`)
    expect(Number(rows[0].valor)).toBe(500)
    expect(rows[0].atualizado_por).toBe('contador@exemplo.com.br')
    expect(await definirAliquota(executar, 'contador@exemplo.com.br', 'issBp', null)).toMatchObject({ ok: true, mensagem: 'ISS: não configurado.' })
    expect((await definirAliquota(executar, 'contador@exemplo.com.br', 'issBp', 10001)).ok).toBe(false)
  })

  it('conferência do livro-razão responde e fica registrada', async () => {
    const r = await verificarLedger(executar, 'gabrielsilva@testeaurea.com.br')
    expect(r.ok).toBe(true)
    const [linha] = await executar((tx) => listarAuditoria(tx, { acao: 'admin.resultados.verificar_ledger' }))
    expect(linha.detalhes).toMatchObject({ ok: true })
  })
})

/* ============================================================================
 * C2 — atendimento (migration 022) e administração de usuários (migration 023)
 * ==========================================================================*/

const ATENDENTE = 'gabrielsilva@testeaurea.com.br'
const T = Date.UTC(2026, 8, 14, 15, 0, 0)

const CADASTRO_ALEX: Cadastro = {
  cpf: '52998224725',
  nomeCompleto: 'Alex da Silva',
  dataNascimento: '1990-05-10',
  telefone: '11999998888',
  endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01001000' },
  dadosBancarios: { chavePix: 'alex@exemplo.com.br', tipoChavePix: 'email' },
  completadoEm: T - 86_400_000,
}

function mensagem(id: string, extra: Partial<Extract<EventoMensageria, { tipo: 'mensagem' }>> = {}): EventoMensageria {
  return { tipo: 'mensagem', idNoProvedor: id, direcao: 'entrada', telefone: '+5511999998888', nomeDoContato: 'Alex', corpo: `mensagem ${id}`, midiaUrl: null, midiaTipo: null, em: T, ...extra }
}

/** Um provedor de verdade de mentira: aceita (com o id pedido) ou recusa com a causa. */
function provedorFalso(opcoes: { ids?: string[]; falha?: string } = {}): ProvedorMensageria {
  const ids = [...(opcoes.ids ?? [])]
  const enviar = async () => {
    if (opcoes.falha) throw new ErroDoProvedor(opcoes.falha, 401)
    return { idNoProvedor: ids.shift() ?? `S-${Math.random().toString(36).slice(2)}` }
  }
  return { nome: 'evolution', identificador: 'cs-teste', entregaDeVerdade: true, pendencias: [], enviarTexto: enviar, enviarMidia: enviar, conferirAssinatura: () => true, normalizarEvento: () => [] }
}

async function mensagensDaConversa(conversaId: number): Promise<Array<{ idNoProvedor: string | null; status: string; autor: string | null; direcao: string }>> {
  const aberta = await abrirConversa(executar, conversaId, false)
  return (aberta?.mensagens ?? []).map((m) => ({ idNoProvedor: m.idNoProvedor, status: m.status, autor: m.autor, direcao: m.direcao }))
}

describe('migrations 022 e 023', () => {
  it('criam as nove tabelas do atendimento e das notas, com RLS ligado', async () => {
    const { rows } = await banco.db.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'aurea' AND c.relkind = 'r' AND (c.relname LIKE 'cs\\_%' OR c.relname IN ('admin_notas_usuario', 'admin_situacao_contas'))
        ORDER BY c.relname`,
    )
    expect(rows.map((r) => r.relname)).toEqual([
      'admin_notas_usuario',
      'admin_situacao_contas',
      'cs_canais',
      'cs_contatos',
      'cs_conversa_etiquetas',
      'cs_conversas',
      'cs_etiquetas',
      'cs_mensagens',
      'cs_notas',
    ])
    expect(rows.every((r) => r.relrowsecurity)).toBe(true)
  })
})

describe('atendimento', () => {
  beforeEach(async () => {
    await banco.db.exec(`TRUNCATE aurea.cs_conversa_etiquetas, aurea.cs_etiquetas, aurea.cs_notas, aurea.cs_mensagens, aurea.cs_conversas, aurea.cs_contatos, aurea.cs_canais RESTART IDENTITY CASCADE;`)
    await lerEstado(executar)
    await mutarEstado(executar, (s) => {
      s.users['alex@testeaurea.com.br'].cadastro = structuredClone(CADASTRO_ALEX)
    })
  })

  it('mensagem nova cria contato e conversa, acha a conta pelo telefone do cadastro e conta como não lida; reentrega não duplica', async () => {
    // O telefone chega canônico do adaptador; o do cadastro está sem o país ('11999998888').
    const evento = mensagem('M1', { telefone: '+5511999998888' })
    expect(await receberEventos(executar, provedorFalso(), [evento, evento], T)).toEqual({ mensagens: 1, repetidas: 1, status: 0 })

    const caixa = await carregarCaixa(executar, FILTRO_PADRAO)
    expect(caixa.conversas).toHaveLength(1)
    expect(caixa.conversas[0]).toMatchObject({ status: 'aberta', naoLidas: 1, contato: { userEmail: 'alex@testeaurea.com.br', nome: 'Alex', telefone: '+5511999998888' }, ultima: { corpo: 'mensagem M1', direcao: 'entrada' } })
    expect(caixa.resumo).toEqual({ porStatus: { aberta: 1, pendente: 0, resolvida: 0 }, naoLidas: 1 })

    const aberta = await abrirConversa(executar, caixa.conversas[0].id, true)
    expect(aberta?.conversa.naoLidas).toBe(0)
    expect((await carregarCaixa(executar, FILTRO_PADRAO)).resumo.naoLidas).toBe(0)
  })

  it('conversa resolvida reabre quando o cliente volta a escrever; entrega só anda para a frente', async () => {
    await receberEventos(executar, provedorFalso(), [mensagem('M1')], T)
    const [conversa] = (await carregarCaixa(executar, FILTRO_PADRAO)).conversas
    expect((await mudarStatusConversa(executar, ATENDENTE, conversa.id, 'resolvida')).ok).toBe(true)
    await receberEventos(executar, provedorFalso(), [mensagem('M2', { em: T + 1000 })], T + 1000)
    expect((await carregarCaixa(executar, FILTRO_PADRAO)).conversas[0]).toMatchObject({ status: 'aberta', naoLidas: 2 })

    const r = await responderConversa(executar, provedorFalso({ ids: ['S1'] }), ATENDENTE, conversa.id, { tipo: 'texto', texto: 'Olá, Alex!' }, T + 2000)
    expect(r).toMatchObject({ ok: true, mensagem: 'Mensagem enviada.', dados: { status: 'enviada' } })
    const status = (s: string) => ({ tipo: 'status' as const, idNoProvedor: 'S1', status: s as 'lida' | 'entregue' })
    expect(await receberEventos(executar, provedorFalso(), [status('lida'), status('entregue')], T + 3000)).toMatchObject({ status: 1 })
    expect((await mensagensDaConversa(conversa.id)).find((m) => m.idNoProvedor === 'S1')).toMatchObject({ status: 'lida', autor: ATENDENTE, direcao: 'saida' })
  })

  it('o eco da própria resposta no webhook vira uma linha só, com o atendente como autor', async () => {
    await receberEventos(executar, provedorFalso(), [mensagem('M1')], T)
    const [conversa] = (await carregarCaixa(executar, FILTRO_PADRAO)).conversas
    // O eco chega ANTES de o envio devolver o id.
    await receberEventos(executar, provedorFalso(), [mensagem('ECO', { direcao: 'saida', nomeDoContato: null, corpo: 'Resposta' })], T + 500)
    expect((await mensagensDaConversa(conversa.id)).find((m) => m.idNoProvedor === 'ECO')?.autor).toBe('whatsapp-celular')
    await responderConversa(executar, provedorFalso({ ids: ['ECO'] }), ATENDENTE, conversa.id, { tipo: 'texto', texto: 'Resposta' }, T + 600)
    const doEco = (await mensagensDaConversa(conversa.id)).filter((m) => m.idNoProvedor === 'ECO')
    expect(doEco).toEqual([{ idNoProvedor: 'ECO', status: 'enviada', autor: ATENDENTE, direcao: 'saida' }])
  })

  it('sem provedor a resposta fica registrada; provedor fora grava a falha — e as duas vão para a trilha', async () => {
    await receberEventos(executar, provedorFalso(), [mensagem('M1')], T)
    const [conversa] = (await carregarCaixa(executar, FILTRO_PADRAO)).conversas

    const local = await responderConversa(executar, criarRegistroLocal(['EVOLUTION_API_URL']), ATENDENTE, conversa.id, { tipo: 'texto', texto: 'Anotado no painel' })
    expect(local).toMatchObject({ ok: true, dados: { status: 'registrada' } })
    expect(local.ok && local.mensagem).toContain('não chega ao cliente')

    const fora = await responderConversa(executar, provedorFalso({ falha: 'HTTP 401: Unauthorized' }), ATENDENTE, conversa.id, { tipo: 'texto', texto: 'Tentativa' })
    expect(fora).toMatchObject({ ok: false })
    expect(!fora.ok && fora.erro).toContain('HTTP 401')

    expect((await mensagensDaConversa(conversa.id)).filter((m) => m.direcao === 'saida').map((m) => m.status)).toEqual(['registrada', 'falhou'])
    const trilha = await executar((tx) => listarAuditoria(tx, { acao: 'admin.cs.responder' }))
    expect(trilha.map((l) => l.detalhes.status).reverse()).toEqual(['registrada', 'falhou'])
    expect(trilha[0]).toMatchObject({ ator: ATENDENTE, entidadeId: String(conversa.id), usuariosAfetados: ['alex@testeaurea.com.br'] })
    expect(trilha[0].detalhes.falha).toContain('HTTP 401')

    expect((await responderConversa(executar, provedorFalso(), ATENDENTE, conversa.id, { tipo: 'midia', url: 'file:///foto.png', midiaTipo: 'image', legenda: '' })).ok).toBe(false)
    expect((await responderConversa(executar, provedorFalso(), ATENDENTE, 999, { tipo: 'texto', texto: 'x' })).ok).toBe(false)
  })

  it('notas, etiquetas, responsável e os filtros da caixa', async () => {
    await receberEventos(executar, provedorFalso(), [mensagem('M1'), mensagem('B1', { telefone: '+5521988887777', nomeDoContato: 'Bia' })], T)
    const conversas = (await carregarCaixa(executar, FILTRO_PADRAO)).conversas
    const alex = conversas.find((c) => c.contato.nome === 'Alex')!

    expect((await anotarConversa(executar, ATENDENTE, alex.id, 'Cliente quer retirar a moeda.')).ok).toBe(true)
    expect((await anotarConversa(executar, ATENDENTE, alex.id, '   ')).ok).toBe(false)
    expect((await abrirConversa(executar, alex.id, false))?.notas.map((n) => n.corpo)).toEqual(['Cliente quer retirar a moeda.'])

    expect(await criarEtiqueta(executar, ATENDENTE, 'Cobrança', 'ouro')).toMatchObject({ ok: true, dados: { slug: 'cobranca' } })
    expect((await criarEtiqueta(executar, ATENDENTE, 'COBRANÇA', 'verde')).ok).toBe(false)
    expect((await etiquetarConversa(executar, ATENDENTE, alex.id, 'cobranca', true)).ok).toBe(true)
    expect((await etiquetarConversa(executar, ATENDENTE, alex.id, 'inventada', true)).ok).toBe(false)
    expect((await carregarCaixa(executar, { ...FILTRO_PADRAO, etiqueta: 'cobranca' })).conversas.map((c) => c.id)).toEqual([alex.id])

    expect((await atribuirConversa(executar, ATENDENTE, alex.id, 'Ana@Aurea.com.br')).ok).toBe(true)
    expect((await carregarCaixa(executar, { ...FILTRO_PADRAO, responsavel: 'ana@aurea.com.br' })).conversas.map((c) => c.id)).toEqual([alex.id])
    expect((await carregarCaixa(executar, { ...FILTRO_PADRAO, responsavel: 'ninguem' })).conversas.map((c) => c.contato.nome)).toEqual(['Bia'])

    expect((await carregarCaixa(executar, { ...FILTRO_PADRAO, busca: '(21) 98888' })).conversas.map((c) => c.contato.nome)).toEqual(['Bia'])
    expect((await carregarCaixa(executar, { ...FILTRO_PADRAO, busca: 'ale' })).conversas.map((c) => c.contato.nome)).toEqual(['Alex'])
    expect((await carregarCaixa(executar, { ...FILTRO_PADRAO, busca: '100%' })).conversas).toEqual([])

    expect((await etiquetarConversa(executar, ATENDENTE, alex.id, 'cobranca', false)).ok).toBe(true)
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.'))).toEqual(['admin.cs.anotar', 'admin.cs.criar_etiqueta', 'admin.cs.etiquetar', 'admin.cs.atribuir', 'admin.cs.etiquetar'])
  })

  it('o atendente inicia conversa por telefone digitado e vincula o contato a outra conta', async () => {
    const r = await iniciarConversa(executar, criarRegistroLocal([]), ATENDENTE, { telefone: '(31) 97777-6666', nome: 'Pegge', texto: 'Oi, Pegge! Aqui é o atendimento.' })
    expect(r).toMatchObject({ ok: true, dados: { status: 'registrada' } })
    expect((await iniciarConversa(executar, criarRegistroLocal([]), ATENDENTE, { telefone: '9999', nome: '', texto: 'x' })).ok).toBe(false)

    const [conversa] = (await carregarCaixa(executar, FILTRO_PADRAO)).conversas
    expect(conversa.contato).toMatchObject({ telefone: '+5531977776666', nome: 'Pegge', userEmail: null })
    expect((await atualizarContato(executar, ATENDENTE, conversa.contato.id, { userEmail: 'ninguem@exemplo.com.br' })).ok).toBe(false)
    expect((await atualizarContato(executar, ATENDENTE, conversa.contato.id, { userEmail: 'Pegge@testeaurea.com.br' })).ok).toBe(true)
    expect((await carregarCaixa(executar, FILTRO_PADRAO)).conversas[0].contato.userEmail).toBe('pegge@testeaurea.com.br')
    const [linha] = await executar((tx) => listarAuditoria(tx, { acao: 'admin.cs.contato' }))
    expect(linha).toMatchObject({ usuariosAfetados: ['pegge@testeaurea.com.br'], detalhes: { conta: { de: null, para: 'pegge@testeaurea.com.br' } } })
  })
})

/** O Supabase Auth de mentira: guarda contas, senhas e bloqueios num mapa. */
function identidadeFalsa(): { porta: PortaDeIdentidade; contas: Map<string, { id: string; senha: string | null; bloqueada: boolean }>; links: string[] } {
  const contas = new Map<string, { id: string; senha: string | null; bloqueada: boolean }>()
  const links: string[] = []
  const porId = (id: string) => [...contas.values()].find((c) => c.id === id)
  const porta: PortaDeIdentidade = {
    configurada: true,
    faltando: [],
    buscar: async (email) => {
      const c = contas.get(email)
      return c ? { id: c.id, email, criadaEm: null, confirmadaEm: null, ultimoLogin: null, bloqueadaAte: c.bloqueada ? '2126-01-01T00:00:00Z' : null, provedores: ['email'] } : null
    },
    criar: async ({ email, senha }) => {
      if (senha === 'fraca') return { ok: false, erro: 'Password should be at least 6 characters.' }
      const id = `id-${contas.size + 1}`
      contas.set(email, { id, senha, bloqueada: false })
      return { ok: true, dados: { id } }
    },
    definirSenha: async (id, senha) => {
      const c = porId(id)
      if (c) c.senha = senha
      return { ok: true, dados: undefined }
    },
    bloquear: async (id, bloquear) => {
      const c = porId(id)
      if (c) c.bloqueada = bloquear
      return { ok: true, dados: undefined }
    },
    enviarLinkDeSenha: async (email) => {
      links.push(email)
      return { ok: true, dados: undefined }
    },
  }
  return { porta, contas, links }
}

describe('administração de usuários', () => {
  const DEMO = { saldo: 500_000, moedas: 6 }

  beforeEach(async () => {
    await banco.db.exec(`TRUNCATE aurea.admin_notas_usuario, aurea.admin_situacao_contas RESTART IDENTITY;`)
    await lerEstado(executar)
  })

  it('criar conta grava identidade, conta zerada, abertura no ledger e a linha do painel', async () => {
    const { porta, contas } = identidadeFalsa()
    const estado = portaDeEstadoNoBanco(executar, ATENDENTE)
    const r = await criarUsuario(estado, porta, ATENDENTE, { email: 'Nova@Exemplo.com.br', nome: 'Nova Conta', senha: 'provisoria1', demonstracao: true })
    expect(r).toMatchObject({ ok: true, dados: { email: 'nova@exemplo.com.br' } })
    expect(contas.get('nova@exemplo.com.br')?.senha).toBe('provisoria1')

    const lido = await lerEstado(executar)
    // Conta criada pelo painel nasce ZERADA desde 20/09/2026: a caixa "carregar
    // saldo e moedas de demonstração" saiu junto com o provisionamento mockado.
    expect(lido.users['nova@exemplo.com.br']).toMatchObject({ name: 'Nova Conta', balance: 0 })
    expect(lido.users['nova@exemplo.com.br'].coins).toHaveLength(0)
    expect((await executar((tx) => datasDeCriacao(tx)))['nova@exemplo.com.br']).toBeGreaterThan(0)

    const [linha] = await executar((tx) => listarAuditoria(tx, { acao: 'admin.usuarios.criar' }))
    expect(linha).toMatchObject({ ator: ATENDENTE, entidadeId: 'nova@exemplo.com.br', detalhes: { identidade: 'criada', senhaProvisoria: true } })
    expect(JSON.stringify(linha.detalhes)).not.toContain('provisoria1')

    expect((await criarUsuario(estado, porta, ATENDENTE, { email: 'nova@exemplo.com.br', nome: 'De novo', senha: '', demonstracao: false })).ok).toBe(false)
    const recusada = await criarUsuario(estado, porta, ATENDENTE, { email: 'fraca@exemplo.com.br', nome: 'Fraca', senha: 'fraca', demonstracao: false })
    expect(recusada).toMatchObject({ ok: false })
    expect((await lerEstado(executar)).users['fraca@exemplo.com.br']).toBeUndefined()
  })

  it('ajuste de saldo vira lançamento `ajuste` no ledger e a trilha guarda o motivo; débito além do saldo não grava', async () => {
    const estado = portaDeEstadoNoBanco(executar, ATENDENTE)
    const antes = (await lerEstado(executar)).users['alex@testeaurea.com.br'].balance
    expect(await ajustarSaldo(estado, ATENDENTE, 'alex@testeaurea.com.br', { valor: 12_345, sentido: 'credito', motivo: 'Estorno de tarifa cobrada em dobro' })).toMatchObject({ ok: true })
    expect((await lerEstado(executar)).users['alex@testeaurea.com.br'].balance).toBe(antes + 12_345)

    const livro = await executar((tx) => listarLancamentos(tx, { userEmail: 'alex@testeaurea.com.br' }))
    expect(livro[livro.length - 1]).toMatchObject({ tipo: 'ajuste', valor: 12_345, sinal: 1, saldoApos: antes + 12_345 })
    const [linha] = await executar((tx) => listarAuditoria(tx, { acao: 'admin.usuarios.ajustar_saldo' }))
    expect(linha.detalhes).toMatchObject({ delta: 12_345, saldoAntes: antes, motivo: 'Estorno de tarifa cobrada em dobro' })

    const demais = await ajustarSaldo(estado, ATENDENTE, 'alex@testeaurea.com.br', { valor: antes + 99_999_999, sentido: 'debito', motivo: 'Teste' })
    expect(demais).toEqual({ ok: false, erro: 'O débito deixaria o saldo negativo.' })
    expect(await executar((tx) => listarAuditoria(tx, { acao: 'admin.usuarios.ajustar_saldo' }))).toHaveLength(1)
  })

  it('se a linha do painel não grava, a mudança de estado também não — é a mesma transação', async () => {
    const estado = portaDeEstadoNoBanco(executar, ATENDENTE)
    const antes = (await lerEstado(executar)).users['rozane@testeaurea.com.br'].balance
    await expect(
      estado.mutarComTrilha(
        (s) => {
          s.users['rozane@testeaurea.com.br'].balance += 1_000
          return true
        },
        () => ({ ator: ATENDENTE, area: 'Fora Do Padrão', verbo: 'x' }),
      ),
    ).rejects.toThrow(/admin\.<area>\.<verbo>/)
    expect((await lerEstado(executar)).users['rozane@testeaurea.com.br'].balance).toBe(antes)
  })

  it('editar cadastro sobrevive à releitura, preserva os dados bancários e a trilha só tem os nomes dos campos', async () => {
    const estado = portaDeEstadoNoBanco(executar, ATENDENTE)
    await mutarEstado(executar, (s) => {
      s.users['goturuba@testeaurea.com.br'].cadastro = { ...structuredClone(CADASTRO_ALEX), nomeCompleto: 'Goturuba Antigo' }
    })
    const r = await editarCadastro(estado, ATENDENTE, 'goturuba@testeaurea.com.br', {
      nome: 'Goturuba',
      cpf: '111.111.111-11',
      nomeCompleto: 'Goturuba Novo',
      dataNascimento: '1985-01-02',
      telefone: '(11) 98888-1111',
      endereco: { logradouro: 'Rua B', numero: '2', bairro: 'Centro', cidade: 'São Paulo', uf: 'sp', cep: '01001-000' },
    })
    expect(r.ok && r.mensagem).toContain('o CPF não confere')
    const u = (await lerEstado(executar)).users['goturuba@testeaurea.com.br']
    expect(u.cadastro).toMatchObject({ cpf: '11111111111', nomeCompleto: 'Goturuba Novo', telefone: '11988881111', dadosBancarios: CADASTRO_ALEX.dadosBancarios })
    const [linha] = await executar((tx) => listarAuditoria(tx, { acao: 'admin.usuarios.editar_cadastro' }))
    expect(linha.detalhes.campos).toEqual(expect.arrayContaining(['cpf', 'nomeCompleto', 'telefone', 'dataNascimento', 'endereco']))
    expect(JSON.stringify(linha.detalhes)).not.toContain('11111111111')

    expect(await editarDadosBancarios(estado, ATENDENTE, 'goturuba@testeaurea.com.br', { banco: '341', agencia: '0001', conta: '12345-6', tipoConta: 'corrente' })).toMatchObject({ ok: true })
    const banco341 = (await lerEstado(executar)).users['goturuba@testeaurea.com.br'].cadastro?.dadosBancarios
    // A gravação guarda o Pix ausente como '' (src/server/db/diff.ts) — vazio, que é o que conta.
    expect(banco341).toMatchObject({ banco: '341', agencia: '0001', conta: '12345-6', tipoConta: 'corrente' })
    expect(banco341?.chavePix).toBeFalsy()
    const [bancaria] = await executar((tx) => listarAuditoria(tx, { acao: 'admin.usuarios.editar_dados_bancarios' }))
    // A ordem das chaves sai do jsonb, que reordena; o que importa é quais mudaram.
    expect([...(bancaria.detalhes.campos as string[])].sort()).toEqual(['agencia', 'banco', 'chavePix', 'conta', 'tipoChavePix', 'tipoConta'])
    expect((await editarDadosBancarios(estado, ATENDENTE, 'solares@testeaurea.com.br', { chavePix: 'x', tipoChavePix: 'email' })).ok).toBe(false)
  })

  it('inadimplência manual liga e desliga, e só grava quando muda', async () => {
    const estado = portaDeEstadoNoBanco(executar, ATENDENTE)
    expect((await marcarInadimplencia(estado, ATENDENTE, 'solares@testeaurea.com.br', true, 'Fatura de julho em aberto')).ok).toBe(true)
    expect((await lerEstado(executar)).users['solares@testeaurea.com.br'].inadimplente).toBe(true)
    expect(await marcarInadimplencia(estado, ATENDENTE, 'solares@testeaurea.com.br', true, '')).toEqual({ ok: true, mensagem: 'A conta já estava marcada como inadimplente.' })
    expect((await marcarInadimplencia(estado, ATENDENTE, 'solares@testeaurea.com.br', false, 'Pagou')).ok).toBe(true)
    expect((await lerEstado(executar)).users['solares@testeaurea.com.br'].inadimplente).toBeFalsy()
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.'))).toEqual(['admin.usuarios.marcar_inadimplente', 'admin.usuarios.desmarcar_inadimplente'])
  })

  it('desativar bloqueia o login no Supabase e registra; conta da equipe é recusada; reativar desbloqueia', async () => {
    const { porta, contas } = identidadeFalsa()
    const estado = portaDeEstadoNoBanco(executar, ATENDENTE)
    await criarUsuario(estado, porta, ATENDENTE, { email: 'sai@exemplo.com.br', nome: 'Sai', senha: 'provisoria1', demonstracao: false })

    const equipe = await mudarSituacaoDaConta(executar, estado, porta, ATENDENTE, { email: 'rogeriopena@testeaurea.com.br', ativa: false, motivo: '', ehDaEquipe: true })
    expect(equipe).toMatchObject({ ok: false })

    const r = await mudarSituacaoDaConta(executar, estado, porta, ATENDENTE, { email: 'sai@exemplo.com.br', ativa: false, motivo: 'Pedido do titular', ehDaEquipe: false })
    expect(r.ok && r.mensagem).toContain('bloqueado')
    expect(contas.get('sai@exemplo.com.br')?.bloqueada).toBe(true)
    expect(await executar((tx) => situacaoDaConta(tx, 'sai@exemplo.com.br'))).toMatchObject({ ativa: false, motivo: 'Pedido do titular', autor: ATENDENTE })
    expect(await executar((tx) => contasDesativadas(tx))).toEqual(new Set(['sai@exemplo.com.br']))

    await mudarSituacaoDaConta(executar, estado, porta, ATENDENTE, { email: 'sai@exemplo.com.br', ativa: true, motivo: 'Voltou', ehDaEquipe: false })
    expect(contas.get('sai@exemplo.com.br')?.bloqueada).toBe(false)
    expect(await executar((tx) => contasDesativadas(tx))).toEqual(new Set())
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.usuarios.') && a !== 'admin.usuarios.criar')).toEqual(['admin.usuarios.desativar', 'admin.usuarios.ativar'])
  })

  it('senha: catálogo recusado; provisória cria o login que faltava; link exige login existente; senha nunca na trilha', async () => {
    const { porta, contas, links } = identidadeFalsa()
    const estado = portaDeEstadoNoBanco(executar, ATENDENTE)
    const base = { redirecionarPara: 'https://aurea.exemplo/entrar/callback', ehDoCatalogo: false }

    const catalogo = await redefinirSenha(executar, estado, porta, ATENDENTE, { ...base, email: 'alex@testeaurea.com.br', modo: 'link', senha: '', ehDoCatalogo: true })
    expect(catalogo).toMatchObject({ ok: false })

    const semLogin = await redefinirSenha(executar, estado, porta, ATENDENTE, { ...base, email: 'pegge@testeaurea.com.br', modo: 'link', senha: '' })
    expect(semLogin).toMatchObject({ ok: false })
    const criado = await redefinirSenha(executar, estado, porta, ATENDENTE, { ...base, email: 'pegge@testeaurea.com.br', modo: 'provisoria', senha: 'segredo-provisorio' })
    expect(criado.ok && criado.mensagem).toContain('Login criado')
    expect(contas.get('pegge@testeaurea.com.br')?.senha).toBe('segredo-provisorio')

    expect((await redefinirSenha(executar, estado, porta, ATENDENTE, { ...base, email: 'pegge@testeaurea.com.br', modo: 'link', senha: '' })).ok).toBe(true)
    expect(links).toEqual(['pegge@testeaurea.com.br'])
    const trilha = await executar((tx) => listarAuditoria(tx, { acao: 'admin.usuarios.redefinir_senha' }))
    expect(trilha.map((l) => l.detalhes.modo).reverse()).toEqual(['identidade_criada', 'link'])
    expect(JSON.stringify(trilha)).not.toContain('segredo-provisorio')

    const semChave = await redefinirSenha(executar, estado, { ...porta, configurada: false, faltando: ['SUPABASE_SERVICE_ROLE_KEY'] }, ATENDENTE, { ...base, email: 'pegge@testeaurea.com.br', modo: 'link', senha: '' })
    expect(!semChave.ok && semChave.erro).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('notas do usuário: só inserção, mais recente primeiro, e cada uma na trilha', async () => {
    const estado = portaDeEstadoNoBanco(executar, ATENDENTE)
    expect((await anotarUsuario(executar, estado, ATENDENTE, 'alex@testeaurea.com.br', 'Ligou pedindo segunda via.')).ok).toBe(true)
    expect((await anotarUsuario(executar, estado, 'rogeriopena@testeaurea.com.br', 'alex@testeaurea.com.br', 'Resolvido por e-mail.')).ok).toBe(true)
    expect((await anotarUsuario(executar, estado, ATENDENTE, 'naoexiste@exemplo.com.br', 'x')).ok).toBe(false)
    const notas = await executar((tx) => listarNotasDoUsuario(tx, 'alex@testeaurea.com.br'))
    expect(notas.map((n) => [n.autor, n.corpo])).toEqual([
      ['rogeriopena@testeaurea.com.br', 'Resolvido por e-mail.'],
      [ATENDENTE, 'Ligou pedindo segunda via.'],
    ])
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.'))).toEqual(['admin.usuarios.anotar', 'admin.usuarios.anotar'])
  })

  it('aceites (A3), fila (A2) e recebimentos (B1): lista vazia com as tabelas, null sem elas', async () => {
    const email = 'alex@testeaurea.com.br'
    expect(await executar((tx) => aceitesDaConta(tx, email))).toEqual([])
    expect(await executar((tx) => historicoDaFilaDaConta(tx, email, 10))).toEqual([])
    expect(await executar((tx) => recebimentosDaConta(tx, email, 10))).toEqual([])

    const tabelas = ['aceites_documentos', 'ofertas_historico', 'recebimentos_gateway']
    const semElas = await semAsTabelas(tabelas, async (tx) => [
      await aceitesDaConta(tx, email),
      await historicoDaFilaDaConta(tx, email, 10),
      await recebimentosDaConta(tx, email, 10),
    ])
    expect(semElas).toEqual([null, null, null])
  })
})


/* ========================================================================== */
/* C3 — configuração do site, catálogo, caixas e bancada web                  */
/* ========================================================================== */

const GESTOR = 'gabriel.silva@aureacustodia.com.br'
// 1º/10/2026: um dia diferente da vigência da versão 1.0 (14/09/2026), para a data da Tabela mudar junto.
const AGORA_C3 = Date.UTC(2026, 9, 1, 18, 0, 0)

/** Publicação de mentira: guarda o que recebeu e, se pedido, falha. */
function publicacaoDeTeste(falhar = false): PortaDePublicacao & { chamadas: Array<{ chave: string; conteudo: string; ator: string }>; garantias: number } {
  const porta = {
    chamadas: [] as Array<{ chave: string; conteudo: string; ator: string }>,
    garantias: 0,
    garantirVersoesDoCodigo: async () => {
      porta.garantias += 1
    },
    publicar: async (chave: string, conteudo: string, ator: string) => {
      if (falhar) throw new Error('Storage fora do ar')
      porta.chamadas.push({ chave, conteudo, ator })
      return { versao: '1.1', hash: sha256Hex(conteudo) }
    },
  }
  return porta as PortaDePublicacao & typeof porta
}

/** A publicação com os repositórios de verdade da A3 — a mesma regra de versão de publicar.ts. */
function publicacaoNoBanco(): PortaDePublicacao {
  return {
    garantirVersoesDoCodigo: () => executar((tx) => garantirDocumentosVigentes(tx)),
    publicar: (chave, conteudo, ator) =>
      executar(async (tx) => {
        const atual = await buscarDocumentoVigente(tx, chave)
        const versao = atual ? (parseFloat(atual.versao) + 0.1).toFixed(1) : '1.0'
        const agora = Date.now()
        const reg = await inserirDocumentoLegal(tx, { chave, versao, vigenteDesde: agora, hashConteudo: sha256Hex(conteudo), conteudo, publicadoPor: ator, createdAt: agora })
        return { versao: reg.versao, hash: reg.hashConteudo }
      }),
  }
}

describe('configuração do site (C3)', () => {
  beforeEach(async () => {
    await banco.db.exec(`TRUNCATE aurea.config_plataforma, aurea.config_historico, aurea.tipos_moeda, aurea.caixas, aurea.documentos_legais RESTART IDENTITY;`)
  })

  it('mudar taxa grava valor, histórico e trilha juntos, e publica a Tabela de Taxas com o texto novo', async () => {
    const pub = publicacaoDeTeste()
    const r = await salvarGrupoDeConfiguracao(executar, pub, GESTOR, 'taxas', { comissaoCompradorBp: '1', taxaSaqueFixa: '7,50', comissaoVendedorBp: '0,5' }, AGORA_C3)
    expect(r).toMatchObject({ ok: true, dados: { documento: { chave: 'tabela_de_taxas', versao: '1.1' } } })
    if (r.ok) expect(r.mensagem).toContain('publicada na versão 1.1')

    const gravados = await executar((tx) => lerConfiguracao(tx))
    expect(Object.fromEntries(Object.entries(gravados).map(([k, g]) => [k, g.valor]))).toEqual({
      comissaoCompradorBp: 100,
      taxaSaqueFixa: 750,
      tabelaDeTaxasVigencia: dataDeBrasilia(AGORA_C3),
    })
    expect(gravados.comissaoCompradorBp.atualizadoPor).toBe(GESTOR)

    const historico = await executar((tx) => listarHistoricoConfig(tx, 10))
    expect(historico.map((h) => [h.chave, h.valorAntigo, h.valorNovo]).sort()).toEqual(
      [
        ['comissaoCompradorBp', 50, 100],
        ['taxaSaqueFixa', 500, 750],
        ['tabelaDeTaxasVigencia', '14/09/2026', dataDeBrasilia(AGORA_C3)],
      ].sort(),
    )
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.'))).toEqual(['admin.config.taxas', 'admin.config.publicar_documento'])

    // O texto publicado é o que a configuração gravada produz — e a garantia das versões do código veio antes.
    const vigentes = valoresVigentes({ comissaoCompradorBp: 100, taxaSaqueFixa: 750, tabelaDeTaxasVigencia: dataDeBrasilia(AGORA_C3) })
    const esperado = documentoTabelaDeTaxas(tabelaDeTaxasDe(vigentes), dataDeBrasilia(AGORA_C3))
    expect(pub.garantias).toBe(1)
    expect(pub.chamadas).toHaveLength(1)
    expect(sha256Hex(pub.chamadas[0].conteudo)).toBe(hashDoDocumento(esperado))
    expect(pub.chamadas[0].conteudo).toContain('1% sobre o valor da negociação + R$ 1,00 fixo por moeda comprada.')
  })

  it('nada mudou, valor inválido e grupo operacional: nenhuma publicação, e o inválido não grava nada', async () => {
    const pub = publicacaoDeTeste()
    expect(await salvarGrupoDeConfiguracao(executar, pub, GESTOR, 'taxas', { comissaoCompradorBp: '0,5' }, AGORA_C3)).toMatchObject({ ok: true, mensagem: 'Nada mudou.' })
    const invalido = await salvarGrupoDeConfiguracao(executar, pub, GESTOR, 'taxas', { comissaoCompradorBp: '0,5', taxaSaqueFixa: 'caro' }, AGORA_C3)
    expect(invalido.ok).toBe(false)
    expect(await salvarGrupoDeConfiguracao(executar, pub, GESTOR, 'operacional', { depositoMaxCents: '50000,00', prazoTransitoEnvioDias: '20' }, AGORA_C3)).toMatchObject({ ok: true, dados: { documento: null } })
    expect(pub.chamadas).toHaveLength(0)
    const gravados = await executar((tx) => lerConfiguracao(tx))
    expect(Object.keys(gravados).sort()).toEqual(['depositoMaxCents', 'prazoTransitoEnvioDias'])
    expect(await salvarGrupoDeConfiguracao(null, pub, GESTOR, 'taxas', {}, AGORA_C3)).toMatchObject({ ok: false })
  })

  it('publicação que falha não desfaz a taxa: o valor já vale, e a mensagem manda publicar a versão vigente', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const r = await salvarGrupoDeConfiguracao(executar, publicacaoDeTeste(true), GESTOR, 'taxas', { custodiaMensalPorMoeda: '2,50' }, AGORA_C3)
    erro.mockRestore()
    expect(r).toMatchObject({ ok: true, dados: { documento: { chave: 'tabela_de_taxas', versao: null } } })
    if (r.ok) expect(r.mensagem).toContain('Publicar a versão vigente')
    expect((await executar((tx) => lerConfiguracao(tx))).custodiaMensalPorMoeda.valor).toBe(250)
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.'))).toEqual(['admin.config.taxas'])

    const recuperada = await publicarDocumentoVigente(executar, publicacaoDeTeste(), GESTOR, 'tabela_de_taxas', AGORA_C3)
    expect(recuperada).toMatchObject({ ok: true, dados: { versao: '1.1' } })
  })

  it('com os repositórios da A3: a versão do código entra antes, e a primeira mudança nasce 1.1', async () => {
    const r = await salvarGrupoDeConfiguracao(executar, publicacaoNoBanco(), GESTOR, 'termos', { termosPrazoRecebimentoVenda: 'até 2 (duas) horas' }, AGORA_C3)
    expect(r).toMatchObject({ ok: true, dados: { documento: { chave: 'termos_de_uso', versao: '1.1' } } })
    const vigente = await executar((tx) => buscarDocumentoVigente(tx, 'termos_de_uso'))
    expect(vigente?.versao).toBe('1.1')
    expect(vigente?.conteudo).toContain('O prazo para o recebimento dos valores provenientes da Venda de Moeda Custodiada é de até 2 (duas) horas após a conclusão da venda.')
    expect(vigente?.publicadoPor).toBe(GESTOR)
  })
})

describe('catálogo de tipos de moeda (C3)', () => {
  beforeEach(async () => {
    await banco.db.exec(`TRUNCATE aurea.config_historico, aurea.tipos_moeda RESTART IDENTITY;`)
  })

  it('nasce semeado com COIN_TYPES, cria tipo novo, recusa nome repetido e edita com histórico e trilha', async () => {
    const criar = await salvarTipoDeMoeda(executar, GESTOR, { chave: 'Paralímpicos 2016', anoPadrao: '2016', tiragem: '20.000', categoria: 'Moedas Olímpicas', negociavel: false, detail: 'Rio 2016', ord: '15', ativo: true }, true, AGORA_C3)
    expect(criar.ok).toBe(true)
    const tipos = await executar((tx) => listarTiposMoeda(tx))
    expect(tipos).toHaveLength(11)
    expect(tipos.find((t) => t.chave === 'Paralímpicos 2016')).toMatchObject({ ord: 15, negociavel: false, criadoPor: GESTOR })

    expect((await salvarTipoDeMoeda(executar, GESTOR, { chave: 'paralímpicos 2016', anoPadrao: '2016', tiragem: '', categoria: 'X', negociavel: false, detail: '', ord: '1', ativo: true }, true)).ok).toBe(false)

    const editar = await salvarTipoDeMoeda(executar, GESTOR, { chave: 'Vôlei', anoPadrao: '2016', tiragem: '17.200', categoria: 'Moedas Olímpicas', negociavel: true, detail: 'Rio 2016 · Tiragem 17.200 · Bimetálica 27mm', ord: '50', ativo: true }, false, AGORA_C3)
    expect(editar).toMatchObject({ ok: true })
    if (editar.ok) expect(editar.mensagem).toContain('negociavel')
    expect((await executar((tx) => listarTiposMoeda(tx))).find((t) => t.chave === 'Vôlei')?.negociavel).toBe(true)
    expect(await salvarTipoDeMoeda(executar, GESTOR, { chave: 'Vôlei', anoPadrao: '2016', tiragem: '17.200', categoria: 'Moedas Olímpicas', negociavel: true, detail: 'Rio 2016 · Tiragem 17.200 · Bimetálica 27mm', ord: '50', ativo: true }, false)).toMatchObject({ ok: true, mensagem: 'Nada mudou.' })

    const historico = await executar((tx) => listarHistoricoConfig(tx, 10))
    expect(historico.map((h) => h.chave)).toEqual(['catalogo:Vôlei', 'catalogo:Paralímpicos 2016'])
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.'))).toEqual(['admin.config.catalogo', 'admin.config.catalogo'])
  })
})

describe('caixas do cofre (C3)', () => {
  beforeEach(async () => {
    await banco.db.exec(`TRUNCATE aurea.caixas;`)
  })

  it('cadastra, recusa o mesmo código escrito de outro jeito e edita sem trocar o código', async () => {
    expect((await salvarCaixa(executar, GESTOR, { codigo: 'EB-001', rotulo: 'Bandeira 1', local: 'Cofre A', capacidade: '40', ativa: true }, true, AGORA_C3)).ok).toBe(true)
    expect(await salvarCaixa(executar, GESTOR, { codigo: 'eb 001', rotulo: '', local: '', capacidade: '', ativa: true }, true)).toMatchObject({ ok: false, erro: 'A caixa EB-001 já está cadastrada.' })
    expect((await salvarCaixa(executar, GESTOR, { codigo: 'eb 001', rotulo: 'Bandeira 1', local: 'Cofre B', capacidade: '', ativa: false }, false, AGORA_C3)).ok).toBe(true)
    expect(await executar((tx) => listarCaixas(tx))).toEqual([{ codigo: 'EB-001', rotulo: 'Bandeira 1', local: 'Cofre B', capacidade: null, ativa: false, criadoEm: AGORA_C3 }])
    expect((await acoesNaTrilha()).filter((a) => a.startsWith('admin.'))).toEqual(['admin.bancada.caixa', 'admin.bancada.caixa'])
    expect(await salvarCaixa(null, GESTOR, { codigo: 'X', rotulo: '', local: '', capacidade: '', ativa: true }, true)).toMatchObject({ ok: false })
  })
})

describe('bancada web (C3) — o serviço da estação é chamado, não reimplementado', () => {
  function portaDeTeste(state: AppState): PortaDaBancada & { fechamentos: unknown[]; linhas: unknown[] } {
    const porta = {
      fechamentos: [] as unknown[],
      linhas: [] as unknown[],
      abrir: async () => ({ ok: true as const }),
      fechar: async (e: { protocolo: string; operador: string; moedas: unknown[] }) => {
        porta.fechamentos.push(e)
        return { ok: true as const, dados: { protocolo: e.protocolo, aprovadas: 1, recusadas: 0, analises: [{ protocolo: 'RO-ANL-0002', codigoMoeda: 'RO-000010', hash: 'h' }] } }
      },
      estado: async () => state,
      retiradas: async () => [],
      caixas: async () => [{ codigo: 'EB-001', rotulo: '', local: '', capacidade: null, ativa: true, criadoEm: 1 }],
      auditar: async (linha: unknown) => {
        porta.linhas.push(linha)
      },
    }
    return porta as unknown as PortaDaBancada & typeof porta
  }

  function estadoComEnvio(): AppState {
    const s = estadoDeTeste({ 'a@x.com': usuarioDeTeste('A', 0, [moedaDeTeste('RO-000001', BAN)]) })
    s.envios = [{ protocolo: 'RO-ENV-0002', userEmail: 'a@x.com', tipoMoeda: BAN, ano: 2012, quantidade: 1, codigoRastreio: null, dataPostagem: null, dataRecebimento: 1, etapaAtual: 'Em análise física', createdAt: 1, codigosAtivosGerados: [] }]
    s.analises = [
      encadearAnalise(
        { protocolo: 'RO-ANL-0001', protocoloEnvio: 'RO-ENV-0001', codigoMoeda: 'RO-000001', codigoRecibo: 'REC-000001', tipoMoeda: BAN, ano: 2012, pesoMg: 7000, veredito: 'aprovada', motivoRecusa: null, operador: 'op', aprovador: 'op', caixa: 'EB-001', posicao: 7, validadoEm: 1, caminhoVideo: null },
        GENESIS,
      ),
    ]
    return s
  }

  it('valida antes de chamar: peso fora da faixa e posição já ocupada não chegam ao serviço', async () => {
    const porta = portaDeTeste(estadoComEnvio())
    const pesoErrado = await fecharPelaBancadaWeb(porta, GESTOR, { protocolo: 'RO-ENV-0002', moedas: [{ veredito: 'aprovada', gramas: '7000', caixa: '', posicao: '', motivoRecusa: '' }], caminhoVideo: null })
    expect(pesoErrado.ok).toBe(false)
    const ocupada = await fecharPelaBancadaWeb(porta, GESTOR, { protocolo: 'RO-ENV-0002', moedas: [{ veredito: 'aprovada', gramas: '7', caixa: 'eb 001', posicao: '7', motivoRecusa: '' }], caminhoVideo: null })
    expect(ocupada).toEqual({ ok: false, erro: 'Moeda 1: a posição 7 da caixa EB-001 já está ocupada pela moeda RO-000001.' })
    expect(porta.fechamentos).toHaveLength(0)
    expect((await fecharPelaBancadaWeb(porta, GESTOR, { protocolo: 'RO-ENV-9999', moedas: [], caminhoVideo: null })).ok).toBe(false)
  })

  it('fecha com o membro como operador, o código de caixa cadastrado e a linha admin.bancada.analisar', async () => {
    const porta = portaDeTeste(estadoComEnvio())
    const r = await fecharPelaBancadaWeb(porta, GESTOR, { protocolo: 'RO-ENV-0002', moedas: [{ veredito: 'aprovada', gramas: '7,02', caixa: 'eb 001', posicao: '8', motivoRecusa: '' }], caminhoVideo: 'RO-ENV-0002/RO-ENV-0002-1.webm' })
    expect(r).toMatchObject({ ok: true, mensagem: 'Pronto. 1 aprovada(s), 0 recusada(s). Recibos emitidos.' })
    expect(porta.fechamentos).toEqual([
      { protocolo: 'RO-ENV-0002', operador: GESTOR, moedas: [{ pesoMg: 7020, veredito: 'aprovada', motivoRecusa: null, caixa: 'EB-001', posicao: 8, caminhoVideo: 'RO-ENV-0002/RO-ENV-0002-1.webm' }] },
    ])
    expect(porta.linhas).toEqual([
      expect.objectContaining({ ator: GESTOR, area: 'bancada', verbo: 'analisar', entidadeId: 'RO-ENV-0002', usuariosAfetados: ['a@x.com'], detalhes: expect.objectContaining({ origem: 'bancada_web', aprovadas: 1 }) }),
    ])
    expect(await abrirPelaBancadaWeb(porta, GESTOR, 'RO-ENV-0002')).toMatchObject({ ok: true })
    expect(porta.linhas).toHaveLength(2)
  })
})
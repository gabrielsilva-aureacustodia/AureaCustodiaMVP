/**
 * A configuração do site pelo painel, do lado do servidor (frente C, C3 — plano do Admin, 3.2 e 3.3).
 *
 * TODA GRAVAÇÃO DEIXA TRÊS RASTROS, NA MESMA TRANSAÇÃO: o valor vigente em `config_plataforma`, a
 * linha append-only em `config_historico` (quem, quando, de quanto para quanto) e
 * `admin.config.<grupo>` em `audit_log`. Ou os três commitam, ou nenhum.
 *
 * TAXA E PRAZO DOS TERMOS SÃO CONTRATO. Depois do commit, a mudança de taxa publica versão nova da
 * Tabela de Taxas, e a de prazo publica versão nova dos Termos — pela função da A3,
 * `publicarVersaoDocumento()` (src/server/documentos/publicar.ts), como a tabela 6 do plano de
 * finalizações pede. A publicação abre a própria transação: se ela falhar, a taxa já vale e a tela
 * mostra "publicar a versão vigente" para completar, em vez de desfazer uma mudança que já está
 * cobrando.
 *
 * O texto publicado é montado pela configuração (src/domain/admin/documentos.ts), com as frases da
 * versão 1.0. Antes da primeira publicação, as versões do código são garantidas no banco — sem isso
 * a primeira versão nova nasceria "1.0" e colidiria com a do código.
 *
 * Por portas: os testes trocam a publicação por um dublê e rodam o resto contra o PGlite.
 */

import {
  camposDoTipoAlterados,
  linhasIniciaisDoCatalogo,
  validarTipoMoeda,
  type EntradaTipoMoeda,
} from '@/domain/admin/catalogo'
import {
  dataDeBrasilia,
  definicaoDe,
  prepararMudancas,
  tabelaDeTaxasDe,
  termosDe,
  valoresVigentes,
  type GrupoConfig,
  type MudancaConfig,
} from '@/domain/admin/configuracao'
import { documentoTabelaDeTaxas, documentoTermosDeUso } from '@/domain/admin/documentos'
import { textoCanonico } from '@/domain/documentos-legais/canonico'
import type { ChaveDocumento } from '@/domain/documentos-legais/types'
import {
  atualizarTipoMoeda,
  buscarTipoMoeda,
  garantirTiposMoeda,
  gravarConfiguracao,
  inserirHistoricoConfig,
  inserirTipoMoeda,
  lerConfiguracao,
  listarTiposMoeda,
} from '@/server/db/repositories/config'
import { tabelaExiste } from '@/server/db/repositories/painel-leituras'
import type { Consulta, Executor } from '@/server/db/sql'

import { registrarAcaoAdmin } from './auditar'
import type { ResultadoAdmin } from './contabil'

export const SEM_BANCO_CONFIG = 'Sem banco configurado (POSTGRES_URL): a configuração é gravada em aurea.config_plataforma. Sem banco, vale o padrão do código.'
export const SEM_TABELA_CONFIG = 'O banco ainda não tem as tabelas de configuração (migration 024). Rode npm run db:migrate.'

export interface PortaDePublicacao {
  /** Garante as versões do código em `documentos_legais` antes da primeira versão nova. */
  garantirVersoesDoCodigo(): Promise<void>
  publicar(chave: ChaveDocumento, conteudo: string, ator: string): Promise<{ versao: string; hash: string }>
}

/** O documento que cada grupo publica quando muda. */
const DOCUMENTO_DO_GRUPO: Partial<Record<GrupoConfig, ChaveDocumento>> = { taxas: 'tabela_de_taxas', termos: 'termos_de_uso' }

const NOME_DO_DOCUMENTO: Record<ChaveDocumento, string> = {
  termos_de_uso: 'Termos de Uso',
  politica_privacidade: 'Política de Privacidade',
  tabela_de_taxas: 'Tabela de Taxas',
  clausula_arbitragem: 'Cláusula de Arbitragem',
}

async function exigirTabela(tx: Consulta): Promise<boolean> {
  return tabelaExiste(tx, 'config_plataforma')
}

function brutos(gravados: Record<string, { valor: unknown }>): Record<string, unknown> {
  const s: Record<string, unknown> = {}
  for (const [k, g] of Object.entries(gravados)) s[k] = g.valor
  return s
}

/** O texto canônico da versão nova, montado pelos valores já gravados. */
export function conteudoDoDocumento(chave: ChaveDocumento, gravados: Readonly<Record<string, unknown>>): string {
  const v = valoresVigentes(gravados)
  if (chave === 'tabela_de_taxas') return textoCanonico(documentoTabelaDeTaxas(tabelaDeTaxasDe(v), String(v.tabelaDeTaxasVigencia)))
  if (chave === 'termos_de_uso') return textoCanonico(documentoTermosDeUso(termosDe(v)))
  throw new Error(`O painel não publica ${chave}.`)
}

async function publicarDepoisDoCommit(
  executar: Executor,
  publicacao: PortaDePublicacao,
  ator: string,
  chave: ChaveDocumento,
  agora: number,
): Promise<{ ok: true; versao: string } | { ok: false; erro: string }> {
  try {
    const gravados = await executar((tx) => lerConfiguracao(tx), { somenteLeitura: true })
    await publicacao.garantirVersoesDoCodigo()
    const r = await publicacao.publicar(chave, conteudoDoDocumento(chave, brutos(gravados)), ator)
    await executar((tx) => registrarAcaoAdmin(tx, { ator, area: 'config', verbo: 'publicar_documento', entidade: 'documento', entidadeId: chave, detalhes: { versao: r.versao, hash: r.hash }, agora }))
    return { ok: true, versao: r.versao }
  } catch (err) {
    console.error(`[admin] a configuração foi gravada, mas a publicação de ${chave} falhou:`, err)
    return { ok: false, erro: err instanceof Error ? err.message : 'falha desconhecida' }
  }
}

export interface ResumoGravacao {
  mudancas: MudancaConfig[]
  documento: { chave: ChaveDocumento; versao: string | null } | null
}

/**
 * Salva um grupo da configuração. `entrada` é o formulário do grupo, com os valores digitados.
 */
export async function salvarGrupoDeConfiguracao(
  executar: Executor | null,
  publicacao: PortaDePublicacao,
  ator: string,
  grupo: GrupoConfig,
  entrada: Readonly<Record<string, unknown>>,
  agora: number = Date.now(),
): Promise<ResultadoAdmin<ResumoGravacao>> {
  if (!executar) return { ok: false, erro: SEM_BANCO_CONFIG }

  const gravacao = await executar(async (tx): Promise<{ ok: false; erro: string } | { ok: true; mudancas: MudancaConfig[] }> => {
    if (!(await exigirTabela(tx))) return { ok: false, erro: SEM_TABELA_CONFIG }
    const gravados = brutos(await lerConfiguracao(tx))
    const preparo = prepararMudancas(grupo, entrada ?? {}, gravados)
    if (!preparo.ok) return { ok: false, erro: preparo.erros.join(' ') }
    if (preparo.mudancas.length === 0) return { ok: true, mudancas: [] }

    const todas = [...preparo.mudancas]
    // A data que a Tabela de Taxas declara é a do dia da mudança. É dado de sistema, mas entra no
    // histórico como os outros: é ela que explica por que o hash da tabela mudou.
    if (grupo === 'taxas') {
      const def = definicaoDe('tabelaDeTaxasVigencia')
      const hoje = dataDeBrasilia(agora)
      const antes = valoresVigentes(gravados).tabelaDeTaxasVigencia
      if (def && antes !== hoje) todas.push({ chave: def.chave, rotulo: def.rotulo, antes, depois: hoje, eraPadrao: !(def.chave in gravados) })
    }

    for (const m of todas) {
      const def = definicaoDe(m.chave)
      if (!def) continue
      await gravarConfiguracao(tx, { chave: m.chave, valor: m.depois, tipo: def.tipo, rotulo: def.rotulo, descricao: def.descricao, agora, ator })
      await inserirHistoricoConfig(tx, { chave: m.chave, valorAntigo: m.antes, valorNovo: m.depois, ator, agora })
    }
    await registrarAcaoAdmin(tx, {
      ator,
      area: 'config',
      verbo: grupo,
      entidade: 'configuracao',
      entidadeId: grupo,
      detalhes: { mudancas: todas.map((m) => ({ chave: m.chave, antes: m.antes, depois: m.depois, eraPadrao: m.eraPadrao })) },
      agora,
    })
    return { ok: true, mudancas: preparo.mudancas }
  })

  if (!gravacao.ok) return gravacao
  if (gravacao.mudancas.length === 0) return { ok: true, mensagem: 'Nada mudou.', dados: { mudancas: [], documento: null } }

  const lista = gravacao.mudancas.map((m) => m.rotulo.toLowerCase()).join(', ')
  const chaveDoc = DOCUMENTO_DO_GRUPO[grupo]
  if (!chaveDoc) return { ok: true, mensagem: `Salvo: ${lista}.`, dados: { mudancas: gravacao.mudancas, documento: null } }

  const pub = await publicarDepoisDoCommit(executar, publicacao, ator, chaveDoc, agora)
  const nome = NOME_DO_DOCUMENTO[chaveDoc]
  if (!pub.ok) {
    return {
      ok: true,
      mensagem: `Salvo: ${lista}. Já vale para as próximas operações, mas a versão nova da ${nome} não foi publicada agora (${pub.erro}). Use “Publicar a versão vigente”.`,
      dados: { mudancas: gravacao.mudancas, documento: { chave: chaveDoc, versao: null } },
    }
  }
  return {
    ok: true,
    mensagem: `Salvo: ${lista}. ${nome} publicada na versão ${pub.versao}.`,
    dados: { mudancas: gravacao.mudancas, documento: { chave: chaveDoc, versao: pub.versao } },
  }
}

/** "Publicar a versão vigente": completa uma publicação que falhou depois de a configuração ser gravada. */
export async function publicarDocumentoVigente(
  executar: Executor | null,
  publicacao: PortaDePublicacao,
  ator: string,
  chave: string,
  agora: number = Date.now(),
): Promise<ResultadoAdmin<{ versao: string }>> {
  if (!executar) return { ok: false, erro: SEM_BANCO_CONFIG }
  if (chave !== 'tabela_de_taxas' && chave !== 'termos_de_uso') return { ok: false, erro: 'O painel só publica a Tabela de Taxas e os Termos de Uso.' }
  if (!(await executar((tx) => exigirTabela(tx), { somenteLeitura: true }))) return { ok: false, erro: SEM_TABELA_CONFIG }
  const pub = await publicarDepoisDoCommit(executar, publicacao, ator, chave, agora)
  if (!pub.ok) return { ok: false, erro: `A publicação falhou: ${pub.erro}` }
  return { ok: true, mensagem: `${NOME_DO_DOCUMENTO[chave]} publicada na versão ${pub.versao}.`, dados: { versao: pub.versao } }
}

/* ---------- catálogo de moedas ---------- */

/** Semeia `tipos_moeda` com `COIN_TYPES` quando ela está vazia — "nasce semeada na primeira leitura". */
export async function garantirCatalogoNoBanco(executar: Executor | null, agora: number = Date.now()): Promise<void> {
  if (!executar) return
  await executar(async (tx) => {
    if (await tabelaExiste(tx, 'tipos_moeda')) await garantirTiposMoeda(tx, linhasIniciaisDoCatalogo(), agora)
  })
}

export async function salvarTipoDeMoeda(
  executar: Executor | null,
  ator: string,
  entrada: EntradaTipoMoeda,
  criando: boolean,
  agora: number = Date.now(),
): Promise<ResultadoAdmin> {
  if (!executar) return { ok: false, erro: SEM_BANCO_CONFIG }
  return executar(async (tx) => {
    if (!(await tabelaExiste(tx, 'tipos_moeda'))) return { ok: false, erro: SEM_TABELA_CONFIG }
    await garantirTiposMoeda(tx, linhasIniciaisDoCatalogo(), agora)
    const existentes = await listarTiposMoeda(tx)
    const v = validarTipoMoeda(entrada, existentes, criando)
    if (!v.ok) return v

    if (criando) {
      await inserirTipoMoeda(tx, v.tipo, ator, agora)
      await inserirHistoricoConfig(tx, { chave: `catalogo:${v.tipo.chave}`, valorAntigo: null, valorNovo: v.tipo, ator, agora })
      await registrarAcaoAdmin(tx, { ator, area: 'config', verbo: 'catalogo', entidade: 'tipo_moeda', entidadeId: v.tipo.chave, detalhes: { criado: v.tipo }, agora })
      return { ok: true, mensagem: `Tipo "${v.tipo.chave}" criado${v.tipo.negociavel ? ' e negociável no mercado' : ''}.` }
    }

    const antesGravado = await buscarTipoMoeda(tx, v.tipo.chave)
    if (!antesGravado) return { ok: false, erro: `O tipo "${v.tipo.chave}" não está no catálogo.` }
    const antes = { chave: antesGravado.chave, anoPadrao: antesGravado.anoPadrao, tiragem: antesGravado.tiragem, categoria: antesGravado.categoria, negociavel: antesGravado.negociavel, detail: antesGravado.detail, ord: antesGravado.ord, ativo: antesGravado.ativo }
    const campos = camposDoTipoAlterados(antes, v.tipo)
    if (campos.length === 0) return { ok: true, mensagem: 'Nada mudou.' }
    await atualizarTipoMoeda(tx, v.tipo)
    await inserirHistoricoConfig(tx, { chave: `catalogo:${v.tipo.chave}`, valorAntigo: antes, valorNovo: v.tipo, ator, agora })
    await registrarAcaoAdmin(tx, { ator, area: 'config', verbo: 'catalogo', entidade: 'tipo_moeda', entidadeId: v.tipo.chave, detalhes: { campos, antes, depois: v.tipo }, agora })
    return { ok: true, mensagem: `Tipo "${v.tipo.chave}" atualizado: ${campos.join(', ')}.` }
  })
}

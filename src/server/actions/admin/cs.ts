'use server'

/**
 * Server Actions da tela de CS — a caixa de conversas do WhatsApp (plano do Admin, seção 2.5).
 *
 * A REGRA DESTA PASTA: toda ação confere a permissão POR CONTA PRÓPRIA, antes de qualquer
 * outra coisa. Ler a caixa pede `cs.ver`; responder, anotar, etiquetar, atribuir e mudar a
 * situação pedem `cs.responder`; conferir a conexão do WhatsApp pede `cs.canais`.
 *
 * O provedor é escolhido pelo ambiente a cada chamada (`provedorDoAmbiente`): sem as variáveis
 * da Evolution, a resposta fica registrada no painel e a tela diz que ela não chegou ao
 * cliente. A escrita e a linha `admin.cs.<verbo>` ficam em src/server/admin/cs.ts.
 */

import { lerFiltroConversas, type FiltroConversas } from '@/domain/admin/cs'
import type { ChavePermissao } from '@/domain/admin/permissoes'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { carregarAtendimento, type DadosAtendimento } from '@/server/admin/atendimento'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import type { ResultadoAdmin } from '@/server/admin/contabil'
import {
  anotarConversa,
  atribuirConversa,
  atualizarContato,
  criarEtiqueta,
  etiquetarConversa,
  iniciarConversa,
  mudarStatusConversa,
  responderConversa,
} from '@/server/admin/cs'
import { TABELA_AUSENTE, ehTabelaAusente, provedorDoAmbiente } from '@/server/admin/portas'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

const SEM_BANCO = 'Sem banco configurado (POSTGRES_URL): o atendimento guarda as conversas no banco.'
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

function paraAction<T>(r: ResultadoAdmin<T>): ActionResult<T> {
  return r.ok ? { ok: true, message: r.mensagem, data: r.dados } : { ok: false, error: r.erro }
}

/** Permissão, depois banco, depois a ação — nessa ordem, sempre. */
async function comPermissaoEBanco<T>(chave: ChavePermissao, acao: (ator: string) => Promise<ResultadoAdmin<T>>): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  if (!bancoConfigurado()) return { ok: false, error: SEM_BANCO }
  try {
    return paraAction(await acao(acesso.membro.email))
  } catch (err) {
    if (ehTabelaAusente(err)) return { ok: false, error: TABELA_AUSENTE }
    console.error(`[admin] falha na ação de CS que pede ${chave}:`, err)
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

function inteiro(v: unknown): number {
  return typeof v === 'number' && Number.isSafeInteger(v) ? v : Number.NaN
}

/**
 * A volta do polling de 5 segundos: caixa, conversa aberta e, quando pedido, o cartão do
 * cliente. Leitura — não grava trilha; zerar as não lidas da conversa aberta é consequência de
 * o atendente estar olhando para ela, não um gesto.
 */
export async function atualizarAtendimentoNoPainel(
  filtro: Partial<FiltroConversas>,
  conversaId: number | null,
  incluirCliente: boolean,
): Promise<ActionResult<DadosAtendimento>> {
  const acesso = await permissaoParaAcao('cs.ver')
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  const f = filtro ?? {}
  const limpo = lerFiltroConversas({
    status: typeof f.status === 'string' ? f.status : undefined,
    responsavel: typeof f.responsavel === 'string' ? f.responsavel : undefined,
    etiqueta: typeof f.etiqueta === 'string' ? f.etiqueta : undefined,
    busca: typeof f.busca === 'string' ? f.busca : undefined,
    naolidas: f.soNaoLidas === true ? '1' : undefined,
  })
  const id = inteiro(conversaId)
  try {
    const dados = await carregarAtendimento(limpo, Number.isNaN(id) || id <= 0 ? null : id, { marcarLida: true, incluirCliente: incluirCliente === true })
    return { ok: true, data: dados }
  } catch (err) {
    console.error('[admin] falha ao atualizar a caixa de CS:', err)
    return { ok: false, error: 'Não foi possível atualizar a caixa de conversas.' }
  }
}

export async function responderNoPainel(conversaId: number, texto: string): Promise<ActionResult> {
  return comPermissaoEBanco('cs.responder', async (ator) => {
    const r = await responderConversa(executarNoBanco, provedorDoAmbiente(), ator, inteiro(conversaId), { tipo: 'texto', texto })
    return r.ok ? { ok: true, mensagem: r.mensagem } : r
  })
}

export async function enviarMidiaNoPainel(conversaId: number, url: string, midiaTipo: string, legenda: string): Promise<ActionResult> {
  return comPermissaoEBanco('cs.responder', async (ator) => {
    const r = await responderConversa(executarNoBanco, provedorDoAmbiente(), ator, inteiro(conversaId), { tipo: 'midia', url, midiaTipo, legenda })
    return r.ok ? { ok: true, mensagem: r.mensagem } : r
  })
}

export async function iniciarConversaNoPainel(telefone: string, nome: string, texto: string): Promise<ActionResult<{ conversaId: number }>> {
  return comPermissaoEBanco('cs.responder', async (ator) => {
    const r = await iniciarConversa(executarNoBanco, provedorDoAmbiente(), ator, { telefone, nome, texto })
    return r.ok ? { ok: true, mensagem: r.mensagem, dados: { conversaId: r.dados?.conversaId ?? 0 } } : r
  })
}

export async function anotarConversaNoPainel(conversaId: number, corpo: string): Promise<ActionResult> {
  return comPermissaoEBanco('cs.responder', (ator) => anotarConversa(executarNoBanco, ator, inteiro(conversaId), corpo))
}

export async function mudarSituacaoDaConversaNoPainel(conversaId: number, status: string): Promise<ActionResult> {
  return comPermissaoEBanco('cs.responder', (ator) => mudarStatusConversa(executarNoBanco, ator, inteiro(conversaId), status))
}

export async function atribuirConversaNoPainel(conversaId: number, responsavel: string | null): Promise<ActionResult> {
  return comPermissaoEBanco('cs.responder', (ator) => atribuirConversa(executarNoBanco, ator, inteiro(conversaId), responsavel))
}

export async function criarEtiquetaNoPainel(rotulo: string, cor: string): Promise<ActionResult<{ slug: string }>> {
  return comPermissaoEBanco('cs.responder', (ator) => criarEtiqueta(executarNoBanco, ator, rotulo, cor))
}

export async function etiquetarConversaNoPainel(conversaId: number, slug: string, marcar: boolean): Promise<ActionResult> {
  return comPermissaoEBanco('cs.responder', (ator) => etiquetarConversa(executarNoBanco, ator, inteiro(conversaId), slug, marcar === true))
}

export async function atualizarContatoNoPainel(contatoId: number, alteracoes: { nome?: string; userEmail?: string | null }): Promise<ActionResult> {
  const a = alteracoes ?? {}
  return comPermissaoEBanco('cs.responder', (ator) =>
    atualizarContato(executarNoBanco, ator, inteiro(contatoId), {
      ...(a.nome !== undefined ? { nome: a.nome } : {}),
      ...(a.userEmail !== undefined ? { userEmail: a.userEmail } : {}),
    }),
  )
}

/**
 * "O WhatsApp está conectado?" — pergunta ao provedor, na hora. Fica na trilha como gesto de
 * quem configura canais, com a resposta.
 */
export async function conferirCanalNoPainel(): Promise<ActionResult> {
  const acesso = await permissaoParaAcao('cs.canais')
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  const provedor = provedorDoAmbiente()
  const estado = provedor.estadoDaConexao
    ? await provedor.estadoDaConexao()
    : { conectado: false, descricao: `Nenhum provedor de WhatsApp configurado. Falta: ${provedor.pendencias.join(', ')}.` }
  if (bancoConfigurado()) {
    try {
      await executarNoBanco((tx) =>
        registrarAcaoAdmin(tx, {
          ator: acesso.membro.email,
          area: 'cs',
          verbo: 'conferir_canal',
          entidade: 'canal',
          entidadeId: `${provedor.nome}:${provedor.identificador}`,
          detalhes: { conectado: estado.conectado, descricao: estado.descricao },
        }),
      )
    } catch (err) {
      console.error('[admin] falha ao registrar a conferência do canal:', err)
    }
  }
  return estado.conectado ? { ok: true, message: estado.descricao } : { ok: false, error: estado.descricao }
}

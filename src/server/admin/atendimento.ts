/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Monta a tela de CS: a caixa de conversas, a conversa aberta e o cartão do
 * cliente. Lê o banco, o estado e o ambiente do provedor de WhatsApp. Não
 * importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import type { FiltroConversas } from '@/domain/admin/cs'
import { emailsDeBootstrap } from '@/domain/admin/permissoes'
import { resumirConta, type ResumoConta } from '@/domain/admin/usuarios'
import { provedorDoAmbiente } from '@/lib/mensageria'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { tabelaExiste } from '@/server/db/repositories/painel-leituras'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

import { ambienteAtual } from './acesso'
import { abrirConversa, carregarCaixa, type Caixa, type ConversaAberta } from './cs'
import { carregarEquipe } from './rbac'

export interface CanalNaTela {
  provedor: string
  identificador: string
  entregaDeVerdade: boolean
  pendencias: readonly string[]
}

export interface DadosAtendimento {
  semBanco: boolean
  /** O banco existe mas as migrations 022 e 023 ainda não rodaram. */
  semTabelas: boolean
  canal: CanalNaTela
  caixa: Caixa | null
  aberta: ConversaAberta | null
  cliente: ResumoConta | null
}

export function canalDoAmbiente(): CanalNaTela {
  const p = provedorDoAmbiente()
  return { provedor: p.nome, identificador: p.identificador, entregaDeVerdade: p.entregaDeVerdade, pendencias: p.pendencias }
}

/** O cartão do cliente ao lado da conversa, quando o contato casa com uma conta. */
export async function clienteDaConversa(email: string | null, agora: number = Date.now()): Promise<ResumoConta | null> {
  if (!email) return null
  const [state, retiradas] = await Promise.all([
    getState(),
    repositorioRetiradas()
      .buscarPorUsuario(email)
      .catch(() => []),
  ])
  return resumirConta(state, email, retiradas, agora)
}

/**
 * Tudo o que a tela precisa de uma vez. `incluirCliente` existe por causa do polling de 5
 * segundos: caixa e conversa são consultas curtas no banco, mas o cartão do cliente lê o
 * AppState inteiro — a tela pede o cartão ao abrir uma conversa e de tempos em tempos, não a
 * cada volta.
 */
export async function carregarAtendimento(
  filtro: FiltroConversas,
  conversaId: number | null,
  opcoes: { marcarLida: boolean; incluirCliente: boolean },
): Promise<DadosAtendimento> {
  const canal = canalDoAmbiente()
  if (!bancoConfigurado()) return { semBanco: true, semTabelas: false, canal, caixa: null, aberta: null, cliente: null }
  if (!(await executarNoBanco((tx) => tabelaExiste(tx, 'cs_conversas'), { somenteLeitura: true }))) {
    return { semBanco: false, semTabelas: true, canal, caixa: null, aberta: null, cliente: null }
  }
  // A conversa primeiro: abrir zera as não lidas dela, e a caixa lida depois já conta certo.
  const aberta = conversaId ? await abrirConversa(executarNoBanco, conversaId, opcoes.marcarLida) : null
  const caixa = await carregarCaixa(executarNoBanco, filtro)
  const cliente = opcoes.incluirCliente && aberta ? await clienteDaConversa(aberta.conversa.contato.userEmail) : null
  return { semBanco: false, semTabelas: false, canal, caixa, aberta, cliente }
}

/** Quem pode ser responsável por uma conversa: membros ativos do painel e a lista do ambiente. */
export async function equipeParaAtribuir(): Promise<Array<{ email: string; nome: string }>> {
  const amb = ambienteAtual()
  const doAmbiente = emailsDeBootstrap(amb.listaDoAmbiente, amb.contasDoSeed).map((email) => ({ email, nome: amb.contasDoSeed[email]?.name ?? '' }))
  if (!bancoConfigurado()) return doAmbiente
  try {
    const equipe = await carregarEquipe(executarNoBanco, amb)
    const ativos = equipe.membros.filter((m) => m.status === 'ativo').map((m) => ({ email: m.email, nome: m.nomeExibicao }))
    // Quem está na tabela é decidido por ela — inclusive o e-mail do ambiente que foi desativado.
    const naTabela = new Set(equipe.membros.map((m) => m.email))
    return [...ativos, ...doAmbiente.filter((m) => !naTabela.has(m.email))].sort((a, b) => a.email.localeCompare(b.email))
  } catch (err) {
    console.error('[admin] equipe indisponível para atribuir conversa:', err)
    return doAmbiente
  }
}

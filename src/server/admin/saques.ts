/**
 * A fila de saques do painel — leitura (14/10/2026).
 *
 * Só lê. Quem pode ver é decidido por quem chama (`saques.ver`), e quem pode agir é decidido de novo
 * por cada Server Action (`saques.pagar`). Devolve o que a tela precisa já resolvido — nome do cliente,
 * se o prazo D+3 estourou e se o envio automático está ligado — para o componente não precisar de nada
 * do servidor.
 */

import { filaDeSaques, resumirFila, saqueEmAberto, type ResumoDaFila } from '@/domain/saques'
import type { Saque } from '@/domain/types'
import { configuracaoDePayouts } from '@/lib/payments/payouts'
import { getState } from '@/server/state'

export interface LinhaDeSaque {
  saque: Saque
  nome: string
  atrasado: boolean
}

export interface DadosDaFilaDeSaques {
  /** Em aberto, do mais antigo para o mais novo. */
  fila: LinhaDeSaque[]
  /** Os já resolvidos (pagos ou recusados), do mais recente — só quando pedido. */
  historico: LinhaDeSaque[]
  resumo: ResumoDaFila
  envio: { ativo: boolean; modo: 'sandbox' | 'producao'; faltando: string[] }
}

export interface OpcoesDaFila {
  /** Restringe a uma conta (ficha do usuário). */
  userEmail?: string
  /** Quantos resolvidos mostrar. 0 = nenhum. */
  historico?: number
}

export async function carregarFilaDeSaques(opcoes: OpcoesDaFila = {}, agora: number = Date.now()): Promise<DadosDaFilaDeSaques> {
  const state = await getState()
  const todos = (state.saques ?? []).filter((s) => !opcoes.userEmail || s.userEmail === opcoes.userEmail)
  const linha = (s: Saque): LinhaDeSaque => ({
    saque: s,
    nome: state.users[s.userEmail]?.name ?? s.userEmail,
    atrasado: saqueEmAberto(s) && s.previsaoPagamentoEm < agora,
  })
  const cfg = configuracaoDePayouts()
  return {
    fila: filaDeSaques(todos).map(linha),
    historico: todos
      .filter((s) => !saqueEmAberto(s))
      .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
      .slice(0, opcoes.historico ?? 0)
      .map(linha),
    resumo: resumirFila(todos, agora),
    envio: { ativo: cfg.ativo, modo: cfg.modo, faltando: cfg.faltando },
  }
}

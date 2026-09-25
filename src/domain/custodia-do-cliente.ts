/**
 * O retrato da custódia de UMA conta, do jeito que o dono precisa ver.
 *
 * POR QUE ISTO É REGRA DE DOMÍNIO E NÃO CONTA FEITA NA TELA
 * ---------------------------------------------------------
 * Até 25/09/2026 as informações de custódia do cliente existiam, mas espalhadas:
 * o aviso de débito somava faturas em aberto por um critério, a aba de Faturas
 * listava por outro, e nenhuma das duas respondia as três perguntas que o
 * Gabriel apontou como faltando — quanto eu pago por mês, quando vence o
 * próximo, e o que eu já paguei até aqui.
 *
 * Três telas passaram a fazer essas contas (Recibos, Minha conta e a página de
 * detalhes). Repetir a soma em três lugares é como os cartões de plano
 * divergiram entre si em 21/09 — um com selo, outro sem, na mesma tela. Então a
 * conta é uma só, aqui, pura e testável.
 *
 * O PREÇO MENSAL É O DO ACERVO, NÃO O DO PLANO
 * --------------------------------------------
 * A mensalidade estimada multiplica o número de moedas guardadas pela tarifa
 * vigente, e não a soma dos planos contratados. É o número certo porque a
 * cobrança funciona assim: moeda sem plano paga o ciclo mensal pela mesma
 * tarifa. Quem olhasse só os planos veria R$ 2,00 tendo 11 moedas guardadas.
 */

import { competenciaAtual } from '@/domain/custody'
import { CUSTODIA_MENSAL_POR_MOEDA_CENTS } from '@/domain/fees'
import { somarMeses } from '@/domain/plano-custodia'
import type {
  AppState,
  Cents,
  FaturaCustodia,
  PlanoCustodia,
  Timestamp,
  UserEmail,
} from '@/domain/types'

export interface ResumoDaCustodia {
  /** Moedas sob guarda com recibo vivo — as que pagam custódia. */
  moedasGuardadas: number
  /** Tarifa por moeda, por mês, da Tabela de Taxas vigente. */
  porMoedaCents: Cents
  /** O que a conta paga por mês pelo acervo de hoje. */
  mensalidadeCents: Cents
  /** Competência que a conta está pagando agora ('AAAA-MM'). */
  competencia: string
  /** A competência da próxima cobrança. */
  proximaCompetencia: string
  /** Faturas ainda não pagas nem canceladas, da mais antiga para a mais nova. */
  emAberto: FaturaCustodia[]
  /** Soma das faturas em aberto. */
  emAbertoCents: Cents
  /** Vencimento mais próximo entre as faturas em aberto; `null` quando não há nenhuma. */
  proximoVencimento: Timestamp | null
  /** Há fatura vencida — é o que bloqueia venda e retirada. */
  vencida: boolean
  /** Faturas pagas, da mais recente para a mais antiga. É o extrato. */
  pagas: FaturaCustodia[]
  /** Tudo o que a conta já pagou de custódia. */
  totalPagoCents: Cents
  /** Planos que ainda cobram: vigentes e os que esperam o primeiro pagamento. */
  planosAtivos: PlanoCustodia[]
  /** Planos cancelados ou encerrados — ficam no histórico, não somem. */
  planosEncerrados: PlanoCustodia[]
}

function faturasDaConta(state: AppState, email: UserEmail): FaturaCustodia[] {
  return (state.faturasCustodia ?? []).filter((f) => f.userEmail === email)
}

export function resumoDaCustodia(
  state: AppState,
  email: UserEmail,
  porMoedaCents: Cents = CUSTODIA_MENSAL_POR_MOEDA_CENTS,
  agora: Timestamp = Date.now(),
): ResumoDaCustodia {
  const user = state.users[email]
  const moedasGuardadas = (user?.coins ?? []).filter((c) => c.recibo?.status !== 'Extinto').length

  const faturas = faturasDaConta(state, email)
  const emAberto = faturas
    .filter((f) => f.status !== 'paga' && f.status !== 'cancelada')
    .sort((a, b) => a.dataVencimento - b.dataVencimento)
  const pagas = faturas
    .filter((f) => f.status === 'paga')
    .sort((a, b) => (b.dataPagamento ?? b.dataEmissao) - (a.dataPagamento ?? a.dataEmissao))

  const planos = (state.planosCustodia ?? []).filter((p) => p.userEmail === email)
  const competencia = competenciaAtual(agora)

  return {
    moedasGuardadas,
    porMoedaCents,
    mensalidadeCents: moedasGuardadas * porMoedaCents,
    competencia,
    proximaCompetencia: somarMeses(competencia, 1),
    emAberto,
    emAbertoCents: emAberto.reduce((soma, f) => soma + f.valorCents, 0),
    proximoVencimento: emAberto.length > 0 ? emAberto[0]!.dataVencimento : null,
    // Status 'atrasada' OU vencimento no passado: o status só vira 'atrasada'
    // quando alguma rotina passa pela fatura, e entre a virada do prazo e essa
    // passagem a tela mostraria "em dia" uma fatura que já bloqueia a venda.
    vencida: emAberto.some((f) => f.status === 'atrasada' || f.dataVencimento < agora),
    pagas,
    totalPagoCents: pagas.reduce((soma, f) => soma + f.valorCents, 0),
    planosAtivos: planos
      .filter((p) => p.status === 'vigente' || p.status === 'aguardando_pagamento')
      .sort((a, b) => b.criadoEm - a.criadoEm),
    planosEncerrados: planos
      .filter((p) => p.status === 'cancelado' || p.status === 'encerrado')
      .sort((a, b) => b.criadoEm - a.criadoEm),
  }
}

/**
 * O rótulo humano da origem da fatura, para o extrato.
 *
 * O cliente não tem por que saber o que é 'ciclo_mensal' — e a diferença entre
 * as origens é justamente o que responde "por que fui cobrado isto aqui?".
 */
export function rotuloDaOrigem(origem: FaturaCustodia['origem']): string {
  switch (origem) {
    case 'contratacao':
      return 'Contratação do plano'
    case 'renovacao_anual':
      return 'Renovação do plano'
    case 'entrada_no_acervo':
      return 'Entrada de moeda na custódia'
    default:
      return 'Mensalidade de custódia'
  }
}

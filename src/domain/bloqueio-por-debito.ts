/**
 * Regras puras de bloqueio de operações por pendência de custódia.
 *
 * DOIS NÍVEIS, E SÓ DOIS (03/11/2026)
 * -----------------------------------
 *  - A MOEDA: negocia ou não pela regra única de src/domain/custodia-da-moeda.ts
 *    (`custodiaImpedeNegociar`). Este arquivo só a aplica — ao livro de ofertas e à lista do aviso.
 *    Até 03/11 havia aqui seis funções por moeda, cada uma com o seu critério ("fatura vencida",
 *    "cobrança registrada", "paga até a competência", "cobertura paga"...), e cada ponto de venda
 *    perguntava a sua. Saíram todas.
 *  - A CONTA: a conta com fatura vencida há mais de um dia (`faturaBloqueia`) tem os anúncios pausados
 *    no casamento e não retira moeda (RA-53). Fatura em aberto dentro do prazo não é dívida.
 *
 * Armadilhas que continuam valendo:
 * 1. `isInadimplente` (custody.ts) é recalculado por quem lê; a coluna `user.inadimplente` é só a marca
 *    manual do painel, e a pendência da conta é a composição `user.inadimplente || isInadimplente(...)`.
 * 2. Ofertas de vendedor com pendência ficam FORA da rodada de casamento sem ser canceladas, preservando a
 *    prioridade original para quando a dívida for quitada.
 */

import type { AppState, FaturaCustodia, MatchResult, SellOffer, Timestamp, User, UserEmail } from '@/domain/types'
import type { TabelaDeTaxas } from '@/domain/fees'
import { custodiaImpedeNegociar } from '@/domain/custodia-da-moeda'
import { isInadimplente } from '@/domain/custody'
import { expurgarOfertasSemCadastro, matchOrders } from '@/domain/market'

export const MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA =
  'Esta conta tem fatura de custódia vencida. Enquanto ela estiver em aberto, os recibos ficam bloqueados para venda e retirada. Pague em Minha conta › Faturas de custódia para liberar na hora.'

export const MENSAGEM_ANUNCIO_PAUSADO =
  'Este anúncio está pausado no momento e não pode ser comprado.'

export const MENSAGEM_CUSTODIA_NAO_PAGA =
  'A custódia desta moeda não foi paga.'

/**
 * Verifica se um usuário possui pendência de custódia no momento avaliado.
 * Considera marca manual ou existência de fatura atrasada/vencida.
 */
export function contaComPendenciaDeCustodia(
  user: User,
  faturasDaConta: readonly FaturaCustodia[],
  agora: Timestamp,
): boolean {
  return Boolean(user.inadimplente) || isInadimplente(user, [...faturasDaConta], agora)
}

/**
 * Avalia pendência de uma conta pelo e-mail a partir do estado da aplicação.
 * Se a conta não existir no estado, retorna false.
 */
export function contaComPendenciaNoEstado(
  state: AppState,
  email: UserEmail,
  agora: Timestamp,
): boolean {
  const user = state.users[email]
  if (!user) return false

  const faturas = (state.faturasCustodia ?? []).filter((f) => f.userEmail === email)
  return contaComPendenciaDeCustodia(user, faturas, agora)
}

/**
 * As moedas da conta que a custódia IMPEDE de negociar agora — a lista por trás do aviso "pague a
 * custódia para vender". A pergunta é a da regra única (`custodiaImpedeNegociar`).
 *
 * Só moeda ativa: recibo extinto (retirada física) já não é guarda nossa. Ordem estável pelo código,
 * para a tela não embaralhar entre leituras.
 */
export function moedasComCustodiaBloqueada(
  state: AppState,
  email: UserEmail,
  agora: Timestamp = Date.now(),
): string[] {
  const moedas = state.users[email]?.coins ?? []
  return moedas
    .filter((c) => c.recibo?.status !== 'Extinto' && custodiaImpedeNegociar(state, c.id, agora))
    .map((c) => c.id)
    .sort()
}

/**
 * Remove do livro de ofertas todas as ofertas cujas moedas a custódia impede de negociar (AG8).
 * Garante que ofertas publicadas antes de a cobertura acabar saiam do livro.
 */
export function expurgarOfertasSemCustodia(state: AppState, agora: Timestamp = Date.now()): SellOffer[] {
  if (!state.sellOffers.length) return state.sellOffers
  state.sellOffers = state.sellOffers.filter((o) => !custodiaImpedeNegociar(state, o.coinId, agora))
  return state.sellOffers
}

/**
 * Retorna os e-mails dos vendedores que possuem ofertas de venda abertas
 * e se encontram com pendência de custódia.
 */
export function vendedoresComPendencia(state: AppState, agora: Timestamp): Set<UserEmail> {
  const vendedores = new Set<UserEmail>()
  for (const offer of state.sellOffers) {
    if (!vendedores.has(offer.seller)) {
      if (contaComPendenciaNoEstado(state, offer.seller, agora)) {
        vendedores.add(offer.seller)
      }
    }
  }
  return vendedores
}

/**
 * Executa o casamento de ordens pausando temporariamente as ofertas de vendedores
 * que possuem pendência e estão no conjunto de contas bloqueáveis (não isentas).
 *
 * Ofertas de moedas que a custódia impede de negociar saem do livro definitivamente (AG8).
 *
 * As ofertas pausadas não participam da rodada de execução, mas retornam ao livro
 * preservando exatamente seus objetos e prioridades originais.
 */
export function casarOrdensRespeitandoPendencia(
  state: AppState,
  taxas: TabelaDeTaxas,
  agora: Timestamp,
  bloqueaveis: ReadonlySet<UserEmail>,
): MatchResult {
  // NINGUÉM SEM CADASTRO COMPLETO NEGOCIA (28/09/2026, decisão do Gabriel).
  // Ver o cabeçalho de `expurgarOfertasSemCadastro` em src/domain/market.ts.
  expurgarOfertasSemCadastro(state)

  // Expurgar do livro qualquer oferta de moeda cuja custódia impede negociar (AG8)
  expurgarOfertasSemCustodia(state, agora)

  if (bloqueaveis.size === 0 || !state.sellOffers.length) {
    return matchOrders(state, taxas)
  }

  const pausados = new Set<UserEmail>()
  for (const offer of state.sellOffers) {
    if (bloqueaveis.has(offer.seller) && contaComPendenciaNoEstado(state, offer.seller, agora)) {
      pausados.add(offer.seller)
    }
  }

  if (pausados.size === 0) {
    return matchOrders(state, taxas)
  }

  const ofertasPausadas: SellOffer[] = []
  const ofertasElegiveis: SellOffer[] = []

  for (const offer of state.sellOffers) {
    if (pausados.has(offer.seller)) {
      ofertasPausadas.push(offer)
    } else {
      ofertasElegiveis.push(offer)
    }
  }

  state.sellOffers = ofertasElegiveis
  const resultado = matchOrders(state, taxas)
  state.sellOffers.push(...ofertasPausadas)

  return resultado
}

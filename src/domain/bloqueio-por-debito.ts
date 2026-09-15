/**
 * Regras puras de bloqueio de operações por pendência de custódia.
 *
 * Evita as seguintes armadilhas mapeadas na pendência B-2:
 * 1. Derivação em tempo real: a inadimplência não é estática nem depende apenas
 *    do ciclo mensal; faturas vencidas bloqueiam na hora em que vencem e liberam
 *    imediatamente quando quitadas.
 * 2. Preservação de `isInadimplente`: a função nativa de `custody.ts` é mantida
 *    intocada porque cinco rotinas do sistema recalculam `u.inadimplente = isInadimplente(...)`
 *    ao liquidar faturas; alterar a função interna impediria o desligamento da marca.
 *    Esta regra faz a composição lógica por fora: `user.inadimplente || isInadimplente(...)`.
 * 3. Casamento justo com ofertas pausadas: vendedores com pendência têm seus anúncios
 *    temporariamente resguardados fora da rodada de casamento sem que sejam cancelados,
 *    preservando sua ordem cronológica e prioridade original para quando a dívida for quitada.
 */

import type {
  AppState,
  FaturaCustodia,
  MatchResult,
  SellOffer,
  Timestamp,
  User,
  UserEmail,
} from '@/domain/types'
import type { TabelaDeTaxas } from '@/domain/fees'
import { isInadimplente } from '@/domain/custody'
import { matchOrders } from '@/domain/market'

export const MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA =
  'Esta conta tem fatura de custódia vencida. Enquanto ela estiver em aberto, os recibos ficam bloqueados para venda e retirada. Pague em Minha conta › Faturas de custódia para liberar na hora.'

export const MENSAGEM_ANUNCIO_PAUSADO =
  'Este anúncio está pausado no momento e não pode ser comprado.'

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
 * As ofertas pausadas não participam da rodada de execução, mas retornam ao livro
 * preservando exatamente seus objetos e prioridades originais.
 */
export function casarOrdensRespeitandoPendencia(
  state: AppState,
  taxas: TabelaDeTaxas,
  agora: Timestamp,
  bloqueaveis: ReadonlySet<UserEmail>,
): MatchResult {
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

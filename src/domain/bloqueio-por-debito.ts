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
  PlanoCustodia,
  SellOffer,
  Timestamp,
  User,
  UserEmail,
} from '@/domain/types'
import type { TabelaDeTaxas } from '@/domain/fees'
import { competenciaAtual, isInadimplente } from '@/domain/custody'
import { matchOrders } from '@/domain/market'

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
 * Retorna as faturas em aberto (pendentes ou atrasadas) do usuário que cobrem uma moeda específica.
 *
 * Uma fatura de outro usuário (ex.: dono anterior) nunca é considerada:
 * a dívida relevante é sempre a do dono atual sobre a moeda.
 */
export function faturasAbertasDaMoeda(
  faturas: readonly FaturaCustodia[],
  planos: readonly PlanoCustodia[] | undefined,
  email: UserEmail,
  coinId: string,
): FaturaCustodia[] {
  return faturas.filter((f) => {
    if (f.userEmail !== email) return false
    if (f.status === 'paga' || f.status === 'cancelada') return false
    if (f.moedaIds && f.moedaIds.includes(coinId)) return true
    if (f.planoId && planos) {
      const plano = planos.find((p) => p.id === f.planoId)
      if (plano && plano.moedaIds && plano.moedaIds.includes(coinId)) return true
    }
    return false
  })
}

/**
 * Até que competência a custódia DESTA moeda está paga — ou `null` se nunca foi.
 *
 * A resposta vem de duas fontes, e vale a mais adiantada delas:
 *
 *  - plano vigente que cobre a moeda, por `pagoAteCompetencia`;
 *  - fatura PAGA que lista a moeda, pela competência dela.
 *
 * NÃO FILTRA POR DONO, e isso é deliberado. Quando uma moeda é vendida no meio
 * do mês, a custódia daquele mês já foi paga — pelo vendedor. Cobrar o
 * comprador de novo pelo mesmo mês seria cobrar duas vezes pela mesma guarda.
 * Do mês seguinte em diante o ciclo cobra o dono novo, que é o certo.
 */
export function custodiaPagaAteCompetencia(
  state: AppState,
  coinId: string,
): string | null {
  let maisAdiantada: string | null = null

  for (const p of state.planosCustodia ?? []) {
    if (p.status !== 'vigente') continue
    if (!p.moedaIds?.includes(coinId)) continue
    if (p.pagoAteCompetencia && (!maisAdiantada || p.pagoAteCompetencia > maisAdiantada)) {
      maisAdiantada = p.pagoAteCompetencia
    }
  }

  for (const f of state.faturasCustodia ?? []) {
    if (f.status !== 'paga') continue
    if (!f.moedaIds?.includes(coinId)) continue
    if (!maisAdiantada || f.competencia > maisAdiantada) maisAdiantada = f.competencia
  }

  return maisAdiantada
}

/**
 * Verifica se a custódia de uma moeda específica não foi paga pelo usuário informado.
 * Vale mesmo antes do vencimento: se a fatura estiver pendente ou atrasada, a guarda não foi quitada.
 */
export function moedaComCustodiaNaoPaga(
  faturas: readonly FaturaCustodia[],
  planos: readonly PlanoCustodia[] | undefined,
  email: UserEmail,
  coinId: string,
): boolean {
  return faturasAbertasDaMoeda(faturas, planos, email, coinId).length > 0
}

/**
 * Retorna o conjunto de IDs de moedas do usuário que possuem custódia em aberto (não paga).
 */
export function moedasComCustodiaNaoPagaDoUsuario(
  faturas: readonly FaturaCustodia[],
  planos: readonly PlanoCustodia[] | undefined,
  email: UserEmail,
): Set<string> {
  const ids = new Set<string>()
  for (const f of faturas) {
    if (f.userEmail !== email || f.status === 'paga' || f.status === 'cancelada') continue
    for (const id of f.moedaIds ?? []) {
      ids.add(id)
    }
    if (f.planoId && planos) {
      const plano = planos.find((p) => p.id === f.planoId)
      if (plano?.moedaIds) {
        for (const id of plano.moedaIds) {
          ids.add(id)
        }
      }
    }
  }
  return ids
}

/**
 * A moeda tem custódia em aberto? É esta que a venda consulta.
 *
 * A PERGUNTA MUDOU EM 23/09/2026, E ERA O BURACO DA TRAVA.
 * -------------------------------------------------------
 * Antes ela perguntava "existe fatura EM ABERTO para esta moeda?". Moeda que
 * nunca foi cobrada não tem fatura nenhuma, então a resposta era "sem dívida"
 * e a venda passava — e toda moeda recém-cadastrada fica exatamente assim até
 * o ciclo mensal rodar. Foi como onze moedas sem cobrança nenhuma chegaram ao
 * livro de ofertas.
 *
 * Agora pergunta "a custódia desta moeda está paga ATÉ o mês corrente?".
 * Ausência de prova de pagamento passou a significar dívida, que é a leitura
 * certa de "nunca vender moeda própria que enviou sem pagar a custódia antes".
 *
 * O efeito colateral bom: não depende mais de o ciclo de faturamento ter
 * rodado. Moeda cadastrada hoje já nasce bloqueada para venda, e destrava no
 * instante em que a custódia dela é paga.
 */
export function moedaComCustodiaNaoPagaNoEstado(
  state: AppState,
  email: UserEmail,
  coinId: string,
): boolean {
  return moedaComCustodiaNaoPaga(state.faturasCustodia ?? [], state.planosCustodia, email, coinId)
}

/**
 * A custódia desta moeda está COMPROVADAMENTE paga até o mês corrente?
 *
 * É a pergunta que a PUBLICAÇÃO de venda faz, e ela é mais dura do que a de
 * cima de propósito.
 *
 * `moedaComCustodiaNaoPagaNoEstado` pergunta "existe dívida conhecida?" —
 * serve para tirar do livro uma oferta cuja fatura venceu, e é uma pergunta
 * sobre um fato registrado. Mas moeda que NUNCA foi cobrada não tem fatura
 * nenhuma, então ela respondia "sem dívida" e liberava a venda. Foi assim que
 * onze moedas sem cobrança alguma chegaram ao livro de ofertas em 23/09/2026.
 *
 * Aqui a pergunta é invertida: sem prova de pagamento, a moeda não sai. É a
 * leitura certa de "nunca vender moeda própria que enviou sem pagar a custódia
 * antes" — e não depende de o ciclo mensal ter rodado, o que era a condição
 * silenciosa de que a trava antiga dependia.
 *
 * A assimetria entre as duas é deliberada: publicar é o dono afirmando que a
 * moeda está em ordem, e aí se exige comprovação; já retirar do livro uma
 * oferta existente age sobre dívida registrada, sem invalidar o livro inteiro
 * por ausência de registro.
 */
export function custodiaNaoComprovadaNoEstado(
  state: AppState,
  coinId: string,
  agora: Timestamp = Date.now(),
): boolean {
  const pagaAte = custodiaPagaAteCompetencia(state, coinId)
  if (!pagaAte) return true
  return pagaAte < competenciaAtual(agora)
}

/**
 * Remove do livro de ofertas todas as ofertas cujas moedas estejam com custódia não quitada (AG8).
 * Garante que ofertas publicadas antes da geração do débito saiam do livro imediatamente.
 */
export function expurgarOfertasSemCustodia(state: AppState): SellOffer[] {
  if (!state.sellOffers.length) return state.sellOffers
  state.sellOffers = state.sellOffers.filter(
    (o) => !moedaComCustodiaNaoPagaNoEstado(state, o.seller, o.coinId),
  )
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
 * Ofertas de moedas com custódia não paga saem do livro definitivamente (AG8).
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
  // Expurgar do livro qualquer oferta de moeda cuja custódia não foi paga (AG8)
  expurgarOfertasSemCustodia(state)

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


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
import { faturaBloqueia, isInadimplente } from '@/domain/custody'
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
  agora: Timestamp = Date.now(),
): FaturaCustodia[] {
  return faturas.filter((f) => {
    if (f.userEmail !== email) return false
    // SÓ FATURA QUE JÁ BLOQUEIA (27/09/2026). Antes bastava estar em aberto, e
    // como esta lista alimenta o expurgo de ofertas e o filtro do motor, a
    // fatura emitida hoje derrubava o anúncio da moeda hoje — sem o cliente ter
    // tido um dia sequer para pagar. Conta a partir de um dia depois de vencer.
    if (!faturaBloqueia(f, agora)) return false
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
  agora: Timestamp = Date.now(),
): boolean {
  return faturasAbertasDaMoeda(faturas, planos, email, coinId, agora).length > 0
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
  agora: Timestamp = Date.now(),
): boolean {
  return moedaComCustodiaNaoPaga(
    state.faturasCustodia ?? [],
    state.planosCustodia,
    email,
    coinId,
    agora,
  )
}

/**
 * A moeda está impedida de ser ANUNCIADA por causa da custódia?
 *
 * Duas perguntas, e as duas precisam ser "não" para a moeda ir ao livro:
 *
 *  1. Existe fatura de custódia dela vencida há mais de um dia?
 *  2. A moeda tem alguma cobrança registrada — fatura ou plano?
 *
 * POR QUE A SEGUNDA, QUE PARECE REDUNDANTE (23/09/2026)
 * -----------------------------------------------------
 * Moeda que NUNCA foi cobrada não tem fatura nenhuma, então a primeira
 * pergunta responde "sem dívida" e a venda passava. Foi assim que onze moedas
 * sem cobrança alguma chegaram ao livro de ofertas. A segunda fecha esse
 * buraco: sem rastro de custódia, a moeda não sai.
 *
 * POR QUE ELA DEIXOU DE EXIGIR PAGAMENTO EM DIA (27/09/2026)
 * ----------------------------------------------------------
 * Entre 23/09 e hoje esta função perguntava "a custódia está PAGA até o mês
 * corrente?", e ausência de pagamento valia como dívida. Somada à cobrança na
 * entrada da moeda, isso travou negociação de gente que não devia nada: a
 * fatura nascia junto com a moeda, dentro do prazo, e a moeda já nascia
 * impedida de ser anunciada.
 *
 * A regra do Gabriel é a que vale: trava só um dia depois de a data passar.
 * Fatura em aberto dentro do prazo é conta a vencer, não dívida — e a moeda
 * dela negocia normalmente.
 */
export function custodiaNaoComprovadaNoEstado(
  state: AppState,
  coinId: string,
  agora: Timestamp = Date.now(),
): boolean {
  const cobrada = temCobrancaRegistrada(state, coinId)
  if (!cobrada) return true

  return (state.faturasCustodia ?? []).some(
    (f) => (f.moedaIds ?? []).includes(coinId) && faturaBloqueia(f, agora),
  )
}

/**
 * A moeda tem alguma cobrança de custódia registrada — paga, em aberto ou
 * coberta por plano? É o rastro que prova que a guarda dela entrou no sistema.
 */
export function temCobrancaRegistrada(state: AppState, coinId: string): boolean {
  if (custodiaPagaAteCompetencia(state, coinId)) return true

  const emFatura = (state.faturasCustodia ?? []).some(
    (f) => f.status !== 'cancelada' && (f.moedaIds ?? []).includes(coinId),
  )
  if (emFatura) return true

  return (state.planosCustodia ?? []).some(
    (p) => p.status !== 'cancelado' && (p.moedaIds ?? []).includes(coinId),
  )
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
  // NINGUÉM SEM CADASTRO COMPLETO NEGOCIA (28/09/2026, decisão do Gabriel).
  // Ver o cabeçalho de `expurgarOfertasSemCadastro` em src/domain/market.ts.
  expurgarOfertasSemCadastro(state)

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


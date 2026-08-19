/**
 * Motor de mercado da Áurea Custódia: casamento de ordens (bid x ask), lotes
 * e as cotações derivadas das negociações.
 *
 * PORT FIEL do MVP monolítico (aurea-mvp-teste.html, linhas 922-931, 952-1010
 * e 1833-1842). Lá dentro tudo lia a global `state`; aqui o estado entra por
 * parâmetro. O que NÃO mudou — e não pode mudar — é a aritmética, a ordem das
 * comparações e os critérios de desempate: o motor executa uma unidade por
 * volta e a ordem de execução define quem compra de quem e por quanto.
 */

import type { AppState, Cents, Coin, Lot, MatchResult, Trade, User } from '@/domain/types'
import { isNegociavel } from '@/domain/constants'
import { DAY_MS, fdate } from '@/domain/dates'
import { tradeFee } from '@/domain/fees'
import { brl } from '@/domain/money'

/* ---------- indicadores derivados das negociações ---------- */

/**
 * Preço médio dos últimos 7 dias DO TIPO PEDIDO — média PONDERADA pela
 * quantidade, não a média simples dos preços: uma negociação de 5 moedas pesa 5
 * vezes mais que uma de 1. O `|| 1` protege registros antigos que nasceram sem
 * `qty`.
 *
 * O recorte por tipo passou a ser obrigatório quando o mercado deixou de ter um
 * ativo só. Sem ele, uma Direitos Humanos de R$ 450 e uma Bandeira de R$ 285
 * entrariam na mesma média, e o número exibido não descreveria mercado nenhum.
 */
export function avg7(state: AppState, tipo: string): Cents | null {
  const cut = Date.now() - 7 * DAY_MS
  const t = state.trades.filter((x) => x.date >= cut && x.tipoMoeda === tipo)
  if (!t.length) return null
  const totalQty = t.reduce((s, x) => s + (x.qty || 1), 0)
  const totalVal = t.reduce((s, x) => s + x.price * (x.qty || 1), 0)
  return Math.round(totalVal / totalQty)
}

/**
 * Última negociação registrada. É o último item do array, não o de maior
 * `date`: o histórico é sempre gravado em ordem cronológica de execução.
 *
 * `tipo` omitido devolve a última negociação DA PLATAFORMA, de qualquer ativo —
 * é o que o painel inicial mostra, e ali a mistura é proposital: o cartão
 * anuncia o próprio tipo negociado ao lado do preço.
 */
export function lastTrade(state: AppState, tipo?: string): Trade | null {
  const lista = tipo ? state.trades.filter((t) => t.tipoMoeda === tipo) : state.trades
  return lista.length ? lista[lista.length - 1] : null
}

/** Rótulo curto da negociação. O sufixo só aparece em lote (qty > 1). */
export function fmtTrade(t: Trade): string {
  return brl(t.price) + (t.qty > 1 ? ' × ' + t.qty : '')
}

/**
 * Preço de referência de UM tipo de ativo. A janela preferida é a das ofertas
 * abertas nas últimas 24h — é o que traduz o mercado de agora. Só quando ela
 * está vazia é que se cai para todas as ofertas abertas do tipo e, em último
 * caso, para as 10 últimas negociações dele. Mediana (e não média) porque uma
 * oferta absurda isolada não pode arrastar a referência.
 *
 * `tipo` é obrigatório de propósito: esta função decide o valor exibido de uma
 * moeda na conta, na grade de recibos e no certificado. Um parâmetro opcional
 * que, esquecido, devolvesse a mediana de todos os ativos misturados escreveria
 * um valor errado no documento sem que nada acusasse.
 */
export function medianSellPrice(state: AppState, tipo: string): Cents | null {
  const cutoff = Date.now() - DAY_MS
  const doTipo = state.sellOffers.filter((o) => o.tipoMoeda === tipo)
  let prices = doTipo.filter((o) => o.createdAt >= cutoff).map((o) => o.price)
  if (!prices.length) prices = doTipo.map((o) => o.price)
  if (!prices.length)
    prices = state.trades
      .filter((t) => t.tipoMoeda === tipo)
      .slice(-10)
      .map((t) => t.price)
  if (!prices.length) return null
  prices.sort((a, b) => a - b)
  const mid = Math.floor(prices.length / 2)
  return prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2)
}

/* ---------- ofertas e lotes ---------- */

/**
 * Moedas do usuário que podem ir a leilão agora: do tipo pedido, negociável
 * pelo catálogo e sem oferta aberta — uma moeda não pode aparecer em duas
 * ofertas ao mesmo tempo.
 *
 * `tipo` omitido devolve TODAS as moedas negociáveis livres, de qualquer tipo.
 * É o que a tela de venda usa para saber se a conta tem alguma coisa a vender
 * antes de o usuário escolher a pasta.
 *
 * A conferência de `isNegociavel` continua aqui mesmo com o tipo vindo por
 * parâmetro: quem chama pode passar um tipo que o usuário tem em custódia mas
 * que o mercado não aceita, e é esta função que fecha essa porta.
 */
export function availableCoinsForSell(state: AppState, u: User, tipo?: string): Coin[] {
  return u.coins.filter(
    (c) =>
      (tipo === undefined ? isNegociavel(c.tipoMoeda) : c.tipoMoeda === tipo && isNegociavel(tipo)) &&
      !state.sellOffers.some((o) => o.coinId === c.id),
  )
}

/**
 * Reagrupa as ofertas unitárias no anúncio que as originou. A persistência é
 * por moeda (permite compra parcial do lote); a vitrine é por lote. Preço,
 * observação e data vêm da primeira oferta encontrada do grupo, que é a
 * própria identidade do anúncio.
 *
 * Ordenação: mais barato primeiro e, no empate, quem anunciou antes.
 *
 * `tipo` omitido devolve os lotes de todos os ativos — a vitrine os agrupa por
 * pasta depois, e ordenar dentro de cada pasta é responsabilidade dela.
 */
export function lotsFromOffers(state: AppState, tipo?: string): Lot[] {
  const map = new Map<string, Lot>()
  state.sellOffers
    .filter((o) => tipo === undefined || o.tipoMoeda === tipo)
    .forEach((o) => {
      const lot = map.get(o.lotId)
      if (lot) {
        lot.coinIds.push(o.coinId)
        return
      }
      map.set(o.lotId, {
        lotId: o.lotId,
        seller: o.seller,
        price: o.price,
        obs: o.obs,
        createdAt: o.createdAt,
        coinIds: [o.coinId],
        tipoMoeda: o.tipoMoeda,
      })
    })
  return [...map.values()].sort((a, b) => a.price - b.price || a.createdAt - b.createdAt)
}

/**
 * Move a moeda INTEIRA (tipo, ano, protocolo, NFT, hash) de um dono para
 * outro. O recibo NFT viaja junto e conserva a data de emissão — só a
 * `entrada`, que é a data de aquisição pelo dono atual, é reescrita.
 *
 * MUTA os dois usuários. Devolve null quando a moeda não está no inventário
 * do vendedor.
 */
export function transferCoin(seller: User, buyer: User, coinId: string): Coin | null {
  const idx = seller.coins.findIndex((c) => c.id === coinId)
  if (idx < 0) return null
  const [coin] = seller.coins.splice(idx, 1)
  coin.entrada = fdate(Date.now())
  coin.transferido = true // status digital "Alienado" na auditoria: já mudou de dono ao menos uma vez
  buyer.coins.push(coin)
  return coin
}

/* ---------- motor de casamento de ordens (bid x ask) ---------- */

/**
 * Executa o livro de ordens por prioridade preço-tempo: compras da mais alta
 * para a mais baixa, vendas da mais baixa para a mais alta, e o empate sempre
 * resolvido por quem chegou primeiro.
 *
 * O laço é deliberadamente ingênuo — uma unidade por volta, com `break` que
 * reinicia toda a rodada. Reordenar a cada execução é o que garante que a
 * próxima moeda vendida seja de novo a mais barata do livro; "otimizar" o laço
 * para casar em lote muda os resultados.
 *
 * UM LIVRO POR TIPO DE MOEDA
 * --------------------------
 * A única regra nova do mercado multi-ativo mora numa linha só: a oferta de
 * venda compatível precisa ter `tipoMoeda` igual ao do bid. Não há dois laços
 * nem duas filas — a prioridade preço-tempo continua sendo a mesma, aplicada
 * dentro de cada tipo. Preço de Direitos Humanos não cruza com Bandeira
 * Olímpica por mais alto que seja, porque são ativos diferentes.
 *
 * MUTA `state`: saldos, inventários, ofertas, ordens e histórico.
 */
export function matchOrders(state: AppState): MatchResult {
  /**
   * Agrupa execuções unitárias por comprador+vendedor+preço+tipo para que N
   * moedas do mesmo lote virem UM registro no histórico, com qty = N.
   *
   * O valor do mapa guarda os campos já separados. Antes eles eram recuperados
   * de volta com `chave.split('|')`; com o tipo de moeda dentro da chave, esse
   * split passaria a depender de nenhum nome de moeda do catálogo conter uma
   * barra vertical — uma armadilha silenciosa esperando o primeiro ativo novo.
   */
  const fills = new Map<string, { buyer: string; seller: string; price: Cents; tipoMoeda: string; qty: number }>()
  let progress = true
  while (progress) {
    progress = false
    if (!state.buyOrders.length || !state.sellOffers.length) break
    state.buyOrders.sort((a, b) => b.price - a.price || a.createdAt - b.createdAt)
    state.sellOffers.sort((a, b) => a.price - b.price || a.createdAt - b.createdAt)
    for (const bo of state.buyOrders) {
      if (bo.qty <= 0) continue
      const buyer = state.users[bo.buyer]
      // `s.tipoMoeda === bo.tipoMoeda` é a separação dos livros: sem ela, um bid
      // de R$ 450 em Direitos Humanos varreria as Bandeiras de R$ 285 do livro,
      // entregando ao comprador um ativo que ele não pediu.
      // `s.seller !== bo.buyer` impede que alguém compre da própria oferta e
      // fabrique volume artificial no histórico.
      const so = state.sellOffers.find(
        (s) => s.tipoMoeda === bo.tipoMoeda && s.price <= bo.price && s.seller !== bo.buyer,
      )
      // Sem saldo, a ordem é apenas PULADA — não se cancela um bid por falta de
      // caixa momentânea; ele volta a ser tentado na próxima rodada.
      if (so && buyer.balance >= so.price) {
        const seller = state.users[so.seller]
        const price = so.price
        const fee = tradeFee(price)

        // A TRANSFERÊNCIA VEM ANTES DO DINHEIRO — divergência deliberada do
        // original (linha 993), autorizada pelos sócios.
        //
        // O MVP debitava, creditava, registrava a negociação e SÓ ENTÃO chamava
        // transferCoin, ignorando o retorno. Se a oferta apontasse para uma
        // moeda que já não estava no inventário do vendedor, o dinheiro trocava
        // de mãos e nenhuma moeda trocava: compra fantasma, com o histórico
        // registrando uma negociação que não existiu.
        //
        // Agora a oferta órfã é removida do livro e a rodada recomeça, sem
        // mover saldo e sem gravar negociação. Remover é o que também impede o
        // laço de reencontrar a mesma oferta para sempre.
        const coin = transferCoin(seller, buyer, so.coinId)
        if (!coin) {
          state.sellOffers = state.sellOffers.filter((o) => o.id !== so.id)
          progress = true
          break
        }

        buyer.balance -= price // o comprador paga o preço cheio
        seller.balance += price - fee // a comissão sai do lado do vendedor
        state.sellOffers = state.sellOffers.filter((o) => o.id !== so.id)
        bo.qty -= 1
        const k = bo.buyer + '|' + so.seller + '|' + price + '|' + so.tipoMoeda
        const atual = fills.get(k)
        if (atual) atual.qty += 1
        else
          fills.set(k, {
            buyer: bo.buyer,
            seller: so.seller,
            price,
            tipoMoeda: so.tipoMoeda,
            qty: 1,
          })
        progress = true
        break
      }
    }
    state.buyOrders = state.buyOrders.filter((b) => b.qty > 0)
  }
  // Todas as execuções da chamada compartilham o mesmo instante: o histórico
  // registra o momento do casamento, não o de cada unidade.
  const now = Date.now()
  const trades: Trade[] = []
  fills.forEach((f) => {
    const trade: Trade = {
      price: f.price,
      qty: f.qty,
      date: now,
      buyer: f.buyer,
      seller: f.seller,
      tipoMoeda: f.tipoMoeda,
    }
    state.trades.push(trade)
    trades.push(trade)
  })
  return { matched: fills.size > 0, trades }
}

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
import { COIN } from '@/domain/constants'
import { DAY_MS, fdate } from '@/domain/dates'
import { tradeFee } from '@/domain/fees'
import { brl } from '@/domain/money'

/* ---------- indicadores derivados das negociações ---------- */

/**
 * Preço médio dos últimos 7 dias — média PONDERADA pela quantidade, não a
 * média simples dos preços: uma negociação de 5 moedas pesa 5 vezes mais que
 * uma de 1. O `|| 1` protege registros antigos que nasceram sem `qty`.
 */
export function avg7(state: AppState): Cents | null {
  const cut = Date.now() - 7 * DAY_MS
  const t = state.trades.filter((x) => x.date >= cut)
  if (!t.length) return null
  const totalQty = t.reduce((s, x) => s + (x.qty || 1), 0)
  const totalVal = t.reduce((s, x) => s + x.price * (x.qty || 1), 0)
  return Math.round(totalVal / totalQty)
}

/**
 * Última negociação registrada. É o último item do array, não o de maior
 * `date`: o histórico é sempre gravado em ordem cronológica de execução.
 */
export function lastTrade(state: AppState): Trade | null {
  return state.trades.length ? state.trades[state.trades.length - 1] : null
}

/** Rótulo curto da negociação. O sufixo só aparece em lote (qty > 1). */
export function fmtTrade(t: Trade): string {
  return brl(t.price) + (t.qty > 1 ? ' × ' + t.qty : '')
}

/**
 * Preço de referência do ativo. A janela preferida é a das ofertas abertas nas
 * últimas 24h — é o que traduz o mercado de agora. Só quando ela está vazia é
 * que se cai para todas as ofertas abertas e, em último caso, para as 10
 * últimas negociações. Mediana (e não média) porque uma oferta absurda
 * isolada não pode arrastar a referência.
 */
export function medianSellPrice(state: AppState): Cents | null {
  const cutoff = Date.now() - DAY_MS
  let prices = state.sellOffers.filter((o) => o.createdAt >= cutoff).map((o) => o.price)
  if (!prices.length) prices = state.sellOffers.map((o) => o.price)
  if (!prices.length) prices = state.trades.slice(-10).map((t) => t.price)
  if (!prices.length) return null
  prices.sort((a, b) => a - b)
  const mid = Math.floor(prices.length / 2)
  return prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2)
}

/* ---------- ofertas e lotes ---------- */

/**
 * Moedas do usuário que podem ir a leilão agora: só o tipo negociável do
 * catálogo (COIN.name) e nenhuma que já esteja anunciada — uma moeda não pode
 * aparecer em duas ofertas ao mesmo tempo.
 */
export function availableCoinsForSell(state: AppState, u: User): Coin[] {
  return u.coins.filter(
    (c) => c.tipoMoeda === COIN.name && !state.sellOffers.some((o) => o.coinId === c.id),
  )
}

/**
 * Reagrupa as ofertas unitárias no anúncio que as originou. A persistência é
 * por moeda (permite compra parcial do lote); a vitrine é por lote. Preço,
 * observação e data vêm da primeira oferta encontrada do grupo, que é a
 * própria identidade do anúncio.
 *
 * Ordenação: mais barato primeiro e, no empate, quem anunciou antes.
 */
export function lotsFromOffers(state: AppState): Lot[] {
  const map = new Map<string, Lot>()
  state.sellOffers.forEach((o) => {
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
 * MUTA `state`: saldos, inventários, ofertas, ordens e histórico.
 */
export function matchOrders(state: AppState): MatchResult {
  // Agrupa execuções unitárias por comprador+vendedor+preço para que N moedas
  // do mesmo lote virem UM registro no histórico, com qty = N.
  const fills = new Map<string, number>()
  let progress = true
  while (progress) {
    progress = false
    if (!state.buyOrders.length || !state.sellOffers.length) break
    state.buyOrders.sort((a, b) => b.price - a.price || a.createdAt - b.createdAt)
    state.sellOffers.sort((a, b) => a.price - b.price || a.createdAt - b.createdAt)
    for (const bo of state.buyOrders) {
      if (bo.qty <= 0) continue
      const buyer = state.users[bo.buyer]
      // `s.seller !== bo.buyer` impede que alguém compre da própria oferta e
      // fabrique volume artificial no histórico.
      const so = state.sellOffers.find((s) => s.price <= bo.price && s.seller !== bo.buyer)
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
        const k = bo.buyer + '|' + so.seller + '|' + price
        fills.set(k, (fills.get(k) || 0) + 1)
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
  fills.forEach((qty, k) => {
    const [buyer, seller, priceStr] = k.split('|')
    const trade: Trade = { price: parseInt(priceStr, 10), qty, date: now, buyer, seller }
    state.trades.push(trade)
    trades.push(trade)
  })
  return { matched: fills.size > 0, trades }
}

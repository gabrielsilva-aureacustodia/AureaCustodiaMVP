/**
 * Cotações de BTC/ETH/USDT em BRL — o "banco de dados" da página 2.3
 * (Comparação de referência) e do aviso de cotações na tela de mercado.
 *
 * MUDANÇA ESTRUTURAL EM RELAÇÃO AO MVP (linhas 2232-2285): a coleta rodava no
 * NAVEGADOR a cada login e era guardada em `window.storage` sob a chave
 * 'aurea-crypto-v1'. Aqui roda no SERVIDOR, e quem faz o papel do cache é o
 * `revalidate` do fetch do Next: uma coleta por hora, compartilhada por todos os
 * usuários. Isso mantém o consumo bem dentro do limite de 5-15 chamadas/min do
 * plano gratuito da CoinGecko, que era o risco real do modelo antigo (cada
 * login de cada usuário disparava 4 requisições do IP dele).
 *
 * Consequência: não há mais série acumulada entre execuções. A série é
 * remontada do histórico da própria CoinGecko a cada revalidação, o que é
 * equivalente ao que o original guardava — e sem o risco de o cache local ficar
 * preso numa série simulada.
 */

import type { Cents, CryptoData, CryptoPoint, Timestamp } from '@/domain/types'
import { DAY_MS, dayStamp } from '@/domain/dates'

const API = 'https://api.coingecko.com/api/v3'

/**
 * Teto de pontos da série, herdado do `slice(-45)` do original. Lá servia para
 * a série acumulada não crescer sem fim no storage; aqui é apenas o mesmo
 * limite defensivo — para `days` <= 45 (o uso real é 30) não tem efeito algum.
 */
const MAX_POINTS = 45

/**
 * O Next estende `RequestInit` com o campo `next`. Declaramos o mínimo que
 * usamos para que `npm run typecheck` funcione mesmo antes do primeiro build
 * (é o build que gera o `next-env.d.ts` com a augmentação global).
 */
type RevalidatingInit = RequestInit & { next?: { revalidate?: number } }

/** Uma hora: granularidade diária não muda mais rápido do que isso. */
const REVALIDATE_S = 3600

/** Resposta de /coins/{id}/market_chart — só a série de preços interessa. */
interface MarketChart {
  prices: Array<[Timestamp, number]>
}

/** Resposta de /simple/price com vs_currencies=brl. */
interface SimplePrice {
  bitcoin: { brl: number }
  ethereum: { brl: number }
  tether: { brl: number }
}

/** Ponto ainda em BRL fracionário, antes da conversão para centavos. */
interface RawPoint {
  t: Timestamp
  btc?: number
  eth?: number
  usdt?: number
}

async function fetchJson<T>(url: string): Promise<T> {
  const init: RevalidatingInit = { next: { revalidate: REVALIDATE_S } }
  const r = await fetch(url, init)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

/** A CoinGecko devolve BRL fracionário; o sistema inteiro fala centavos inteiros. */
function toCents(brlValue: number): Cents {
  return Math.round(brlValue * 100)
}

/**
 * Só entra na série o dia que tem as três moedas — o original fazia o mesmo
 * (`filter(x => x.btc && x.eth && x.usdt)`), porque um dia com buraco quebraria
 * a normalização em índice base 100 do gráfico comparativo.
 */
function isComplete(p: RawPoint): p is Required<RawPoint> {
  return Boolean(p.btc && p.eth && p.usdt)
}

/**
 * Fallback do MVP (linha 2241): passeio aleatório de 30 dias a partir de
 * patamares plausíveis. O viés de alta (0.48 em vez de 0.50) é do original e
 * fica como está — a série é decorativa e a UI avisa que é simulada.
 *
 * Marcar `simulated: true` NÃO é detalhe de implementação: as telas 2.2 e 2.3
 * mostram um aviso explícito ao usuário quando a série não é real. É requisito
 * de transparência — nunca devolver dados inventados sem essa marca.
 */
export function simulatedCryptoSeries(days: number): CryptoData {
  const now = dayStamp(Date.now())
  const series: CryptoPoint[] = []
  // Patamares iniciais em BRL, como no original.
  let btc = 620000
  let eth = 21500
  let usdt = 5.45
  for (let i = days - 1; i >= 0; i--) {
    btc *= 1 + (Math.random() - 0.48) * 0.02
    eth *= 1 + (Math.random() - 0.48) * 0.025
    usdt *= 1 + (Math.random() - 0.5) * 0.001
    series.push({
      t: now - i * DAY_MS,
      btc: toCents(btc),
      eth: toCents(eth),
      usdt: toCents(usdt),
    })
  }
  return { series, lastUpdate: Date.now(), simulated: true }
}

/**
 * Série diária real de BTC/ETH/USDT em centavos de BRL, do dia mais antigo para
 * o mais recente.
 *
 * NUNCA joga exceção: qualquer falha de rede, limite de taxa ou resposta
 * inesperada vira, silenciosamente, a série simulada com `simulated: true`. A
 * página 2.3 é informativa e não pode derrubar o render do app por causa de uma
 * API de terceiro.
 */
export async function fetchCryptoSeries(days: number): Promise<CryptoData> {
  try {
    const [b, e, t] = await Promise.all([
      fetchJson<MarketChart>(`${API}/coins/bitcoin/market_chart?vs_currency=brl&days=${days}&interval=daily`),
      fetchJson<MarketChart>(`${API}/coins/ethereum/market_chart?vs_currency=brl&days=${days}&interval=daily`),
      fetchJson<MarketChart>(`${API}/coins/tether/market_chart?vs_currency=brl&days=${days}&interval=daily`),
    ])

    // A CoinGecko devolve cada moeda numa série própria; aqui elas viram um
    // ponto único por dia, chaveado pelo início do dia (mesma lógica do MVP).
    const map = new Map<Timestamp, RawPoint>()
    const put = (chart: MarketChart, key: 'btc' | 'eth' | 'usdt'): void => {
      for (const [ts, price] of chart.prices) {
        const dk = dayStamp(ts)
        const slot = map.get(dk) ?? { t: dk }
        slot[key] = price
        map.set(dk, slot)
      }
    }
    put(b, 'btc')
    put(e, 'eth')
    put(t, 'usdt')

    const raw = Array.from(map.values())
      .filter(isComplete)
      .sort((x, y) => x.t - y.t)

    // Snapshot do dia corrente. O histórico diário fecha no dia anterior em boa
    // parte das respostas, então o original completava com /simple/price. Se
    // essa segunda chamada falhar, o histórico real continua valendo — era
    // exatamente o que acontecia no MVP, onde a série já estava salva.
    try {
      const p = await fetchJson<SimplePrice>(`${API}/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=brl`)
      const today = dayStamp(Date.now())
      const point: Required<RawPoint> = {
        t: today,
        btc: p.bitcoin.brl,
        eth: p.ethereum.brl,
        usdt: p.tether.brl,
      }
      const idx = raw.findIndex((x) => x.t === today)
      if (idx >= 0) raw[idx] = point
      else raw.push(point)
    } catch {
      // Histórico real sem o ponto de hoje ainda é histórico real: segue sem marcar simulado.
    }

    const series: CryptoPoint[] = raw.slice(-MAX_POINTS).map((p) => ({
      t: p.t,
      btc: toCents(p.btc),
      eth: toCents(p.eth),
      usdt: toCents(p.usdt),
    }))

    // Série vazia (resposta fora do formato esperado + snapshot falho) é o mesmo
    // caso que o MVP tratava no `catch`: sem ponto nenhum, cai para o simulado —
    // melhor um gráfico marcado como fictício do que um gráfico em branco sem aviso.
    if (!series.length) return simulatedCryptoSeries(days)

    return { series, lastUpdate: Date.now(), simulated: false }
  } catch {
    return simulatedCryptoSeries(days)
  }
}

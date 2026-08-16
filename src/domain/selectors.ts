/**
 * Seletores de leitura: recortes do estado usados pela auditoria pública
 * (2.0), pelo certificado da moeda (3.1), pela conta (3.0) e pelos gráficos
 * comparativos (2.3).
 *
 * PORT FIEL do MVP monolítico (aurea-mvp-teste.html, linhas 1843-1849,
 * 2288-2310, 2357-2371 e 2577-2580). São funções de leitura e, com uma
 * exceção anotada (`getSettings`), não tocam no estado.
 */

import type { AppState, Cents, Coin, Timestamp, User, UserEmail, UserSettings } from '@/domain/types'
import { DAY_MS, dayStamp, fdate } from '@/domain/dates'

/* ---------- inventário global (auditoria pública) ---------- */

/**
 * Achata o inventário de todos os usuários numa lista única, ordenada pelo
 * código do ativo (RO-000001, RO-000002...). É a base da tabela de auditoria
 * e da exportação CSV.
 *
 * O comparador nunca devolve 0, exatamente como no original: em empate a
 * ordem fica a critério do motor. Na prática não acontece — o código do ativo
 * é sequencial e único.
 */
export function allCoinsFlat(
  state: AppState,
): Array<{ owner: UserEmail; ownerName: string; coin: Coin }> {
  const out: Array<{ owner: UserEmail; ownerName: string; coin: Coin }> = []
  Object.entries(state.users).forEach(([em, u]) => {
    u.coins.forEach((c) => out.push({ owner: em, ownerName: u.name, coin: c }))
  })
  return out.sort((a, b) => (a.coin.id < b.coin.id ? -1 : 1))
}

/**
 * Procura uma moeda no inventário de qualquer usuário. O certificado é
 * público: quem tem o código do ativo consulta, mesmo sem ser o dono.
 */
export function findCoinAnywhere(
  state: AppState,
  coinId: string,
): { owner: UserEmail; coin: Coin } | null {
  for (const [email, u] of Object.entries(state.users)) {
    const c = u.coins.find((x) => x.id === coinId)
    if (c) return { owner: email, coin: c }
  }
  return null
}

/**
 * Situação negocial da moeda, derivada em tempo de leitura — não é campo
 * persistido. 'Negociando' tem precedência sobre 'Alienado': o que importa
 * na auditoria é que o ativo está com oferta aberta agora.
 *
 * DIVERGÊNCIA DELIBERADA DO CONTRATO DE MÓDULOS, que previa `(c: Coin)`: a
 * primeira condição consulta `state.sellOffers`, então sem o estado o
 * 'Negociando' simplesmente não existiria e a pill da auditoria mentiria.
 * Chame com `coinStatusDigital(state, coin)`.
 */
export function coinStatusDigital(state: AppState, c: Coin): string {
  if (state.sellOffers.some((o) => o.coinId === c.id)) return 'Negociando'
  if (c.transferido) return 'Alienado'
  return 'Disponível'
}

/**
 * Data de envio para custódia. Vale a data de postagem do protocolo que
 * originou a moeda; sem ela, cai para a `entrada` — que, se a moeda já foi
 * negociada, é a data da aquisição pelo dono atual.
 */
export function envioDateFor(state: AppState, c: Coin): string {
  const e = state.envios.find((x) => x.protocolo === c.protocolo)
  if (e && e.dataPostagem) return fdate(e.dataPostagem)
  return c.entrada
}

/* ---------- preferências ---------- */

/**
 * Preferências do usuário, criadas na primeira leitura. MUTA o usuário de
 * propósito: contas antigas (e as do seed) nascem sem `settings`, e a tela
 * 3.2 precisa de um objeto estável para alternar os interruptores.
 */
export function getSettings(u: User): UserSettings {
  if (!u.settings)
    u.settings = { twoFA: false, notifEnvios: true, notifNegociacoes: true, notifNovidades: false }
  return u.settings
}

/* ---------- séries para os gráficos ---------- */

/**
 * Série diária do ativo RO: um ponto por dia com negociação, no preço médio
 * ponderado pela quantidade do dia. Dias sem negociação simplesmente não
 * existem na série — a linha do gráfico liga os pontos que houver.
 */
export function roDailySeries(
  state: AppState,
  days: number,
): Array<{ t: Timestamp; v: Cents }> {
  const cut = Date.now() - days * DAY_MS
  const buckets = new Map<Timestamp, { sum: number; q: number }>()
  state.trades
    .filter((t) => t.date >= cut)
    .forEach((t) => {
      const dk = dayStamp(t.date)
      const b = buckets.get(dk) ?? { sum: 0, q: 0 }
      b.sum += t.price * (t.qty || 1)
      b.q += t.qty || 1
      buckets.set(dk, b)
    })
  return [...buckets.entries()]
    .map(([t, b]) => ({ t, v: Math.round(b.sum / b.q) }))
    .sort((a, b) => a.t - b.t)
}

/**
 * Normaliza a série em base 100 no primeiro ponto. É o que permite comparar
 * o RO com BTC, ETH e USDT no mesmo eixo: ordens de grandeza diferentes,
 * variação percentual comparável.
 *
 * Série vazia ou base zero devolvem [] — sem base não há normalização
 * possível, e dividir por zero contaminaria o gráfico inteiro.
 *
 * Recebe e devolve só os VALORES, na ordem: no original a função carregava os
 * pares {t,v} inteiros. Quem monta o gráfico reata o `t` da série de origem —
 * `pontos.map((p, i) => ({ t: p.t, v: idx[i] }))` — porque o índice de saída
 * tem exatamente o mesmo comprimento e a mesma ordem da entrada.
 */
export function toIndex(points: number[]): number[] {
  if (!points.length) return []
  const base = points[0]
  if (!base) return []
  return points.map((v) => (v / base) * 100)
}

/**
 * Variação percentual entre a ponta inicial e a final da série. Devolve null
 * (e não 0) quando não há dois pontos ou a base é zero: a interface distingue
 * "não variou" de "não dá para calcular" — esta última vira um traço.
 */
export function pctChange(points: number[]): number | null {
  if (!points || points.length < 2) return null
  const a = points[0]
  const b = points[points.length - 1]
  if (!a) return null
  return ((b - a) / a) * 100
}

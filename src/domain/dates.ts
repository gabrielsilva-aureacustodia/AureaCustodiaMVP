/**
 * Datas: formatação para exibição e normalização para agrupamento diário.
 *
 * Port fiel de aurea-mvp-teste.html (linhas 920 e 2235).
 */

import type { Timestamp, DateBR } from '@/domain/types'

/**
 * Um dia em milissegundos. Aparece solto no MVP (7*86400000 na média de 7 dias,
 * 24*3600*1000 na mediana); aqui é uma constante só para as janelas de tempo
 * ficarem legíveis nos módulos que as usam.
 */
export const DAY_MS: number = 86400000

/** Timestamp -> 'dd/mm/aaaa'. É a forma congelada que vai para dentro do NFT. */
export function fdate(ts: Timestamp): DateBR {
  return new Date(ts).toLocaleDateString('pt-BR')
}

/**
 * Zera o horário e devolve o início do dia LOCAL em ms.
 *
 * Serve de chave de agrupamento das séries diárias (cripto e índice RO): dois
 * instantes do mesmo dia precisam colidir no mesmo ponto do gráfico.
 */
export function dayStamp(ts: Timestamp): Timestamp {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

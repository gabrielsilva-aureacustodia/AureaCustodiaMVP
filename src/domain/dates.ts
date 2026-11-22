/**
 * Datas: formatação para exibição e normalização para agrupamento diário.
 *
 * Port fiel de aurea-mvp-teste.html (linhas 920 e 2235).
 */

import type { Timestamp, DateBR } from '@/domain/types'
import { somarDiasUteis } from '@/domain/dias-uteis'

/**
 * Um dia em milissegundos. Aparece solto no MVP (7*86400000 na média de 7 dias,
 * 24*3600*1000 na mediana); aqui é uma constante só para as janelas de tempo
 * ficarem legíveis nos módulos que as usam.
 */
export const DAY_MS: number = 86400000

/**
 * Fuso fixo de toda data exibida (QA Davi, erro React 418, 22/11/2026). Sem ele o servidor (UTC, na Vercel) e o
 * navegador (Brasília) formatavam a MESMA data/hora com texto diferente — das 21h à meia-noite o dia mudava e a
 * hora sempre mudava 3 h —, e a hidratação de Mercado, Compras e Recibos acusava a diferença. Brasília é também
 * o dia que o resto do sistema usa (cobrança, ciclo de custódia).
 */
export const FUSO_DE_EXIBICAO = 'America/Sao_Paulo'

/** Timestamp -> 'dd/mm/aaaa'. É a forma congelada que vai para dentro do recibo. */
export function fdate(ts: Timestamp): DateBR {
  return new Date(ts).toLocaleDateString('pt-BR', { timeZone: FUSO_DE_EXIBICAO })
}

/** Timestamp -> 'DD/MM/AAAA às HH:MM:SS'. Usado na fila de ofertas e histórico recente. */
export function fdatetime(ts: Timestamp): string {
  const d = new Date(ts)
  const data = d.toLocaleDateString('pt-BR', { timeZone: FUSO_DE_EXIBICAO })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: FUSO_DE_EXIBICAO })
  return `${data} às ${hora}`
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

/**
 * Prazo regulamentar de liquidação de saque: D+3 (72 horas úteis/corridas).
 * Regra da publicação (Seção 3.3 do Plano Executivo):
 * Sem dados bancários confirmados, o prazo não começa a correr.
 */
export const PRAZO_SAQUE_DIAS: number = 3

/**
 * Calcula a data-limite prevista para liquidação do saque a partir do instante do pedido.
 */
export function calcularDataLimiteSaque(
  solicitadoEm: Timestamp = Date.now(),
  dias: number = PRAZO_SAQUE_DIAS,
): { timestamp: Timestamp; formatada: DateBR } {
  // Dias ÚTEIS (QA Davi B06): pula fim de semana e feriado nacional, como a tela promete.
  const ts = somarDiasUteis(solicitadoEm, dias)
  return {
    timestamp: ts,
    formatada: fdate(ts),
  }
}

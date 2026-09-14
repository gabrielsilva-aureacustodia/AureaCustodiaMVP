/**
 * Formatação dos números do painel — um lugar só, usado pelas páginas (servidor) e pelos
 * componentes de cliente.
 *
 * DATA E HORA SEMPRE NO FUSO DE BRASÍLIA, explícito. O servidor da Vercel roda em UTC e o
 * navegador roda no fuso de quem abre: formatar sem fuso daria um horário no HTML do
 * servidor e outro depois da hidratação — e, pior, uma negociação das 22h apareceria no
 * dia seguinte. Dinheiro continua passando por `brl()`, a única conversão do projeto.
 */

import { brl } from '@/domain/money'
import type { Cents } from '@/domain/types'

export const FUSO = 'America/Sao_Paulo'

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const DATA = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' })

export function dataHora(ts: number | null | undefined): string {
  return typeof ts === 'number' ? DATA_HORA.format(new Date(ts)).replace(',', '') : '—'
}

export function data(ts: number | null | undefined): string {
  return typeof ts === 'number' ? DATA.format(new Date(ts)) : '—'
}

export function dinheiro(c: Cents | null | undefined): string {
  if (typeof c !== 'number') return '—'
  // A DRE escreve dedução como `-valor`; com valor zero isso é -0, que o Intl mostra
  // como "-R$ 0,00". `c === 0` é verdadeiro para -0, e devolve o zero sem sinal.
  return brl(c === 0 ? 0 : c)
}

export function numero(n: number | null | undefined): string {
  return typeof n === 'number' ? n.toLocaleString('pt-BR') : '—'
}

/** Pontos-base → '12,5%'. `null` vira travessão: "não dá para calcular" não é zero. */
export function percentual(bp: number | null | undefined): string {
  if (typeof bp !== 'number') return '—'
  const pct = bp / 100
  return `${pct.toLocaleString('pt-BR', { maximumFractionDigits: pct % 1 === 0 ? 0 : 2 })}%`
}

/** Milissegundos → '2 d 4 h', '3 h 10 min', '12 min'. */
export function duracao(ms: number | null | undefined): string {
  if (typeof ms !== 'number') return '—'
  const minutos = Math.round(ms / 60000)
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) {
    const resto = minutos % 60
    return resto ? `${horas} h ${resto} min` : `${horas} h`
  }
  const dias = Math.floor(horas / 24)
  const restoH = horas % 24
  return restoH ? `${dias} d ${restoH} h` : `${dias} d`
}

/** 'AAAA-MM' → 'setembro de 2026'. */
export function nomeDoMes(chave: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(chave)
  if (!m) return chave
  const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${nomes[Number(m[2]) - 1] ?? m[2]} de ${m[1]}`
}

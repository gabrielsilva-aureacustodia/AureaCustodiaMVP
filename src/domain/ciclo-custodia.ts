/**
 * O ciclo de custódia de UMA moeda: começa no dia em que ela foi aceita no
 * sistema e se renova todo mês, no mesmo dia.
 *
 * POR QUE ISTO EXISTE (02/10/2026)
 * --------------------------------
 * Até aqui a custódia era cobrada por mês-calendário: um cron rodava no dia 1º
 * e cobrava o acervo inteiro de todo mundo, e a "competência" ('AAAA-MM') era o
 * mês do calendário. O extrato do Rogério mostrou o defeito: pagou a custódia
 * em 25/09 e foi cobrado de novo em 01/10, seis dias depois.
 *
 * A regra do Gabriel é outra, e é por moeda: a custódia corre a partir do dia
 * em que a moeda foi aceita (aprovada no painel, ou enviada pelo cliente e
 * aprovada na análise), independente do dia em que o cliente pagar — a guarda já
 * está acontecendo. Aceita em 02/10, a próxima cobrança é em 02/11, depois
 * 02/12, e assim por diante. Quem não pagou até o fim do dia do vencimento tem a
 * moeda travada para negociação até pagar.
 *
 * O QUE É CADA COISA
 * ------------------
 *  - `inicio`: o dia do aniversário da aceitação, à meia-noite de Brasília.
 *  - `fim`: o início do ciclo seguinte. É a data da próxima cobrança, e é também
 *    o `dataVencimento` da fatura do ciclo: `faturaBloqueia` soma um dia de
 *    carência, então a moeda só trava depois das 23:59 desse dia.
 *  - `competencia`: o mês em que o ciclo COMEÇA. Uma moeda tem no máximo um
 *    ciclo começando por mês, então a competência continua identificando o ciclo
 *    dela — e continua sendo a chave de tudo que já existia (fatura, plano,
 *    relatório contábil), sem migrar nada.
 *
 * FUSO: o aniversário é por dia de Brasília (UTC-3, sem horário de verão desde
 * 2019). `entrada` guarda só 'dd/mm/aaaa'; o servidor roda em UTC, e tratar a
 * data como UTC jogaria a virada do ciclo para as 21h do dia anterior.
 *
 * DIA 29, 30 E 31: nos meses que não têm o dia, o ciclo cai no último dia do
 * mês (aceita em 31/01 -> 28/02 -> 31/03).
 */

import type { DateBR, Timestamp } from '@/domain/types'

const BRASILIA_UTC_MENOS_3_MS = 3 * 60 * 60 * 1000

export interface CicloDaMoeda {
  /** O dia do aniversário, 00:00 de Brasília. */
  inicio: Timestamp
  /** Início do ciclo seguinte: a próxima cobrança e o vencimento da fatura deste. */
  fim: Timestamp
  /** Mês em que o ciclo começa, 'AAAA-MM'. */
  competencia: string
}

interface ParAnoMes {
  ano: number
  mes: number // 1-12
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

function inicioDoDia(ano: number, mes: number, dia: number): Timestamp {
  return Date.UTC(ano, mes - 1, dia) + BRASILIA_UTC_MENOS_3_MS
}

function aniversarioNoMes(ancoraDia: number, { ano, mes }: ParAnoMes): Timestamp {
  return inicioDoDia(ano, mes, Math.min(ancoraDia, ultimoDiaDoMes(ano, mes)))
}

function somarMesesAoPar({ ano, mes }: ParAnoMes, n: number): ParAnoMes {
  const indice = ano * 12 + (mes - 1) + n
  return { ano: Math.floor(indice / 12), mes: (indice % 12) + 1 }
}

function mesDeBrasilia(ts: Timestamp): ParAnoMes {
  const d = new Date(ts - BRASILIA_UTC_MENOS_3_MS)
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 }
}

function competenciaDoPar({ ano, mes }: ParAnoMes): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

/** 'dd/mm/aaaa' -> partes, ou `null` se a data não for legível ou não existir. */
export function lerDataBR(data: DateBR): { ano: number; mes: number; dia: number } | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((data ?? '').trim())
  if (!m) return null
  const dia = Number(m[1])
  const mes = Number(m[2])
  const ano = Number(m[3])
  if (mes < 1 || mes > 12 || dia < 1 || dia > ultimoDiaDoMes(ano, mes)) return null
  return { ano, mes, dia }
}

/** O dia de Brasília de um instante, em 'dd/mm/aaaa' — é o que vai em `Coin.entrada`. */
export function dataBrasilia(ts: Timestamp): DateBR {
  const d = new Date(ts - BRASILIA_UTC_MENOS_3_MS)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

/**
 * O ciclo em que a moeda está em `agora`.
 *
 * `entrada` ilegível (dado antigo ou de teste) cai no mês-calendário, que era a
 * regra anterior: melhor um ciclo conhecido do que nenhum.
 */
export function cicloDaMoeda(entrada: DateBR, agora: Timestamp): CicloDaMoeda {
  const ancora = lerDataBR(entrada)
  const hoje = mesDeBrasilia(agora)

  if (!ancora) {
    const proximo = somarMesesAoPar(hoje, 1)
    return {
      inicio: inicioDoDia(hoje.ano, hoje.mes, 1),
      fim: inicioDoDia(proximo.ano, proximo.mes, 1),
      competencia: competenciaDoPar(hoje),
    }
  }

  const mesDaEntrada: ParAnoMes = { ano: ancora.ano, mes: ancora.mes }
  const indice = (p: ParAnoMes): number => p.ano * 12 + p.mes

  let mesDoCiclo: ParAnoMes = hoje
  if (indice(hoje) < indice(mesDaEntrada)) {
    // Relógio antes da entrada (fixture, ajuste de data): é o primeiro ciclo.
    mesDoCiclo = mesDaEntrada
  } else if (aniversarioNoMes(ancora.dia, hoje) > agora) {
    // Ainda não chegou o dia deste mês: o ciclo em curso começou no mês anterior.
    mesDoCiclo = somarMesesAoPar(hoje, -1)
    if (indice(mesDoCiclo) < indice(mesDaEntrada)) mesDoCiclo = mesDaEntrada
  }

  return {
    inicio: aniversarioNoMes(ancora.dia, mesDoCiclo),
    fim: aniversarioNoMes(ancora.dia, somarMesesAoPar(mesDoCiclo, 1)),
    competencia: competenciaDoPar(mesDoCiclo),
  }
}

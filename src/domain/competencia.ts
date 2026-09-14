/**
 * Funções puras de apropriação por competência contábil (Regime de Competência - B3.4, RA-31).
 *
 * Camada de domínio PURA: sem React, sem Next, sem I/O, sem async.
 * Valores monetários SEMPRE inteiros em centavos (Cents).
 *
 * REGRAS CONTÁBEIS:
 *  - Mensal (ciclo e contratação de plano mensal): receita na competência da fatura paga.
 *  - Anual: 1/12 por mês coberto; a sobra do arredondamento vai para o 12º mês,
 *    para os doze somarem exatamente o valor pago.
 *  - Não conta duas vezes: faturas de planos anuais não somam na receita de fatura mensal,
 *    pois são apropriadas mês a mês via `apropriacaoPlanoAnual`.
 */

import type { Periodo } from './dre'
import { somarMeses } from './plano-custodia'
import type { Cents, FaturaCustodia, PlanoCustodia, Timestamp } from './types'

/**
 * Avalia se o mês de uma competência ('AAAA-MM') intercepta o período informado.
 * Utiliza o ponto médio do mês (dia 15) para imunidade a fuso horário e virada de mês.
 */
export function mesNoPeriodo(competencia: string, periodo: Periodo): boolean {
  const [ano, mes] = competencia.split('-').map(Number)
  if (!ano || !mes || mes < 1 || mes > 12) return false
  const meioMes = new Date(ano, mes - 1, 15).getTime()
  return meioMes >= periodo.inicio && meioMes < periodo.fim
}

/**
 * Receita de um plano anual dentro de um período contábil:
 * 1/12 por mês coberto; a sobra do arredondamento vai para o 12º mês,
 * para os doze meses somarem exatamente o valor líquido pago.
 */
export function apropriacaoPlanoAnual(plano: PlanoCustodia, periodo: Periodo): Cents {
  if (plano.modalidade !== 'anual') return 0
  if (plano.status !== 'vigente' && plano.status !== 'encerrado') return 0

  const valorLiquido = plano.valorTotalCents - (plano.estornadoCents ?? 0)
  if (valorLiquido <= 0) return 0

  const parcelaMensal = Math.floor(valorLiquido / 12)
  const sobra = valorLiquido - parcelaMensal * 12

  let totalPeriodo = 0

  for (let i = 0; i < 12; i++) {
    const compMes = somarMeses(plano.inicioCompetencia, i)
    if (mesNoPeriodo(compMes, periodo)) {
      const valorMes = i === 11 ? parcelaMensal + sobra : parcelaMensal
      totalPeriodo += valorMes
    }
  }

  return totalPeriodo
}

/**
 * Receita de custódia total reconhecida por competência no período:
 *  - Faturas pagas de ciclo mensal e de planos mensais (pela competência da fatura);
 *  - Planos anuais vigentes ou encerrados apropriados linearmente (1/12 por mês coberto).
 *
 * Evita contagem dupla: faturas emitidas para planos anuais são desconsideradas
 * na soma de faturas, sendo reconhecidas estritamente pela apropriação mensal do plano.
 */
export function receitaDeCustodiaNoPeriodo(
  faturas: FaturaCustodia[],
  planos: PlanoCustodia[],
  periodo: Periodo,
): Cents {
  let receita = 0

  const planosMap = new Map((planos ?? []).map((p) => [p.id, p]))

  // 1. Receita de faturas mensais pagas
  for (const f of faturas ?? []) {
    if (f.status !== 'paga') continue

    // Se a fatura é de contratação ou renovação de plano anual, sua receita é reconhecida via plano
    if (f.origem === 'renovacao_anual') continue
    if (f.planoId) {
      const p = planosMap.get(f.planoId)
      if (p && p.modalidade === 'anual') continue
    }

    if (mesNoPeriodo(f.competencia, periodo)) {
      receita += f.valorCents
    }
  }

  // 2. Receita de planos anuais por competência (1/12 ao mês)
  for (const p of planos ?? []) {
    if (p.modalidade === 'anual') {
      receita += apropriacaoPlanoAnual(p, periodo)
    }
  }

  return receita
}

/**
 * Detalhamento de receita diferida para um plano de custódia anual:
 * calcula o total pago, quanto já foi apropriado até a data de referência,
 * quanto resta a apropriar e quantos meses restam.
 */
export function calcularReceitaDiferida(
  plano: PlanoCustodia,
  dataReferencia: Timestamp = Date.now(),
): {
  valorPago: Cents
  jaApropriado: Cents
  aApropriar: Cents
  mesesRestantes: number
  mesesApropriados: number
} {
  const valorPago = Math.max(0, plano.valorTotalCents - (plano.estornadoCents ?? 0))
  if (plano.modalidade !== 'anual' || valorPago <= 0) {
    return {
      valorPago,
      jaApropriado: valorPago,
      aApropriar: 0,
      mesesRestantes: 0,
      mesesApropriados: 0,
    }
  }

  const parcelaMensal = Math.floor(valorPago / 12)
  const sobra = valorPago - parcelaMensal * 12

  const dRef = new Date(dataReferencia)
  const compRef = `${dRef.getFullYear()}-${String(dRef.getMonth() + 1).padStart(2, '0')}`

  let jaApropriado = 0
  let mesesApropriados = 0

  for (let i = 0; i < 12; i++) {
    const compMes = somarMeses(plano.inicioCompetencia, i)
    if (compMes <= compRef) {
      mesesApropriados++
      jaApropriado += i === 11 ? parcelaMensal + sobra : parcelaMensal
    }
  }

  const mesesRestantes = Math.max(0, 12 - mesesApropriados)
  const aApropriar = Math.max(0, valorPago - jaApropriado)

  return {
    valorPago,
    jaApropriado,
    aApropriar,
    mesesRestantes,
    mesesApropriados,
  }
}

/**
 * Funções puras de apropriação por competência contábil (Regime de Competência - B3.4, RA-31).
 *
 * Camada de domínio PURA: sem React, sem Next, sem I/O, sem async.
 * Valores monetários SEMPRE inteiros em centavos (Cents).
 *
 * REGRAS CONTÁBEIS:
 *  - Ciclo mensal: receita na competência da fatura paga.
 *  - Plano: linear pelos meses que ele cobre — 1/12 no anual, 1/24 no de 24 meses;
 *    a sobra do arredondamento vai para o último mês, para todos somarem exatamente
 *    o valor pago.
 *  - Não conta duas vezes: faturas de plano não somam na receita de fatura do ciclo,
 *    pois são apropriadas mês a mês via `apropriacaoDoPlano`.
 */

import type { Periodo } from './dre'
import { mesesCobertos, somarMeses } from './plano-custodia'
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
 * Receita de um plano de custódia dentro de um período contábil, apropriada
 * linearmente pelos meses que o plano cobre: 1/12 no anual, 1/24 no de 24 meses.
 * A sobra do arredondamento vai para o último mês, para as parcelas somarem
 * exatamente o valor líquido pago — R$ 36,00 em 24 meses dá R$ 1,50 redondo, mas
 * uma tabela de taxas editada no painel pode gerar valor que não divide.
 */
export function apropriacaoDoPlano(plano: PlanoCustodia, periodo: Periodo): Cents {
  if (plano.status !== 'vigente' && plano.status !== 'encerrado') return 0

  const valorLiquido = plano.valorTotalCents - (plano.estornadoCents ?? 0)
  if (valorLiquido <= 0) return 0

  const meses = mesesCobertos(plano.modalidade)
  const parcelaMensal = Math.floor(valorLiquido / meses)
  const sobra = valorLiquido - parcelaMensal * meses

  let totalPeriodo = 0

  for (let i = 0; i < meses; i++) {
    const compMes = somarMeses(plano.inicioCompetencia, i)
    if (mesNoPeriodo(compMes, periodo)) {
      const valorMes = i === meses - 1 ? parcelaMensal + sobra : parcelaMensal
      totalPeriodo += valorMes
    }
  }

  return totalPeriodo
}

/**
 * Receita de custódia total reconhecida por competência no período:
 *  - Faturas pagas do ciclo mensal (pela competência da fatura);
 *  - Planos vigentes ou encerrados apropriados linearmente pelos meses cobertos.
 *
 * Evita contagem dupla: faturas emitidas para um plano são desconsideradas na soma
 * de faturas, sendo reconhecidas estritamente pela apropriação mensal do plano.
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

    // Se a fatura é de contratação ou renovação de plano, sua receita é reconhecida via plano
    if (f.origem === 'renovacao_anual') continue
    if (f.planoId && planosMap.has(f.planoId)) continue

    if (mesNoPeriodo(f.competencia, periodo)) {
      receita += f.valorCents
    }
  }

  // 2. Receita dos planos por competência (1/12 ou 1/24 ao mês)
  for (const p of planos ?? []) {
    receita += apropriacaoDoPlano(p, periodo)
  }

  return receita
}

/**
 * Detalhamento de receita diferida para um plano de custódia:
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
  if (valorPago <= 0) {
    return {
      valorPago,
      jaApropriado: valorPago,
      aApropriar: 0,
      mesesRestantes: 0,
      mesesApropriados: 0,
    }
  }

  const meses = mesesCobertos(plano.modalidade)
  const parcelaMensal = Math.floor(valorPago / meses)
  const sobra = valorPago - parcelaMensal * meses

  const dRef = new Date(dataReferencia)
  const compRef = `${dRef.getFullYear()}-${String(dRef.getMonth() + 1).padStart(2, '0')}`

  let jaApropriado = 0
  let mesesApropriados = 0

  for (let i = 0; i < meses; i++) {
    const compMes = somarMeses(plano.inicioCompetencia, i)
    if (compMes <= compRef) {
      mesesApropriados++
      jaApropriado += i === meses - 1 ? parcelaMensal + sobra : parcelaMensal
    }
  }

  const mesesRestantes = Math.max(0, meses - mesesApropriados)
  const aApropriar = Math.max(0, valorPago - jaApropriado)

  return {
    valorPago,
    jaApropriado,
    aApropriar,
    mesesRestantes,
    mesesApropriados,
  }
}

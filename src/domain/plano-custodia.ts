/**
 * O "plano" de custódia: o PAGAMENTO ANTECIPADO do primeiro mês de um envio.
 *
 * O QUE ELE É DESDE 03/11/2026
 * ----------------------------
 * Na tela de Envios o cliente paga o primeiro mês de custódia das moedas que está mandando, antes de elas
 * chegarem. Isso gera um plano (o registro do envio pago) e uma fatura de origem `contratacao`, ainda sem
 * moeda nenhuma. Quando a análise aceita as moedas, `alimentarPlanoNaAnalise` liga essa fatura às moedas
 * aceitas e dá a ela o PRIMEIRO CICLO delas: do dia do aceite ao dia anterior ao aniversário seguinte. A
 * partir daí a moeda segue a regra única de src/domain/custodia-da-moeda.ts, como qualquer outra.
 *
 * O QUE ELE DEIXOU DE SER
 * -----------------------
 * Até 03/11/2026 o plano era um segundo modelo de cobrança, contado por mês do calendário: pago em 27/10,
 * cobria "outubro" (até 31/10), qualquer que fosse o dia em que a moeda fosse aceita, e um cron o renovava
 * no dia 1º. Foi o que travou a moeda do Sidnei em 01/11 — aceita em 30/10, coberta por um dia — e cobrou
 * do Rogério, em 01/11, a renovação de um plano sem moeda nenhuma. A cobertura do plano, a renovação e a
 * conta "pago até a competência" saíram do código; `pagoAteCompetencia` ficou só como registro para os
 * relatórios.
 *
 * Os planos anual, de 24 meses e de transferência foram aposentados em setembro de 2026 e não voltam.
 */

import { cicloDaMoeda } from '@/domain/ciclo-custodia'
import { CUSTODIA_MENSAL_POR_MOEDA_CENTS } from '@/domain/fees'
import type { Cents, FaturaCustodia, ModalidadePlanoCustodia, PlanoCustodia, Timestamp, User } from '@/domain/types'

/**
 * O recorte da Tabela de Taxas que o plano de custódia precisa.
 *
 * Campos opcionais e índice aberto de propósito: quem chama passa a tabela
 * vigente inteira, vinda do banco (C3), e aqui só interessa uma coluna.
 *
 * `Cents | number | undefined` no índice, e não `unknown`: com `unknown` a
 * `TabelaDeTaxas` de `fees.ts` deixava de ser atribuível a este tipo — todo
 * campo dela é número, e um índice `unknown` exige que o tipo de origem também
 * declare um. Quem passa a tabela vigente passa um objeto de números.
 */
export interface TabelaDeTaxasPlano {
  custodiaMensalPorMoeda?: Cents
  [key: string]: number | undefined
}

export type TabelaDeTaxas = TabelaDeTaxasPlano

/**
 * Quantos meses de guarda o pagamento cobre: um. Fica para a apropriação contábil
 * (src/domain/competencia.ts), que reparte o valor pago pelos meses cobertos.
 */
export function mesesCobertos(_modalidade?: ModalidadePlanoCustodia): number {
  return 1
}

/**
 * Calcula os valores unitário, total e limite de parcelamento do pagamento antecipado.
 */
export function valorDoPlano(
  _modalidade: ModalidadePlanoCustodia,
  quantidade: number,
  taxas?: TabelaDeTaxasPlano,
): { porMoeda: Cents; total: Cents; parcelasMax: number; meses: number } {
  const qtd = Math.max(0, Math.floor(quantidade))
  const mensal = taxas?.custodiaMensalPorMoeda ?? CUSTODIA_MENSAL_POR_MOEDA_CENTS
  return { porMoeda: mensal, total: mensal * qtd, parcelasMax: 1, meses: 1 }
}

/**
 * Soma ou subtrai meses de uma competência 'AAAA-MM', virando o ano corretamente.
 * Uso contábil (competência de lançamento), não de cobertura de custódia.
 */
export function somarMeses(competencia: string, meses: number): string {
  const [anoStr, mesStr] = competencia.split('-')
  const ano = parseInt(anoStr, 10)
  const mes = parseInt(mesStr, 10)

  if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
    throw new Error(`Competência inválida: ${competencia}`)
  }

  const totalMeses = ano * 12 + (mes - 1) + meses
  const novoAno = Math.floor(totalMeses / 12)
  const novoMes = (((totalMeses % 12) + 12) % 12) + 1

  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}

/**
 * Liga o pagamento antecipado do envio às moedas aceitas na análise (passo B2.5, refeito em 03/11/2026).
 *
 * - a fatura de contratação passa a listar as moedas aceitas e a cobrir o PRIMEIRO CICLO delas, do dia do
 *   aceite ao dia anterior ao aniversário seguinte — paga ou não. Paga, a moeda já nasce negociável; em
 *   aberto, é ela a conta do primeiro ciclo, e a entrada no acervo não emite outra;
 * - plano já pago e moedas recusadas -> `estornadoCents += recusadas * valorPorMoeda`, creditado ao saldo;
 * - plano não pago e moedas recusadas -> a fatura de contratação passa a valer só as aceitas;
 * - todas recusadas -> plano cancelado; fatura cancelada se não paga, ou estorno integral se paga.
 *
 * Chame ANTES de `cobrarEntradaNoAcervo`, na mesma transação: é a fatura ligada aqui que faz a entrada
 * reconhecer o ciclo como já cobrado.
 */
export function alimentarPlanoNaAnalise({
  plano,
  faturas,
  user,
  moedaIdsAprovadas,
  quantidadeRecusadas,
  agora = Date.now(),
}: {
  plano?: PlanoCustodia
  faturas: FaturaCustodia[]
  user: User
  moedaIdsAprovadas: string[]
  quantidadeRecusadas: number
  agora?: Timestamp
}): void {
  if (!plano) return

  const aprovadas = moedaIdsAprovadas.length
  const recusadas = Math.max(0, quantidadeRecusadas)
  const fatura = faturas.find(
    (f) => f.planoId === plano.id && f.origem === 'contratacao' && f.status !== 'cancelada',
  )
  const jaPago = plano.status === 'vigente' || fatura?.status === 'paga'

  if (aprovadas === 0) {
    plano.status = 'cancelado'
    plano.moedaIds = []
    plano.atualizadoEm = agora

    if (jaPago) {
      const estorno = plano.valorTotalCents
      plano.estornadoCents = (plano.estornadoCents || 0) + estorno
      user.balance += estorno
    } else if (fatura && fatura.status !== 'paga') {
      fatura.status = 'cancelada'
    }
    return
  }

  plano.moedaIds = [...moedaIdsAprovadas]
  plano.atualizadoEm = agora

  if (recusadas > 0) {
    if (jaPago) {
      const estorno = recusadas * plano.valorPorMoedaCents
      plano.estornadoCents = (plano.estornadoCents || 0) + estorno
      user.balance += estorno
    } else if (fatura && fatura.status !== 'paga') {
      const novoValor = aprovadas * plano.valorPorMoedaCents
      plano.valorTotalCents = novoValor
      fatura.valorCents = novoValor
    }
  }

  if (!fatura) return

  fatura.moedaIds = [...moedaIdsAprovadas]
  // Paga, a quantidade fica a que foi paga (e tem nota emitida); a sobra das recusadas voltou como estorno.
  if (fatura.status !== 'paga') fatura.quantidadeMoedas = aprovadas

  // O PRIMEIRO CICLO DAS MOEDAS ACEITAS. Todas nascem no mesmo aceite, então têm o mesmo ciclo; a data é a
  // gravada na moeda (`entrada`), a mesma que o cron vai usar nos aniversários seguintes.
  const entrada = user.coins.find((c) => moedaIdsAprovadas.includes(c.id))?.entrada
  if (!entrada) return
  const ciclo = cicloDaMoeda(entrada, agora)
  fatura.competencia = ciclo.competencia
  fatura.dataVencimento = ciclo.fim
  fatura.coberturaAte = ciclo.fim - 1
  plano.inicioCompetencia = ciclo.competencia
  if (fatura.status === 'paga') plano.pagoAteCompetencia = ciclo.competencia
}

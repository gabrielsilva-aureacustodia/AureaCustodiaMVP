/**
 * Regras puras de domínio para planos de custódia (mensal e anual) e ciclo de faturamento.
 *
 * Passo B2.3 da Frente B (Finalizações 13/09/2026).
 *
 * Modos de contratação:
 * - Mensal: R$ 2,00 por moeda por mês, 1 parcela.
 * - Anual: R$ 24,00 por moeda por ano, parcelamento em até 12x no cartão.
 *
 * Cobertura e ciclo:
 * - A competência coberta impede cobrança duplicada no ciclo do dia 1º.
 * - Moedas cobertas por plano vigente e quitado são deduzidas das moedas faturáveis.
 * - Planos anuais vencidos geram renovação anual no 13º mês.
 */

import {
  CUSTODIA_ANUAL_POR_MOEDA_CENTS,
  CUSTODIA_MENSAL_POR_MOEDA_CENTS,
} from '@/domain/fees'
import {
  calcularVencimentoFatura,
  DIAS_TOLERANCIA_FATURA,
  moedasFaturaveis,
} from '@/domain/custody'
import type {
  Cents,
  FaturaCustodia,
  ModalidadePlanoCustodia,
  PlanoCustodia,
  Timestamp,
  User,
  UserEmail,
} from '@/domain/types'

export interface TabelaDeTaxasPlano {
  custodiaMensalPorMoeda?: Cents
  custodiaAnualPorMoeda?: Cents
  custodiaAnualParcelasMax?: number
  [key: string]: unknown
}

export type TabelaDeTaxas = TabelaDeTaxasPlano

/**
 * Calcula os valores unitário, total e limite de parcelamento do plano de custódia.
 */
export function valorDoPlano(
  modalidade: ModalidadePlanoCustodia,
  quantidade: number,
  taxas?: TabelaDeTaxasPlano
): { porMoeda: Cents; total: Cents; parcelasMax: number } {
  const qtd = Math.max(0, Math.floor(quantidade))

  if (modalidade === 'mensal') {
    const porMoeda = taxas?.custodiaMensalPorMoeda ?? CUSTODIA_MENSAL_POR_MOEDA_CENTS
    return {
      porMoeda,
      total: porMoeda * qtd,
      parcelasMax: 1,
    }
  }

  const porMoeda = taxas?.custodiaAnualPorMoeda ?? CUSTODIA_ANUAL_POR_MOEDA_CENTS
  const parcelasMax = taxas?.custodiaAnualParcelasMax ?? 12
  return {
    porMoeda,
    total: porMoeda * qtd,
    parcelasMax,
  }
}

/**
 * Soma ou subtrai meses de uma competência 'AAAA-MM', virando o ano corretamente.
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
 * Calcula até qual competência um plano recém-pago cobre a custódia.
 * - Mensal: cobre a própria competência de início (+0 meses).
 * - Anual: cobre 12 meses (+11 meses a partir do início).
 */
export function calcularPagoAte(
  inicioCompetencia: string,
  modalidade: ModalidadePlanoCustodia
): string {
  return modalidade === 'mensal'
    ? somarMeses(inicioCompetencia, 0)
    : somarMeses(inicioCompetencia, 11)
}

/**
 * Avalia se uma competência específica está coberta por um plano quitado.
 */
export function competenciaCoberta(
  plano: PlanoCustodia,
  competencia: string
): boolean {
  if (plano.status !== 'vigente') return false
  if (!plano.pagoAteCompetencia) return false
  return (
    competencia >= plano.inicioCompetencia &&
    competencia <= plano.pagoAteCompetencia
  )
}

/**
 * Retorna o conjunto de IDs de moedas cobertas por planos vigentes na competência informada.
 */
export function moedasCobertas(
  planos: PlanoCustodia[],
  competencia: string
): Set<string> {
  const cobertas = new Set<string>()
  for (const plano of planos) {
    if (competenciaCoberta(plano, competencia) || renovacaoAnualDevida(plano, competencia)) {
      for (const id of plano.moedaIds) {
        cobertas.add(id)
      }
    }
  }
  return cobertas
}

/**
 * Gera a fatura do ciclo mensal para moedas que NÃO estejam cobertas por nenhum plano ativo.
 * Retorna null se todas as moedas estiverem cobertas ou se o usuário não possuir moedas ativas.
 */
export function gerarFaturaDoCiclo(
  user: User,
  userEmail: UserEmail,
  competencia: string,
  planos: PlanoCustodia[],
  taxas?: TabelaDeTaxasPlano,
  agora: Timestamp = Date.now()
): FaturaCustodia | null {
  const moedasAtivas = moedasFaturaveis(user)
  const cobertas = moedasCobertas(planos, competencia)
  const naoCobertas = moedasAtivas.filter((c) => !cobertas.has(c.id))

  if (naoCobertas.length === 0) {
    return null
  }

  const taxaUnitária = taxas?.custodiaMensalPorMoeda ?? CUSTODIA_MENSAL_POR_MOEDA_CENTS
  const valorCents = naoCobertas.length * taxaUnitária
  const sanitizeEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const id = `FAT-${competencia}-${sanitizeEmail}-${agora}`

  return {
    id,
    userEmail,
    competencia,
    quantidadeMoedas: naoCobertas.length,
    moedaIds: naoCobertas.map((c) => c.id),
    valorCents,
    status: 'pendente',
    dataEmissao: agora,
    dataVencimento: calcularVencimentoFatura(agora, DIAS_TOLERANCIA_FATURA),
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
    planoId: null,
    origem: 'ciclo_mensal',
  }
}

/**
 * Avalia se um plano anual atingiu o período de renovação (13º mês, ou seja, pago até o mês anterior).
 */
export function renovacaoAnualDevida(
  plano: PlanoCustodia,
  competencia: string
): boolean {
  if (plano.modalidade !== 'anual') return false
  if (plano.status !== 'vigente') return false
  if (!plano.pagoAteCompetencia) return false

  const mesAnterior = somarMeses(competencia, -1)
  return plano.pagoAteCompetencia === mesAnterior
}

/**
 * Atualiza o plano de custódia e faturas após a análise física (emissão de recibos).
 * Passo B2.5:
 * - moedas aprovadas entram em `plano.moedaIds`;
 * - plano já pago e moedas recusadas -> `estornadoCents += recusadas * valorPorMoeda`, creditado ao saldo;
 * - plano não pago e moedas recusadas -> fatura de contratação passa a valer só as aprovadas;
 * - todas recusadas -> plano cancelado; fatura cancelada se não paga, ou estorno integral se paga.
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
  const fatura = faturas.find((f) => f.planoId === plano.id && f.origem === 'contratacao')
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
      fatura.quantidadeMoedas = aprovadas
      fatura.moedaIds = [...moedaIdsAprovadas]
    }
  }
}


/**
 * Regras puras de domínio para o plano de custódia e o ciclo de faturamento.
 *
 * Passo B2.3 da Frente B (Finalizações 13/09/2026); planos revistos em
 * 18/09, 20/09 e 21/09/2026.
 *
 * Modos de contratação:
 * - Mensal: R$ 3,00 por moeda por mês, sem prazo, renovado no ciclo.
 * - Anual: R$ 24,00 por moeda pelos 12 meses (R$ 2,00/mês), em até 12x no cartão.
 *
 * O plano de 24 meses existiu e foi aposentado em 20/09/2026; não volta.
 *
 * PLANO MENSAL E CICLO MENSAL NÃO SÃO A MESMA COISA, apesar do mesmo preço.
 * Plano é o que o cliente escolhe e fica gravado em `planosCustodia`; ciclo
 * (`gerarFaturaDoCiclo`) é o que se cobra de quem tem moeda guardada SEM plano
 * vigente — plano vencido, moeda solta de plano cancelado, moeda cadastrada
 * direto pela bancada. Confundir os dois foi o que embaralhou a cobrança antes.
 *
 * Cobertura e ciclo:
 * - A competência coberta impede cobrança duplicada no ciclo do dia 1º.
 * - Moedas cobertas por plano vigente e quitado são deduzidas das moedas faturáveis.
 * - Plano vencido gera fatura de renovação no mês seguinte ao último mês coberto
 *   (13º mês do anual, 2º mês do mensal).
 */

import {
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

/**
 * O recorte da Tabela de Taxas que o plano de custódia precisa.
 *
 * Campos opcionais e índice aberto de propósito: quem chama passa a tabela
 * vigente inteira, vinda do banco (C3), e aqui só interessam três colunas. O
 * índice usa `unknown` em vez de repetir a `TabelaDeTaxas` de `fees.ts` para
 * que este módulo não fique preso ao formato completo dela.
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
 * Quantos meses de guarda a modalidade cobre.
 * Apenas modalidade mensal (1 mês).
 */
export function mesesCobertos(_modalidade?: ModalidadePlanoCustodia): number {
  return 1
}

/**
 * Quantos meses este plano cobre (1 mês no plano mensal).
 */
export function mesesDoPlano(_plano?: {
  modalidade?: ModalidadePlanoCustodia
}): number {
  return 1
}

/**
 * Calcula os valores unitário, total e limite de parcelamento do plano de custódia mensal.
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
 * No plano mensal cobre apenas o mês corrente (inicioCompetencia).
 */
export function calcularPagoAte(
  inicioCompetencia: string,
  _modalidade?: ModalidadePlanoCustodia,
): string {
  return inicioCompetencia
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
    if (competenciaCoberta(plano, competencia) || renovacaoDevida(plano, competencia)) {
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
 * Avalia se um plano vigente chegou ao mês da renovação — o primeiro mês depois do
 * último coberto (13º mês).
 *
 * A conta não olha a modalidade: compara `pagoAteCompetencia` com o mês anterior,
 * e quem escreveu essa competência já levou o prazo do plano em conta.
 */
export function renovacaoDevida(
  plano: PlanoCustodia,
  competencia: string
): boolean {
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


/**
 * Taxas: custódia (anual, por faixa de quantidade) e corretagem (por moeda).
 *
 * Port de aurea-mvp-teste.html. A custódia por faixas das linhas 802-805 foi
 * aposentada pela decisão D-3; sobrou daquele trecho a comissão. Ver também
 * a comissão de negociação, que no MVP não era função — a expressão
 * `Math.round(price*FEE_PCT)+FEE_FIXED` aparecia repetida em três lugares
 * (linhas 990, 1423 e 1781). Aqui vira `tradeFee`, com o mesmo resultado
 * numérico, para que compra por lote, venda a bid e a prévia da interface não
 * possam divergir entre si.
 */

import { FEE_PCT, FEE_FIXED } from '@/domain/constants'
import type { Cents } from '@/domain/types'

/**
 * Taxa de custódia mensal e anual por moeda (Decisão D-3, 10/09/2026).
 *
 * Substitui as faixas anuais antigas por R$ 2,00 por moeda por mês,
 * ou plano anual de R$ 24,00 por moeda em até 12x (sem desconto).
 */
export const CUSTODIA_MENSAL_POR_MOEDA_CENTS: Cents = 200 // R$ 2,00
export const CUSTODIA_ANUAL_POR_MOEDA_CENTS: Cents = 2400 // R$ 24,00

/**
 * Calcula a taxa mensal de custódia pela quantidade de moedas ativas sob guarda.
 */
export function custodiaMensalPorMoeda(qtdMoedas: number): Cents {
  if (!Number.isFinite(qtdMoedas) || qtdMoedas <= 0) return 0
  return Math.floor(qtdMoedas) * CUSTODIA_MENSAL_POR_MOEDA_CENTS
}

/**
 * Calcula a taxa anual de custódia pela quantidade de moedas ativas sob guarda.
 */
export function custodiaAnualPorMoeda(qtdMoedas: number): Cents {
  if (!Number.isFinite(qtdMoedas) || qtdMoedas <= 0) return 0
  return Math.floor(qtdMoedas) * CUSTODIA_ANUAL_POR_MOEDA_CENTS
}

/**
 * Comissão de uma negociação, por moeda: 0,5% do preço + R$ 1,00 fixo.
 *
 * O arredondamento é do percentual antes de somar o fixo — inverter a ordem ou
 * arredondar no fim mudaria o centavo em alguns preços, então a expressão fica
 * exatamente como estava no original.
 */
export function tradeFee(price: Cents): Cents {
  return Math.round(price * FEE_PCT) + FEE_FIXED
}

/**
 * Tarifa fixa de saque de recursos: R$ 5,00 debitados do valor sacado (Sessão B-4).
 * Cobre os custos operacionais e bancários de liquidação Pix/TED para o cliente.
 */
export const TAXA_SAQUE_FIXA_CENTS: Cents = 500

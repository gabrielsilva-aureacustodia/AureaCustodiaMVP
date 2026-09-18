/**
 * Taxas: custódia (ciclo mensal, plano anual e plano de 24 meses), corretagem dos
 * dois lados e saque.
 *
 * Tabela única de taxas da Áurea Custódia (Decisão F-1, 13/09/2026).
 *
 * Substitui os valores dispersos pelo objeto `TAXAS_PADRAO`.
 * Valores monetários em centavos (Cents), percentuais em pontos-base (bp).
 *
 * OS PLANOS SÃO DOIS (18/09/2026): anual e 24 meses. O plano mensal foi
 * aposentado — a moeda entra em custódia já dentro de um dos dois. O valor
 * `custodiaMensalPorMoeda` continua existindo porque NÃO é plano: é o preço do
 * ciclo mensal, a cobrança de quem tem moeda guardada sem plano vigente (plano
 * vencido, moeda que sobrou de um plano cancelado). R$ 2,00/mês é exatamente
 * 1/12 do plano anual, então a conta fecha nos dois caminhos.
 */

import type { Cents } from '@/domain/types'

/** Pontos-base: 50 bp = 0,5%. Inteiro, como em aurea.parametros_contabeis. */
export interface TabelaDeTaxas {
  comissaoCompradorBp: number
  comissaoCompradorFixa: Cents
  comissaoVendedorBp: number
  comissaoVendedorFixa: Cents
  custodiaMensalPorMoeda: Cents
  custodiaAnualPorMoeda: Cents
  custodiaAnualParcelasMax: number
  custodiaBienalPorMoeda: Cents
  custodiaBienalParcelasMax: number
  taxaSaqueFixa: Cents
  taxaRetiradaComum: Cents
  taxaRetiradaSegura: Cents
  retiradaSeguraParcelasMax: number
}

export const TAXAS_PADRAO: TabelaDeTaxas = {
  comissaoCompradorBp: 50,
  comissaoCompradorFixa: 100,
  comissaoVendedorBp: 50,
  comissaoVendedorFixa: 100,
  custodiaMensalPorMoeda: 200,
  custodiaAnualPorMoeda: 2400,
  custodiaAnualParcelasMax: 12,
  custodiaBienalPorMoeda: 3600,
  custodiaBienalParcelasMax: 12,
  taxaSaqueFixa: 500,
  taxaRetiradaComum: 5000,
  taxaRetiradaSegura: 18000,
  retiradaSeguraParcelasMax: 2,
}

export interface ComissaoPorMoeda {
  comprador: Cents
  vendedor: Cents
}

/**
 * Calcula a comissão de uma negociação por moeda para comprador e vendedor.
 * Cada lado: Math.round(price * bp / 10000) + fixa.
 */
export function comissaoPorMoeda(price: Cents, t?: TabelaDeTaxas): ComissaoPorMoeda
export function comissaoPorMoeda(price: Cents, lado: 'comprador' | 'vendedor', t?: TabelaDeTaxas): Cents
export function comissaoPorMoeda(
  price: Cents,
  ladoOuTaxas?: 'comprador' | 'vendedor' | TabelaDeTaxas,
  taxasSeLado?: TabelaDeTaxas,
): ComissaoPorMoeda | Cents {
  const t =
    typeof ladoOuTaxas === 'object' && ladoOuTaxas !== null
      ? ladoOuTaxas
      : (taxasSeLado ?? TAXAS_PADRAO)
  const comprador = Math.round((price * t.comissaoCompradorBp) / 10000) + t.comissaoCompradorFixa
  const vendedor = Math.round((price * t.comissaoVendedorBp) / 10000) + t.comissaoVendedorFixa
  if (ladoOuTaxas === 'comprador') return comprador
  if (ladoOuTaxas === 'vendedor') return vendedor
  return { comprador, vendedor }
}

/** Preço unitário + comissão do comprador. */
export function custoDeCompraPorMoeda(price: Cents, t: TabelaDeTaxas = TAXAS_PADRAO): Cents {
  return price + comissaoPorMoeda(price, t).comprador
}

/** Preço unitário − comissão do vendedor. */
export function liquidoDeVendaPorMoeda(price: Cents, t: TabelaDeTaxas = TAXAS_PADRAO): Cents {
  return price - comissaoPorMoeda(price, t).vendedor
}

/**
 * Comissão histórica (lado do vendedor): 0,5% do preço + R$ 1,00 fixo.
 * Mantida para retrocompatibilidade com chamadores que ainda não foram atualizados.
 */
export function tradeFee(price: Cents, lado: 'comprador' | 'vendedor' = 'vendedor'): Cents {
  return comissaoPorMoeda(price, lado)
}

/**
 * Taxa de custódia por moeda (Decisão D-3, 10/09/2026; planos revistos em 18/09/2026).
 * Apelidos para TAXAS_PADRAO.
 *
 * Mensal é o ciclo (R$ 2,00/mês). Anual é R$ 24,00 pelos 12 meses — os mesmos
 * R$ 2,00 por mês. Bienal é R$ 36,00 pelos 24 meses, ou seja R$ 1,50 por mês:
 * o desconto de quem contrata o dobro de tempo.
 */
export const CUSTODIA_MENSAL_POR_MOEDA_CENTS: Cents = TAXAS_PADRAO.custodiaMensalPorMoeda
export const CUSTODIA_ANUAL_POR_MOEDA_CENTS: Cents = TAXAS_PADRAO.custodiaAnualPorMoeda
export const CUSTODIA_BIENAL_POR_MOEDA_CENTS: Cents = TAXAS_PADRAO.custodiaBienalPorMoeda

/**
 * Calcula a taxa mensal de custódia pela quantidade de moedas ativas sob guarda.
 */
export function custodiaMensalPorMoeda(qtdMoedas: number, t: TabelaDeTaxas = TAXAS_PADRAO): Cents {
  if (!Number.isFinite(qtdMoedas) || qtdMoedas <= 0) return 0
  return Math.floor(qtdMoedas) * t.custodiaMensalPorMoeda
}

/**
 * Calcula a taxa anual de custódia pela quantidade de moedas ativas sob guarda.
 */
export function custodiaAnualPorMoeda(qtdMoedas: number, t: TabelaDeTaxas = TAXAS_PADRAO): Cents {
  if (!Number.isFinite(qtdMoedas) || qtdMoedas <= 0) return 0
  return Math.floor(qtdMoedas) * t.custodiaAnualPorMoeda
}

/**
 * Tarifa fixa de saque de recursos: R$ 5,00 debitados do valor sacado (Sessão B-4).
 */
export const TAXA_SAQUE_FIXA_CENTS: Cents = TAXAS_PADRAO.taxaSaqueFixa

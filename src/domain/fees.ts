/**
 * Taxas: custódia (anual, por faixa de quantidade) e corretagem (por moeda).
 *
 * Port fiel de aurea-mvp-teste.html: `custodyFeeForCount` das linhas 802-805 e
 * a comissão de negociação, que no MVP não era função — a expressão
 * `Math.round(price*FEE_PCT)+FEE_FIXED` aparecia repetida em três lugares
 * (linhas 990, 1423 e 1781). Aqui vira `tradeFee`, com o mesmo resultado
 * numérico, para que compra por lote, venda a bid e a prévia da interface não
 * possam divergir entre si.
 */

import { FEE_PCT, FEE_FIXED } from '@/domain/constants'
import type { Cents } from '@/domain/types'

/**
 * Taxa de custódia anual pela quantidade de moedas guardadas.
 *
 * Faixas fixas vindas da planilha financeira — quanto maior o acervo, menor o
 * custo por moeda, e acima de 30 é preço único de acervo grande.
 */
export function custodyFeeForCount(n: number): Cents {
  if (n <= 1) return 500
  if (n <= 10) return 1500
  if (n <= 20) return 2500
  if (n <= 30) return 3000
  return 6000
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

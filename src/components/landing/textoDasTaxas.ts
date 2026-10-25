/**
 * Frases de taxa da landing montadas a partir da tabela VIGENTE (a mesma que /taxas lê no servidor).
 *
 * Até 24/10/2026 a landing digitava "0,5% + R$ 1,00" e "R$ 2,00" no JSX: mudar uma taxa em
 * /admin/configuracao atualizava /taxas e deixava a landing prometendo o valor antigo. Aqui nada é digitado:
 * o percentual vem em pontos-base e o fixo em centavos, como em `TabelaDeTaxas`.
 */

import type { TabelaDeTaxas } from '@/domain/fees'
import { brl } from '@/domain/money'

/** 50 bp → "0,5%". */
export function percentual(bp: number): string {
  return `${(bp / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

/** "0,5% + R$ 1,00" — a comissão de UM lado. Comprador e vendedor hoje pagam igual; se divergirem, cada lado tem a sua. */
export function comissaoDoLado(t: TabelaDeTaxas, lado: 'comprador' | 'vendedor'): string {
  return lado === 'comprador'
    ? `${percentual(t.comissaoCompradorBp)} + ${brl(t.comissaoCompradorFixa)}`
    : `${percentual(t.comissaoVendedorBp)} + ${brl(t.comissaoVendedorFixa)}`
}

/** Os dois lados pagam o mesmo? Decide se a landing fala "de cada lado" ou mostra os dois valores. */
export function comissaoSimetrica(t: TabelaDeTaxas): boolean {
  return t.comissaoCompradorBp === t.comissaoVendedorBp && t.comissaoCompradorFixa === t.comissaoVendedorFixa
}

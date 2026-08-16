/**
 * Dinheiro: a fronteira entre centavos (inteiro) e texto para humanos.
 *
 * Port fiel de aurea-mvp-teste.html (linhas 919 e 947-951). Todo o resto do
 * sistema trabalha com `Cents` inteiro — estas duas funções são o único lugar
 * onde o valor vira string e volta.
 */

import type { Cents } from '@/domain/types'

/**
 * Formata centavos como moeda brasileira: 28500 -> 'R$ 285,00'.
 *
 * A divisão por 100 gera float, mas só na saída e só para o Intl formatar com
 * duas casas — o valor de negócio nunca deixa de ser inteiro.
 */
export function brl(c: Cents): string {
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Lê um preço digitado por brasileiro e devolve centavos.
 *
 * O usuário escreve '1.234,56': o ponto é separador de milhar (some) e a
 * vírgula é decimal (vira ponto). Entrada vazia, não numérica ou não positiva
 * devolve 0, que a camada de cima trata como "preço inválido" — por isso um
 * preço zerado nunca chega ao motor de ordens.
 */
export function parsePrice(v: string): Cents {
  if (!v) return 0
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) || n <= 0 ? 0 : Math.round(n * 100)
}

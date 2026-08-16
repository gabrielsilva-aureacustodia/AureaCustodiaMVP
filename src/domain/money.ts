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
 * Lê um preço digitado e devolve centavos.
 *
 * DIVERGÊNCIA DELIBERADA DO ORIGINAL (linhas 947-951), autorizada pelos sócios.
 * O MVP apagava TODOS os pontos antes de trocar a vírgula por ponto. Isso está
 * certo para o padrão brasileiro — '1.234,56' vira 123456 centavos — mas quem
 * digitasse '250.00' no padrão americano recebia R$ 25.000,00: erro de 100x,
 * silencioso, num campo de texto livre onde o valor vira ordem de venda real.
 *
 * A regra de desambiguação passa a ser:
 *
 *  - Tem vírgula? Ela é o decimal e todo ponto é separador de milhar.
 *    '1.234,56' -> 1234,56    (padrão brasileiro, comportamento original)
 *
 *  - Não tem vírgula? Decide pelo tamanho do último grupo depois do ponto:
 *      3 dígitos -> milhar     '1.500'    -> 1500,00
 *      1-2 dígitos -> decimal  '250.00'   -> 250,00   (era 25.000,00)
 *                              '10.5'     -> 10,50
 *      múltiplos pontos com o último grupo de 1-2 dígitos: os anteriores são
 *      milhar e o último é decimal — '1.234.56' -> 1234,56
 *
 * O caso que muda de resultado é exatamente o que ninguém escreve de propósito:
 * '1.50' agora é R$ 1,50 e não R$ 150,00. Quem quer cento e cinquenta escreve
 * '150' ou '150,00'.
 *
 * Entrada vazia, não numérica ou não positiva continua devolvendo 0, que a
 * camada de cima trata como "preço inválido" — por isso preço zerado nunca
 * chega ao motor de ordens.
 */
export function parsePrice(v: string): Cents {
  if (!v) return 0

  const texto = String(v).trim()
  if (!texto) return 0

  let normalizado: string

  if (texto.includes(',')) {
    // Padrão brasileiro explícito: ponto é milhar, vírgula é decimal.
    normalizado = texto.replace(/\./g, '').replace(',', '.')
  } else {
    const partes = texto.split('.')
    if (partes.length === 1) {
      normalizado = texto
    } else {
      const ultimo = partes[partes.length - 1]
      // Grupo final de 3 dígitos é milhar ('1.500'); de 1 ou 2 dígitos é
      // decimal ('250.00'). Qualquer outro tamanho não é separador nenhum —
      // trata tudo como milhar e deixa o parseFloat reprovar se for lixo.
      normalizado =
        ultimo.length >= 1 && ultimo.length <= 2
          ? partes.slice(0, -1).join('') + '.' + ultimo
          : partes.join('')
    }
  }

  const n = parseFloat(normalizado)
  return isNaN(n) || n <= 0 ? 0 : Math.round(n * 100)
}

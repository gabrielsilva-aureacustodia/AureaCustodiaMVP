/**
 * Singular ou plural conforme a quantidade (S07, QA do Davi, 22/11/2026): "1 unidade", "4 anúncios".
 * Existe para a tela nunca mais escrever "anúncio(s)", "moeda(s)" ou "disponível(is)". Só o 1 é singular:
 * 0 e 2 em diante levam o plural ("0 moedas"), que é como se fala em português.
 */
export function quantidadeComUnidade(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

/** Só a palavra, para quando o número já está escrito ao lado ("de 4 ofertas"). */
export function palavraNoPlural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

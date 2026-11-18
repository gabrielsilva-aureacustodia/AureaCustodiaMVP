/**
 * O NÚMERO DA MOEDA NO RECIBO (item 12 da manutenção de novembro/2026, pedido do Rogério).
 *
 * "Número da moeda" é o `Coin.id` ('RO-000042', o código sequencial global da moeda) — não o
 * código do recibo ('REC-000042', que só troca o prefixo do mesmo número). A decisão e a
 * evidência estão no MD de execução da frente I.
 *
 * O TEXTO MORA AQUI, EM UM LUGAR SÓ. A folha da tela, o cartão da lista e o PDF importam esta
 * função, para que o recibo baixado diga exatamente o que a pessoa viu — era a regra que o
 * cabeçalho de FolhaDoRecibo já impunha aos cinco campos. Trocar "Moeda nº" por outra
 * redação é mexer numa linha, aqui.
 *
 * ESTE MÓDULO É SÓ EXIBIÇÃO. O hash do recibo (`Recibo.hash`) e a corrente de análises
 * (`src/domain/hash.ts`, `analise.ts`) não leem nada daqui: o número já entra nelas pela via
 * de sempre (`codigoMoeda`), e mostrá-lo no papel não pode alterar nenhum resultado. O teste
 * `numero-da-moeda.test.ts` prova isso.
 *
 * Sem 'use client' e sem importar React: o gerador de PDF (lib/pdf/recibo-pdf.ts) usa este
 * arquivo e não pode puxar a árvore de componentes junto.
 */

/** Rótulo impresso antes do número. Troque aqui para mudar tela, cartão e PDF de uma vez. */
export const ROTULO_NUMERO_DA_MOEDA = 'Moeda nº'

/**
 * "Moeda nº RO-000042". O espaço entre o "nº" e o número é INSEPARÁVEL (U+00A0): na tela estreita
 * (320 px) a linha não pode quebrar entre os dois e deixar "Moeda nº" sozinho numa linha e o
 * código na outra. No PDF o jsPDF mede o espaço inseparável como um espaço comum.
 */
export function rotuloDoNumeroDaMoeda(coinId: string): string {
  return `${ROTULO_NUMERO_DA_MOEDA} ${coinId}`
}

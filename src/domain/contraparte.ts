/**
 * Código anônimo da contraparte na vitrine — 'Vendedor #A93F'.
 *
 * NÃO É PORT. No monolito, e neste port até 10/09/2026, a vitrine escrevia o
 * nome real de quem vendia e de quem comprava: `Vendedor: Rogério Pena`. Isso
 * expunha dado pessoal de um cliente para todos os outros, sem finalidade e sem
 * política de retenção — e a decisão D-5 dos sócios, de 10/09/2026, trocou o
 * nome por um código derivado do id da OFERTA.
 *
 * POR QUE DERIVA DA OFERTA, E NÃO DA PESSOA
 * ----------------------------------------
 * Foi o que os sócios decidiram, e o efeito é desejado: duas ofertas da mesma
 * pessoa recebem códigos diferentes, então ninguém consegue montar de fora o
 * retrato de quanto um vendedor tem em estoque ou com que frequência opera.
 * Um código por pessoa vazaria exatamente isso. A rastreabilidade interna não
 * se perde: o id da oferta continua no estado, no ledger e na auditoria.
 *
 * O código NÃO é dado pessoal e não é reversível — quem tem 'A93F' não
 * consegue voltar ao e-mail, porque são só dezesseis bits de um SHA-256.
 * Colisão entre duas ofertas é possível (uma em 65 mil) e é inofensiva: o
 * código serve para distinguir linhas na tela, nunca para identificar alguém
 * ou para casar ordem.
 *
 * A oferta da PRÓPRIA sessão não passa por aqui — ali a tela continua dizendo
 * 'você'. Esconder de alguém o que é dele só confundiria.
 */

import { sha256Hex } from '@/domain/hash'

/**
 * Quatro hexadecimais maiúsculos derivados de um id de oferta ou de ordem.
 * Determinístico: o mesmo id devolve sempre o mesmo código, em qualquer
 * máquina — é o mesmo SHA-256 puro que assina a trilha de auditoria.
 */
export function codigoContraparte(idDaOferta: string): string {
  return sha256Hex(idDaOferta).slice(0, 4).toUpperCase()
}

/** 'Vendedor #A93F'. O rótulo já vem pronto para a vitrine. */
export function apelidoVendedor(idDaOferta: string): string {
  return 'Vendedor #' + codigoContraparte(idDaOferta)
}

/** 'Comprador #A93F'. */
export function apelidoComprador(idDaOrdem: string): string {
  return 'Comprador #' + codigoContraparte(idDaOrdem)
}

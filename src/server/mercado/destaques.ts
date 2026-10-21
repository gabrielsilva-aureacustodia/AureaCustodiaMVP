/**
 * Os destaques de mercado da landing pública (21/10/2026).
 *
 * A landing é de quem ainda não entrou, então só recebe AGREGADOS do livro de ordens — a maior oferta de compra
 * e a média de cada tipo —, nunca ofertas individuais nem quem as fez. A leitura é tolerante a falha: a landing
 * é a vitrine e não pode cair porque o estado não carregou; sem dados, o cartão mostra "sem ofertas no momento"
 * e a referência externa (que não depende do banco) continua lá.
 */

import { destaqueDeMercado, type DestaqueDeMercado } from '@/domain/destaques-de-mercado'
import { getState } from '@/server/state'

/** Os tipos que a landing apresenta, na ordem em que aparecem. */
export const TIPOS_DA_LANDING = ['Entrega da Bandeira Olímpica', 'Direitos Humanos'] as const

export async function carregarDestaquesDaLanding(): Promise<Record<string, DestaqueDeMercado>> {
  const resultado: Record<string, DestaqueDeMercado> = {}
  try {
    const state = await getState()
    for (const tipo of TIPOS_DA_LANDING) resultado[tipo] = destaqueDeMercado(state, tipo)
  } catch (err) {
    console.error('[landing] destaques de mercado indisponíveis:', err)
  }
  return resultado
}

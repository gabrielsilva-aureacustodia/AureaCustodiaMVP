/**
 * O que o bloco principal de cada moeda mostra, na landing e no início (21/10/2026): a MAIOR OFERTA DE COMPRA
 * em destaque, a média de mercado da plataforma e a referência de mercado externo (flor de cunho).
 *
 * UMA FUNÇÃO PARA AS DUAS TELAS. A landing é desenhada no servidor e o início no navegador, mas as duas
 * perguntam a mesma coisa ao mesmo estado — se cada uma calculasse a sua, a maior oferta mostrada na landing
 * e a mostrada depois do login poderiam divergir.
 *
 * Os três números são de naturezas diferentes e a tela os rotula como tal:
 *  - maior oferta de compra: quanto alguém quer pagar AGORA (livro de ordens da plataforma);
 *  - média de mercado: a mediana das ofertas de venda abertas e das últimas negociações (`medianSellPrice`);
 *  - referência externa: preço de FORA da plataforma, para moeda em flor de cunho (`REFERENCIA_EXTERNA_FDC`).
 *
 * Regra pura, sem I/O. Número ausente vira `null` e a tela diz que não há — nunca zero.
 */

import { referenciaExterna, type ReferenciaExterna } from '@/domain/constants'
import { maiorOfertaDeCompra, medianSellPrice } from '@/domain/market'
import type { AppState, Cents } from '@/domain/types'

export interface DestaqueDeMercado {
  tipo: string
  maiorOfertaDeCompra: Cents | null
  mediaDeMercado: Cents | null
  referenciaExterna: ReferenciaExterna | null
}

export function destaqueDeMercado(state: AppState, tipo: string): DestaqueDeMercado {
  return {
    tipo,
    maiorOfertaDeCompra: maiorOfertaDeCompra(state, tipo),
    mediaDeMercado: medianSellPrice(state, tipo),
    referenciaExterna: referenciaExterna(tipo),
  }
}

/**
 * Repositório das reservas de compra pós-paga: `aurea.reservas_compra`.
 *
 * A reserva é a janela de dez minutos que o comprador pós-pago tem para pagar
 * depois de a oferta dele casar — o desenho está em
 * `src/domain/reserva-de-compra.ts`.
 *
 * A oferta de venda vai inteira para `oferta_json`, e não em colunas: se a
 * reserva expirar, ela precisa voltar ao livro exatamente como era, inclusive
 * `obs` e `lotId`. Espalhar em colunas convida a esquecer um campo na volta, e
 * foi o que aconteceu na primeira versão.
 *
 * Opera dentro de transações com `Consulta` (ou `tx`), como os demais.
 */

import type { ReservaDeCompra, SellOffer, StatusReservaDeCompra } from '@/domain/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

export type LinhaReserva = {
  id: string
  bid_id: string
  comprador: string
  vendedor: string
  coin_id: string
  tipo_moeda: string
  preco: unknown
  comissao_comprador: unknown
  total: unknown
  oferta_json: SellOffer | string
  criada_em: unknown
  expira_em: unknown
  status: string
  payment_intent_ref: string | null
  avisado_em: unknown
}

function linhaParaReserva(r: LinhaReserva): ReservaDeCompra {
  // O driver devolve `jsonb` já desserializado, mas o PGlite dos testes pode
  // entregar texto. Aceitar os dois evita um bug que só aparece num ambiente.
  const oferta: SellOffer =
    typeof r.oferta_json === 'string' ? (JSON.parse(r.oferta_json) as SellOffer) : r.oferta_json

  return {
    id: r.id,
    bidId: r.bid_id,
    comprador: r.comprador,
    vendedor: r.vendedor,
    coinId: r.coin_id,
    tipoMoeda: r.tipo_moeda,
    precoCents: num(r.preco),
    comissaoCompradorCents: num(r.comissao_comprador),
    totalCents: num(r.total),
    oferta,
    criadaEm: num(r.criada_em),
    expiraEm: num(r.expira_em),
    status: r.status as StatusReservaDeCompra,
    paymentIntentRef: r.payment_intent_ref ?? null,
    avisadoEm: r.avisado_em === null || r.avisado_em === undefined ? null : num(r.avisado_em),
  }
}

const COLUNAS = `id, bid_id, comprador, vendedor, coin_id, tipo_moeda, preco,
                 comissao_comprador, total, oferta_json, criada_em, expira_em,
                 status, payment_intent_ref, avisado_em`

export async function carregarReservas(tx: Consulta): Promise<ReservaDeCompra[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaReserva>(
    `SELECT ${COLUNAS} FROM ${S}.reservas_compra ORDER BY criada_em`,
  )
  return rows.map(linhaParaReserva)
}

export async function inserirReserva(tx: Consulta, r: ReservaDeCompra): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.reservas_compra (${COLUNAS})
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      r.id,
      r.bidId,
      r.comprador,
      r.vendedor,
      r.coinId,
      r.tipoMoeda,
      r.precoCents,
      r.comissaoCompradorCents,
      r.totalCents,
      JSON.stringify(r.oferta),
      r.criadaEm,
      r.expiraEm,
      r.status,
      r.paymentIntentRef ?? null,
      r.avisadoEm ?? null,
    ],
  )
}

/**
 * Atualiza o que muda depois de aberta: o status, a referência da cobrança e a
 * marca de aviso. Valor, moeda e prazo são congelados na abertura — reescrevê-los
 * mudaria o combinado no meio dos dez minutos.
 */
export async function atualizarReserva(tx: Consulta, r: ReservaDeCompra): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.reservas_compra
        SET status = $2, payment_intent_ref = $3, avisado_em = $4
      WHERE id = $1`,
    [r.id, r.status, r.paymentIntentRef ?? null, r.avisadoEm ?? null],
  )
}

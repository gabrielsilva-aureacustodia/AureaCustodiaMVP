/**
 * Repositório do livro de ordens: `aurea.sell_offers` e `aurea.buy_orders`.
 *
 * Substitui `state.sellOffers` e `state.buyOrders`. Os dois lados vivem no
 * mesmo arquivo porque são as duas metades do mesmo livro, e é `matchOrders`
 * quem os cruza — nunca um repositório.
 *
 * A ORDEM DE LEITURA IMPORTA: `ORDER BY created_at, ord`. O motor reordena os
 * arrays por preço e depois por `createdAt`, e a ordenação do JavaScript é
 * estável — duas ofertas do mesmo lote nascem no mesmo milissegundo e são
 * desempatadas pela posição no array. Ler em ordem de criação (com `ord`
 * quebrando o empate do milissegundo) reproduz a posição que elas tinham no
 * blob, e o motor decide exatamente como decidia.
 */

import type { BuyOrder, SellOffer } from '@/domain/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

/* ---------- ofertas de venda ---------- */

type LinhaSellOffer = {
  id: string
  coin_id: string
  seller: string
  price: unknown
  obs: string
  lot_id: string
  created_at: unknown
  tipo_moeda: string
}

export async function carregarSellOffers(tx: Consulta): Promise<SellOffer[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaSellOffer>(
    `SELECT id, coin_id, seller, price, obs, lot_id, created_at, tipo_moeda
       FROM ${S}.sell_offers
      ORDER BY created_at, ord`,
  )
  return rows.map((r) => ({
    id: r.id,
    coinId: r.coin_id,
    seller: r.seller,
    price: num(r.price),
    obs: r.obs,
    lotId: r.lot_id,
    createdAt: num(r.created_at),
    tipoMoeda: r.tipo_moeda,
  }))
}

export async function inserirSellOffer(tx: Consulta, o: SellOffer): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.sell_offers (id, coin_id, seller, price, obs, lot_id, created_at, tipo_moeda)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [o.id, o.coinId, o.seller, o.price, o.obs, o.lotId, o.createdAt, o.tipoMoeda],
  )
}

/** Só `price` muda na prática (editLot); os demais campos vão junto por simetria com o diff. */
export async function atualizarSellOffer(tx: Consulta, o: SellOffer): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.sell_offers
        SET coin_id = $2, seller = $3, price = $4, obs = $5, lot_id = $6, created_at = $7, tipo_moeda = $8
      WHERE id = $1`,
    [o.id, o.coinId, o.seller, o.price, o.obs, o.lotId, o.createdAt, o.tipoMoeda],
  )
}

export async function removerSellOffer(tx: Consulta, id: string): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.sell_offers WHERE id = $1`, [id])
}

/* ---------- ofertas de compra (bids) ---------- */

type LinhaBuyOrder = {
  id: string
  buyer: string
  price: unknown
  qty: unknown
  created_at: unknown
  tipo_moeda: string
}

export async function carregarBuyOrders(tx: Consulta): Promise<BuyOrder[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaBuyOrder>(
    `SELECT id, buyer, price, qty, created_at, tipo_moeda
       FROM ${S}.buy_orders
      ORDER BY created_at, ord`,
  )
  return rows.map((r) => ({
    id: r.id,
    buyer: r.buyer,
    price: num(r.price),
    qty: num(r.qty),
    createdAt: num(r.created_at),
    tipoMoeda: r.tipo_moeda,
  }))
}

export async function inserirBuyOrder(tx: Consulta, b: BuyOrder): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.buy_orders (id, buyer, price, qty, created_at, tipo_moeda)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [b.id, b.buyer, b.price, b.qty, b.createdAt, b.tipoMoeda],
  )
}

export async function atualizarBuyOrder(tx: Consulta, b: BuyOrder): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.buy_orders
        SET buyer = $2, price = $3, qty = $4, created_at = $5, tipo_moeda = $6
      WHERE id = $1`,
    [b.id, b.buyer, b.price, b.qty, b.createdAt, b.tipoMoeda],
  )
}

export async function removerBuyOrder(tx: Consulta, id: string): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.buy_orders WHERE id = $1`, [id])
}

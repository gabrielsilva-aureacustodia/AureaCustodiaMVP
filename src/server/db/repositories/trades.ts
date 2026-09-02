/**
 * Repositório de `aurea.trades` — o histórico de negociações.
 *
 * Substitui `state.trades`. APPEND-ONLY: só existe `carregar` e `inserir`. Não
 * há `atualizar` nem `remover` de propósito — o histórico é a prova de quem
 * comprou de quem, e prova alterável não é prova. Se um dia for preciso
 * corrigir uma negociação, o caminho é um lançamento inverso (M4), não um
 * UPDATE.
 *
 * `ORDER BY id` é a ordem cronológica de execução: o seed grava as 32
 * negociações já ordenadas por data, e cada casamento novo entra depois. É
 * dessa ordem que `lastTrade` depende — ele lê o último item do array, não o
 * de maior `date`.
 */

import type { TradeRegistro } from '../diff'
import { nomeDoSchema, num, type Consulta } from '../sql'

type LinhaTrade = {
  price: unknown
  qty: unknown
  date: unknown
  buyer: string
  seller: string
  tipo_moeda: string
  fee: unknown
}

export async function carregarTrades(tx: Consulta): Promise<TradeRegistro[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaTrade>(
    `SELECT price, qty, date, buyer, seller, tipo_moeda, fee
       FROM ${S}.trades
      ORDER BY id`,
  )
  return rows.map((r) => ({
    price: num(r.price),
    qty: num(r.qty),
    date: num(r.date),
    buyer: r.buyer,
    seller: r.seller,
    tipoMoeda: r.tipo_moeda,
    fee: num(r.fee),
  }))
}

export async function inserirTrade(tx: Consulta, t: TradeRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.trades (price, qty, date, buyer, seller, tipo_moeda, fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [t.price, t.qty, t.date, t.buyer, t.seller, t.tipoMoeda, t.fee],
  )
}

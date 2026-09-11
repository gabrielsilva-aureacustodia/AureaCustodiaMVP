/**
 * Repositório de faturas de custódia mensal: `aurea.faturas_custodia`.
 *
 * Persiste e consulta faturas de cobrança mensal de custódia (Sessão B-5, bloco 8).
 * Opera dentro de transações de banco com `Consulta` (ou `tx`).
 */

import type { FaturaCustodia, FormaPagamentoFatura, StatusFatura } from '@/domain/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

export type LinhaFatura = {
  id: string
  user_email: string
  competencia: string
  quantidade_moedas: unknown
  moeda_ids: string[] | string
  valor_cents: unknown
  status: string
  data_emissao: unknown
  data_vencimento: unknown
  data_pagamento: unknown | null
  forma_pagamento: string | null
  payment_intent_id: string | null
}

function linhaParaFatura(r: LinhaFatura): FaturaCustodia {
  let moedaIds: string[] = []
  if (Array.isArray(r.moeda_ids)) {
    moedaIds = r.moeda_ids
  } else if (typeof r.moeda_ids === 'string') {
    try {
      moedaIds = JSON.parse(r.moeda_ids)
    } catch {
      // Caso o driver retorne formato array do postgres `{item1,item2}`
      moedaIds = r.moeda_ids.replace(/^\{|\}$/g, '').split(',').filter(Boolean)
    }
  }

  return {
    id: r.id,
    userEmail: r.user_email,
    competencia: r.competencia,
    quantidadeMoedas: num(r.quantidade_moedas),
    moedaIds,
    valorCents: num(r.valor_cents),
    status: r.status as StatusFatura,
    dataEmissao: num(r.data_emissao),
    dataVencimento: num(r.data_vencimento),
    dataPagamento: r.data_pagamento !== null && r.data_pagamento !== undefined ? num(r.data_pagamento) : null,
    formaPagamento: (r.forma_pagamento as FormaPagamentoFatura) ?? null,
    paymentIntentId: r.payment_intent_id ?? null,
  }
}

/** Carrega todas as faturas de custódia ordenadas por data de emissão. */
export async function carregarFaturas(tx: Consulta): Promise<FaturaCustodia[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaFatura>(
    `SELECT id, user_email, competencia, quantidade_moedas, moeda_ids, valor_cents,
            status, data_emissao, data_vencimento, data_pagamento, forma_pagamento,
            payment_intent_id
       FROM ${S}.faturas_custodia
      ORDER BY data_emissao ASC`,
  )
  return rows.map(linhaParaFatura)
}

/** Carrega faturas de um usuário específico ordenadas pela emissão decrescente. */
export async function buscarFaturasPorUsuario(tx: Consulta, userEmail: string): Promise<FaturaCustodia[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaFatura>(
    `SELECT id, user_email, competencia, quantidade_moedas, moeda_ids, valor_cents,
            status, data_emissao, data_vencimento, data_pagamento, forma_pagamento,
            payment_intent_id
       FROM ${S}.faturas_custodia
      WHERE user_email = $1
      ORDER BY data_emissao DESC`,
    [userEmail],
  )
  return rows.map(linhaParaFatura)
}

/** Busca fatura pelo seu id único. */
export async function buscarFaturaPorId(tx: Consulta, id: string): Promise<FaturaCustodia | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaFatura>(
    `SELECT id, user_email, competencia, quantidade_moedas, moeda_ids, valor_cents,
            status, data_emissao, data_vencimento, data_pagamento, forma_pagamento,
            payment_intent_id
       FROM ${S}.faturas_custodia
      WHERE id = $1`,
    [id],
  )
  if (!rows.length) return null
  return linhaParaFatura(rows[0])
}

/** Insere uma nova fatura de custódia. */
export async function inserirFatura(tx: Consulta, f: FaturaCustodia): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.faturas_custodia (
       id, user_email, competencia, quantidade_moedas, moeda_ids, valor_cents,
       status, data_emissao, data_vencimento, data_pagamento, forma_pagamento,
       payment_intent_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      f.id,
      f.userEmail,
      f.competencia,
      f.quantidadeMoedas,
      f.moedaIds,
      f.valorCents,
      f.status,
      f.dataEmissao,
      f.dataVencimento,
      f.dataPagamento ?? null,
      f.formaPagamento ?? null,
      f.paymentIntentId ?? null,
    ],
  )
}

/** Atualiza status, data de pagamento e forma de pagamento de uma fatura. */
export async function atualizarFatura(tx: Consulta, f: FaturaCustodia): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.faturas_custodia SET
       status = $1,
       data_pagamento = $2,
       forma_pagamento = $3,
       payment_intent_id = $4
     WHERE id = $5`,
    [
      f.status,
      f.dataPagamento ?? null,
      f.formaPagamento ?? null,
      f.paymentIntentId ?? null,
      f.id,
    ],
  )
}

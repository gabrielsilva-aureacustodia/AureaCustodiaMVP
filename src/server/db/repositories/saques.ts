/**
 * Repositório de saques de recursos: `aurea.saques`.
 *
 * Persiste e consulta solicitações de saque de saldo (Sessão B-4, bloco 7b).
 * Opera dentro de transações de banco com `Consulta` (ou `tx`).
 */

import type { DadosBancarios, Saque, StatusSaque } from '@/domain/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

type LinhaSaque = {
  id: string
  user_email: string
  valor_total: unknown
  taxa: unknown
  valor_liquido: unknown
  dados_bancarios: unknown
  status: string
  motivo_falha: string | null
  criado_em: unknown
  previsao_pagamento_em: unknown
  pago_em: unknown | null
  comprovante_ref: string | null
  atualizado_em: unknown
}

function linhaParaSaque(r: LinhaSaque): Saque {
  const dadosBancarios: DadosBancarios =
    typeof r.dados_bancarios === 'string'
      ? JSON.parse(r.dados_bancarios)
      : (r.dados_bancarios as DadosBancarios)

  return {
    id: r.id,
    userEmail: r.user_email,
    valorTotal: num(r.valor_total),
    taxa: num(r.taxa),
    valorLiquido: num(r.valor_liquido),
    dadosBancarios,
    status: r.status as StatusSaque,
    motivoFalha: r.motivo_falha ?? null,
    criadoEm: num(r.criado_em),
    previsaoPagamentoEm: num(r.previsao_pagamento_em),
    pagoEm: r.pago_em !== null && r.pago_em !== undefined ? num(r.pago_em) : null,
    comprovanteRef: r.comprovante_ref ?? null,
    atualizadoEm: num(r.atualizado_em),
  }
}

/** Carrega todos os saques ordenados por data de criação. */
export async function carregarSaques(tx: Consulta): Promise<Saque[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaSaque>(
    `SELECT id, user_email, valor_total, taxa, valor_liquido, dados_bancarios,
            status, motivo_falha, criado_em, previsao_pagamento_em, pago_em,
            comprovante_ref, atualizado_em
       FROM ${S}.saques
      ORDER BY criado_em ASC`,
  )
  return rows.map(linhaParaSaque)
}

/** Insere uma nova solicitação de saque. */
export async function inserirSaque(tx: Consulta, s: Saque): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.saques (
       id, user_email, valor_total, taxa, valor_liquido, dados_bancarios,
       status, motivo_falha, criado_em, previsao_pagamento_em, pago_em,
       comprovante_ref, atualizado_em
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      s.id,
      s.userEmail,
      s.valorTotal,
      s.taxa,
      s.valorLiquido,
      JSON.stringify(s.dadosBancarios),
      s.status,
      s.motivoFalha ?? null,
      s.criadoEm,
      s.previsaoPagamentoEm,
      s.pagoEm ?? null,
      s.comprovanteRef ?? null,
      s.atualizadoEm,
    ],
  )
}

/** Atualiza status, comprovante e motivo de falha de um saque existente. */
export async function atualizarSaque(tx: Consulta, s: Saque): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.saques SET
       status = $1,
       motivo_falha = $2,
       pago_em = $3,
       comprovante_ref = $4,
       atualizado_em = $5
     WHERE id = $6`,
    [
      s.status,
      s.motivoFalha ?? null,
      s.pagoEm ?? null,
      s.comprovanteRef ?? null,
      s.atualizadoEm,
      s.id,
    ],
  )
}

/** Busca um saque pelo seu identificador único. */
export async function buscarSaquePorId(tx: Consulta, id: string): Promise<Saque | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaSaque>(
    `SELECT id, user_email, valor_total, taxa, valor_liquido, dados_bancarios,
            status, motivo_falha, criado_em, previsao_pagamento_em, pago_em,
            comprovante_ref, atualizado_em
       FROM ${S}.saques
      WHERE id = $1`,
    [id],
  )
  if (!rows.length) return null
  return linhaParaSaque(rows[0])
}

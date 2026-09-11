/**
 * Repositório da conta: `aurea.deposits` e `aurea.custody_charges`.
 *
 * Substitui `state.deposits`. A cobrança de custódia saiu daqui em
 * 11/09/2026, junto com o mecanismo antigo — quem cobra agora é a fatura
 * mensal (`aurea.faturas_custodia`). Ficam juntos porque
 * são as duas fatias que a tela de conta (3.0) e o extrato leem — o dinheiro
 * que entrou e a cobrança de custódia vigente.
 *
 * Depósitos são APPEND-ONLY, como as negociações: o extrato precisa explicar
 * de onde veio cada centavo, e um depósito editável explicaria mal. A cobrança
 * de custódia é uma por usuário, sobrescrita a cada recibo emitido — por isso
 * `gravar` é um upsert, não um par inserir/atualizar.
 */

import type { Deposit } from '@/domain/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

/* ---------- depósitos ---------- */

type LinhaDeposit = { user_email: string; valor: unknown; date: unknown }

export async function carregarDeposits(tx: Consulta): Promise<Deposit[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaDeposit>(
    `SELECT user_email, valor, date FROM ${S}.deposits ORDER BY id`,
  )
  return rows.map((r) => ({ userEmail: r.user_email, valor: num(r.valor), date: num(r.date) }))
}

export async function inserirDeposit(tx: Consulta, d: Deposit): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.deposits (user_email, valor, date) VALUES ($1, $2, $3)`,
    [d.userEmail, d.valor, d.date],
  )
}

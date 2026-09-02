/**
 * Repositório da conta: `aurea.deposits` e `aurea.custody_charges`.
 *
 * Substitui `state.deposits` e `state.custodyCharges`. Ficam juntos porque
 * são as duas fatias que a tela de conta (3.0) e o extrato leem — o dinheiro
 * que entrou e a cobrança de custódia vigente.
 *
 * Depósitos são APPEND-ONLY, como as negociações: o extrato precisa explicar
 * de onde veio cada centavo, e um depósito editável explicaria mal. A cobrança
 * de custódia é uma por usuário, sobrescrita a cada recibo emitido — por isso
 * `gravar` é um upsert, não um par inserir/atualizar.
 */

import type { CustodyCharge, Deposit, StatusPagamento, UserEmail } from '@/domain/types'

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

/* ---------- cobrança de custódia ---------- */

type LinhaCustodyCharge = {
  user_email: string
  total_moedas: unknown
  valor_cobrado: unknown
  data_cobranca: string
  status_pagamento: string
}

export async function carregarCustodyCharges(
  tx: Consulta,
): Promise<Array<{ email: UserEmail; cobranca: CustodyCharge }>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaCustodyCharge>(
    `SELECT user_email, total_moedas, valor_cobrado, data_cobranca, status_pagamento
       FROM ${S}.custody_charges
      ORDER BY user_email`,
  )
  return rows.map((r) => ({
    email: r.user_email,
    cobranca: {
      totalMoedas: num(r.total_moedas),
      valorCobrado: num(r.valor_cobrado),
      dataCobranca: r.data_cobranca,
      statusPagamento: r.status_pagamento as StatusPagamento,
    },
  }))
}

export async function gravarCustodyCharge(
  tx: Consulta,
  email: UserEmail,
  c: CustodyCharge,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.custody_charges (user_email, total_moedas, valor_cobrado, data_cobranca, status_pagamento)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_email) DO UPDATE
       SET total_moedas = EXCLUDED.total_moedas,
           valor_cobrado = EXCLUDED.valor_cobrado,
           data_cobranca = EXCLUDED.data_cobranca,
           status_pagamento = EXCLUDED.status_pagamento`,
    [email, c.totalMoedas, c.valorCobrado, c.dataCobranca, c.statusPagamento],
  )
}

export async function removerCustodyCharge(tx: Consulta, email: UserEmail): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.custody_charges WHERE user_email = $1`, [email])
}

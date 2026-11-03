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

type LinhaDeposit = {
  user_email: string
  valor: unknown
  date: unknown
  origem: string | null
  metodo: string | null
  ref_externa: string | null
}

export async function carregarDeposits(tx: Consulta): Promise<Deposit[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaDeposit>(
    `SELECT user_email, valor, date, origem, metodo, ref_externa FROM ${S}.deposits ORDER BY id`,
  )
  // A origem (migration 049) só entra no objeto quando existe, como em `normalizarDeposit`: o diff compara
  // os retratos, e uma chave `null` a mais faria o registro antigo parecer outro.
  return rows.map((r) => ({
    userEmail: r.user_email,
    valor: num(r.valor),
    date: num(r.date),
    ...(r.origem ? { origem: r.origem as Deposit['origem'] } : {}),
    ...(r.metodo ? { metodo: r.metodo as Deposit['metodo'] } : {}),
    ...(r.ref_externa ? { refExterna: r.ref_externa } : {}),
  }))
}

export async function inserirDeposit(tx: Consulta, d: Deposit): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.deposits (user_email, valor, date, origem, metodo, ref_externa) VALUES ($1, $2, $3, $4, $5, $6)`,
    [d.userEmail, d.valor, d.date, d.origem ?? null, d.metodo ?? null, d.refExterna ?? null],
  )
}

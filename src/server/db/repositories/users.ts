/**
 * Repositório de `aurea.users`.
 *
 * Substitui a fatia `state.users[email]` do blob — SEM o array `coins`, que
 * tem tabela própria (coins.ts). A forma que entra e sai daqui é `UserRegistro`
 * (diff.ts): a linha, não o `User` do domínio. Quem remonta o `User` com o
 * inventário é repositories/state.ts.
 *
 * `ORDER BY ord` preserva a ordem de inserção: o blob guardava os usuários na
 * ordem do seed, e é assim que as telas os listam.
 */

import type { UserEmail, UserSettings } from '@/domain/types'

import type { UserRegistro } from '../diff'
import { json, nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

type LinhaUser = {
  email: string
  name: string
  balance: unknown
  pass: string | null
  last_access: unknown
  prev_access: unknown
  settings: unknown
}

export interface UserCarregado {
  email: UserEmail
  user: UserRegistro
}

export async function carregarUsers(tx: Consulta): Promise<UserCarregado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaUser>(
    `SELECT email, name, balance, pass, last_access, prev_access, settings
       FROM ${S}.users
      ORDER BY ord`,
  )
  return rows.map((r) => ({
    email: r.email,
    user: {
      name: r.name,
      balance: num(r.balance),
      pass: r.pass,
      lastAccess: numOuNulo(r.last_access),
      prevAccess: numOuNulo(r.prev_access),
      settings: json<UserSettings>(r.settings),
    },
  }))
}

export async function inserirUser(tx: Consulta, email: UserEmail, u: UserRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.users (email, name, balance, pass, last_access, prev_access, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [email, u.name, u.balance, u.pass, u.lastAccess, u.prevAccess, u.settings ? JSON.stringify(u.settings) : null],
  )
}

export async function atualizarUser(tx: Consulta, email: UserEmail, u: UserRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.users
        SET name = $2, balance = $3, pass = $4, last_access = $5, prev_access = $6, settings = $7::jsonb
      WHERE email = $1`,
    [email, u.name, u.balance, u.pass, u.lastAccess, u.prevAccess, u.settings ? JSON.stringify(u.settings) : null],
  )
}

/** Nunca acontece hoje — não há tela que apague conta. Existe para o diff ser completo. */
export async function removerUser(tx: Consulta, email: UserEmail): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.users WHERE email = $1`, [email])
}

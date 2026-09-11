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

import type { Cadastro, DadosBancarios, Endereco, UserEmail, UserSettings } from '@/domain/types'

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
  cpf: string | null
  nome_completo: string | null
  data_nascimento: string | null
  telefone: string | null
  endereco: unknown
  dados_bancarios: unknown
  cadastro_completado_em: unknown
  cadastro_confirmado_em: unknown
}

export interface UserCarregado {
  email: UserEmail
  user: UserRegistro
}

export async function carregarUsers(tx: Consulta): Promise<UserCarregado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaUser>(
    `SELECT email, name, balance, pass, last_access, prev_access, settings,
            cpf, nome_completo, data_nascimento, telefone, endereco, dados_bancarios,
            cadastro_completado_em, cadastro_confirmado_em
       FROM ${S}.users
      ORDER BY ord`,
  )
  return rows.map((r) => {
    let cadastro: Cadastro | null = null
    const endereco = json<Endereco>(r.endereco)
    const dadosBancarios = json<DadosBancarios>(r.dados_bancarios)
    if (r.cpf && r.nome_completo && r.data_nascimento && r.telefone && endereco && dadosBancarios) {
      cadastro = {
        cpf: r.cpf,
        nomeCompleto: r.nome_completo,
        dataNascimento: r.data_nascimento,
        telefone: r.telefone,
        endereco,
        dadosBancarios,
        completadoEm: num(r.cadastro_completado_em),
        confirmadoEm: numOuNulo(r.cadastro_confirmado_em) ?? undefined,
      }
    }
    return {
      email: r.email,
      user: {
        name: r.name,
        balance: num(r.balance),
        pass: r.pass,
        lastAccess: numOuNulo(r.last_access),
        prevAccess: numOuNulo(r.prev_access),
        settings: json<UserSettings>(r.settings),
        cadastro,
      },
    }
  })
}

export async function inserirUser(tx: Consulta, email: UserEmail, u: UserRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.users (
       email, name, balance, pass, last_access, prev_access, settings,
       cpf, nome_completo, data_nascimento, telefone, endereco, dados_bancarios,
       cadastro_completado_em, cadastro_confirmado_em
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15)`,
    [
      email,
      u.name,
      u.balance,
      u.pass,
      u.lastAccess,
      u.prevAccess,
      u.settings ? JSON.stringify(u.settings) : null,
      u.cadastro?.cpf ?? null,
      u.cadastro?.nomeCompleto ?? null,
      u.cadastro?.dataNascimento ?? null,
      u.cadastro?.telefone ?? null,
      u.cadastro?.endereco ? JSON.stringify(u.cadastro.endereco) : null,
      u.cadastro?.dadosBancarios ? JSON.stringify(u.cadastro.dadosBancarios) : null,
      u.cadastro?.completadoEm ?? null,
      u.cadastro?.confirmadoEm ?? null,
    ],
  )
}

export async function atualizarUser(tx: Consulta, email: UserEmail, u: UserRegistro): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.users
        SET name = $2,
            balance = $3,
            pass = $4,
            last_access = $5,
            prev_access = $6,
            settings = $7::jsonb,
            cpf = $8,
            nome_completo = $9,
            data_nascimento = $10,
            telefone = $11,
            endereco = $12::jsonb,
            dados_bancarios = $13::jsonb,
            cadastro_completado_em = $14,
            cadastro_confirmado_em = $15
      WHERE email = $1`,
    [
      email,
      u.name,
      u.balance,
      u.pass,
      u.lastAccess,
      u.prevAccess,
      u.settings ? JSON.stringify(u.settings) : null,
      u.cadastro?.cpf ?? null,
      u.cadastro?.nomeCompleto ?? null,
      u.cadastro?.dataNascimento ?? null,
      u.cadastro?.telefone ?? null,
      u.cadastro?.endereco ? JSON.stringify(u.cadastro.endereco) : null,
      u.cadastro?.dadosBancarios ? JSON.stringify(u.cadastro.dadosBancarios) : null,
      u.cadastro?.completadoEm ?? null,
      u.cadastro?.confirmadoEm ?? null,
    ],
  )
}

/** Nunca acontece hoje — não há tela que apague conta. Existe para o diff ser completo. */
export async function removerUser(tx: Consulta, email: UserEmail): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.users WHERE email = $1`, [email])
}


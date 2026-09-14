/**
 * Repositório da administração de usuários: `aurea.admin_notas_usuario` e
 * `aurea.admin_situacao_contas` (migration 023, frente C, C2), mais as leituras da ficha
 * que vivem em tabelas de sempre (ledger, trilha, registro de uso).
 *
 * SÓ SQL, e as duas tabelas próprias são APPEND-ONLY: nota se corrige com nota nova, e a
 * situação da conta é a linha mais recente — desativar e reativar deixa as duas linhas.
 */

import type { SituacaoConta } from '@/domain/admin/usuarios'
import type { EntradaAuditoriaGravada } from '@/server/db/repositories/auditoria'

import { json, nomeDoSchema, num, type Consulta } from '../sql'

/* ---------- notas internas ---------- */

export interface NotaDoUsuario {
  id: number
  autor: string
  corpo: string
  createdAt: number
}

export async function inserirNotaDoUsuario(tx: Consulta, n: { email: string; autor: string; corpo: string; createdAt: number }): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.admin_notas_usuario (user_email, autor, corpo, created_at) VALUES ($1, $2, $3, $4) RETURNING id`,
    [n.email, n.autor, n.corpo, n.createdAt],
  )
  return num(rows[0].id)
}

export async function listarNotasDoUsuario(tx: Consulta, email: string): Promise<NotaDoUsuario[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown; autor: string; corpo: string; created_at: unknown }>(
    `SELECT id, autor, corpo, created_at FROM ${S}.admin_notas_usuario WHERE user_email = $1 ORDER BY id DESC`,
    [email],
  )
  return rows.map((r) => ({ id: num(r.id), autor: r.autor, corpo: r.corpo, createdAt: num(r.created_at) }))
}

/* ---------- situação da conta ---------- */

type LinhaSituacao = { ativa: unknown; motivo: string; autor: string; created_at: unknown }

function paraSituacao(r: LinhaSituacao): SituacaoConta {
  return { ativa: r.ativa === true, motivo: r.motivo, autor: r.autor, em: num(r.created_at) }
}

export async function inserirSituacao(tx: Consulta, s: { email: string; ativa: boolean; motivo: string; autor: string; createdAt: number }): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.admin_situacao_contas (user_email, ativa, motivo, autor, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [s.email, s.ativa, s.motivo, s.autor, s.createdAt],
  )
}

/** A situação vigente; `null` quando ninguém nunca mudou (a conta está ativa). */
export async function situacaoDaConta(tx: Consulta, email: string): Promise<SituacaoConta | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaSituacao>(
    `SELECT ativa, motivo, autor, created_at FROM ${S}.admin_situacao_contas WHERE user_email = $1 ORDER BY id DESC LIMIT 1`,
    [email],
  )
  return rows[0] ? paraSituacao(rows[0]) : null
}

export async function historicoDaSituacao(tx: Consulta, email: string): Promise<SituacaoConta[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaSituacao>(
    `SELECT ativa, motivo, autor, created_at FROM ${S}.admin_situacao_contas WHERE user_email = $1 ORDER BY id DESC`,
    [email],
  )
  return rows.map(paraSituacao)
}

/** Os e-mails cuja linha mais recente diz "desativada" — para a lista. */
export async function contasDesativadas(tx: Consulta): Promise<Set<string>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ user_email: string; ativa: unknown }>(
    `SELECT DISTINCT ON (user_email) user_email, ativa
       FROM ${S}.admin_situacao_contas
      ORDER BY user_email, id DESC`,
  )
  return new Set(rows.filter((r) => r.ativa !== true).map((r) => r.user_email))
}

/* ---------- leituras de tabelas de sempre ---------- */

/**
 * Quando cada conta nasceu: o primeiro lançamento `saldo_inicial` do ledger, que
 * src/server/db/derivar.ts grava para toda conta nova. `aurea.users` não tem data de criação.
 */
export async function datasDeCriacao(tx: Consulta): Promise<Record<string, number>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ user_email: string; criado: unknown }>(
    `SELECT user_email, min(created_at) AS criado FROM ${S}.ledger_entries WHERE tipo = 'saldo_inicial' GROUP BY user_email`,
  )
  const datas: Record<string, number> = {}
  for (const r of rows) datas[r.user_email] = num(r.criado)
  return datas
}

/** Tudo da trilha que envolve a conta: como afetada, como alvo ou como quem agiu. */
export async function trilhaDaConta(tx: Consulta, email: string, limite: number): Promise<EntradaAuditoriaGravada[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{
    id: unknown
    created_at: unknown
    ator: string
    acao: string
    entidade: string | null
    entidade_id: string | null
    usuarios_afetados: unknown
    detalhes: unknown
  }>(
    `SELECT id, created_at, ator, acao, entidade, entidade_id, usuarios_afetados, detalhes
       FROM ${S}.audit_log
      WHERE $1 = ANY(usuarios_afetados) OR entidade_id = $1 OR ator = $1
      ORDER BY id DESC LIMIT $2`,
    [email, limite],
  )
  return rows.map((r) => ({
    id: num(r.id),
    createdAt: num(r.created_at),
    ator: r.ator,
    acao: r.acao,
    entidade: r.entidade,
    entidadeId: r.entidade_id,
    usuariosAfetados: Array.isArray(r.usuarios_afetados) ? (r.usuarios_afetados as string[]) : [],
    detalhes: json<Record<string, unknown>>(r.detalhes) ?? {},
  }))
}

export interface EventoDeUsoDaConta {
  createdAt: number
  tipo: string
  rota: string | null
  alvo: string | null
  plataforma: string | null
}

/** O registro de uso da conta (migration 021), mais recente primeiro. */
export async function usoDaConta(tx: Consulta, email: string, limite: number): Promise<EventoDeUsoDaConta[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ created_at: unknown; tipo: string; rota: string | null; alvo: string | null; plataforma: string | null }>(
    `SELECT created_at, tipo, rota, alvo, plataforma FROM ${S}.eventos_uso WHERE user_email = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
    [email, limite],
  )
  return rows.map((r) => ({ createdAt: num(r.created_at), tipo: r.tipo, rota: r.rota, alvo: r.alvo, plataforma: r.plataforma }))
}

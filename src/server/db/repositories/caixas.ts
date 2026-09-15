/**
 * Repositório de `aurea.caixas` (migration 025, frente C, C3) — as caixas físicas do cofre.
 *
 * SÓ SQL. Caixa é catálogo, não trilha: o cadastro é editável, e quem mudou fica em
 * `audit_log` (`admin.bancada.caixa`), gravado na mesma transação pelo serviço. Não há DELETE:
 * caixa com análise gravada se desativa.
 */

import type { CaixaCadastrada, CaixaValidada } from '@/domain/admin/caixas'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

type LinhaCaixa = { codigo: string; rotulo: string; local: string; capacidade: unknown; ativa: unknown; created_at: unknown }

function paraCaixa(r: LinhaCaixa): CaixaCadastrada {
  return { codigo: r.codigo, rotulo: r.rotulo, local: r.local, capacidade: numOuNulo(r.capacidade), ativa: r.ativa === true, criadoEm: num(r.created_at) }
}

export async function listarCaixas(tx: Consulta): Promise<CaixaCadastrada[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaCaixa>(`SELECT codigo, rotulo, local, capacidade, ativa, created_at FROM ${S}.caixas ORDER BY codigo`)
  return rows.map(paraCaixa)
}

export async function buscarCaixa(tx: Consulta, codigo: string): Promise<CaixaCadastrada | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaCaixa>(`SELECT codigo, rotulo, local, capacidade, ativa, created_at FROM ${S}.caixas WHERE codigo = $1 FOR UPDATE`, [codigo])
  return rows[0] ? paraCaixa(rows[0]) : null
}

export async function inserirCaixa(tx: Consulta, c: CaixaValidada, criadoEm: number): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`INSERT INTO ${S}.caixas (codigo, rotulo, local, capacidade, ativa, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, [
    c.codigo,
    c.rotulo,
    c.local,
    c.capacidade,
    c.ativa,
    criadoEm,
  ])
}

export async function atualizarCaixa(tx: Consulta, c: CaixaValidada): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.caixas SET rotulo = $2, local = $3, capacidade = $4, ativa = $5 WHERE codigo = $1`, [c.codigo, c.rotulo, c.local, c.capacidade, c.ativa])
}

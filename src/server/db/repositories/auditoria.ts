/**
 * Repositório de `aurea.audit_log` — a trilha de auditoria.
 *
 * APPEND-ONLY. Uma linha por mutação de estado (gravada por estado.ts, dentro
 * da mesma transação) e uma por exportação de relatório. Não há UPDATE nem
 * DELETE: trilha editável não é trilha.
 *
 * O que NÃO entra aqui, por decisão: endereço IP, user-agent e qualquer dado
 * pessoal além do e-mail que já é a chave da conta. Trilha de auditoria não é
 * lugar de coletar mais do que a plataforma já tem (LGPD).
 */

import { json, nomeDoSchema, num, type Consulta } from '../sql'

export interface EntradaAuditoria {
  createdAt: number
  /** E-mail da sessão, ou 'sistema', 'webhook:mercadopago', 'cron:shipping'… */
  ator: string
  /** 'negociacao', 'deposito', 'envio.criar', 'semeadura', 'exportacao'… */
  acao: string
  entidade: string | null
  entidadeId: string | null
  usuariosAfetados: string[]
  detalhes: Record<string, unknown>
}

export interface EntradaAuditoriaGravada extends EntradaAuditoria {
  id: number
}

type LinhaAuditoria = {
  id: unknown
  created_at: unknown
  ator: string
  acao: string
  entidade: string | null
  entidade_id: string | null
  usuarios_afetados: unknown
  detalhes: unknown
}

function paraEntrada(r: LinhaAuditoria): EntradaAuditoriaGravada {
  // O `pg` devolve text[] como array; o PGlite também. Uma string crua
  // ('{a,b}') não é esperada, mas o fallback evita quebrar a listagem.
  const afetados = Array.isArray(r.usuarios_afetados)
    ? (r.usuarios_afetados as string[])
    : typeof r.usuarios_afetados === 'string'
      ? r.usuarios_afetados.replace(/^\{|\}$/g, '').split(',').filter(Boolean)
      : []
  return {
    id: num(r.id),
    createdAt: num(r.created_at),
    ator: r.ator,
    acao: r.acao,
    entidade: r.entidade,
    entidadeId: r.entidade_id,
    usuariosAfetados: afetados,
    detalhes: json<Record<string, unknown>>(r.detalhes) ?? {},
  }
}

export async function registrarAuditoria(tx: Consulta, e: EntradaAuditoria): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.audit_log
       (created_at, ator, acao, entidade, entidade_id, usuarios_afetados, detalhes)
     VALUES ($1, $2, $3, $4, $5, $6::text[], $7::jsonb)`,
    [e.createdAt, e.ator, e.acao, e.entidade, e.entidadeId, e.usuariosAfetados, JSON.stringify(e.detalhes)],
  )
}

export interface FiltroAuditoria {
  ator?: string
  acao?: string
  de?: number
  ate?: number
  limite?: number
}

/** Mais recente primeiro — é como uma trilha se lê. */
export async function listarAuditoria(tx: Consulta, filtro: FiltroAuditoria = {}): Promise<EntradaAuditoriaGravada[]> {
  const S = nomeDoSchema()
  const condicoes: string[] = []
  const valores: unknown[] = []
  const param = (v: unknown): string => {
    valores.push(v)
    return `$${valores.length}`
  }
  if (filtro.ator) condicoes.push(`ator = ${param(filtro.ator)}`)
  if (filtro.acao) condicoes.push(`acao = ${param(filtro.acao)}`)
  if (filtro.de !== undefined) condicoes.push(`created_at >= ${param(filtro.de)}`)
  if (filtro.ate !== undefined) condicoes.push(`created_at < ${param(filtro.ate)}`)
  const where = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : ''
  const limit = ` LIMIT ${param(filtro.limite ?? 500)}`
  const { rows } = await tx.query<LinhaAuditoria>(
    `SELECT id, created_at, ator, acao, entidade, entidade_id, usuarios_afetados, detalhes
       FROM ${S}.audit_log${where} ORDER BY id DESC${limit}`,
    valores,
  )
  return rows.map(paraEntrada)
}

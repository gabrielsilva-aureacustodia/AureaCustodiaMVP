/**
 * Repositório de `aurea.eventos_uso` — o registro de uso da plataforma (migration 021,
 * frente C).
 *
 * APPEND-ONLY: só `inserirEventos` e leitura. Não há UPDATE nem DELETE, como em toda
 * tabela de trilha do projeto. A expurgação por tempo de retenção, quando existir,
 * será uma decisão de LGPD com rotina própria — não um DELETE esquecido num repositório.
 *
 * O lote chega JÁ LIMPO por `validarLoteDeEventos` (src/domain/admin/uso.ts): rota
 * normalizada, texto curto, sem user agent. A inserção é set-based — um `unnest` por
 * lote, uma consulta —, porque ela roda depois de toda troca de página de todo mundo.
 */

import type { EventoDeUso, EventoValidado, TipoEvento } from '@/domain/admin/uso'

import { nomeDoSchema, num, type Consulta } from '../sql'

export async function inserirEventos(
  tx: Consulta,
  contexto: { userEmail: string; sessao: string | null; plataforma: string },
  eventos: readonly EventoValidado[],
): Promise<void> {
  if (!eventos.length) return
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.eventos_uso (created_at, user_email, sessao, tipo, rota, alvo, detalhes, plataforma)
     SELECT c, $1, $2, t, r, a, d::jsonb, $3
       FROM unnest($4::bigint[], $5::text[], $6::text[], $7::text[], $8::text[]) AS x(c, t, r, a, d)`,
    [
      contexto.userEmail,
      contexto.sessao,
      contexto.plataforma,
      eventos.map((e) => e.createdAt),
      eventos.map((e) => e.tipo),
      eventos.map((e) => e.rota),
      eventos.map((e) => e.alvo),
      eventos.map((e) => JSON.stringify(e.detalhes)),
    ],
  )
}

type LinhaEvento = {
  created_at: unknown
  user_email: string | null
  sessao: string | null
  tipo: string
  rota: string | null
  alvo: string | null
  plataforma: string | null
}

export interface FiltroEventos {
  /** Início inclusivo, ms. */
  de: number
  /** Fim exclusivo, ms. */
  ate: number
  limite: number
}

/** Quantos eventos desde um instante — o "registro de uso está vivo?" do painel inicial. */
export async function contarEventosDesde(tx: Consulta, desde: number): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ n: unknown }>(`SELECT count(*)::int AS n FROM ${S}.eventos_uso WHERE created_at >= $1`, [desde])
  return num(rows[0]?.n ?? 0)
}

/** Na ordem em que aconteceram — é como uma jornada se lê. */
export async function listarEventos(tx: Consulta, filtro: FiltroEventos): Promise<EventoDeUso[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaEvento>(
    `SELECT created_at, user_email, sessao, tipo, rota, alvo, plataforma
       FROM ${S}.eventos_uso
      WHERE created_at >= $1 AND created_at < $2
      ORDER BY created_at, id
      LIMIT $3`,
    [filtro.de, filtro.ate, filtro.limite],
  )
  return rows.map((r) => ({
    createdAt: num(r.created_at),
    userEmail: r.user_email,
    sessao: r.sessao,
    tipo: r.tipo as TipoEvento,
    rota: r.rota,
    alvo: r.alvo,
    plataforma: r.plataforma,
  }))
}

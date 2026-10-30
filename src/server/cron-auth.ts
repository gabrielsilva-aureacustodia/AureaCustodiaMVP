/**
 * Conferência do cabeçalho dos jobs agendados (`/api/cron/*`).
 *
 * A Vercel manda `Authorization: Bearer <CRON_SECRET>` sozinha quando a variável existe no projeto.
 * Até 30/10/2026 cada rota comparava com `Bearer ${process.env.CRON_SECRET}` — e, em produção sem a
 * variável, isso virava `"Bearer undefined"`: o cron nunca rodava (401 mudo) e, pior, quem mandasse
 * esse texto à mão passava. Aqui a ausência do segredo em produção fecha a rota de verdade e
 * deixa um erro claro no log, sem abrir nada ao público.
 *
 * Fora de produção e sem segredo, passa: é o desenvolvimento local (comportamento de antes).
 */

import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

export type ResultadoAuthCron = 'ok' | 'sem-segredo' | 'negado'

export function conferirAuthCron(authHeader: string | null): ResultadoAuthCron {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return process.env.NODE_ENV === 'production' ? 'sem-segredo' : 'ok'
  const esperado = Buffer.from(`Bearer ${segredo}`)
  const recebido = Buffer.from(authHeader ?? '')
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return 'negado'
  return 'ok'
}

/** Resposta de recusa (ou `null` se pode seguir). Loga o motivo SEM o valor de nenhum segredo. */
export function recusaDoCron(authHeader: string | null, rota: string): NextResponse | null {
  const r = conferirAuthCron(authHeader)
  if (r === 'ok') return null
  if (r === 'sem-segredo') {
    console.error(`[cron] ${rota} recusado: CRON_SECRET ausente em produção — crie a variável na Vercel e faça redeploy.`)
  }
  return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 })
}

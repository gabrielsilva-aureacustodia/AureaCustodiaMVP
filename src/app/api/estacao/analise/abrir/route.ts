/**
 * POST /api/estacao/analise/abrir — o envio entra em 'Em análise física'.
 *
 * Corpo: { "protocolo": "RO-ENV-0001" }
 *
 * É a troca de fase que o cliente vê na tela `/envios` em menos de 30 segundos,
 * pelo polling de 10 s que já existe. Nenhum websocket foi construído para isto
 * — a tela muda três vezes por dia.
 */

import { NextRequest, NextResponse } from 'next/server'

import { autorizarEstacao } from '@/server/estacao/acesso'
import { abrirAnalise } from '@/server/estacao/analise'

export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function POST(req: NextRequest): Promise<NextResponse> {
  const acesso = autorizarEstacao(req.headers.get('authorization'))
  if (!acesso.ok) {
    return NextResponse.json({ error: acesso.erro }, { status: acesso.status, headers: SEM_CACHE })
  }

  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400, headers: SEM_CACHE })
  }

  const protocolo =
    typeof corpo === 'object' && corpo !== null && 'protocolo' in corpo
      ? (corpo as { protocolo: unknown }).protocolo
      : null

  if (typeof protocolo !== 'string' || protocolo.trim().length === 0) {
    return NextResponse.json(
      { error: 'Informe o protocolo do envio.' },
      { status: 400, headers: SEM_CACHE },
    )
  }

  const r = await abrirAnalise(protocolo.trim())
  if (!r.ok) {
    return NextResponse.json({ error: r.erro }, { status: r.status, headers: SEM_CACHE })
  }
  return NextResponse.json({ ok: true }, { headers: SEM_CACHE })
}

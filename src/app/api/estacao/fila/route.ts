/**
 * GET /api/estacao/fila — o que está esperando na bancada.
 *
 * Devolve os envios em 'Recebido pela custódia' e 'Em análise física'. O
 * segundo entra na lista de propósito: se o notebook reiniciar no meio de um
 * procedimento, o envio precisa reaparecer na fila — senão ele fica invisível
 * para a estação e só um administrador consegue destravá-lo pela tela.
 */

import { NextRequest, NextResponse } from 'next/server'

import { autorizarEstacao } from '@/server/estacao/acesso'
import { filaDeAnalise } from '@/server/estacao/analise'

export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function GET(req: NextRequest): Promise<NextResponse> {
  const acesso = autorizarEstacao(req.headers.get('authorization'))
  if (!acesso.ok) {
    return NextResponse.json({ error: acesso.erro }, { status: acesso.status, headers: SEM_CACHE })
  }

  try {
    const fila = await filaDeAnalise()
    return NextResponse.json({ fila }, { headers: SEM_CACHE })
  } catch {
    return NextResponse.json(
      { error: 'Falha ao ler a fila.' },
      { status: 500, headers: SEM_CACHE },
    )
  }
}

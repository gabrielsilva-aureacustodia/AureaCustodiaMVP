/**
 * GET /api/estacao — o "alô" da bancada.
 *
 * É a primeira rota que o programa do notebook chama, e a única cuja resposta
 * o operador vê traduzida em uma palavra: "Conectado" ou "Sem conexão". Serve
 * para separar três falhas que, sem ela, chegariam ao operador como a mesma
 * tela travada: internet caída, chave errada e variável faltando na Vercel.
 */

import { NextRequest, NextResponse } from 'next/server'

import { autorizarEstacao } from '@/server/estacao/acesso'

export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function GET(req: NextRequest): Promise<NextResponse> {
  const acesso = autorizarEstacao(req.headers.get('authorization'))
  if (!acesso.ok) {
    return NextResponse.json({ error: acesso.erro }, { status: acesso.status, headers: SEM_CACHE })
  }

  const origem = req.nextUrl.origin
  return NextResponse.json(
    {
      ok: true,
      servidor: origem,
      agora: Date.now(),
      rotas: {
        fila: `${origem}/api/estacao/fila`,
        abrir: `${origem}/api/estacao/analise/abrir`,
        fechar: `${origem}/api/estacao/analise/fechar`,
        urlDeVideo: `${origem}/api/estacao/video/url`,
      },
    },
    { headers: SEM_CACHE },
  )
}

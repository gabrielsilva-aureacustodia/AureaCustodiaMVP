/**
 * POST /api/estacao/video/url — a URL assinada para o vídeo da análise.
 *
 * Corpo: { "protocolo": "RO-ENV-0001", "arquivo": "RO-ENV-0001-1.webm" }
 *
 * A resposta traz uma URL para onde a bancada envia o arquivo DIRETO, sem
 * passar por aqui. É o que contorna o limite de 4,5 MB de corpo da Vercel — e a
 * razão de esta rota devolver algumas centenas de bytes em vez de receber
 * algumas centenas de megabytes.
 *
 * 503 quando o Supabase Storage ainda não está configurado. A estação trata
 * isso como "grava local e segue": o vídeo fica no disco do notebook e a
 * análise é fechada do mesmo jeito. Falta de balde não pode impedir a moeda de
 * ser analisada.
 */

import { NextRequest, NextResponse } from 'next/server'

import { autorizarEstacao } from '@/server/estacao/acesso'
import { urlDeUploadDeVideo, VideoNaoConfigurado } from '@/server/estacao/video'

export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

function texto(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

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
  const c = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as Record<string, unknown>

  const protocolo = texto(c.protocolo)
  const arquivo = texto(c.arquivo)
  if (!protocolo || !arquivo) {
    return NextResponse.json(
      { error: 'Informe o protocolo do envio e o nome do arquivo.' },
      { status: 400, headers: SEM_CACHE },
    )
  }

  try {
    const dados = await urlDeUploadDeVideo(protocolo, arquivo)
    return NextResponse.json(dados, { headers: SEM_CACHE })
  } catch (e) {
    if (e instanceof VideoNaoConfigurado) {
      return NextResponse.json(
        { error: e.message, faltando: e.faltando },
        { status: 503, headers: SEM_CACHE },
      )
    }
    return NextResponse.json(
      { error: 'Falha ao assinar a URL de upload.' },
      { status: 500, headers: SEM_CACHE },
    )
  }
}

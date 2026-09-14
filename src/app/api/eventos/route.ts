/**
 * POST /api/eventos — o registro de uso da plataforma (plano do Admin, seção 1.5).
 *
 * Recebe, em lote, o que `RegistroDeUso` (src/components/providers/) anotou no
 * navegador: páginas abertas e cliques em elementos marcados com `data-uso`.
 *
 * AS TRÊS REGRAS DA ROTA
 * ----------------------
 *  1. NUNCA ATRAPALHA A NAVEGAÇÃO. Responde na hora e grava depois, em `after()`. Falha
 *     de banco vira linha de log, não erro para o navegador — que, de todo modo, nem
 *     olha a resposta.
 *  2. QUEM É, É A SESSÃO. O e-mail vem do cookie assinado, nunca do corpo. Sem sessão,
 *     nada é gravado: o registro existe para a jornada de quem usa a plataforma.
 *  3. NADA DE IP NEM DE USER AGENT COMPLETO. O user agent vira a plataforma resumida
 *     ('android', 'windows'…) e é descartado aqui mesmo. A rota chega sem query string
 *     e com identificadores trocados por `[id]` (src/domain/admin/uso.ts).
 *
 * Códigos: 204 sempre que o corpo tem forma de lote (gravado ou descartado); 400 quando
 * nem isso. Sem trava de frequência: é ambiente de teste com contas de sócios (RA-41).
 */

import { NextRequest, NextResponse, after } from 'next/server'

import { plataformaResumida, validarLoteDeEventos } from '@/domain/admin/uso'
import { gravarEventosDeUso } from '@/server/admin/uso'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { getSessionEmail } from '@/server/session'

export const dynamic = 'force-dynamic'

/** 64 KB: um lote de 50 eventos cabe com folga; mais que isso não é o nosso navegador. */
const CORPO_MAX = 64_000

/** `after()` só existe dentro de uma requisição do Next; fora dele (testes) a tarefa roda solta. */
function depoisDaResposta(tarefa: () => Promise<void>): void {
  try {
    after(tarefa)
  } catch {
    void tarefa()
  }
}

const SEM_CONTEUDO = (): NextResponse => new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const email = await getSessionEmail().catch(() => null)

  let corpo: unknown
  try {
    const texto = await req.text()
    if (texto.length > CORPO_MAX) return SEM_CONTEUDO()
    corpo = JSON.parse(texto)
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const lote = validarLoteDeEventos(corpo, Date.now())
  if (!lote) return new NextResponse(null, { status: 400 })
  if (!email || !lote.eventos.length || !bancoConfigurado()) return SEM_CONTEUDO()

  const plataforma = plataformaResumida(req.headers.get('user-agent'))
  depoisDaResposta(async () => {
    try {
      await gravarEventosDeUso(executarNoBanco, email, lote, plataforma)
    } catch (err) {
      console.error('[eventos] falha ao gravar o registro de uso:', err)
    }
  })
  return SEM_CONTEUDO()
}

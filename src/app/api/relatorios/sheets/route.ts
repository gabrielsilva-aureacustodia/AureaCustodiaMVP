/**
 * POST /api/relatorios/sheets?ano=&mes=&trimestre=
 *
 * O "push" para o Google Sheets: grava todos os relatórios na planilha
 * configurada, uma aba por relatório. É o que o botão "Enviar ao Google
 * Sheets" da tela chama por Server Action; esta rota existe para o mesmo
 * gesto poder ser AGENDADO — um cron da Vercel com `Authorization: Bearer
 * <AUREA_RELATORIOS_TOKEN>`, ou um Apps Script na própria planilha.
 *
 * Só POST: escrever numa planilha externa por GET convidaria um link a fazê-lo.
 */

import { NextRequest, NextResponse } from 'next/server'

import { autorizarRelatorioNoPainel } from '@/server/relatorios/acesso'
import { sincronizarSheetsComoAtor } from '@/server/relatorios/sincronizar'
import { getSessionEmail } from '@/server/session'

export const dynamic = 'force-dynamic'

const SEM_CACHE = { 'Cache-Control': 'no-store, max-age=0' } as const

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessao = await getSessionEmail().catch(() => null)
  const auth = req.headers.get('authorization')
  const token = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : req.nextUrl.searchParams.get('token')
  // Escrever na planilha do contador é exportar: pede `resultados.exportar` da sessão.
  const acesso = await autorizarRelatorioNoPainel(sessao, token, 'resultados.exportar')
  if (!acesso.ok) return NextResponse.json({ ok: false, error: acesso.erro }, { status: acesso.status, headers: SEM_CACHE })

  const q = req.nextUrl.searchParams
  const resultado = await sincronizarSheetsComoAtor(acesso.ator, {
    ano: q.get('ano'),
    mes: q.get('mes'),
    trimestre: q.get('trimestre'),
  })
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400, headers: SEM_CACHE })
}

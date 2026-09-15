/**
 * Saída de sessão (logout) via GET.
 *
 * Utilizado para encerrar a sessão de usuários desativados ou desconexão direta.
 * Server Components não podem apagar cookies diretamente no Next.js App Router;
 * este Route Handler limpa o cookie aurea_session e faz signOut local no Supabase Auth.
 */

import { NextResponse } from 'next/server'

import { createAuthClient } from '@/server/auth/client'
import { barrarContaDesativada, STATUS_CONTA_DESATIVADA } from '@/server/auth/conta-desativada'
import { clearSession, getSessionEmail } from '@/server/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<NextResponse> {
  const email = await getSessionEmail()
  const desativada = email ? await barrarContaDesativada(email) : false
  await clearSession()
  try {
    const client = await createAuthClient()
    await client.auth.signOut({ scope: 'local' })
  } catch {
    // Sem Supabase configurado, a sessão da plataforma já saiu — não prende ninguém aqui.
  }
  const url = new URL('/entrar', request.url)
  if (desativada) url.searchParams.set('status', STATUS_CONTA_DESATIVADA)
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store' } })
}

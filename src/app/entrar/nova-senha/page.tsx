/**
 * Tela isolada do casco do app para a sessão aberta pelo link de redefinição.
 *
 * Ela não carrega o estado da plataforma: a Server Action confere se a sessão
 * interna e a identidade do Supabase pertencem ao mesmo e-mail antes de mudar a senha.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { NovaSenhaForm } from '@/components/login/NovaSenhaForm'
import { destinoPermitido } from '@/server/auth/destino'
import { getSessionEmail } from '@/server/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nova senha | Real Olímpico',
  robots: { index: false, follow: false },
}

interface NovaSenhaPageProps {
  searchParams: Promise<{ destino?: string }>
}

export default async function NovaSenhaPage({
  searchParams,
}: NovaSenhaPageProps): Promise<ReactNode> {
  const email = await getSessionEmail().catch(() => null)
  if (!email) redirect('/entrar')

  const { destino } = await searchParams
  return <NovaSenhaForm email={email} destino={destinoPermitido(destino)} />
}

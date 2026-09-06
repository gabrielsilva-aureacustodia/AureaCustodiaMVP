/**
 * Landing pública da Áurea Custódia.
 *
 * Visitantes sem sessão recebem a página institucional. Uma sessão válida e
 * já ligada aos dados mockados segue direto para o painel; sessão antiga ou
 * conta ainda não provisionada permanece na landing, sem laço de redirect.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { LandingPage } from '@/components/landing/LandingPage'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export const metadata: Metadata = {
  title: 'Áurea Custódia | Custódia de moedas comemorativas',
  description:
    'Custódia física, recibo digital e marketplace para moedas comemorativas brasileiras.',
}

export default async function HomePage(): Promise<ReactNode> {
  const session = await getSessionEmail()
  if (session) {
    const state = await getState()
    if (state.users[session]) redirect('/inicio')
  }

  return <LandingPage />
}

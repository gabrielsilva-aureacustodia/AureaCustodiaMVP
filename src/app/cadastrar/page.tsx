/**
 * Cadastro público preparado, mas fechado pelo RA-03.
 *
 * A trava é calculada no servidor e repetida dentro das Server Actions; remover
 * `disabled` pelo inspetor não abre o cadastro por requisição forjada.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { RegisterForm } from '@/components/login/RegisterForm'
import { getRegistrationStatus } from '@/server/auth/config'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export const metadata: Metadata = {
  title: 'Criar conta | Áurea Custódia',
  description: 'Crie sua conta na plataforma Áurea Custódia.',
}

interface CadastrarPageProps {
  searchParams: Promise<{ erro?: string }>
}

export default async function CadastrarPage({
  searchParams,
}: CadastrarPageProps): Promise<ReactNode> {
  const session = await getSessionEmail()
  if (session) {
    const state = await getState()
    if (state.users[session]) redirect('/inicio')
  }

  const params = await searchParams
  const status = getRegistrationStatus()
  const callbackError =
    params.erro === 'aceite-oauth'
      ? 'O aceite legal do acesso com Google expirou. Inicie o cadastro novamente.'
      : undefined

  return <RegisterForm registration={status} initialError={callbackError} />
}

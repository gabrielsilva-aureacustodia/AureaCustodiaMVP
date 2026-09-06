/**
 * Tela de entrada movida da raiz para `/entrar`.
 *
 * A checagem de sessão permanece no servidor. Conferir também a existência do
 * usuário no estado evita o laço de redirecionamento durante a recriação das
 * contas dos sócios e a carga posterior dos dados mockados.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { LoginForm } from '@/components/login/LoginForm'
import { getRegistrationStatus } from '@/server/auth/config'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export const metadata: Metadata = {
  title: 'Entrar | Áurea Custódia',
  description: 'Acesse a plataforma de custódia e negociação da Áurea Custódia.',
}

interface EntrarPageProps {
  searchParams: Promise<{ erro?: string; status?: string }>
}

function feedback(params: { erro?: string; status?: string }): {
  error?: string
  message?: string
} {
  if (params.status === 'conta-pendente') {
    return {
      message:
        'E-mail confirmado. A conta será liberada quando a equipe carregar os dados de teste.',
    }
  }
  if (params.erro === 'callback') {
    return { error: 'O link de autenticação expirou ou não pôde ser validado. Tente novamente.' }
  }
  return {}
}

export default async function EntrarPage({ searchParams }: EntrarPageProps): Promise<ReactNode> {
  const session = await getSessionEmail()
  if (session) {
    const state = await getState()
    if (state.users[session]) redirect('/inicio')
  }

  const status = getRegistrationStatus()
  const initialFeedback = feedback(await searchParams)
  return (
    <LoginForm
      initialError={initialFeedback.error}
      initialMessage={initialFeedback.message}
      registrationOpen={status.enabled}
    />
  )
}

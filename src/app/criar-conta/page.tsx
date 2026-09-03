/**
 * Rota '/criar-conta' — o cadastro SIMULADO da demonstração.
 *
 * POR QUE NÃO SE CHAMA '/cadastrar'
 * ---------------------------------
 * '/cadastrar' é da frente A (`feat/auth-landing`), com Supabase Auth e aceite
 * versionado dos documentos legais. Usar o mesmo caminho aqui criaria conflito
 * de merge num arquivo que já existe lá. Com nome próprio, esta pasta some
 * inteira no dia do merge — `git rm -r src/app/criar-conta` — e nada da frente
 * A precisa ser reconciliado.
 *
 * A checagem de sessão é a mesma de '/': quem já está logado vai para /inicio
 * antes de a tela pintar, e a segunda condição (`state.users[session]`) evita o
 * laço de redirecionamento quando o cookie aponta para um usuário que sumiu do
 * estado — o ambiente recomeça do seed a cada reinício sem banco.
 */

import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { SignupForm } from '@/components/login/SignupForm'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'

export default async function CriarContaPage(): Promise<ReactNode> {
  const session = await getSessionEmail()

  if (session) {
    const state = await getState()
    if (state.users[session]) redirect('/inicio')
  }

  return <SignupForm />
}

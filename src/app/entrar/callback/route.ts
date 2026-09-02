/**
 * Callback do Supabase Auth para confirmação de e-mail e Google OAuth.
 *
 * O código de uso único vira uma identidade validada no servidor. Só depois
 * disso a aplicação procura os dados mockados e cria a sessão interna; uma
 * identidade sem carga de teste recebe orientação clara em vez de cair num
 * laço entre a tela de entrada e o layout protegido.
 */

import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { createAuthClient } from '@/server/auth/client'
import { consumePendingLegalAcceptance } from '@/server/auth/legal'
import { clearSession, setSession } from '@/server/session'

function destination(request: Request, path: string): URL {
  return new URL(path, request.url)
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  if (!code && !(tokenHash && type === 'email')) {
    return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
  }

  try {
    const client = await createAuthClient()
    let user: User | null = null

    if (code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code)
      if (error) return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
      user = data.user
    } else if (tokenHash) {
      // O template SSR do Supabase envia TokenHash, não a sessão no fragmento
      // da URL. Assim a confirmação é validada inteiramente no servidor.
      const { data, error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      })
      if (error) return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
      user = data.user
    }

    if (!user?.email) {
      return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
    }

    if (user.app_metadata.provider === 'google') {
      const acceptance = await consumePendingLegalAcceptance()
      if (!acceptance) {
        await client.auth.signOut({ scope: 'local' })
        return NextResponse.redirect(destination(request, '/cadastrar?erro=aceite-oauth'))
      }

      const { error: metadataError } = await client.auth.updateUser({
        data: {
          legal_terms_version: acceptance.termsVersion,
          privacy_policy_version: acceptance.privacyVersion,
          legal_accepted_at: acceptance.acceptedAt,
        },
      })
      if (metadataError) {
        await client.auth.signOut({ scope: 'local' })
        return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
      }
    }

    const provisioned = await authorizeProvisionedUser(user.email)
    if (!provisioned) {
      await client.auth.signOut({ scope: 'local' })
      await clearSession()
      return NextResponse.redirect(destination(request, '/entrar?status=conta-pendente'))
    }

    await setSession(user.email.trim().toLowerCase())
    return NextResponse.redirect(destination(request, '/inicio'))
  } catch {
    return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
  }
}

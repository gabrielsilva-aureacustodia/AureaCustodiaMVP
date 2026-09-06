/**
 * Callback do Supabase Auth para confirmação de e-mail e Google OAuth.
 *
 * Aceita TODOS os formatos que o Supabase produz, inclusive o do template
 * padrão — nenhuma configuração especial de e-mail é necessária:
 *
 *  - `?code=`                          fluxo PKCE (Google e template SSR)
 *  - `?token_hash=&type=`              template com TokenHash
 *  - `?token=&type=`                   formato antigo de verificação
 *  - `#access_token=&refresh_token=`   template padrão, sessão no fragmento
 *
 * O fragmento nunca chega ao servidor. Antes, isso fazia todo link do template
 * padrão cair em "link expirou": o handler não via parâmetro nenhum e recusava.
 * Agora, quando a query vem vazia, devolvemos uma página mínima que copia o
 * fragmento para a query e volta — daí o servidor consegue ler.
 *
 * Não há nenhuma trava de aceite legal aqui. Identidade confirmada pelo
 * Supabase é suficiente para provisionar e entrar. Ver RA-18.
 */

import { NextResponse } from 'next/server'
import type { EmailOtpType, User } from '@supabase/supabase-js'

import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { createAuthClient } from '@/server/auth/client'
import { consumePendingLegalAcceptance } from '@/server/auth/legal'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'
import { setSession } from '@/server/session'

function destination(request: Request, path: string): URL {
  return new URL(path, request.url)
}

function nomeDoUsuario(user: User): string | undefined {
  const name = user.user_metadata.full_name ?? user.user_metadata.name
  return typeof name === 'string' ? name : undefined
}

/**
 * O navegador é o único que enxerga o fragmento. Esta página troca `#` por `?`
 * e recarrega o próprio callback, sem depender de JavaScript de terceiros.
 * `replace` evita que o histórico guarde a URL com o token dentro.
 */
function paginaQueRecuperaOFragmento(): NextResponse {
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Confirmando acesso…</title></head>
<body style="font-family:system-ui;background:#0d1b34;color:#f5f5f5;display:grid;place-items:center;height:100vh;margin:0">
<p>Confirmando seu acesso…</p>
<script>
(function () {
  var h = window.location.hash.replace(/^#/, '');
  var destino = h ? window.location.pathname + '?' + h : '/entrar?erro=callback';
  window.location.replace(destino);
})();
</script>
</body></html>`
  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams
  const code = params.get('code')
  const tokenHash = params.get('token_hash')
  const token = params.get('token')
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const tipo = (params.get('type') ?? 'email') as EmailOtpType

  // Sem nenhum parâmetro conhecido a informação pode estar no fragmento.
  if (!code && !tokenHash && !token && !accessToken) {
    if (params.get('error') || params.get('error_description')) {
      return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
    }
    return paginaQueRecuperaOFragmento()
  }

  try {
    const client = await createAuthClient()
    let user: User | null = null

    if (accessToken && refreshToken) {
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
      user = data.user
    } else if (code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code)
      if (error) return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
      user = data.user
    } else {
      const { data, error } = await client.auth.verifyOtp(
        tokenHash
          ? { token_hash: tokenHash, type: tipo }
          : { token_hash: token as string, type: tipo },
      )
      if (error) return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
      user = data.user
    }

    if (!user?.email) {
      return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
    }

    // O aceite legal, quando existir, é apenas registrado. Ele nunca decide se
    // a pessoa entra: falhar aqui não interrompe o acesso.
    if (user.app_metadata.provider === 'google') {
      const acceptance = await consumePendingLegalAcceptance()
      if (acceptance) {
        await client.auth
          .updateUser({
            data: {
              legal_terms_version: acceptance.termsVersion,
              privacy_policy_version: acceptance.privacyVersion,
              legal_accepted_at: acceptance.acceptedAt,
            },
          })
          .catch(() => undefined)
      }
    }

    const provisioned = await authorizeProvisionedUser(user.email)
    if (!provisioned) {
      await provisionAuthenticatedUser(user.email, nomeDoUsuario(user))
    }

    await setSession(user.email.trim().toLowerCase())
    return NextResponse.redirect(destination(request, '/inicio'))
  } catch {
    return NextResponse.redirect(destination(request, '/entrar?erro=callback'))
  }
}

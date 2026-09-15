/**
 * Callback do Supabase Auth para confirmação de e-mail, Google OAuth e recuperação de senha.
 *
 * Aceita TODOS os formatos que o Supabase produz, inclusive o do template
 * padrão — nenhuma configuração especial de e-mail é necessária:
 *
 *  - `?code=`                          fluxo PKCE (Google e template SSR)
 *  - `?token_hash=&type=`              template com TokenHash
 *  - `?token=&type=`                   formato antigo de verificação
 *  - `#access_token=&refresh_token=`   template padrão, sessão no fragmento
 *  - `type=recovery`                   link de redefinição de senha → tela de nova senha
 *
 * Conta desativada pelo painel é barrada aqui antes de abrir sessão e antes do
 * provisionamento, redirecionando para `/entrar?status=conta-desativada`.
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
import {
  barrarContaDesativada,
  ehIdentidadeBloqueada,
  STATUS_CONTA_DESATIVADA,
} from '@/server/auth/conta-desativada'
import { consumirDestinoDoLogin } from '@/server/auth/destino'
import { consumePendingLegalAcceptance } from '@/server/auth/legal'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'
import { registrarAceitesFormais } from '@/server/documentos/aceites'
import { setSession } from '@/server/session'

function destination(request: Request, path: string): URL {
  return new URL(path, request.url)
}

async function contaDesativadaNaEntrada(request: Request): Promise<NextResponse> {
  await consumirDestinoDoLogin()
  const url = destination(request, '/entrar')
  url.searchParams.set('status', STATUS_CONTA_DESATIVADA)
  return NextResponse.redirect(url)
}

/**
 * Leva o motivo real ate a tela de entrada. Se for identidade bloqueada pelo
 * painel, direciona para o aviso de conta desativada descartando o destino.
 */
async function falha(request: Request, motivo: string): Promise<NextResponse> {
  if (ehIdentidadeBloqueada({ message: motivo })) {
    return contaDesativadaNaEntrada(request)
  }
  const url = destination(request, '/entrar')
  url.searchParams.set('erro', 'callback')
  url.searchParams.set('motivo', motivo.slice(0, 300))
  return NextResponse.redirect(url)
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
  const recuperacao = params.get('type') === 'recovery'

  // Sem nenhum parâmetro conhecido a informação pode estar no fragmento.
  if (!code && !tokenHash && !token && !accessToken) {
    const erroExterno = params.get('error_description') ?? params.get('error')
    if (erroExterno) return await falha(request, erroExterno)
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
      if (error) return await falha(request, `setSession: ${error.message}`)
      user = data.user
    } else if (code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code)
      if (error) return await falha(request, `exchangeCode: ${error.message}`)
      user = data.user
    } else {
      const { data, error } = await client.auth.verifyOtp(
        tokenHash
          ? { token_hash: tokenHash, type: tipo }
          : { token_hash: token as string, type: tipo },
      )
      if (error) return await falha(request, `verifyOtp: ${error.message}`)
      user = data.user
    }

    if (!user?.email) return await falha(request, 'identidade sem e-mail')

    if (await barrarContaDesativada(user.email)) {
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
      return await contaDesativadaNaEntrada(request)
    }

    // O aceite legal, quando existir, é apenas registrado. Ele nunca decide se
    // a pessoa entra: falhar aqui não interrompe o acesso.
    if (user.app_metadata.provider === 'google') {
      const acceptance = await consumePendingLegalAcceptance()
      if (acceptance) {
        const ip =
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') ||
          null
        const userAgent = request.headers.get('user-agent') || null

        await registrarAceitesFormais(user.email, 'cadastro_google', {
          ip,
          userAgent,
        }).catch(() => undefined)

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

    const destino = await consumirDestinoDoLogin()
    if (recuperacao) {
      const url = destination(request, '/entrar/nova-senha')
      // Quem pediu o link a partir da entrada do painel volta ao painel depois de trocar a senha.
      if (destino === '/admin') url.searchParams.set('destino', '/admin')
      return NextResponse.redirect(url)
    }

    return NextResponse.redirect(destination(request, destino))
  } catch (erro) {
    return await falha(request, erro instanceof Error ? erro.message : 'excecao no callback')
  }
}

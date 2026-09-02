/* ============================================================================
 * ORIGEM DOS CALLBACKS DE AUTENTICAÇÃO — módulo exclusivo de servidor.
 *
 * Preview e localhost mudam de host. Derivar a origem da própria requisição
 * evita gravar URL de ambiente no código e impede que o callback volte para a
 * produção durante um teste isolado.
 * ==========================================================================*/

import 'server-only'

import { headers } from 'next/headers'

export async function authCallbackUrl(): Promise<string> {
  const configured =
    process.env.AUREA_SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (configured) return new URL('/entrar/callback', configured).toString()

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  if (!host) throw new Error('Não foi possível determinar a origem do callback de autenticação.')

  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocol}://${host}/entrar/callback`
}

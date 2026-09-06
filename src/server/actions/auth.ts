'use server'

/**
 * Autenticação com Supabase Auth.
 *
 * A senha deixa de ser comparada com ACCOUNTS ou `user.pass`: ela segue direto
 * para o Supabase Auth, que guarda apenas o hash. Depois de a identidade ser
 * confirmada, a aplicação ainda exige que a frente B tenha carregado os dados
 * mockados daquele e-mail antes de criar a sessão interna.
 */

import { ACCOUNTS } from '@/domain/constants'
import type { ActionResult } from '@/domain/types'
import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { createAuthClient } from '@/server/auth/client'
import {
  AuthConfigurationError,
  getRegistrationStatus,
} from '@/server/auth/config'
import { setPendingLegalAcceptance } from '@/server/auth/legal'
import { authCallbackUrl } from '@/server/auth/origin'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'
import { clearSession, setSession } from '@/server/session'
import { getState, mutateState } from '@/server/state'

const CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
const EMAIL_NAO_CONFIRMADO = 'Confirme seu e-mail antes de entrar.'
const CONTA_NAO_PROVISIONADA =
  'Conta autenticada, mas os dados de teste ainda não foram carregados. Fale com a equipe da Áurea.'
const FALHA_AUTENTICACAO = 'Não foi possível concluir a autenticação. Tente novamente.'

export interface OAuthStartData {
  redirectTo: string
}

function authError<T = unknown>(): ActionResult<T> {
  return { ok: false, error: FALHA_AUTENTICACAO }
}

/** Mantém as sete contas do seed acessíveis até o Supabase existir no ambiente. */
async function loginDeContingencia(email: string, senha: string): Promise<ActionResult> {
  const account = ACCOUNTS[email]
  if (!account) return { ok: false, error: CREDENCIAIS_INVALIDAS }

  const state = await getState()
  const user = state.users[email]
  if (!user) return { ok: false, error: CREDENCIAIS_INVALIDAS }
  if (senha !== (user.pass || account.pass)) {
    return { ok: false, error: CREDENCIAIS_INVALIDAS }
  }

  await mutateState((current) => {
    const currentUser = current.users[email]
    if (!currentUser) return
    currentUser.prevAccess = currentUser.lastAccess
    currentUser.lastAccess = Date.now()
  })
  await setSession(email)
  return { ok: true }
}

function nomeDoSupabase(metadata: Record<string, unknown>): string | undefined {
  const name = metadata.full_name ?? metadata.name
  return typeof name === 'string' ? name : undefined
}

function possuiAceiteLegal(metadata: Record<string, unknown>): boolean {
  return (
    typeof metadata.legal_terms_version === 'string' &&
    typeof metadata.privacy_policy_version === 'string' &&
    typeof metadata.legal_accepted_at === 'string'
  )
}

export async function login(email: string, senha: string): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !senha) return { ok: false, error: CREDENCIAIS_INVALIDAS }

  try {
    const client = await createAuthClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: normalized,
      password: senha,
    })

    if (error || !data.user?.email) return { ok: false, error: CREDENCIAIS_INVALIDAS }
    if (!data.user.email_confirmed_at) {
      await client.auth.signOut({ scope: 'local' })
      return { ok: false, error: EMAIL_NAO_CONFIRMADO }
    }

    let provisioned = await authorizeProvisionedUser(data.user.email)
    if (!provisioned && possuiAceiteLegal(data.user.user_metadata)) {
      await provisionAuthenticatedUser(
        data.user.email,
        nomeDoSupabase(data.user.user_metadata),
      )
      provisioned = true
    }
    if (!provisioned) {
      await client.auth.signOut({ scope: 'local' })
      await clearSession()
      return { ok: false, error: CONTA_NAO_PROVISIONADA }
    }

    await setSession(data.user.email.trim().toLowerCase())
    return { ok: true }
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      try {
        return await loginDeContingencia(normalized, senha)
      } catch {
        return { ok: false, error: FALHA_AUTENTICACAO }
      }
    }
    return authError()
  }
}

export async function registerWithEmail(
  name: string,
  email: string,
  senha: string,
  acceptedLegalTerms: boolean,
): Promise<ActionResult> {
  const status = getRegistrationStatus()
  if (!status.enabled || !status.termsVersion || !status.privacyVersion) {
    return { ok: false, error: status.reason ?? 'Novos cadastros estão fechados.' }
  }
  if (!acceptedLegalTerms) {
    return { ok: false, error: 'Aceite os Termos de Uso e a Política de Privacidade.' }
  }

  const normalizedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedName.length < 3) return { ok: false, error: 'Informe seu nome completo.' }
  if (!normalizedEmail.includes('@')) return { ok: false, error: 'Informe um e-mail válido.' }
  if (senha.length < 8) return { ok: false, error: 'A senha precisa ter pelo menos 8 caracteres.' }

  try {
    const client = await createAuthClient()
    const acceptedAt = new Date().toISOString()
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password: senha,
      options: {
        emailRedirectTo: await authCallbackUrl(),
        data: {
          full_name: normalizedName,
          legal_terms_version: status.termsVersion,
          privacy_policy_version: status.privacyVersion,
          legal_accepted_at: acceptedAt,
        },
      },
    })

    if (error) return { ok: false, error: FALHA_AUTENTICACAO }
    if (data.user?.email && data.user.email_confirmed_at) {
      await provisionAuthenticatedUser(data.user.email, normalizedName)
      await client.auth.signOut({ scope: 'local' })
      return {
        ok: true,
        message: 'Conta criada e confirmada. Você já pode entrar.',
      }
    }
    await client.auth.signOut({ scope: 'local' })
    return {
      ok: true,
      message: 'Conta criada. Abra o e-mail de confirmação para validar seu acesso.',
    }
  } catch {
    return authError()
  }
}

/** Inicia Google OAuth para uma conta que já aceitou os termos anteriormente. */
export async function loginWithGoogle(): Promise<ActionResult<OAuthStartData>> {
  try {
    const client = await createAuthClient()
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: await authCallbackUrl(),
        skipBrowserRedirect: true,
      },
    })

    if (error || !data.url) return { ok: false, error: FALHA_AUTENTICACAO }
    return { ok: true, data: { redirectTo: data.url } }
  } catch {
    return authError<OAuthStartData>()
  }
}

export async function registerWithGoogle(
  acceptedLegalTerms: boolean,
): Promise<ActionResult<OAuthStartData>> {
  const status = getRegistrationStatus()
  if (!status.enabled) {
    return { ok: false, error: status.reason ?? 'Novos cadastros estão fechados.' }
  }
  if (!acceptedLegalTerms) {
    return { ok: false, error: 'Aceite os Termos de Uso e a Política de Privacidade.' }
  }

  try {
    await setPendingLegalAcceptance(status)
    const client = await createAuthClient()
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: await authCallbackUrl(),
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

    if (error || !data.url) return { ok: false, error: FALHA_AUTENTICACAO }
    return { ok: true, data: { redirectTo: data.url } }
  } catch {
    return authError<OAuthStartData>()
  }
}

export async function logout(): Promise<ActionResult> {
  await clearSession()
  try {
    const client = await createAuthClient()
    await client.auth.signOut({ scope: 'local' })
  } catch (error) {
    // A sessão interna já foi encerrada. Ausência de configuração do Supabase
    // não pode prender a pessoa dentro da aplicação.
    if (!(error instanceof AuthConfigurationError)) return { ok: false, error: FALHA_AUTENTICACAO }
  }
  return { ok: true }
}

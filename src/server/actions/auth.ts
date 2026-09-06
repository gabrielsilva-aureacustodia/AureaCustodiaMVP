'use server'

/**
 * Autenticação com Supabase Auth.
 *
 * A senha deixa de ser comparada com ACCOUNTS ou `user.pass`: ela segue direto
 * para o Supabase Auth, que guarda apenas o hash. Depois de a identidade ser
 * confirmada, a aplicação ainda exige que a frente B tenha carregado os dados
 * mockados daquele e-mail antes de criar a sessão interna.
 */

import { ACCOUNTS, DEMO_DATA } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { mkCoinsForUser } from '@/domain/seed'
import type { ActionResult, User } from '@/domain/types'
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
const FALHA_AUTENTICACAO = 'Não foi possível concluir a autenticação. Tente novamente.'

export interface OAuthStartData {
  redirectTo: string
}

function authError<T = unknown>(): ActionResult<T> {
  return { ok: false, error: FALHA_AUTENTICACAO }
}

/**
 * Entrada pelo catálogo local — RA-19.
 *
 * Vale para as contas de demonstração (`ACCOUNTS`), entre elas a do Rogério em
 * `rogerio@aureacustodia.com.br`. Não passa pelo Supabase em momento nenhum:
 * se a integração de login estiver fora do ar, com chave errada, com o e-mail
 * de confirmação barrado ou com o OAuth quebrado, a demonstração do site
 * continua funcionando. É a rede de segurança da apresentação.
 *
 * Quando a conta ainda não existe no estado — banco semeado antes de ela ser
 * criada, por exemplo — ela é criada aqui com o saldo e o acervo de `DEMO_DATA`,
 * os mesmos que o seed produziria.
 */
async function loginDoCatalogoLocal(email: string, senha: string): Promise<ActionResult | null> {
  const account = ACCOUNTS[email]
  if (!account) return null

  const state = await getState()
  const existente = state.users[email]
  const senhaEsperada = existente?.pass || account.pass
  if (senha !== senhaEsperada) return { ok: false, error: CREDENCIAIS_INVALIDAS }

  await mutateState((current) => {
    const atual = current.users[email]
    if (atual) {
      atual.prevAccess = atual.lastAccess
      atual.lastAccess = Date.now()
      return
    }

    const demo = DEMO_DATA[email]
    const novo: User = {
      name: account.name,
      balance: demo?.balance ?? 500_000,
      coins: mkCoinsForUser(current.seq, demo?.coins ?? 6, demo?.entrada ?? fdate(Date.now())),
      lastAccess: Date.now(),
    }
    current.users[email] = novo
  })

  await setSession(email)
  return { ok: true }
}

function nomeDoSupabase(metadata: Record<string, unknown>): string | undefined {
  const name = metadata.full_name ?? metadata.name
  return typeof name === 'string' ? name : undefined
}

export async function login(email: string, senha: string): Promise<ActionResult> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !senha) return { ok: false, error: CREDENCIAIS_INVALIDAS }

  // As contas de demonstração entram sempre por aqui, antes de qualquer
  // chamada ao Supabase. Ver RA-19.
  const local = await loginDoCatalogoLocal(normalized, senha)
  if (local) return local

  try {
    const client = await createAuthClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: normalized,
      password: senha,
    })

    if (error || !data.user?.email) return { ok: false, error: CREDENCIAIS_INVALIDAS }

    // Identidade confirmada pelo Supabase basta para provisionar. A exigência
    // de aceite legal no metadata trancava para fora quem tinha confirmado o
    // e-mail mas cujo aceite não sobreviveu ao caminho — ver RA-18.
    const provisioned = await authorizeProvisionedUser(data.user.email)
    if (!provisioned) {
      await provisionAuthenticatedUser(
        data.user.email,
        nomeDoSupabase(data.user.user_metadata),
      )
    }

    await setSession(data.user.email.trim().toLowerCase())
    return { ok: true }
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return { ok: false, error: CREDENCIAIS_INVALIDAS }
    }
    return authError()
  }
}

export async function registerWithEmail(
  name: string,
  email: string,
  senha: string,
): Promise<ActionResult> {
  const status = getRegistrationStatus()
  if (!status.enabled) {
    return { ok: false, error: status.reason ?? 'Novos cadastros estão fechados.' }
  }

  // Sem validacao local de nome, e-mail ou tamanho de senha: quem valida e o
  // Supabase, e a mensagem dele e mais precisa do que a nossa. Ver RA-18.
  const normalizedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()

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

    if (error) return { ok: false, error: error.message || FALHA_AUTENTICACAO }
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

export async function registerWithGoogle(): Promise<ActionResult<OAuthStartData>> {
  const status = getRegistrationStatus()
  if (!status.enabled) {
    return { ok: false, error: status.reason ?? 'Novos cadastros estão fechados.' }
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

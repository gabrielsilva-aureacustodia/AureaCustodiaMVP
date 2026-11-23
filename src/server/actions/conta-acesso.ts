'use server'

/**
 * Acesso à conta pelo e-mail: "Esqueci minha senha" (S01), reenvio do link de confirmação (B02) e a
 * situação do e-mail para o selo de Segurança. QA Davi, 22/11/2026.
 *
 * Todo export de arquivo 'use server' é um endpoint: as três ações aqui só devolvem texto neutro.
 * Pedir link NUNCA revela se o e-mail tem conta (a resposta é sempre a mesma), senão a tela vira
 * consulta de quem é cliente. O limite de pedidos por e-mail é do Supabase Auth.
 */

import { createClient } from '@supabase/supabase-js'

import { normalizarEmail } from '@/domain/email'
import type { ActionResult } from '@/domain/types'
import { createAuthClient } from '@/server/auth/client'
import { getAuthConfig } from '@/server/auth/config'
import { authCallbackUrl } from '@/server/auth/origin'
import { getSessionEmail } from '@/server/session'

const RESPOSTA_NEUTRA_SENHA =
  'Se este e-mail tem conta, enviamos um link para criar uma senha nova. Confira também o spam.'
const RESPOSTA_NEUTRA_LINK =
  'Se este e-mail tem conta, enviamos um link de acesso. Clique nele para confirmar o e-mail e entrar.'
const FALHA = 'Não foi possível enviar agora. Tente novamente em instantes.'

function emailPlausivel(email: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)
}

/**
 * Link de redefinição. Usa o fluxo `implicit` (sem verificador PKCE em cookie): o link volta ao callback com
 * `type=recovery` no fragmento, que é o que o callback e `sessaoVeioDeLinkDeEmailRecente` já reconhecem — o mesmo
 * formato dos links que o painel envia (`enviarLinkDeSenha`). Funciona de qualquer navegador, inclusive o do app.
 */
export async function solicitarRedefinicaoDeSenha(email: string): Promise<ActionResult> {
  const alvo = normalizarEmail(email ?? '')
  if (!emailPlausivel(alvo)) return { ok: false, error: 'Informe o e-mail da sua conta.' }
  try {
    const { url, anonKey } = getAuthConfig()
    const client = createClient(url, anonKey, {
      auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false },
    })
    const { error } = await client.auth.resetPasswordForEmail(alvo, { redirectTo: await authCallbackUrl() })
    // Limite de envio do Supabase é o único erro que vale mostrar: o resto fica mudo para não revelar a conta.
    if (error && error.status === 429) {
      return { ok: false, error: 'Aguarde 1 minuto para pedir outro link.' }
    }
    return { ok: true, message: RESPOSTA_NEUTRA_SENHA }
  } catch {
    return { ok: false, error: FALHA }
  }
}

/**
 * Link de acesso por e-mail para quem não confirmou: o clique prova o e-mail e já entra no Início. Não cria conta
 * (`shouldCreateUser: false`).
 */
export async function reenviarLinkDeAcesso(email: string): Promise<ActionResult> {
  const alvo = normalizarEmail(email ?? '')
  if (!emailPlausivel(alvo)) return { ok: false, error: 'Informe o e-mail da sua conta.' }
  try {
    const client = await createAuthClient()
    const { error } = await client.auth.signInWithOtp({
      email: alvo,
      options: { shouldCreateUser: false, emailRedirectTo: await authCallbackUrl() },
    })
    if (error && error.status === 429) {
      return { ok: false, error: 'Aguarde um minuto antes de pedir outro link.' }
    }
    return { ok: true, message: RESPOSTA_NEUTRA_LINK }
  } catch {
    return { ok: false, error: FALHA }
  }
}

/** Para o selo "E-mail verificado" da tela de Segurança: a conta logada já confirmou o e-mail? */
// Decisão de 22/11/2026: conta nasce confirmada, nenhuma limitação por e-mail no cadastro.
export async function situacaoDoEmailDaConta(): Promise<ActionResult<{ confirmado: boolean }>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: 'Sua sessão expirou. Entre novamente.' }
  return { ok: true, data: { confirmado: true } }
}

/** O botão "Reenviar link" da própria tela de Segurança: manda para o e-mail da sessão, sem digitar. */
export async function reenviarLinkParaMinhaConta(): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: 'Sua sessão expirou. Entre novamente.' }
  return reenviarLinkDeAcesso(email)
}

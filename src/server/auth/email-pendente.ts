/* ============================================================================
 * E-MAIL NÃO CONFIRMADO (QA Davi 22/11/2026, B02) — módulo exclusivo de servidor.
 *
 * O PROBLEMA. O projeto Supabase de produção está com `mailer_autoconfirm: true` (conferido em
 * /auth/v1/settings em 22/11/2026): o cadastro por e-mail nasce "confirmado" na hora, sem e-mail e
 * sem clique, e a tela de Segurança mostrava "Verificado" de qualquer jeito (era texto fixo). Quem
 * vê o código não consegue desligar essa chave — ela é do painel do Supabase — e a política certa
 * não pode depender de ela estar ligada ou desligada.
 *
 * O DESENHO. A conta nova pelo e-mail ganha `app_metadata.email_pendente = true`. `app_metadata` só
 * a chave de serviço escreve (o `user_metadata` o próprio cliente edita, por isso não serve). O
 * clique no link do e-mail passa pelo callback, que tira a marca. Conta sem a marca — as dos sócios,
 * as do Google, as criadas pelo painel — vale como verificada, sem migração: nada trava quem já usa.
 *
 * O QUE A MARCA TRANCA. `salvarCadastro` (cadastro formal). Depósito, compra, venda e saque já exigem
 * `temCadastroCompleto`, então conta pendente não chega a nenhum deles — um ponto só para guardar, em
 * vez de espalhar a conferência por quinze Server Actions. Política provisória (a decisão é do
 * Gabriel): pendente entra e olha, não movimenta dinheiro.
 * ==========================================================================*/

import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { createAuthClient } from '@/server/auth/client'

/** A marca, lida de um `app_metadata` qualquer. Pura: o teste a cobre sem Supabase. */
export function marcaDeEmailPendente(appMetadata: Record<string, unknown> | null | undefined): boolean {
  return appMetadata?.email_pendente === true
}

function clienteDeServico() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !chave) return null
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Põe a marca numa conta recém-criada. `false` quando não deu (sem chave de serviço ou erro do Supabase). */
export async function marcarEmailPendente(userId: string): Promise<boolean> {
  const admin = clienteDeServico()
  if (!admin) return false
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { email_pendente: true } })
  return !error
}

/** Tira a marca: o clique no link do e-mail provou que a pessoa lê aquela caixa. Nunca derruba o login. */
export async function liberarEmailPendente(userId: string, appMetadata: Record<string, unknown> | undefined): Promise<void> {
  if (!marcaDeEmailPendente(appMetadata)) return
  try {
    const admin = clienteDeServico()
    if (!admin) return
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { email_pendente: false, email_confirmado_em: new Date().toISOString() },
    })
  } catch {
    // O login segue; a marca fica e o cliente pode pedir novo link.
  }
}

/**
 * A conta da sessão atual está com o e-mail por confirmar? Pergunta ao Supabase (`getUser` valida o
 * token no servidor, então o `app_metadata` lido é confiável). Sem Supabase configurado ou com erro de
 * rede, `false` — falhar fechado trancaria os sócios por uma oscilação de rede.
 */
export async function emailDaSessaoEstaPendente(): Promise<boolean> {
  try {
    const client = await createAuthClient()
    const { data } = await client.auth.getUser()
    return marcaDeEmailPendente(data?.user?.app_metadata)
  } catch {
    return false
  }
}

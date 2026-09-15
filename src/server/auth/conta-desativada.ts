/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Checagem e mensagens para portas de entrada sobre contas desativadas.
 * Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { contaDesativada } from '@/server/admin/situacao'

export const MENSAGEM_CONTA_DESATIVADA = 'Esta conta está desativada. Fale com o atendimento.'
export const STATUS_CONTA_DESATIVADA = 'conta-desativada'
/** Route Handler que apaga a sessão — o casco do app não pode apagar cookie. */
export const SAIDA_DA_CONTA_DESATIVADA = '/entrar/sair'

/** A pergunta das portas de entrada. Qualquer exceção responde "liberada". */
export async function barrarContaDesativada(email: string | null | undefined): Promise<boolean> {
  try {
    return await contaDesativada(email)
  } catch {
    return false
  }
}

/** Erro do Supabase de identidade bloqueada pelo painel (ban_duration). */
export function ehIdentidadeBloqueada(erro: { code?: string; message?: string } | null | undefined): boolean {
  return erro?.code === 'user_banned' || /\bbanned\b/i.test(erro?.message ?? '')
}

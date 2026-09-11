'use server'

/**
 * Server Actions para o Aceite Legal por Blocos.
 *
 * Permite aos Client Components consultar o estado do aceite da conta logada
 * e submeter a confirmação dos 6 blocos obrigatórios de termos de uso e privacidade.
 */

import type { ActionResult, LegalBlockAcceptance } from '@/domain/types'
import {
  obterStatusAceiteLegal,
  registrarAceiteLegal,
  type StatusAceiteLegal,
} from '@/server/auth/legal'
import { getSessionEmail } from '@/server/session'

const SESSAO_EXPIRADA = 'Sessão expirada.'

/**
 * Registra a aceitação dos blocos de termos e condições para o usuário logado.
 */
export async function salvarAceiteLegal(
  blocosMarcados: string[],
): Promise<ActionResult<LegalBlockAcceptance>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  return registrarAceiteLegal(email, blocosMarcados)
}

/**
 * Consulta se o usuário logado possui o aceite vigente com todos os blocos.
 */
export async function consultarStatusAceiteLegal(): Promise<ActionResult<StatusAceiteLegal>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  const status = await obterStatusAceiteLegal(email)
  return { ok: true, data: status }
}

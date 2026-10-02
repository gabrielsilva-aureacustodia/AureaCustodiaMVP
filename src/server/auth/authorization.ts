/* ============================================================================
 * PONTE ENTRE IDENTIDADE E DADOS DE TESTE — módulo exclusivo de servidor.
 *
 * Supabase Auth prova quem é a pessoa; o AppState ainda responde se aquela
 * identidade já recebeu os dados mockados. Separar as duas decisões permite
 * distinguir uma entrada comum de uma primeira confirmação. O provisionamento
 * dos dados mockados fica em provisioning.ts e só roda após a identidade ter
 * sido confirmada pelo Supabase.
 * ==========================================================================*/

import 'server-only'

import { getState, mutateState } from '@/server/state'
import { chaveDeUsuario, normalizarEmail } from '@/domain/email'

export async function authorizeProvisionedUser(email: string): Promise<boolean> {
  const normalized = normalizarEmail(email)
  const current = await getState()
  const chave = chaveDeUsuario(current.users, normalized)
  if (chave === null) return false

  const { result } = await mutateState((state) => {
    const chaveAtual = chaveDeUsuario(state.users, normalized)
    const user = chaveAtual === null ? undefined : state.users[chaveAtual]
    if (!user) return false

    user.prevAccess = user.lastAccess
    user.lastAccess = Date.now()
    return true
  })

  return result
}

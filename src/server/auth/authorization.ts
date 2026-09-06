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

export async function authorizeProvisionedUser(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  const current = await getState()
  if (!current.users[normalized]) return false

  const { result } = await mutateState((state) => {
    const user = state.users[normalized]
    if (!user) return false

    user.prevAccess = user.lastAccess
    user.lastAccess = Date.now()
    return true
  })

  return result
}

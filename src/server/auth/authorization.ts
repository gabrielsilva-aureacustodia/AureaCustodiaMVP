/* ============================================================================
 * PONTE ENTRE IDENTIDADE E DADOS DE TESTE — módulo exclusivo de servidor.
 *
 * Supabase Auth prova quem é a pessoa; o AppState ainda responde se aquela
 * identidade já recebeu os dados mockados. Separar as duas decisões permite
 * recriar as contas dos sócios do zero sem inventar usuário vazio ou saldo no
 * fluxo de login — essa carga pertence à frente B.
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

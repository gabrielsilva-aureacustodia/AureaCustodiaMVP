/* ============================================================================
 * PROVISIONAMENTO DE DADOS MOCKADOS APÓS AUTENTICAÇÃO — somente servidor.
 *
 * O Supabase prova a identidade; esta função cria o lado demonstrativo da
 * conta apenas depois dessa prova. O navegador nunca escolhe saldo nem acervo.
 * ==========================================================================*/

import 'server-only'

import { fdate } from '@/domain/dates'
import { mkCoinsForUser } from '@/domain/seed'
import type { Cents, User } from '@/domain/types'
import { mutateState } from '@/server/state'

/** Mantém os mesmos dados da conta de demonstração que a rota provisória oferecia. */
export const SALDO_MOCK_INICIAL: Cents = 500_000
export const MOEDAS_MOCK_INICIAIS = 6

export interface ProvisioningResult {
  created: boolean
  email: string
}

function nomeDaConta(nome: string | undefined, email: string): string {
  const normalizado = nome?.trim()
  if (normalizado && normalizado.length >= 2) return normalizado
  return email.split('@')[0] || 'Conta Áurea'
}

/**
 * Cria saldo e moedas fictícias para uma identidade já confirmada. A operação
 * é idempotente: duas chegadas do callback atualizam o acesso da mesma conta.
 */
export async function provisionAuthenticatedUser(
  email: string,
  nome?: string,
): Promise<ProvisioningResult> {
  const normalized = email.trim().toLowerCase()

  const { result } = await mutateState<ProvisioningResult>((state) => {
    const existing = state.users[normalized]
    if (existing) {
      existing.prevAccess = existing.lastAccess
      existing.lastAccess = Date.now()
      return { created: false, email: normalized }
    }

    const user: User = {
      name: nomeDaConta(nome, normalized),
      balance: SALDO_MOCK_INICIAL,
      coins: mkCoinsForUser(state.seq, MOEDAS_MOCK_INICIAIS, fdate(Date.now())),
      lastAccess: Date.now(),
    }
    state.users[normalized] = user

    return { created: true, email: normalized }
  })

  return result
}

'use server'

/**
 * Consulta da situação de bloqueio por pendência de custódia e vendedores pausados.
 *
 * Server Action somente-leitura utilizada pelos componentes clientes para obter
 * a situação da conta logada e a lista de vendedores com anúncios pausados no livro.
 *
 * Segue a política de tolerância a falhas do projeto: sem sessão ou em caso de qualquer
 * erro técnico, responde com segurança com valores liberados (minhaContaBloqueada: false).
 */

import type { UserEmail } from '@/domain/types'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'
import { contaComPendenciaNoEstado } from '@/domain/bloqueio-por-debito'
import { contaBloqueavel, vendedoresBloqueaveis } from '@/server/custodia/isencao-da-equipe'

export interface SituacaoBloqueioPorPendencia {
  minhaContaBloqueada: boolean
  vendedoresPausados: UserEmail[]
}

export async function situacaoDoBloqueioPorPendencia(): Promise<SituacaoBloqueioPorPendencia> {
  try {
    const email = await getSessionEmail().catch(() => null)
    if (!email) {
      return { minhaContaBloqueada: false, vendedoresPausados: [] }
    }

    const vendedoresSet = await vendedoresBloqueaveis()
    const vendedoresPausados = Array.from(vendedoresSet)

    const bloqueavel = await contaBloqueavel(email)
    if (!bloqueavel) {
      return { minhaContaBloqueada: false, vendedoresPausados }
    }

    const state = await getState()
    const minhaContaBloqueada = contaComPendenciaNoEstado(state, email, Date.now())

    return { minhaContaBloqueada, vendedoresPausados }
  } catch {
    return { minhaContaBloqueada: false, vendedoresPausados: [] }
  }
}

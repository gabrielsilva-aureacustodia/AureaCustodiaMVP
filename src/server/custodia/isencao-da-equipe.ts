/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Avalia a isenção de contas da equipe para bloqueios de custódia.
 * Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import type { UserEmail } from '@/domain/types'
import { carregarMembro } from '@/server/admin/acesso'
import { getState } from '@/server/state'
import { vendedoresComPendencia } from '@/domain/bloqueio-por-debito'

/**
 * Avalia se uma conta pode ser bloqueada por pendência de custódia.
 *
 * Segue a mesma diretriz de `contaDesativada` em `src/server/admin/situacao.ts`:
 * contas reconhecidas por `carregarMembro` (membros da tabela, bootstrap do
 * ambiente e contas do seed) pertencem à equipe e ficam isentas do bloqueio no
 * ambiente de teste ("nada tranca a equipe para fora").
 *
 * Qualquer exceção na consulta é tratada como isenção (retorna false / liberado)
 * para que instabilidade técnica nunca cause bloqueio indevido.
 */
export async function contaBloqueavel(email: UserEmail): Promise<boolean> {
  if (!email) return false
  try {
    const membro = await carregarMembro(email)
    return membro === null
  } catch (err) {
    console.error('[custodia] falha ao checar membro da equipe; liberando por segurança:', err)
    return false
  }
}

/**
 * Das contas recebidas, retorna o subconjunto das que PODEM ser bloqueadas
 * (onde `carregarMembro` respondeu null).
 */
export async function contasBloqueaveis(emails: Iterable<UserEmail>): Promise<Set<UserEmail>> {
  const bloqueaveis = new Set<UserEmail>()
  for (const email of emails) {
    if (await contaBloqueavel(email)) {
      bloqueaveis.add(email)
    }
  }
  return bloqueaveis
}

/**
 * Lê o estado da aplicação, identifica os vendedores com ofertas no livro que possuem
 * pendência de custódia e devolve aqueles que são bloqueáveis (não isentos).
 * Qualquer falha na leitura ou consulta devolve um Set vazio (liberado).
 */
export async function vendedoresBloqueaveis(): Promise<Set<UserEmail>> {
  try {
    const state = await getState()
    const candidatos = vendedoresComPendencia(state, Date.now())
    return await contasBloqueaveis(candidatos)
  } catch (err) {
    console.error('[custodia] falha ao listar vendedores bloqueáveis; liberando:', err)
    return new Set<UserEmail>()
  }
}

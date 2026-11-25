'use server'

/**
 * Server Action dos interruptores de /admin/features.
 *
 * SÓ A SUPERADMIN. A ação confere a sessão e o papel `dev` POR CONTA PRÓPRIA — esconder o item do
 * menu não protege nada. Quem não é `dev` recebe 403 e a tentativa vai para a trilha de recusas.
 * Toda troca grava `admin.features.alternar` na trilha e uma linha em `config_historico`.
 */

import { SLUG_DEV } from '@/domain/admin/permissoes'
import type { ActionResult } from '@/domain/types'
import { carregarMembro, SESSAO_EXPIRADA, SO_EQUIPE } from '@/server/admin/acesso'
import { alternarFeature } from '@/server/config/features'
import { getSessionEmail } from '@/server/session'

const SO_SUPERADMIN = 'Os interruptores de features são só da superadmin.'
const FALHA = 'Falha ao salvar o interruptor. Tente novamente.'

export async function alternarFeatureNoPainel(chave: string, ligada: boolean): Promise<ActionResult<{ ligada: boolean }>> {
  const email = await getSessionEmail().catch(() => null)
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }
  const membro = await carregarMembro(email)
  if (!membro) return { ok: false, error: SO_EQUIPE }
  if (membro.papel.slug !== SLUG_DEV) return { ok: false, error: SO_SUPERADMIN }
  try {
    const r = await alternarFeature(membro.email, typeof chave === 'string' ? chave : '', ligada === true)
    if (!r.ok) return { ok: false, error: r.erro }
    return { ok: true, message: r.ligada ? 'Feature ligada.' : 'Feature desligada.', data: { ligada: r.ligada } }
  } catch (err) {
    console.error('[admin] falha ao alternar feature:', err)
    return { ok: false, error: FALHA }
  }
}

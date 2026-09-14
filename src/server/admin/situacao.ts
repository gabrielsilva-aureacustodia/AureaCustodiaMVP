/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê `aurea.admin_situacao_contas` pelo banco. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { normalizarEmail } from '@/domain/admin/permissoes'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { situacaoDaConta } from '@/server/db/repositories/admin-usuarios'

import { podeAbrirPainelAdmin } from './acesso'

/**
 * "Esta conta foi desativada pelo painel?" — a pergunta que as portas de entrada fazem.
 *
 * O painel desativa em duas metades (src/server/admin/usuarios.ts): bloqueia o login no
 * Supabase Auth e registra a situação aqui. A entrada pelo catálogo de demonstração e a sessão
 * já aberta não passam pelo Supabase; quem as fecha é o dono delas — a frente A, no login, no
 * callback e no casco do app — chamando esta função. O pedido está em
 * docs/finalizacoes/PENDENCIAS_AGENTE_C.md.
 *
 * NADA TRANCA NINGUÉM POR ACIDENTE:
 *  - sem banco, ou com o banco falhando, a resposta é `false` — instabilidade não é desativação;
 *  - conta que abre o painel (membro ou lista do ambiente) nunca é tratada como desativada. O
 *    painel já recusa desativá-la, e esta segunda garantia cobre o e-mail que virou membro
 *    depois de ter sido desativado.
 */
export async function contaDesativada(email: string | null | undefined): Promise<boolean> {
  if (!email || !bancoConfigurado()) return false
  const conta = normalizarEmail(email)
  try {
    const situacao = await executarNoBanco((tx) => situacaoDaConta(tx, conta), { somenteLeitura: true })
    if (!situacao || situacao.ativa) return false
    return !(await podeAbrirPainelAdmin(conta))
  } catch (err) {
    console.error('[admin] situação da conta indisponível; tratando como ativa:', err)
    return false
  }
}

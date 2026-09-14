'use server'

/**
 * Server Actions da tela Equipe e papéis — quem acessa o painel e o que cada papel pode.
 *
 * Mesma regra de toda ação do painel: a permissão é conferida AQUI, por conta própria
 * (`admin.membros` para membros, `admin.papeis` para papéis), antes de qualquer coisa. A
 * escrita e a linha `admin.membros.<verbo>` / `admin.papeis.<verbo>` ficam em
 * src/server/admin/rbac.ts, na mesma transação.
 *
 * Nenhuma trava além das que protegem o próprio painel: o papel `dev` tem todas as
 * permissões, e o painel não fica sem um dev ativo. `rank` não recusa nada.
 */

import type { ChavePermissao } from '@/domain/admin/permissoes'
import type { ActionResult } from '@/domain/types'
import { ambienteAtual, permissaoParaAcao } from '@/server/admin/acesso'
import {
  adicionarMembro,
  alterarMembro,
  alterarPapel,
  criarPapel,
  excluirPapel,
  type ResultadoEquipe,
} from '@/server/admin/rbac'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

const SEM_BANCO = 'Sem banco configurado (POSTGRES_URL): sem ele só vale a lista do ambiente, e não há equipe para editar.'
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

async function comPermissao(chave: ChavePermissao, acao: (ator: string) => Promise<ResultadoEquipe>): Promise<ActionResult> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  if (!bancoConfigurado()) return { ok: false, error: SEM_BANCO }
  try {
    const r = await acao(acesso.membro.email)
    return r.ok ? { ok: true, message: r.mensagem } : { ok: false, error: r.erro }
  } catch (err) {
    console.error(`[admin] falha na ação de equipe que pede ${chave}:`, err)
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

export async function adicionarMembroNoPainel(email: string, nome: string, papelSlug: string): Promise<ActionResult> {
  return comPermissao('admin.membros', (ator) => adicionarMembro(executarNoBanco, ator, { email, nome, papelSlug }, ambienteAtual()))
}

export async function alterarMembroNoPainel(
  email: string,
  alteracoes: { nome?: string; papelSlug?: string; status?: string },
): Promise<ActionResult> {
  const { nome, papelSlug, status } = alteracoes ?? {}
  return comPermissao('admin.membros', (ator) => alterarMembro(executarNoBanco, ator, { email, nome, papelSlug, status }, ambienteAtual()))
}

export async function criarPapelNoPainel(entrada: {
  slug: string
  nome: string
  rank: number
  variantePainel: string
  permissoes: string[]
}): Promise<ActionResult> {
  return comPermissao('admin.papeis', (ator) =>
    criarPapel(executarNoBanco, ator, {
      slug: entrada?.slug ?? '',
      nome: entrada?.nome ?? '',
      // NaN é recusado pela validação com a mensagem certa; o cliente pode mandar qualquer coisa.
      rank: typeof entrada?.rank === 'number' ? entrada.rank : Number.NaN,
      variantePainel: entrada?.variantePainel ?? '',
      permissoes: Array.isArray(entrada?.permissoes) ? entrada.permissoes : [],
    }),
  )
}

export async function alterarPapelNoPainel(
  slug: string,
  alteracoes: { nome?: string; rank?: number; variantePainel?: string; permissoes?: string[] },
): Promise<ActionResult> {
  const a = alteracoes ?? {}
  return comPermissao('admin.papeis', (ator) =>
    alterarPapel(executarNoBanco, ator, {
      slug,
      nome: a.nome,
      rank: a.rank,
      variantePainel: a.variantePainel,
      permissoes: Array.isArray(a.permissoes) ? a.permissoes : undefined,
    }),
  )
}

export async function excluirPapelNoPainel(slug: string): Promise<ActionResult> {
  return comPermissao('admin.papeis', (ator) => excluirPapel(executarNoBanco, ator, slug))
}

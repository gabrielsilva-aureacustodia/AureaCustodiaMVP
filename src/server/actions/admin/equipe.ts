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
import { conviteDeEquipe, gravarReenvio } from '@/server/admin/emails'
import { authCallbackUrl } from '@/server/auth/origin'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { listarMembros } from '@/server/db/repositories/admin-rbac'
import { enviarEmail } from '@/lib/email'

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
  const r = await comPermissao('admin.membros', (ator) => adicionarMembro(executarNoBanco, ator, { email, nome, papelSlug }, ambienteAtual()))
  if (!r.ok) return r
  // O aviso "você foi adicionado" sai DEPOIS de o membro estar gravado e nunca desfaz o cadastro:
  // se o e-mail falhar, o acesso vale do mesmo jeito e o botão "Reenviar" da lista resolve.
  const aviso = await avisarNovoMembro(email)
  return { ...r, message: aviso ? `${r.message} ${aviso}` : r.message }
}

async function avisarNovoMembro(email: string): Promise<string> {
  try {
    const acesso = await permissaoParaAcao('admin.membros')
    if (!acesso.ok) return ''
    const alvo = email.trim().toLowerCase()
    const membro = (await executarNoBanco((tx) => listarMembros(tx))).find((m) => m.email === alvo)
    if (!membro) return ''
    const link = new URL('/painel', await authCallbackUrl()).toString()
    const { assunto, texto } = conviteDeEquipe(membro.nomeExibicao, membro.papelNome, link)
    const envio = await enviarEmail({ para: alvo, assunto, texto })
    if (!envio.ok) return `O e-mail de aviso não saiu (${envio.erro ?? 'erro do provedor'}); use Reenviar na lista.`
    await executarNoBanco((tx) => gravarReenvio(tx, { ator: acesso.membro.email, tipo: 'convite_equipe', email: alvo, simulado: envio.simulado, primeiro: true }))
    return envio.simulado ? 'Sem RESEND_API_KEY: o aviso foi só registrado no log do servidor.' : 'Aviso enviado por e-mail.'
  } catch (err) {
    console.error('[admin] falha ao avisar novo membro por e-mail:', err)
    return 'O e-mail de aviso não saiu; use Reenviar na lista.'
  }
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

'use server'

/**
 * Server Actions da equipe nos casos de atendimento (`/admin/casos`).
 *
 * A REGRA DESTA PASTA: toda ação confere a permissão por conta própria, antes de qualquer outra coisa.
 * Ler pede `cs.ver`; responder e mudar o estado pedem `cs.responder` — as mesmas do atendimento por
 * WhatsApp, sem papel novo. A escrita e a linha `admin.casos.<verbo>` ficam em
 * src/server/atendimento/casos.ts, na mesma transação.
 */

import type { FiltroDeCasos } from '@/domain/atendimento/casos'
import { lerFiltroDeCasos } from '@/domain/atendimento/casos'
import type { ChavePermissao } from '@/domain/admin/permissoes'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import type { ResultadoAdmin } from '@/server/admin/contabil'
import { TABELA_AUSENTE, ehTabelaAusente } from '@/server/admin/portas'
import { avisarRespostaDoCaso } from '@/server/atendimento/avisos'
import {
  abertosParaOMenu,
  listarParaEquipe,
  mudarEstadoDoCaso,
  responderComoEquipe,
  verCasoComoEquipe,
  type CasoDetalhado,
} from '@/server/atendimento/casos'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import type { CasoGravado } from '@/server/db/repositories/casos'

const SEM_BANCO = 'Sem banco configurado (POSTGRES_URL): o atendimento guarda os casos no banco.'
const FALHA = 'Falha ao salvar dados. Tente novamente.'

export interface ListaDeCasos {
  casos: Array<CasoGravado & { ultimaMensagem: string | null }>
  abertos: number
}

async function comPermissao<T>(chave: ChavePermissao, acao: (ator: string) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  if (!bancoConfigurado()) return { ok: false, error: SEM_BANCO }
  try {
    return await acao(acesso.membro.email)
  } catch (err) {
    if (ehTabelaAusente(err)) return { ok: false, error: TABELA_AUSENTE }
    console.error(`[admin] falha na ação de casos que pede ${chave}:`, err)
    return { ok: false, error: FALHA }
  }
}

function paraAction<T>(r: ResultadoAdmin<T>): ActionResult<T> {
  return r.ok ? { ok: true, message: r.mensagem, data: r.dados } : { ok: false, error: r.erro }
}

function inteiro(v: unknown): number {
  return typeof v === 'number' && Number.isSafeInteger(v) ? v : Number.NaN
}

export async function listarCasosNoPainel(filtro: Partial<FiltroDeCasos>): Promise<ActionResult<ListaDeCasos>> {
  return comPermissao('cs.ver', async () => {
    const f = filtro ?? {}
    const limpo = lerFiltroDeCasos({ estado: typeof f.estado === 'string' ? f.estado : undefined, tipo: typeof f.tipo === 'string' ? f.tipo : undefined, q: typeof f.busca === 'string' ? f.busca : undefined })
    return { ok: true, data: await listarParaEquipe(executarNoBanco, limpo) }
  })
}

export async function verCasoNoPainel(casoId: number): Promise<ActionResult<CasoDetalhado>> {
  return comPermissao('cs.ver', async () => {
    const d = await verCasoComoEquipe(executarNoBanco, inteiro(casoId))
    return d ? { ok: true, data: d } : { ok: false, error: 'Caso não encontrado.' }
  })
}

export async function responderCasoNoPainel(casoId: number, texto: string): Promise<ActionResult<{ avisoPorEmail: 'enviado' | 'so-na-area' }>> {
  return comPermissao('cs.responder', async (ator) => {
    const id = inteiro(casoId)
    const r = await responderComoEquipe(executarNoBanco, ator, id, texto)
    if (!r.ok) return { ok: false, error: r.erro }
    const aviso = await avisarRespostaDoCaso(r.dados!.clienteEmail, id, r.dados!.titulo)
    const via = aviso.enviado ? 'enviado' : 'so-na-area'
    return { ok: true, message: aviso.enviado ? 'Resposta enviada. O cliente também recebeu um e-mail.' : 'Resposta enviada. O cliente a vê na área logada (o e-mail ainda não está configurado).', data: { avisoPorEmail: via } }
  })
}

export async function mudarEstadoDoCasoNoPainel(casoId: number, gesto: string): Promise<ActionResult<{ estado: string }>> {
  return comPermissao('cs.responder', async (ator) => paraAction(await mudarEstadoDoCaso(executarNoBanco, ator, inteiro(casoId), gesto)))
}

/** Para o contador do menu. Quem não tem `cs.ver` ou está sem banco recebe zero: o menu nunca quebra por isso. */
export async function contarCasosAbertosNoPainel(): Promise<number> {
  const r = await comPermissao('cs.ver', async () => ({ ok: true, data: await abertosParaOMenu(executarNoBanco) }))
  return r.ok ? r.data ?? 0 : 0
}

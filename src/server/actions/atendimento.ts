'use server'

/**
 * Server Actions do cliente no atendimento: ver os próprios casos, abrir um e escrever nele.
 *
 * O E-MAIL DA SESSÃO É QUEM MANDA. Nenhuma ação recebe "de quem é o caso": o dono vem de
 * `getSessionEmail()` e entra na consulta, então um id de outra conta devolve "não encontrado".
 * O envio com imagem não passa por aqui: Server Action tem corpo de 1 MB, e o print pode ter 2 —
 * vai por POST /api/atendimento/casos (route handler).
 */

import type { CasoDetalhado } from '@/server/atendimento/casos'
import { listarMeusCasos, responderComoCliente, verCasoComoCliente } from '@/server/atendimento/casos'
import type { CasoGravado } from '@/server/db/repositories/casos'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { ehTabelaAusente } from '@/server/admin/portas'
import { getSessionEmail } from '@/server/session'
import type { ActionResult } from '@/domain/types'

const SEM_SESSAO = 'Sessão expirada. Entre de novo.'
const INDISPONIVEL = 'O atendimento não está disponível agora. Tente de novo em instantes.'

function inteiro(v: unknown): number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : Number.NaN
}

export async function listarMeusCasosAction(): Promise<ActionResult<{ casos: CasoGravado[]; novas: number }>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SEM_SESSAO }
  // Sem banco (ambiente de demonstração) a lista simplesmente vem vazia: o botão da plataforma não deve quebrar tela nenhuma.
  if (!bancoConfigurado()) return { ok: true, data: { casos: [], novas: 0 } }
  try {
    return { ok: true, data: await listarMeusCasos(executarNoBanco, email) }
  } catch (err) {
    if (ehTabelaAusente(err)) return { ok: true, data: { casos: [], novas: 0 } }
    console.error('[atendimento] falha ao listar os casos do cliente:', err)
    return { ok: false, error: INDISPONIVEL }
  }
}

export async function verMeuCasoAction(casoId: number): Promise<ActionResult<CasoDetalhado>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SEM_SESSAO }
  const id = inteiro(casoId)
  if (Number.isNaN(id) || !bancoConfigurado()) return { ok: false, error: 'Caso não encontrado.' }
  try {
    const d = await verCasoComoCliente(executarNoBanco, email, id)
    return d ? { ok: true, data: d } : { ok: false, error: 'Caso não encontrado.' }
  } catch (err) {
    console.error('[atendimento] falha ao abrir o caso do cliente:', err)
    return { ok: false, error: INDISPONIVEL }
  }
}

export async function responderMeuCasoAction(casoId: number, texto: string): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SEM_SESSAO }
  const id = inteiro(casoId)
  if (Number.isNaN(id) || !bancoConfigurado()) return { ok: false, error: 'Caso não encontrado.' }
  try {
    const r = await responderComoCliente(executarNoBanco, email, id, texto)
    return r.ok ? { ok: true, message: r.mensagem } : { ok: false, error: r.erro }
  } catch (err) {
    console.error('[atendimento] falha ao gravar a mensagem do cliente:', err)
    return { ok: false, error: INDISPONIVEL }
  }
}

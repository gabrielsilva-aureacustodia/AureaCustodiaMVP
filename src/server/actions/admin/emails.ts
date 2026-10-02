'use server'

/**
 * Server Actions de reenvio de e-mail ao cliente e à equipe — o botão "não recebi" do painel.
 *
 * Mesma regra de toda ação do painel: a permissão é conferida AQUI, por conta própria, antes de
 * qualquer coisa — `usuarios.editar` para o cliente (link de senha, aviso de reserva) e
 * `admin.membros` para o convite de equipe. Todo reenvio grava `admin.email.reenviar` na trilha
 * (src/server/admin/emails.ts), com o tipo do e-mail em `detalhes`.
 *
 * Falha de envio devolve erro ao atendente e NÃO grava a linha: a trilha registra o que saiu.
 */

import { ACCOUNTS } from '@/domain/constants'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { conviteDeEquipe, gravarReenvio, type TipoDeReenvio } from '@/server/admin/emails'
import { portaDeEstadoDoServidor, portaDeIdentidadeDoAmbiente, executorOuNulo } from '@/server/admin/portas'
import { redefinirSenha } from '@/server/admin/usuarios'
import { listarMembros } from '@/server/db/repositories/admin-rbac'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { authCallbackUrl } from '@/server/auth/origin'
import { enviarEmail } from '@/lib/email'
import { corpo as corpoDoAvisoDeReserva } from '@/server/mercado/aviso-de-reserva'
import { getState, mutateState } from '@/server/state'
import type { ChavePermissao } from '@/domain/admin/permissoes'

const FALHA = 'Falha ao reenviar o e-mail. Tente novamente.'

function conta(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

async function gravar(ator: string, tipo: TipoDeReenvio, email: string, extra: { referencia?: string; simulado?: boolean } = {}): Promise<void> {
  const executar = executorOuNulo()
  if (!executar) return
  await executar((tx) => gravarReenvio(tx, { ator, tipo, email, ...extra }))
}

async function comPermissao(chave: ChavePermissao, acao: (ator: string) => Promise<ActionResult>): Promise<ActionResult> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  try {
    return await acao(acesso.membro.email)
  } catch (err) {
    console.error(`[admin] falha ao reenviar e-mail (${chave}):`, err)
    return { ok: false, error: FALHA }
  }
}

/** Reenvia o link de redefinição de senha — o mesmo envio do botão original, mais a linha do reenvio. */
export async function reenviarRedefinicaoSenhaNoPainel(email: string): Promise<ActionResult> {
  return comPermissao('usuarios.editar', async (ator) => {
    const alvo = conta(email)
    const r = await redefinirSenha(executorOuNulo(), portaDeEstadoDoServidor(ator), portaDeIdentidadeDoAmbiente(), ator, {
      email: alvo,
      modo: 'link',
      senha: '',
      redirecionarPara: await authCallbackUrl(),
      ehDoCatalogo: alvo in ACCOUNTS,
    })
    if (!r.ok) return { ok: false, error: r.erro }
    await gravar(ator, 'redefinicao_senha', alvo)
    return { ok: true, message: 'E-mail de redefinição reenviado.' }
  })
}

/** Reenvia o aviso de reserva (prazo para pagar) de uma compra pós-paga ainda aberta. */
export async function reenviarAvisoDeReservaNoPainel(email: string, reservaId: string): Promise<ActionResult> {
  return comPermissao('usuarios.editar', async (ator) => {
    const alvo = conta(email)
    const id = typeof reservaId === 'string' ? reservaId.trim() : ''
    const state = await getState()
    const r = (state.reservas ?? []).find((x) => x.id === id && x.comprador === alvo)
    if (!r) return { ok: false, error: 'Reserva não encontrada para esta conta.' }
    if (r.status !== 'aguardando_pagamento' || r.expiraEm <= Date.now()) {
      return { ok: false, error: 'O prazo desta reserva já terminou: não há mais o que avisar.' }
    }
    const { assunto, texto } = corpoDoAvisoDeReserva(r, state.users[alvo]?.name ?? alvo)
    const envio = await enviarEmail({ para: alvo, assunto, texto })
    if (!envio.ok) return { ok: false, error: `O e-mail não saiu: ${envio.erro ?? 'erro do provedor'}.` }
    await mutateState((s) => {
      const reserva = (s.reservas ?? []).find((x) => x.id === id)
      if (reserva) reserva.avisadoEm = Date.now()
      return null
    })
    await gravar(ator, 'aviso_reserva', alvo, { referencia: id, simulado: envio.simulado })
    return {
      ok: true,
      message: envio.simulado ? 'Sem RESEND_API_KEY: o aviso foi só registrado no log do servidor, não saiu.' : 'Aviso de reserva reenviado.',
    }
  })
}

/** Reenvia o "você foi adicionado à equipe" a um membro já cadastrado. */
export async function reenviarConviteDeEquipeNoPainel(email: string): Promise<ActionResult> {
  return comPermissao('admin.membros', async (ator) => {
    if (!bancoConfigurado()) return { ok: false, error: 'Sem banco configurado: não há equipe cadastrada.' }
    const alvo = conta(email)
    const membro = (await executarNoBanco((tx) => listarMembros(tx))).find((m) => m.email === alvo)
    if (!membro) return { ok: false, error: 'Membro não encontrado.' }
    const { assunto, texto } = conviteDeEquipe(membro.nomeExibicao, membro.papelNome, await linkDoPainel())
    const envio = await enviarEmail({ para: alvo, assunto, texto })
    if (!envio.ok) return { ok: false, error: `O e-mail não saiu: ${envio.erro ?? 'erro do provedor'}.` }
    await gravar(ator, 'convite_equipe', alvo, { simulado: envio.simulado })
    return {
      ok: true,
      message: envio.simulado ? 'Sem RESEND_API_KEY: o convite foi só registrado no log do servidor, não saiu.' : 'Convite reenviado.',
    }
  })
}

async function linkDoPainel(): Promise<string> {
  return new URL('/painel', await authCallbackUrl()).toString()
}

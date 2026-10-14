'use server'

/**
 * Server Actions do painel para os saques: aprovar (Pix pelo Mercado Pago), pagar por fora, conferir,
 * recusar e reenviar.
 *
 * 14/10/2026. Os saques eram só uma linha `solicitado` e o dinheiro do cliente ficava reservado sem
 * ninguém para pagar. As duas ações que existiam em `account.ts` conferiam apenas que HAVIA uma sessão —
 * qualquer cliente logado podia, em tese, marcar o saque de outro como pago ou recusá-lo (estornando o
 * valor). Saíram de lá: a regra desta pasta é que **cada ação confere a permissão por conta própria**
 * (`saques.pagar`, e `saques.ver` para ler) e grava `admin.saques.<verbo>` em `audit_log`.
 *
 * A lógica mora em `src/server/saques/pagamento.ts`, que não é 'use server' e por isso não vira
 * endpoint: só este arquivo é alcançável pelo navegador, e ele só chega lá depois da permissão.
 */

import type { ChavePermissao, MembroAdmin } from '@/domain/admin/permissoes'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  aprovarPeloMercadoPago,
  conferirNoMercadoPago,
  recusarSaque as recusarNoServico,
  registrarPagamentoManual,
} from '@/server/saques/pagamento'
import { avisarClienteDoSaque } from '@/server/saques/avisos'

const FALHA = 'Falha ao salvar dados. Tente novamente.'

async function auditar(membro: MembroAdmin, verbo: string, saqueId: string, afetado: string | null, detalhes: Record<string, unknown>): Promise<void> {
  if (!bancoConfigurado()) return
  try {
    await executarNoBanco((tx) =>
      registrarAcaoAdmin(tx, {
        ator: membro.email,
        area: 'saques',
        verbo,
        entidade: 'saque',
        entidadeId: saqueId,
        usuariosAfetados: afetado ? [afetado] : [],
        detalhes,
      }),
    )
  } catch (err) {
    // A trilha é consequência da ação, não condição: o dinheiro já andou.
    console.error('[admin] falha ao gravar a trilha do saque:', err)
  }
}

async function comPermissao<T>(chave: ChavePermissao, acao: (membro: MembroAdmin) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  try {
    return await acao(acesso.membro)
  } catch (err) {
    console.error(`[admin] falha na ação de saques que pede ${chave}:`, err)
    return { ok: false, error: FALHA }
  }
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** Aprova e manda o Pix pelo Mercado Pago (também retoma um envio de resposta incerta). */
export async function aprovarSaque(saqueId: string): Promise<ActionResult> {
  return comPermissao('saques.pagar', async (membro) => {
    const id = texto(saqueId)
    if (!id) return { ok: false, error: 'Saque não informado.' }
    const r = await aprovarPeloMercadoPago(id, membro.email)
    await auditar(membro, 'aprovar', id, r.data?.userEmail ?? null, { canal: 'mercadopago', ok: r.ok, ...(r.ok ? {} : { erro: r.error }) })
    return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error }
  })
}

/** Confere no Mercado Pago se o Pix já foi creditado. */
export async function conferirSaque(saqueId: string): Promise<ActionResult> {
  return comPermissao('saques.pagar', async (membro) => {
    const id = texto(saqueId)
    if (!id) return { ok: false, error: 'Saque não informado.' }
    const r = await conferirNoMercadoPago(id)
    if (r.ok) await auditar(membro, 'conferir', id, null, { veredito: r.data?.veredito })
    if (r.ok && r.data?.veredito === 'pago') {
      await avisarClienteDoSaque(id, 'pago')
    }
    return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error }
  })
}

/** O Pix foi feito por fora (app do banco, painel do Mercado Pago): registra o comprovante. */
export async function marcarSaquePago(saqueId: string, comprovante: string): Promise<ActionResult> {
  return comPermissao('saques.pagar', async (membro) => {
    const id = texto(saqueId)
    if (!id) return { ok: false, error: 'Saque não informado.' }
    const r = await registrarPagamentoManual(id, texto(comprovante), membro.email)
    await auditar(membro, 'pagar_manual', id, r.data?.userEmail ?? null, { canal: 'manual', ok: r.ok, comprovante: texto(comprovante).slice(0, 120) })
    if (r.ok) await avisarClienteDoSaque(id, 'pago')
    return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error }
  })
}

/** Recusa com motivo e devolve o valor ao saldo do cliente. */
export async function recusarSaque(saqueId: string, motivo: string): Promise<ActionResult> {
  return comPermissao('saques.pagar', async (membro) => {
    const id = texto(saqueId)
    if (!id) return { ok: false, error: 'Saque não informado.' }
    const r = await recusarNoServico(id, texto(motivo))
    await auditar(membro, 'recusar', id, r.data?.userEmail ?? null, { ok: r.ok, motivo: texto(motivo).slice(0, 300) })
    if (r.ok) await avisarClienteDoSaque(id, 'recusado')
    return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.error }
  })
}

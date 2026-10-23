'use server'

/**
 * Server Actions do painel para as NFS-e (23/10/2026): reprocessar notas rejeitadas ou com erro,
 * forçar o envio da fila e baixar o XML autorizado.
 *
 * Mesma regra de toda a pasta: cada ação confere a permissão por conta própria (`resultados.nfse` para
 * mandar à Sefin, `resultados.ver` para baixar) e grava `admin.fiscal.<verbo>` em `audit_log`. A
 * lógica mora em src/server/nfse/emissao.ts, que não é 'use server' e por isso não vira endpoint.
 */

import type { ChavePermissao, MembroAdmin } from '@/domain/admin/permissoes'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { reabrirParaEnvio, xmlDaNfse } from '@/server/db/repositories/nfse'
import { processarNotasPendentes, type RelatorioEmissao } from '@/server/nfse/emissao'

const FALHA = 'Falha ao processar as notas. Tente novamente.'

async function comPermissao<T>(chave: ChavePermissao, acao: (membro: MembroAdmin) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  if (!bancoConfigurado()) return { ok: false, error: 'Sem banco de dados configurado: a fila de notas vive no Postgres.' }
  try {
    return await acao(acesso.membro)
  } catch (err) {
    console.error(`[admin] falha na ação fiscal que pede ${chave}:`, err)
    return { ok: false, error: FALHA }
  }
}

async function auditar(membro: MembroAdmin, verbo: string, detalhes: Record<string, unknown>): Promise<void> {
  try {
    await executarNoBanco((tx) => registrarAcaoAdmin(tx, { ator: membro.email, area: 'fiscal', verbo, entidade: 'nfse', detalhes }))
  } catch (err) {
    console.error('[admin] falha ao gravar a trilha fiscal:', err)
  }
}

function resumo(r: RelatorioEmissao): string {
  if (r.impedimento) return r.impedimento
  if (!r.processadas) return 'Nada na fila para enviar.'
  return `${r.processadas} nota(s) processada(s): ${r.autorizadas} autorizada(s), ${r.rejeitadas} rejeitada(s), ${r.erros} com erro.`
}

/** Envia agora o que está na fila, sem esperar o cron. */
export async function enviarFilaDeNotas(): Promise<ActionResult<RelatorioEmissao>> {
  return comPermissao('resultados.nfse', async (membro) => {
    const r = await processarNotasPendentes({ limite: 100 })
    await auditar(membro, 'enviar_fila', { ...r })
    return r.impedimento ? { ok: false, error: r.impedimento } : { ok: true, message: resumo(r), data: r }
  })
}

/** Devolve à fila as notas rejeitadas ou com erro (uma ou todas) e envia em seguida. */
export async function reprocessarNotas(ids: number[] | 'todas'): Promise<ActionResult<RelatorioEmissao>> {
  return comPermissao('resultados.nfse', async (membro) => {
    const alvo = ids === 'todas' ? 'todas' : ids.filter((n) => Number.isInteger(n) && n > 0)
    if (alvo !== 'todas' && !alvo.length) return { ok: false, error: 'Nenhuma nota selecionada.' }
    const reabertas = await executarNoBanco((tx) => reabrirParaEnvio(tx, alvo, Date.now()))
    const r = await processarNotasPendentes({ limite: 100 })
    await auditar(membro, 'reprocessar', { reabertas, ids: alvo, ...r })
    if (r.impedimento) return { ok: false, error: r.impedimento }
    return { ok: true, message: `${reabertas} nota(s) devolvida(s) à fila. ${resumo(r)}`, data: r }
  })
}

/** O XML da nota autorizada — o documento fiscal oficial (o PDF é só representação). */
export async function baixarXmlNfse(id: number): Promise<ActionResult<{ nome: string; xml: string }>> {
  return comPermissao('resultados.ver', async () => {
    const r = await executarNoBanco((tx) => xmlDaNfse(tx, id))
    if (!r?.xml) return { ok: false, error: 'Esta nota ainda não tem XML autorizado.' }
    return { ok: true, data: { nome: `NFSe-${r.chaveAcesso ?? id}.xml`, xml: r.xml } }
  })
}

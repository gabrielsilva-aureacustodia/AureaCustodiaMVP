'use server'

/**
 * Server Actions do controle financeiro (`/admin/resultados/controle`, migration 046).
 *
 * A REGRA DESTA PASTA: toda ação confere a permissão POR CONTA PRÓPRIA, antes de qualquer outra
 * coisa. Escrever no controle financeiro gera lançamento contábil, então pede a MESMA permissão
 * do lançamento manual da aba Contábil: `contabil.lancar` (decisão do Gabriel, 25/10/2026 — sem
 * permissão nova). Ver a tela pede `resultados.ver`, conferida pela página.
 *
 * A validação mora em src/domain/financeiro/controle.ts; a escrita e a linha
 * `admin.financeiro.<verbo>` em src/server/admin/financeiro.ts, na mesma transação.
 */

import type { ActionResult, Cents } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import type { ResultadoAdmin } from '@/server/admin/contabil'
import { alternarRecorrente, lancarVencidos, salvarRecorrente, salvarSetor } from '@/server/admin/financeiro'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

const SEM_BANCO = 'Sem banco configurado (POSTGRES_URL): o controle financeiro só existe com o Supabase.'
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'
const SEM_TABELA = 'O banco ainda não tem as tabelas do controle financeiro (migration 046). Rode npm run db:migrate.'

async function comLancar<T>(acao: (ator: string) => Promise<ResultadoAdmin<T>>): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao('contabil.lancar')
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  if (!bancoConfigurado()) return { ok: false, error: SEM_BANCO }
  try {
    const r = await acao(acesso.membro.email)
    return r.ok ? { ok: true, message: r.mensagem, data: r.dados } : { ok: false, error: r.erro }
  } catch (err) {
    console.error('[admin] falha no controle financeiro:', err)
    // Tabela ausente (42P01) = a 046 ainda não foi aplicada neste banco.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01') return { ok: false, error: SEM_TABELA }
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

export interface EntradaRecorrenteDoPainel {
  tipo: string
  descricao: string
  fornecedor: string
  contaCodigo: string
  setorId: number | null
  valorCents: Cents
  periodicidade: string
  inicio: string
  fim: string
  observacao: string
}

export async function salvarRecorrenteNoPainel(id: number | null, entrada: EntradaRecorrenteDoPainel): Promise<ActionResult<{ id: number; lancadas: number }>> {
  return comLancar((ator) => salvarRecorrente(executarNoBanco, ator, id, entrada))
}

export async function alternarRecorrenteNoPainel(id: number, ativo: boolean): Promise<ActionResult<{ lancadas: number }>> {
  return comLancar((ator) => alternarRecorrente(executarNoBanco, ator, id, ativo))
}

export async function lancarVencidosNoPainel(): Promise<ActionResult<{ lancadas: number }>> {
  return comLancar(async (ator) => {
    const r = await lancarVencidos(executarNoBanco, ator)
    return r.ok ? { ok: true, mensagem: r.mensagem, dados: { lancadas: r.dados?.lancadas.length ?? 0 } } : r
  })
}

export async function salvarSetorNoPainel(id: number | null, nome: string, ativo: boolean): Promise<ActionResult<{ id: number }>> {
  return comLancar((ator) => salvarSetor(executarNoBanco, ator, id, nome, ativo))
}

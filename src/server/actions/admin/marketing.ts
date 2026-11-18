'use server'

/**
 * Server Actions do gasto de marketing (`/admin/resultados/kpis?aba=gasto`, migration 057).
 *
 * A REGRA DESTA PASTA: toda ação confere a permissão POR CONTA PRÓPRIA, antes de qualquer outra coisa. Escrever
 * o gasto é lançar dinheiro à mão, então pede a MESMA permissão do controle financeiro: `contabil.lancar`
 * (decisão do Gabriel de 25/10/2026 para o controle financeiro — sem permissão nova). Ver os números pede
 * `resultados.ver`, conferida pela página.
 *
 * A validação mora em src/domain/kpis.ts; a escrita e a linha `admin.marketing.<verbo>` em
 * src/server/admin/marketing.ts, na mesma transação.
 */

import type { EntradaDeGasto } from '@/domain/kpis'
import type { ActionResult } from '@/domain/types'
import { permissaoParaAcao } from '@/server/admin/acesso'
import type { ResultadoAdmin } from '@/server/admin/contabil'
import { cancelarGastoRegistrado, registrarGasto } from '@/server/admin/marketing'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

const SEM_BANCO = 'Sem banco configurado (POSTGRES_URL): o gasto de marketing só existe com o Supabase.'
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'
const SEM_TABELA = 'O banco ainda não tem a tabela do gasto de marketing (migration 057). Rode npm run db:migrate.'

async function comLancar<T>(acao: (ator: string) => Promise<ResultadoAdmin<T>>): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao('contabil.lancar')
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  if (!bancoConfigurado()) return { ok: false, error: SEM_BANCO }
  try {
    const r = await acao(acesso.membro.email)
    return r.ok ? { ok: true, message: r.mensagem, data: r.dados } : { ok: false, error: r.erro }
  } catch (err) {
    console.error('[admin] falha no gasto de marketing:', err)
    // Tabela ausente (42P01) = a 057 ainda não foi aplicada neste banco.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01') return { ok: false, error: SEM_TABELA }
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

export async function registrarGastoNoPainel(entrada: EntradaDeGasto): Promise<ActionResult<{ id: number }>> {
  return comLancar((ator) => registrarGasto(executarNoBanco, ator, entrada))
}

export async function cancelarGastoNoPainel(id: number, motivo: string): Promise<ActionResult> {
  return comLancar((ator) => cancelarGastoRegistrado(executarNoBanco, ator, id, motivo))
}

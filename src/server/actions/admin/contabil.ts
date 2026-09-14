'use server'

/**
 * Server Actions da Central de Resultados — abas Financeiro e Contábil do painel.
 *
 * A REGRA DESTA PASTA: toda ação confere a permissão POR CONTA PRÓPRIA, antes de
 * qualquer outra coisa (`permissaoParaAcao`). O botão escondido na tela é conveniência;
 * uma Server Action é um endpoint HTTP, e quem conhece o identificador dela a chama sem
 * tela nenhuma. É aqui que o "não" acontece — e a recusa fica na trilha.
 *
 * O resto é delegado: a validação mora em src/domain/admin/contabil.ts, a escrita e a
 * linha `admin.contabil.<verbo>` em src/server/admin/contabil.ts, na mesma transação.
 *
 * Quem lança: `contabil.lancar`. Quem mexe em alíquota: `contabil.parametros`. Quem
 * envia ao Google Sheets: `resultados.exportar`. Quem confere o livro-razão:
 * `resultados.ver`.
 */

import type { ActionResult, Cents } from '@/domain/types'
import type { ChavePermissao } from '@/domain/admin/permissoes'
import { permissaoParaAcao } from '@/server/admin/acesso'
import { registrarAcaoAdmin } from '@/server/admin/auditar'
import { definirAliquota, estornarManual, lancarManual, verificarLedger, type ResultadoAdmin } from '@/server/admin/contabil'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import type { ParametrosPeriodo } from '@/server/relatorios/dados'
import { sincronizarSheetsComoAtor } from '@/server/relatorios/sincronizar'

const SEM_BANCO = 'Sem banco configurado (POSTGRES_URL): a base contábil só existe com o Supabase.'
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

function paraAction<T>(r: ResultadoAdmin<T>): ActionResult<T> {
  return r.ok ? { ok: true, message: r.mensagem, data: r.dados } : { ok: false, error: r.erro }
}

/** Permissão, depois banco, depois a ação — nessa ordem, sempre. */
async function comPermissaoEBanco<T>(
  chave: ChavePermissao,
  acao: (ator: string) => Promise<ResultadoAdmin<T>>,
): Promise<ActionResult<T>> {
  const acesso = await permissaoParaAcao(chave)
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  if (!bancoConfigurado()) return { ok: false, error: SEM_BANCO }
  try {
    return paraAction(await acao(acesso.membro.email))
  } catch (err) {
    console.error(`[admin] falha na ação que pede ${chave}:`, err)
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

export async function lancarManualNoPainel(
  dataISO: string,
  contaCodigo: string,
  descricao: string,
  valorCents: Cents,
): Promise<ActionResult<{ id: number }>> {
  return comPermissaoEBanco('contabil.lancar', (ator) => lancarManual(executarNoBanco, ator, { dataISO, contaCodigo, descricao, valorCents }))
}

export async function estornarManualNoPainel(id: number, motivo: string): Promise<ActionResult> {
  return comPermissaoEBanco('contabil.lancar', (ator) => estornarManual(executarNoBanco, ator, id, motivo))
}

export async function definirAliquotaNoPainel(chave: string, valor: number | null): Promise<ActionResult> {
  return comPermissaoEBanco('contabil.parametros', (ator) => definirAliquota(executarNoBanco, ator, chave, valor))
}

export async function verificarLedgerNoPainel(): Promise<ActionResult<{ lancamentos: number; primeiraQuebra: number | null }>> {
  return comPermissaoEBanco('resultados.ver', (ator) => verificarLedger(executarNoBanco, ator))
}

/**
 * O push para o Google Sheets reaproveita `sincronizarSheetsComoAtor`, que já registra
 * a exportação e a linha `exportacao.sheets`. A linha `admin.resultados.enviar_sheets`
 * é a do GESTO no painel — quem apertou o botão —, e diz se deu certo.
 */
export async function enviarAoSheetsNoPainel(periodo: ParametrosPeriodo): Promise<ActionResult> {
  const acesso = await permissaoParaAcao('resultados.exportar')
  if (!acesso.ok) return { ok: false, error: acesso.erro }
  const limpo: ParametrosPeriodo = {
    ano: typeof periodo?.ano === 'string' ? periodo.ano : null,
    mes: typeof periodo?.mes === 'string' ? periodo.mes : null,
    trimestre: typeof periodo?.trimestre === 'string' ? periodo.trimestre : null,
  }
  const r = await sincronizarSheetsComoAtor(acesso.membro.email, limpo)
  if (bancoConfigurado()) {
    try {
      await executarNoBanco((tx) =>
        registrarAcaoAdmin(tx, {
          ator: acesso.membro.email,
          area: 'resultados',
          verbo: 'enviar_sheets',
          entidade: 'planilha',
          detalhes: { ok: r.ok, mensagem: r.message, periodo: limpo },
        }),
      )
    } catch (err) {
      console.error('[admin] falha ao registrar o envio ao Sheets:', err)
    }
  }
  return r.ok ? { ok: true, message: r.message } : { ok: false, error: r.message }
}

/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 * ==========================================================================*/

import 'server-only'

import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { registrarAuditoria } from '@/server/db/repositories/auditoria'
import { registrarExportacao } from '@/server/db/repositories/contabil'

import { gerarTodosRelatorios, type ParametrosPeriodo } from './dados'
import { configuracaoSheets, enviarParaSheets, type ResultadoSheets } from './sheets'

export interface ResultadoSincronizacao {
  ok: boolean
  message: string
  data?: ResultadoSheets
}

/**
 * Gera todos os relatórios, envia ao Google Sheets e registra o resultado —
 * na tabela de exportações E na trilha de auditoria, com o ator. É a mesma
 * função por trás do botão da tela (Server Action) e da rota POST (cron):
 * dois gestos, um caminho, um registro.
 */
export async function sincronizarSheetsComoAtor(ator: string, periodo: ParametrosPeriodo = {}): Promise<ResultadoSincronizacao> {
  const { config, faltando } = configuracaoSheets()
  if (!config) {
    return {
      ok: false,
      message: `Google Sheets não configurado. Faltam: ${faltando.join(', ')}. Ver docs/INTEGRACAO_GOOGLE_SHEETS.md.`,
    }
  }

  const agora = Date.now()
  let resultado: ResultadoSheets | null = null
  let erro: string | null = null
  let linhas = 0
  try {
    const relatorios = await gerarTodosRelatorios(periodo)
    linhas = relatorios.reduce((s, r) => s + r.linhas.length, 0)
    resultado = await enviarParaSheets(config, relatorios)
  } catch (err) {
    erro = err instanceof Error ? err.message : 'erro desconhecido'
    console.error('[relatorios] falha ao enviar ao Google Sheets:', err)
  }

  if (bancoConfigurado()) {
    try {
      await executarNoBanco(async (tx) => {
        await registrarExportacao(tx, {
          createdAt: agora,
          relatorio: 'tudo',
          formato: 'sheets',
          destino: 'sheets',
          ator,
          linhas,
          ok: erro === null,
          detalhe: erro ?? (resultado ? `${resultado.abas.length} aba(s)` : null),
        })
        await registrarAuditoria(tx, {
          createdAt: agora,
          ator,
          acao: 'exportacao.sheets',
          entidade: 'planilha',
          entidadeId: config.spreadsheetId,
          usuariosAfetados: [],
          detalhes: { ok: erro === null, linhas, erro },
        })
      })
    } catch (err) {
      console.error('[relatorios] falha ao registrar a sincronização:', err)
    }
  }

  if (erro || !resultado) return { ok: false, message: `Não foi possível enviar ao Google Sheets: ${erro ?? 'erro'}` }
  return {
    ok: true,
    message: `Planilha atualizada: ${resultado.abas.length} aba(s), ${linhas} linha(s).`,
    data: resultado,
  }
}

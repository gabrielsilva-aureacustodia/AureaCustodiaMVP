/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê o estado, as retiradas e o livro-razão para a auditoria de moedas. Não
 * importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import {
  filtrarMoedas,
  linhasDoAcervo,
  resumirAcervo,
  verificarAcervo,
  type FiltroMoedas,
  type LinhaMoeda,
  type ResumoAcervo,
  type VerificacaoDoAcervo,
} from '@/domain/admin/moedas'
import { GENESIS } from '@/domain/hash'
import type { Analise, Envio, Retirada } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { listarLancamentos } from '@/server/db/repositories/ledger'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

/**
 * A auditoria de moedas (plano do Admin, 3.5). A leitura é a do relatório `estoque` — o estado
 * inteiro —, cruzada com as análises e as retiradas por src/domain/admin/moedas.ts.
 *
 * AS RETIRADAS PODEM FALTAR SEM DERRUBAR A TELA: sem elas, toda moeda aparece como custodiada, e a
 * página diz isso. Esconder o acervo inteiro porque uma tabela vizinha falhou seria pior.
 */

/** Uma tela não precisa de mais linhas que isso de uma vez; o filtro acha o resto. */
export const LIMITE_LINHAS = 500

export interface DadosDaAuditoria {
  linhas: LinhaMoeda[]
  totalFiltrado: number
  resumo: ResumoAcervo
  tipos: string[]
  caixas: string[]
  retiradasIndisponiveis: boolean
  semBanco: boolean
}

async function retiradasOuVazio(): Promise<{ retiradas: Retirada[]; indisponiveis: boolean }> {
  try {
    return { retiradas: await repositorioRetiradas().listarTodas(), indisponiveis: false }
  } catch (err) {
    console.error('[admin] retiradas indisponíveis na auditoria de moedas:', err)
    return { retiradas: [], indisponiveis: true }
  }
}

export async function carregarAuditoriaDeMoedas(filtro: FiltroMoedas): Promise<DadosDaAuditoria> {
  const [state, { retiradas, indisponiveis }] = await Promise.all([getState(), retiradasOuVazio()])
  const todas = linhasDoAcervo(state, retiradas)
  const filtradas = filtrarMoedas(todas, filtro)
  return {
    linhas: filtradas.slice(0, LIMITE_LINHAS),
    totalFiltrado: filtradas.length,
    resumo: resumirAcervo(todas),
    tipos: [...new Set(todas.map((l) => l.tipoMoeda))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    caixas: [...new Set(todas.map((l) => l.caixa).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    retiradasIndisponiveis: indisponiveis,
    semBanco: !bancoConfigurado(),
  }
}

/**
 * "Verificar corrente": a corrente das análises, a do livro-razão e o cruzamento recibo × análise.
 * Lê o livro inteiro — é um botão, não roda em toda visita.
 */
export async function verificarCorrenteDoAcervo(): Promise<VerificacaoDoAcervo> {
  const state = await getState()
  const ledger = bancoConfigurado() ? await executarNoBanco((tx) => listarLancamentos(tx), { somenteLeitura: true }) : null
  return verificarAcervo(state, ledger, GENESIS)
}

export interface FichaDaMoeda {
  linha: LinhaMoeda
  /** A análise completa, com os quinze campos que entram no hash. */
  analise: Analise | null
  envio: Envio | null
  retiradas: Retirada[]
}

/** O visualizador de recibo de qualquer conta (plano do Admin, 3.6). `null` = código desconhecido. */
export async function carregarFichaDaMoeda(codigo: string): Promise<FichaDaMoeda | null> {
  const [state, { retiradas }] = await Promise.all([getState(), retiradasOuVazio()])
  const linha = linhasDoAcervo(state, retiradas).find((l) => l.codigo === codigo)
  if (!linha) return null
  return {
    linha,
    analise: state.analises.filter((a) => a.codigoMoeda === codigo).at(-1) ?? null,
    envio: state.envios.find((e) => e.protocolo === linha.protocoloEnvio) ?? null,
    retiradas: retiradas.filter((r) => r.coinId === codigo).sort((a, b) => b.solicitadoEm - a.solicitadoEm),
  }
}

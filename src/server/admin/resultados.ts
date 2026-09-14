/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Carrega os dados das telas da Central de Resultados a partir do banco e do estado.
 * As páginas (Server Components) chamam estas funções DEPOIS de conferir a permissão,
 * e entregam ao cliente só o resultado — nunca o livro-razão inteiro.
 * ==========================================================================*/

import 'server-only'

import { somarColunasDeDinheiro, resumirFinanceiro, type ResumoFinanceiro } from '@/domain/admin/financeiro'
import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import { primeirasVendasDe } from '@/domain/admin/uso'
import { PLANO_DE_CONTAS, type ContaContabil, type Dre } from '@/domain/dre'
import { montarKpis, type Kpis, type PlanoKpi } from '@/domain/kpis'
import type { AppState, Cents } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  garantirCatalogos,
  listarContas,
  listarExportacoes,
  listarLancamentosManuais,
  listarParametros,
  type LancamentoManualGravado,
  type ParametroGravado,
  type RegistroExportacao,
} from '@/server/db/repositories/contabil'
import { lerHistoricoDaFila, listarTrilhaDoPainel, type EventoDaFila } from '@/server/db/repositories/painel-leituras'
import type { EntradaAuditoriaGravada } from '@/server/db/repositories/auditoria'
import { contarEventosDesde } from '@/server/db/repositories/eventos-uso'
import { dreCompleta, ehNomeDeRelatorio, gerarRelatorio } from '@/server/relatorios/dados'
import { configuracaoSheets } from '@/server/relatorios/sheets'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

import { LIMITE_TRILHA_NA_TELA, carregarUsoNoBanco } from './uso'

const DIA_MS = 24 * 60 * 60 * 1000

/* ---------- Financeiro ---------- */

export interface RecebimentosGateway {
  linhas: number
  bruto: Cents | null
  tarifa: Cents | null
  liquido: Cents | null
}

export interface DadosFinanceiro {
  dre: Dre
  resumo: ResumoFinanceiro
  cadeiaOk: boolean
  semBanco: boolean
  /** `null` enquanto o relatório `recebimentos-gateway` (frente B, B3) não existir. */
  recebimentos: RecebimentosGateway | null
}

/**
 * O relatório dos recebimentos do Mercado Pago nasce na B3. Até lá o nome não está em
 * `NOMES_RELATORIOS`, e o cartão diz "disponível depois da B3". Quando ele entrar, o
 * cartão acende sozinho — lendo as colunas pelo nome, que é o contrato dos relatórios.
 */
const RELATORIO_RECEBIMENTOS: string = 'recebimentos-gateway'

async function recebimentosDoGateway(p: PeriodoEscolhido): Promise<RecebimentosGateway | null> {
  if (!ehNomeDeRelatorio(RELATORIO_RECEBIMENTOS)) return null
  try {
    const r = await gerarRelatorio(RELATORIO_RECEBIMENTOS, { ...p.consulta, recortar: true })
    const somas = somarColunasDeDinheiro(r.colunas, r.linhas, { bruto: /bruto/i, tarifa: /tarifa/i, liquido: /l[ií]quido/i })
    return { linhas: r.linhas.length, bruto: somas.bruto, tarifa: somas.tarifa, liquido: somas.liquido }
  } catch (err) {
    console.error('[admin] falha ao ler recebimentos do gateway:', err)
    return null
  }
}

export async function carregarFinanceiro(p: PeriodoEscolhido): Promise<DadosFinanceiro> {
  const [completa, state, recebimentos] = await Promise.all([dreCompleta(p.consulta), getState(), recebimentosDoGateway(p)])
  return {
    dre: completa.dre,
    resumo: resumirFinanceiro({ ledger: completa.ledger, saques: state.saques ?? [], faturas: state.faturasCustodia ?? [], periodo: p.periodo }),
    cadeiaOk: completa.cadeiaOk,
    semBanco: completa.semBanco,
    recebimentos,
  }
}

/* ---------- Contábil ---------- */

export interface DadosContabil {
  semBanco: boolean
  contas: ContaContabil[]
  parametros: ParametroGravado[]
  lancamentos: LancamentoManualGravado[]
  exportacoes: Array<RegistroExportacao & { id: number }>
  sheetsFaltando: string[]
  tokenConfigurado: boolean
}

export async function carregarContabil(): Promise<DadosContabil> {
  const { faltando } = configuracaoSheets()
  const tokenConfigurado = (process.env.AUREA_RELATORIOS_TOKEN?.length ?? 0) >= 16
  if (!bancoConfigurado()) {
    return { semBanco: true, contas: [...PLANO_DE_CONTAS], parametros: [], lancamentos: [], exportacoes: [], sheetsFaltando: faltando, tokenConfigurado }
  }
  return executarNoBanco(async (tx) => {
    // Escreve (upsert do catálogo), por isso não é transação somente leitura.
    await garantirCatalogos(tx)
    return {
      semBanco: false,
      contas: await listarContas(tx),
      parametros: await listarParametros(tx),
      lancamentos: await listarLancamentosManuais(tx),
      exportacoes: await listarExportacoes(tx, 200),
      sheetsFaltando: faltando,
      tokenConfigurado,
    }
  })
}

/* ---------- KPIs ---------- */

/** Leitura opcional numa transação própria: uma consulta que falha não derruba a tela. */
async function historicoDaFila(p: PeriodoEscolhido): Promise<EventoDaFila[] | null> {
  if (!bancoConfigurado()) return null
  try {
    // A publicação pode ter acontecido antes do período: lê três meses para trás.
    return await executarNoBanco((tx) => lerHistoricoDaFila(tx, p.periodo.inicio - 90 * DIA_MS, p.periodo.fim, 100_000), { somenteLeitura: true })
  } catch (err) {
    console.error('[admin] falha ao ler o histórico da fila:', err)
    return null
  }
}

export async function carregarKpis(p: PeriodoEscolhido): Promise<{ kpis: Kpis; semBanco: boolean }> {
  const [state, retiradas, historico] = await Promise.all([getState(), repositorioRetiradas().listarTodas(), historicoDaFila(p)])
  // `planosCustodia` entra no AppState com a B2. Lido pelo nome, sem depender do tipo.
  const planos = (state as AppState & { planosCustodia?: PlanoKpi[] }).planosCustodia ?? null
  return {
    kpis: montarKpis({ state, retiradas, periodo: p.periodo, agora: Date.now(), historicoDaFila: historico, planos }),
    semBanco: !bancoConfigurado(),
  }
}

/* ---------- Painel inicial ---------- */

export interface DadosPainelInicial {
  /** Com `resultados.ver`: o mês corrente. */
  resultados: { rotulo: string; receitaBruta: Cents; resultadoLiquido: Cents; negociacoes: number; volume: Cents; moedasEmCustodia: number; faturasAtrasadas: number } | null
  /** Com `bancada.ver` ou `logistica.ver`: a situação de agora. */
  operacao: { aguardandoBancada: number; aCaminho: number; retiradasASeparar: number; retiradasPostadas: number } | null
  /** Com papel de desenvolvimento ou `admin.auditoria`: saúde do painel. */
  sistema: {
    bancoConfigurado: boolean
    cadeiaOk: boolean | null
    eventosUltimas24h: number | null
    ultimasAcoesDoPainel: Array<{ id: number; createdAt: number; ator: string; acao: string }> | null
  } | null
}

/**
 * Carrega só o que o papel alcança. Uma parte que falha vira `null` naquela seção — o
 * painel inicial é a porta de entrada e não pode cair por causa de um indicador.
 */
export async function carregarPainelInicial(
  pode: { resultados: boolean; operacao: boolean; sistema: boolean; auditoria: boolean },
  agora: number,
): Promise<DadosPainelInicial> {
  const hoje = new Date(agora)
  const mes = { ano: String(hoje.getFullYear()), mes: String(hoje.getMonth() + 1), trimestre: null }
  const precisaEstado = pode.resultados || pode.operacao
  const [state, retiradas] = precisaEstado ? await Promise.all([getState(), repositorioRetiradas().listarTodas()]) : [null, []]

  let resultados: DadosPainelInicial['resultados'] = null
  let cadeiaOk: boolean | null = null
  if (pode.resultados && state) {
    try {
      const completa = await dreCompleta(mes)
      cadeiaOk = completa.semBanco ? null : completa.cadeiaOk
      const kpis = montarKpis({ state, retiradas, periodo: completa.dre.periodo, agora, historicoDaFila: null, planos: null })
      resultados = {
        rotulo: completa.dre.periodo.rotulo,
        receitaBruta: completa.dre.totais.receitaBruta,
        resultadoLiquido: completa.dre.totais.resultadoLiquido,
        negociacoes: kpis.mercado.negociacoes,
        volume: kpis.mercado.volume,
        moedasEmCustodia: kpis.acervo.moedasEmCustodia,
        faturasAtrasadas: kpis.faturas.atrasadas.quantidade,
      }
    } catch (err) {
      console.error('[admin] painel inicial — resultados:', err)
    }
  }

  const operacao: DadosPainelInicial['operacao'] =
    pode.operacao && state
      ? {
          aguardandoBancada: state.envios.filter((e) => e.etapaAtual === 'Recebido pela custódia' || e.etapaAtual === 'Em análise física').length,
          aCaminho: state.envios.filter((e) => e.etapaAtual === 'Envio postado').length,
          retiradasASeparar: retiradas.filter((r) => r.status === 'paga' || r.status === 'separacao').length,
          retiradasPostadas: retiradas.filter((r) => r.status === 'postada').length,
        }
      : null

  let sistema: DadosPainelInicial['sistema'] = null
  if (pode.sistema || pode.auditoria) {
    sistema = { bancoConfigurado: bancoConfigurado(), cadeiaOk, eventosUltimas24h: null, ultimasAcoesDoPainel: null }
    if (bancoConfigurado()) {
      try {
        const lido = await executarNoBanco(
          async (tx) => ({
            eventos: await contarEventosDesde(tx, agora - DIA_MS),
            acoes: pode.auditoria ? await listarTrilhaDoPainel(tx, { acaoComeca: 'admin.', limite: 6 }) : null,
          }),
          { somenteLeitura: true },
        )
        sistema.eventosUltimas24h = lido.eventos
        sistema.ultimasAcoesDoPainel = lido.acoes ? lido.acoes.map((a) => ({ id: a.id, createdAt: a.createdAt, ator: a.ator, acao: a.acao })) : null
      } catch (err) {
        console.error('[admin] painel inicial — sistema:', err)
      }
    }
  }

  return { resultados, operacao, sistema }
}

/* ---------- Uso ---------- */

export interface FiltroDaTrilha {
  ator: string
  acao: string
}

export interface DadosUso {
  semBanco: boolean
  resumo: Awaited<ReturnType<typeof carregarUsoNoBanco>>['resumo'] | null
  trilha: EntradaAuditoriaGravada[] | null
  eventosNoLimite: boolean
  trilhaNoLimite: boolean
}

/**
 * Cada parte só é lida por quem pode vê-la: sem `resultados.ver` o registro de uso não
 * sai do banco; sem `admin.auditoria`, a trilha filtrada também não.
 */
export async function carregarUso(p: PeriodoEscolhido, filtro: FiltroDaTrilha, pode: { uso: boolean; trilha: boolean }): Promise<DadosUso> {
  if (!bancoConfigurado()) return { semBanco: true, resumo: null, trilha: null, eventosNoLimite: false, trilhaNoLimite: false }
  const filtroTrilha = pode.trilha
    ? { atorContem: filtro.ator.trim() || undefined, acaoComeca: filtro.acao.trim() || undefined, de: p.periodo.inicio, ate: p.periodo.fim }
    : null

  if (!pode.uso) {
    const trilha = filtroTrilha
      ? await executarNoBanco((tx) => listarTrilhaDoPainel(tx, { ...filtroTrilha, limite: LIMITE_TRILHA_NA_TELA }), { somenteLeitura: true })
      : null
    return { semBanco: false, resumo: null, trilha, eventosNoLimite: false, trilhaNoLimite: trilha !== null && trilha.length >= LIMITE_TRILHA_NA_TELA }
  }

  const state = await getState()
  const dados = await carregarUsoNoBanco(executarNoBanco, {
    de: p.periodo.inicio,
    ate: p.periodo.fim,
    primeirasVendas: primeirasVendasDe(state.trades),
    filtroTrilha,
  })
  return { semBanco: false, ...dados }
}

/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Carrega os dados das telas da Central de Resultados a partir do banco e do estado.
 * As páginas (Server Components) chamam estas funções DEPOIS de conferir a permissão,
 * e entregam ao cliente só o resultado — nunca o livro-razão inteiro.
 * ==========================================================================*/

import 'server-only'

import { saldoDosClientes, somarColunasDeDinheiro, resumirFinanceiro, type ResumoFinanceiro, type SaldoDosClientes } from '@/domain/admin/financeiro'
import { ehContaDaAurea } from '@/domain/isencao'
import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import { ehEmailProtegido, emailsDaLista, normalizarEmail } from '@/domain/admin/permissoes'
import { primeirasVendasDe } from '@/domain/admin/uso'
import { PLANO_DE_CONTAS, type ContaContabil, type Dre } from '@/domain/dre'
import { diaDeBrasilia, meioDiaDeBrasilia } from '@/domain/financeiro/controle'
import {
  janelaDoPeriodo,
  janelasDeReferencia,
  montarKpis,
  montarKpisDeAquisicao,
  type Kpis,
  type KpisAquisicao,
  type PlanoKpi,
} from '@/domain/kpis'
import type { AppState, Cents } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { datasDeCriacao } from '@/server/db/repositories/admin-usuarios'
import { lerCasosParaKpi, listarGastos, type GastoGravado } from '@/server/db/repositories/marketing'
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
  /** O dinheiro dos clientes que a Áurea guarda, e a conta que o fecha (22/11/2026). */
  saldoClientes: SaldoDosClientes
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
    // A conta da própria Áurea fica de fora: o dinheiro dela não é de terceiros.
    saldoClientes: saldoDosClientes({
      usuarios: state.users,
      ofertasDeCompra: state.buyOrders,
      saques: state.saques ?? [],
      ledger: completa.ledger,
      excluir: ehContaDaAurea,
    }),
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

/* ---------- Aquisição e atendimento (frente J, 18/11/2026) ---------- */

export interface DadosAquisicao {
  kpis: KpisAquisicao
  /**
   * As entradas de gasto digitadas pela equipe, as mais recentes primeiro, inclusive as canceladas (a tela as
   * risca). `null` = sem banco ou migration 057 ainda não aplicada.
   */
  gastos: GastoGravado[] | null
  semBanco: boolean
  /** true = o banco ainda não tem `marketing_gastos` (migration 057). */
  migracaoPendente: boolean
  /** false = a conta não tem `cs.ver`: o atendimento nem é lido do banco. */
  atendimentoLiberado: boolean
  /** O dia de hoje em Brasília, 'AAAA-MM-DD' — o padrão do formulário de gasto. */
  hoje: string
}

const LIMITE_GASTOS = 1000
const LIMITE_CASOS = 20_000
const MEIO_DIA_MS = 12 * 60 * 60 * 1000

function tabelaAusente(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01'
}

/**
 * Quem NÃO é cliente captado: contas da equipe (e-mail institucional e lista de administradores do ambiente) e as
 * de teste (`@testeaurea.com.br`). Elas não entram em cadastro nem em ativação — o CAC mede quem veio de fora.
 */
function contasQueNaoSaoCliente(state: AppState): Set<string> {
  const doAmbiente = new Set(emailsDaLista(process.env.AUREA_ADMIN_EMAILS) ?? [])
  return new Set(Object.keys(state.users).filter((email) => ehEmailProtegido(email) || doAmbiente.has(normalizarEmail(email))))
}

/**
 * Carrega o painel de aquisição e atendimento. Cada leitura do banco roda na sua transação e falha sozinha: uma
 * tabela ausente (a 057 antes de aplicada, a 048) deixa só aquele número `null`, e a tela diz por quê, em vez de
 * cair. O atendimento só é lido por quem tem `cs.ver`, e a página confere a permissão antes de chamar isto.
 */
export async function carregarAquisicao(p: PeriodoEscolhido, pode: { atendimento: boolean }, agora: number = Date.now()): Promise<DadosAquisicao> {
  const state = await getState()
  const periodo = janelaDoPeriodo(p, p.periodo.rotulo)
  const base = { state, janelas: janelasDeReferencia(agora), periodo, agora, ignorar: contasQueNaoSaoCliente(state) }
  const hoje = diaDeBrasilia(agora)

  if (!bancoConfigurado()) {
    return {
      kpis: montarKpisDeAquisicao({ ...base, criadasEm: null, gastos: null, casos: null }),
      gastos: null,
      semBanco: true,
      migracaoPendente: false,
      atendimentoLiberado: pode.atendimento,
      hoje,
    }
  }

  const lerGastos = async (): Promise<{ gastos: GastoGravado[] | null; pendente: boolean }> => {
    try {
      return { gastos: await executarNoBanco((tx) => listarGastos(tx, LIMITE_GASTOS), { somenteLeitura: true }), pendente: false }
    } catch (err) {
      if (tabelaAusente(err)) return { gastos: null, pendente: true }
      console.error('[admin] falha ao ler o gasto de marketing:', err)
      return { gastos: null, pendente: false }
    }
  }
  const de = meioDiaDeBrasilia(periodo.de) - MEIO_DIA_MS
  const ate = meioDiaDeBrasilia(periodo.ate) + MEIO_DIA_MS
  const [criadasEm, lidos, casos] = await Promise.all([
    executarNoBanco((tx) => datasDeCriacao(tx), { somenteLeitura: true }).catch((err: unknown) => {
      console.error('[admin] falha ao ler as datas de cadastro:', err)
      return null
    }),
    lerGastos(),
    pode.atendimento
      ? executarNoBanco((tx) => lerCasosParaKpi(tx, de, ate, LIMITE_CASOS), { somenteLeitura: true }).catch((err: unknown) => {
          console.error('[admin] falha ao ler os casos para os KPIs:', err)
          return null
        })
      : Promise.resolve(null),
  ])

  return {
    kpis: montarKpisDeAquisicao({ ...base, criadasEm, gastos: lidos.gastos ? lidos.gastos.filter((g) => g.canceladoEm === null) : null, casos }),
    gastos: lidos.gastos,
    semBanco: false,
    migracaoPendente: lidos.pendente,
    atendimentoLiberado: pode.atendimento,
    hoje,
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

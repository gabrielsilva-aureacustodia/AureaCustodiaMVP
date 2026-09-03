/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Monta os relatórios da empresa a partir do banco e do estado. Importa o
 * cliente do banco — carrega a barreira.
 * ==========================================================================*/

import 'server-only'

import { fdate } from '@/domain/dates'
import {
  PARAMETROS_VAZIOS,
  montarDre,
  periodoAnual,
  periodoMensal,
  periodoTrimestral,
  type Dre,
  type LancamentoManual,
  type ParametrosContabeis,
  type Periodo,
} from '@/domain/dre'
import { GENESIS } from '@/domain/hash'
import { verificarCadeia, type LedgerEntry } from '@/domain/ledger'
import { medianSellPrice } from '@/domain/market'
import { allCoinsFlat, coinStatusDigital, envioDateFor } from '@/domain/selectors'
import { statementTotals, userStatement } from '@/domain/statement'
import type { AppState } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { listarAuditoria, type EntradaAuditoriaGravada } from '@/server/db/repositories/auditoria'
import {
  carregarParametros,
  garantirCatalogos,
  listarExportacoes,
  listarLancamentosManuais,
  listarLancamentosVigentes,
  listarParametros,
  type LancamentoManualGravado,
  type ParametroGravado,
} from '@/server/db/repositories/contabil'
import { listarLancamentos, saldosPeloLedger, type LedgerEntryGravado } from '@/server/db/repositories/ledger'
import { getState } from '@/server/state'

/* ---------- o formato comum de todo relatório ---------- */

export type Celula = string | number | boolean | null

/**
 * Um relatório é uma tabela: colunas nomeadas e linhas com os mesmos nomes.
 * É o que vira aba de planilha, CSV, JSON e intervalo do Google Sheets. Os
 * nomes de coluna são sem acento e com underline, como nos exportadores
 * existentes — alguém vai ler isto por script.
 *
 * DINHEIRO SAI EM REAIS, com duas casas, porque o destino é gente e contador;
 * quem precisa do inteiro exato tem o banco. A conversão acontece em `reais()`
 * e em nenhum outro lugar deste arquivo.
 */
export interface Relatorio {
  nome: string
  titulo: string
  geradoEm: number
  periodo: string | null
  colunas: string[]
  linhas: Array<Record<string, Celula>>
  observacoes: string[]
}

export const NOMES_RELATORIOS = [
  'dre',
  'analise',
  'ledger',
  'auditoria',
  'extratos',
  'negociacoes',
  'custodia',
  'estoque',
  'contas',
  'lancamentos-manuais',
  'parametros',
  'exportacoes',
] as const

export type NomeRelatorio = (typeof NOMES_RELATORIOS)[number]

export function ehNomeDeRelatorio(x: string): x is NomeRelatorio {
  return (NOMES_RELATORIOS as readonly string[]).includes(x)
}

export const TITULOS: Record<NomeRelatorio, string> = {
  dre: 'DRE — Demonstração do Resultado',
  analise: 'Análise contábil básica',
  ledger: 'Livro-razão (ledger)',
  auditoria: 'Trilha de auditoria',
  extratos: 'Extratos de todas as contas',
  negociacoes: 'Negociações',
  custodia: 'Cobranças de custódia',
  estoque: 'Auditoria de estoque',
  contas: 'Contas e saldos',
  'lancamentos-manuais': 'Lançamentos manuais',
  parametros: 'Parâmetros contábeis',
  exportacoes: 'Registro de exportações',
}

/** Centavos -> reais com duas casas. 28500 -> 285 */
function reais(c: number): number {
  return Math.round(c) / 100
}

function dataHora(ts: number): string {
  const d = new Date(ts)
  return `${fdate(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* ---------- período ---------- */

export interface ParametrosPeriodo {
  ano?: string | null
  mes?: string | null
  trimestre?: string | null
}

/**
 * Período pedido na consulta: `ano` obrigatório para recortar; `mes` ou
 * `trimestre` refinam. Sem nada, o exercício corrente — é o que o contador
 * quer ver por padrão.
 */
export function periodoDaConsulta(p: ParametrosPeriodo): Periodo {
  const hoje = new Date()
  const ano = clampInt(p.ano, 2000, 2100) ?? hoje.getFullYear()
  const mes = clampInt(p.mes, 1, 12)
  const tri = clampInt(p.trimestre, 1, 4)
  if (mes) return periodoMensal(ano, mes)
  if (tri) return periodoTrimestral(ano, tri)
  return periodoAnual(ano)
}

function clampInt(v: string | null | undefined, min: number, max: number): number | null {
  if (!v) return null
  const n = parseInt(v, 10)
  if (!Number.isInteger(n) || n < min || n > max) return null
  return n
}

/* ---------- as fontes ---------- */

interface Fontes {
  state: AppState
  ledger: LedgerEntryGravado[]
  auditoria: EntradaAuditoriaGravada[]
  manuaisTodos: LancamentoManualGravado[]
  manuaisVigentes: LancamentoManualGravado[]
  parametros: ParametrosContabeis
  parametrosLista: ParametroGravado[]
  saldosLedger: Record<string, number>
  exportacoes: Array<{ id: number; createdAt: number; relatorio: string; formato: string; destino: string; ator: string; linhas: number; ok: boolean; detalhe: string | null }>
  semBanco: boolean
}

/**
 * Lê tudo de uma vez. Sem `POSTGRES_URL` (npm run dev sem banco) o estado vem
 * do blob e as tabelas do M4 não existem: o ledger, a trilha e os catálogos
 * voltam vazios e o relatório diz isso em `observacoes` em vez de falhar.
 */
async function carregarFontes(): Promise<Fontes> {
  const state = await getState()
  if (!bancoConfigurado()) {
    return {
      state,
      ledger: [],
      auditoria: [],
      manuaisTodos: [],
      manuaisVigentes: [],
      parametros: PARAMETROS_VAZIOS,
      parametrosLista: [],
      saldosLedger: {},
      exportacoes: [],
      semBanco: true,
    }
  }
  return executarNoBanco(async (tx) => {
    await garantirCatalogos(tx)
    const [ledger, auditoria, manuaisTodos, manuaisVigentes, parametros, parametrosLista, saldosLedger, exportacoes] =
      await Promise.all([
        listarLancamentos(tx),
        listarAuditoria(tx, { limite: 2000 }),
        listarLancamentosManuais(tx),
        listarLancamentosVigentes(tx),
        carregarParametros(tx),
        listarParametros(tx),
        saldosPeloLedger(tx),
        listarExportacoes(tx, 500),
      ])
    return { state, ledger, auditoria, manuaisTodos, manuaisVigentes, parametros, parametrosLista, saldosLedger, exportacoes, semBanco: false }
  })
}

const SEM_BANCO =
  'Sem POSTGRES_URL neste ambiente: ledger, trilha de auditoria e catálogos contábeis não existem. O estado veio do blob em memória.'

/* ---------- os relatórios ---------- */

function base(nome: NomeRelatorio, fontes: Fontes, periodo: Periodo | null): Relatorio {
  return {
    nome,
    titulo: TITULOS[nome],
    geradoEm: Date.now(),
    periodo: periodo ? periodo.rotulo : null,
    colunas: [],
    linhas: [],
    observacoes: fontes.semBanco ? [SEM_BANCO] : [],
  }
}

function comLinhas(r: Relatorio, linhas: Array<Record<string, Celula>>, colunas: string[]): Relatorio {
  r.colunas = colunas
  r.linhas = linhas
  return r
}

export function montarDreDasFontes(fontes: Fontes, periodo: Periodo): Dre {
  const manuais: LancamentoManual[] = fontes.manuaisVigentes.map((m) => ({
    data: m.data,
    contaCodigo: m.contaCodigo,
    descricao: m.descricao,
    valor: m.valor,
    criadoPor: m.criadoPor,
  }))
  return montarDre({ ledger: fontes.ledger, manuais, parametros: fontes.parametros, periodo })
}

function relatorioDre(fontes: Fontes, periodo: Periodo): Relatorio {
  const dre = montarDreDasFontes(fontes, periodo)
  const r = base('dre', fontes, periodo)
  r.observacoes.push(...dre.pendencias)
  r.observacoes.push('Receita de comissões e de custódia lidas do ledger (valores congelados na gravação). Impostos só com alíquota configurada pelo contador.')
  return comLinhas(
    r,
    dre.linhas.map((l) => ({
      Codigo: l.codigo,
      Descricao: l.nivel === 2 ? '    ' + l.descricao : l.descricao,
      Valor: reais(l.valor),
      Nivel: l.nivel,
      Observacao: l.observacao ?? '',
    })),
    ['Codigo', 'Descricao', 'Valor', 'Nivel', 'Observacao'],
  )
}

function relatorioAnalise(fontes: Fontes, periodo: Periodo): Relatorio {
  const dre = montarDreDasFontes(fontes, periodo)
  const a = dre.analise
  const r = base('analise', fontes, periodo)
  const pct = (bp: number | null): Celula => (bp === null ? '' : bp / 100)
  const linhas: Array<Record<string, Celula>> = [
    { Indicador: 'Receita bruta (R$)', Valor: reais(dre.totais.receitaBruta), Detalhe: '' },
    { Indicador: 'Resultado líquido (R$)', Valor: reais(dre.totais.resultadoLiquido), Detalhe: '' },
    { Indicador: 'Margem operacional (%)', Valor: pct(a.margemOperacionalBp), Detalhe: 'resultado operacional / receita bruta' },
    { Indicador: 'Margem líquida (%)', Valor: pct(a.margemLiquidaBp), Detalhe: 'resultado líquido / receita bruta' },
    { Indicador: 'Carga tributária (%)', Valor: pct(a.cargaTributariaBp), Detalhe: 'deduções + IRPJ + CSLL / receita bruta' },
    { Indicador: 'Negociações no período', Valor: a.numNegociacoes, Detalhe: '' },
    { Indicador: 'Volume negociado (R$)', Valor: reais(a.volumeNegociado), Detalhe: 'soma das vendas' },
    { Indicador: 'Comissão média por negociação (R$)', Valor: a.ticketMedioComissao === null ? '' : reais(a.ticketMedioComissao), Detalhe: '' },
    { Indicador: 'Ajustes não explicados (R$)', Valor: reais(a.ajustesNaoExplicados), Detalhe: 'precisa ser zero' },
  ]
  for (const t of a.receitaPorTipo) {
    linhas.push({ Indicador: `Comissões — ${t.tipoMoeda} (R$)`, Valor: reais(t.receita), Detalhe: `${t.negociacoes} negociação(ões)` })
  }
  for (const m of a.porMes) {
    linhas.push({ Indicador: `Mês ${m.mes} — comissões (R$)`, Valor: reais(m.comissoes), Detalhe: `custódia ${reais(m.custodia)} · despesas ${reais(m.despesas)}` })
  }
  return comLinhas(r, linhas, ['Indicador', 'Valor', 'Detalhe'])
}

function relatorioLedger(fontes: Fontes, periodo: Periodo | null): Relatorio {
  const r = base('ledger', fontes, periodo)
  const cadeia = verificarCadeia(fontes.ledger, GENESIS)
  r.observacoes.push(
    cadeia.ok
      ? `Cadeia de hashes íntegra (${fontes.ledger.length} lançamentos).`
      : `⚠ CADEIA QUEBRADA no lançamento de índice ${cadeia.primeiraQuebra}: ${cadeia.motivo}`,
  )
  const nomes = nomesDe(fontes.state)
  const linhas = fontes.ledger
    .filter((l) => !periodo || (l.createdAt >= periodo.inicio && l.createdAt < periodo.fim))
    .map((l) => ({
      Id: l.id,
      Data: dataHora(l.createdAt),
      Conta: l.userEmail,
      Nome: nomes[l.userEmail] ?? '',
      Tipo: l.tipo,
      Valor: reais(l.valor * l.sinal),
      Saldo_Apos: reais(l.saldoApos),
      Moeda: l.tipoMoeda ?? '',
      Quantidade: l.quantidade ?? '',
      Ref_Interna: l.refInterna ?? '',
      Ref_Externa: l.refExterna ?? '',
      Descricao: l.descricao,
      Hash: l.hash,
    }))
  return comLinhas(r, linhas, ['Id', 'Data', 'Conta', 'Nome', 'Tipo', 'Valor', 'Saldo_Apos', 'Moeda', 'Quantidade', 'Ref_Interna', 'Ref_Externa', 'Descricao', 'Hash'])
}

function relatorioAuditoria(fontes: Fontes, periodo: Periodo | null): Relatorio {
  const r = base('auditoria', fontes, periodo)
  const linhas = fontes.auditoria
    .filter((a) => !periodo || (a.createdAt >= periodo.inicio && a.createdAt < periodo.fim))
    .map((a) => ({
      Id: a.id,
      Data: dataHora(a.createdAt),
      Ator: a.ator,
      Acao: a.acao,
      Usuarios_Afetados: a.usuariosAfetados.join(', '),
      Operacoes: JSON.stringify((a.detalhes as { operacoes?: unknown }).operacoes ?? {}),
      Lancamentos: Number((a.detalhes as { lancamentos?: number }).lancamentos ?? 0),
      Detalhes: JSON.stringify(a.detalhes),
    }))
  return comLinhas(r, linhas, ['Id', 'Data', 'Ator', 'Acao', 'Usuarios_Afetados', 'Operacoes', 'Lancamentos', 'Detalhes'])
}

function relatorioExtratos(fontes: Fontes, periodo: Periodo | null): Relatorio {
  const r = base('extratos', fontes, periodo)
  r.observacoes.push('Uma linha por movimentação de cada conta, no mesmo formato do extrato individual. Leva dados de proprietário: uso interno.')
  const linhas: Array<Record<string, Celula>> = []
  for (const [email, u] of Object.entries(fontes.state.users)) {
    const rows = userStatement(fontes.state, email).filter(
      (l) => !periodo || (l.date >= periodo.inicio && l.date < periodo.fim),
    )
    const tot = statementTotals(rows)
    for (const l of rows) {
      linhas.push({
        Conta: email,
        Nome: u.name,
        Data: l.dateBR,
        Tipo: l.kind,
        Moeda: l.tipoMoeda,
        Descricao: l.descricao,
        Quantidade: l.quantidade ?? '',
        Valor_Unitario: l.valorUnitario === null ? '' : reais(l.valorUnitario),
        Taxa: l.taxa === null ? '' : reais(l.taxa),
        Impacto_Saldo: reais(l.impacto),
        Saldo_Atual: reais(u.balance),
        Variacao_Periodo: reais(tot.variacaoSaldo),
      })
    }
  }
  return comLinhas(r, linhas, ['Conta', 'Nome', 'Data', 'Tipo', 'Moeda', 'Descricao', 'Quantidade', 'Valor_Unitario', 'Taxa', 'Impacto_Saldo', 'Saldo_Atual', 'Variacao_Periodo'])
}

function relatorioNegociacoes(fontes: Fontes, periodo: Periodo | null): Relatorio {
  const r = base('negociacoes', fontes, periodo)
  const nomes = nomesDe(fontes.state)
  const linhas = fontes.state.trades
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !periodo || (t.date >= periodo.inicio && t.date < periodo.fim))
    .map(({ t, i }) => ({
      Ref: `TRADE-${i + 1}`,
      Data: dataHora(t.date),
      Moeda: t.tipoMoeda,
      Quantidade: t.qty,
      Preco_Unitario: reais(t.price),
      Valor_Bruto: reais(t.price * t.qty),
      Comissao: t.fee === undefined ? '' : reais(t.fee),
      Comprador: t.buyer,
      Nome_Comprador: nomes[t.buyer] ?? '',
      Vendedor: t.seller,
      Nome_Vendedor: nomes[t.seller] ?? '',
    }))
  if (fontes.state.trades.some((t) => t.fee === undefined)) {
    r.observacoes.push('Negociações sem comissão gravada vêm do blob (sem banco); o valor congelado só existe em aurea.trades.')
  }
  return comLinhas(r, linhas, ['Ref', 'Data', 'Moeda', 'Quantidade', 'Preco_Unitario', 'Valor_Bruto', 'Comissao', 'Comprador', 'Nome_Comprador', 'Vendedor', 'Nome_Vendedor'])
}

function relatorioCustodia(fontes: Fontes): Relatorio {
  const r = base('custodia', fontes, null)
  r.observacoes.push('A cobrança vigente por conta. Registrada, não debitada: o saldo não é afetado neste ambiente.')
  const linhas = Object.entries(fontes.state.custodyCharges).map(([email, c]) => ({
    Conta: email,
    Nome: fontes.state.users[email]?.name ?? '',
    Moedas: c.totalMoedas,
    Valor_Anual: reais(c.valorCobrado),
    Data_Cobranca: c.dataCobranca,
    Status: c.statusPagamento,
  }))
  return comLinhas(r, linhas, ['Conta', 'Nome', 'Moedas', 'Valor_Anual', 'Data_Cobranca', 'Status'])
}

function relatorioEstoque(fontes: Fontes): Relatorio {
  const r = base('estoque', fontes, null)
  r.observacoes.push('Inventário completo com proprietário e valor estimado — versão interna da auditoria pública, que não leva dono.')
  const s = fontes.state
  const medianas: Record<string, number | null> = {}
  const linhas = allCoinsFlat(s).map(({ owner, ownerName, coin }) => {
    if (!(coin.tipoMoeda in medianas)) medianas[coin.tipoMoeda] = medianSellPrice(s, coin.tipoMoeda)
    return {
      Codigo_Ativo: coin.id,
      Tipo_Moeda: coin.tipoMoeda,
      Ano: coin.ano,
      Proprietario: owner,
      Nome: ownerName,
      Status_Fisico: coin.statusFisico,
      Status_Digital: coinStatusDigital(s, coin),
      Data_Envio: envioDateFor(s, coin),
      Data_Entrada: coin.entrada,
      Recibo: coin.nft.codigo,
      Recibo_Status: coin.nft.status,
      Valor_Estimado: reais(coin.valorEstimado),
      Valor_Mercado: medianas[coin.tipoMoeda] === null ? '' : reais(medianas[coin.tipoMoeda] as number),
      Protocolo: coin.protocolo,
    }
  })
  return comLinhas(r, linhas, ['Codigo_Ativo', 'Tipo_Moeda', 'Ano', 'Proprietario', 'Nome', 'Status_Fisico', 'Status_Digital', 'Data_Envio', 'Data_Entrada', 'Recibo', 'Recibo_Status', 'Valor_Estimado', 'Valor_Mercado', 'Protocolo'])
}

function relatorioContas(fontes: Fontes): Relatorio {
  const r = base('contas', fontes, null)
  r.observacoes.push('Saldo_Ledger é a soma do livro-razão; Diferenca precisa ser zero em toda conta.')
  const s = fontes.state
  const linhas = Object.entries(s.users).map(([email, u]) => {
    const peloLedger = fontes.saldosLedger[email]
    return {
      Conta: email,
      Nome: u.name,
      Saldo: reais(u.balance),
      Saldo_Ledger: peloLedger === undefined ? '' : reais(peloLedger),
      Diferenca: peloLedger === undefined ? '' : reais(u.balance - peloLedger),
      Moedas: u.coins.length,
      Ofertas_Venda: s.sellOffers.filter((o) => o.seller === email).length,
      Ordens_Compra: s.buyOrders.filter((b) => b.buyer === email).reduce((n, b) => n + b.qty, 0),
      Ultimo_Acesso: u.lastAccess ? dataHora(u.lastAccess) : '',
    }
  })
  return comLinhas(r, linhas, ['Conta', 'Nome', 'Saldo', 'Saldo_Ledger', 'Diferenca', 'Moedas', 'Ofertas_Venda', 'Ordens_Compra', 'Ultimo_Acesso'])
}

function relatorioLancamentosManuais(fontes: Fontes): Relatorio {
  const r = base('lancamentos-manuais', fontes, null)
  const estornados = new Set(fontes.manuaisTodos.filter((l) => l.estornaId !== null).map((l) => l.estornaId))
  const linhas = fontes.manuaisTodos.map((l) => ({
    Id: l.id,
    Data: fdate(l.data),
    Conta_Codigo: l.contaCodigo,
    Descricao: l.descricao,
    Valor: reais(l.valor),
    Criado_Por: l.criadoPor,
    Criado_Em: dataHora(l.createdAt),
    Estorna_Id: l.estornaId ?? '',
    Situacao: l.estornaId !== null ? 'estorno' : estornados.has(l.id) ? 'estornado' : 'vigente',
  }))
  return comLinhas(r, linhas, ['Id', 'Data', 'Conta_Codigo', 'Descricao', 'Valor', 'Criado_Por', 'Criado_Em', 'Estorna_Id', 'Situacao'])
}

function relatorioParametros(fontes: Fontes): Relatorio {
  const r = base('parametros', fontes, null)
  r.observacoes.push('Valores em pontos-base (3200 = 32%) ou centavos. Nulo = não configurado: a DRE zera a linha e declara a pendência.')
  const linhas = fontes.parametrosLista.map((p) => ({
    Chave: p.chave,
    Rotulo: p.rotulo,
    Unidade: p.unidade,
    Valor: p.valor ?? '',
    Valor_Legivel: p.valor === null ? 'não configurado' : p.unidade === 'bp' ? `${p.valor / 100}%` : `R$ ${reais(p.valor)}`,
    Atualizado_Em: p.atualizadoEm ? dataHora(p.atualizadoEm) : '',
    Atualizado_Por: p.atualizadoPor ?? '',
    Descricao: p.descricao,
  }))
  return comLinhas(r, linhas, ['Chave', 'Rotulo', 'Unidade', 'Valor', 'Valor_Legivel', 'Atualizado_Em', 'Atualizado_Por', 'Descricao'])
}

function relatorioExportacoes(fontes: Fontes): Relatorio {
  const r = base('exportacoes', fontes, null)
  const linhas = fontes.exportacoes.map((e) => ({
    Id: e.id,
    Data: dataHora(e.createdAt),
    Relatorio: e.relatorio,
    Formato: e.formato,
    Destino: e.destino,
    Ator: e.ator,
    Linhas: e.linhas,
    Ok: e.ok,
    Detalhe: e.detalhe ?? '',
  }))
  return comLinhas(r, linhas, ['Id', 'Data', 'Relatorio', 'Formato', 'Destino', 'Ator', 'Linhas', 'Ok', 'Detalhe'])
}

function nomesDe(state: AppState): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [e, u] of Object.entries(state.users)) out[e] = u.name
  return out
}

/* ---------- a porta de entrada ---------- */

export interface OpcoesRelatorio extends ParametrosPeriodo {
  /** Relatórios sem recorte natural (ledger, auditoria) só recortam se `recortar` for true. */
  recortar?: boolean
}

export async function gerarRelatorio(nome: NomeRelatorio, opcoes: OpcoesRelatorio = {}): Promise<Relatorio> {
  const fontes = await carregarFontes()
  return montarRelatorio(nome, fontes, opcoes)
}

/** Todos de uma vez, para a pasta de trabalho completa e para o Google Sheets. */
export async function gerarTodosRelatorios(opcoes: OpcoesRelatorio = {}): Promise<Relatorio[]> {
  const fontes = await carregarFontes()
  return NOMES_RELATORIOS.map((nome) => montarRelatorio(nome, fontes, opcoes))
}

function montarRelatorio(nome: NomeRelatorio, fontes: Fontes, opcoes: OpcoesRelatorio): Relatorio {
  const periodo = periodoDaConsulta(opcoes)
  const recorte = opcoes.recortar ? periodo : null
  switch (nome) {
    case 'dre':
      return relatorioDre(fontes, periodo)
    case 'analise':
      return relatorioAnalise(fontes, periodo)
    case 'ledger':
      return relatorioLedger(fontes, recorte)
    case 'auditoria':
      return relatorioAuditoria(fontes, recorte)
    case 'extratos':
      return relatorioExtratos(fontes, recorte)
    case 'negociacoes':
      return relatorioNegociacoes(fontes, recorte)
    case 'custodia':
      return relatorioCustodia(fontes)
    case 'estoque':
      return relatorioEstoque(fontes)
    case 'contas':
      return relatorioContas(fontes)
    case 'lancamentos-manuais':
      return relatorioLancamentosManuais(fontes)
    case 'parametros':
      return relatorioParametros(fontes)
    case 'exportacoes':
      return relatorioExportacoes(fontes)
  }
}

/** A DRE estruturada (para a tela), com os parâmetros e os lançamentos que a alimentam. */
export async function dreCompleta(opcoes: ParametrosPeriodo = {}): Promise<{
  dre: Dre
  parametros: ParametroGravado[]
  lancamentos: LancamentoManualGravado[]
  ledger: LedgerEntry[]
  cadeiaOk: boolean
  semBanco: boolean
}> {
  const fontes = await carregarFontes()
  const periodo = periodoDaConsulta(opcoes)
  return {
    dre: montarDreDasFontes(fontes, periodo),
    parametros: fontes.parametrosLista,
    lancamentos: fontes.manuaisTodos,
    ledger: fontes.ledger,
    cadeiaOk: verificarCadeia(fontes.ledger, GENESIS).ok,
    semBanco: fontes.semBanco,
  }
}

/**
 * DRE — Demonstração do Resultado do Exercício, sob Lucro Presumido (módulo M7).
 *
 * NÃO É PORT. É a estrutura contábil que o plano (docs/EXECUCAO_POR_MODULO.md,
 * M7) pede: receita lida DO LEDGER — nunca recalculada —, deduções e impostos
 * com o cálculo pronto e a alíquota vindo de FORA.
 *
 * ⚠️ NENHUMA ALÍQUOTA ENTRA FIXA NO CÓDIGO. A alíquota efetiva depende de
 * faturamento, de município e muda por lei; alíquota errada em produção gera
 * passivo fiscal retroativo que só aparece na fiscalização, anos depois. Por
 * isso todo parâmetro nasce `null` ("não configurado"), a DRE mostra a linha
 * zerada com a pendência escrita, e é o contador quem preenche os valores —
 * pela tela de relatórios ou direto na tabela `aurea.parametros_contabeis`.
 * Enquanto a contradição tributária do CLAUDE.md (Presumido × Simples) não for
 * resolvida pelo contador, isto é a ÚNICA forma de a plataforma falar de
 * imposto: como estrutura, não como número.
 *
 * ARITMÉTICA EM INTEIROS. Percentuais são "pontos-base" (bp): 32% = 3200 bp,
 * 0,65% = 65 bp. `aplicarBp(base, bp)` = round(base × bp / 10000), em centavos.
 * Nunca float para dinheiro, nem para imposto.
 *
 * O QUE ENTRA DE ONDE
 * -------------------
 *  - Receita de comissões: lançamentos `comissao` do ledger no período. É o
 *    valor que foi efetivamente retido do vendedor — o RA-06 pago de verdade.
 *  - Receita de custódia: lançamentos `custodia` do período. Como a cobrança é
 *    reemitida a cada recibo (e a plataforma guarda uma por usuário), conta-se
 *    a ÚLTIMA registrada por usuário dentro do período — a vigente —, e não a
 *    soma de todas as reemissões, que dobraria a receita.
 *  - Outras receitas e TODAS as despesas: lançamentos manuais, por conta do
 *    plano de contas. Aluguel, pessoal, seguro do acervo — nada disso passa
 *    pela plataforma, então entra pela tela de relatórios.
 */

import { dayStamp } from '@/domain/dates'
import type { LedgerEntry } from '@/domain/ledger'
import type { Cents, Timestamp } from '@/domain/types'

/* ---------- parâmetros (alíquotas) ---------- */

/**
 * Tudo em pontos-base, exceto o limite do adicional de IRPJ, que é um valor
 * em centavos por mês. `null` = não configurado, e a DRE diz isso.
 */
export interface ParametrosContabeis {
  /** Presunção de lucro sobre a receita bruta (serviços costumam ser 32% = 3200). */
  presuncaoLucroBp: number | null
  irpjBp: number | null
  irpjAdicionalBp: number | null
  /** Parcela mensal do lucro presumido isenta do adicional (hoje R$ 20.000,00 na lei). */
  irpjAdicionalLimiteMensal: Cents | null
  csllBp: number | null
  pisBp: number | null
  cofinsBp: number | null
  /** Municipal — depende da cidade e do serviço. */
  issBp: number | null
}

export const PARAMETROS_VAZIOS: ParametrosContabeis = {
  presuncaoLucroBp: null,
  irpjBp: null,
  irpjAdicionalBp: null,
  irpjAdicionalLimiteMensal: null,
  csllBp: null,
  pisBp: null,
  cofinsBp: null,
  issBp: null,
}

export type ChaveParametro = keyof ParametrosContabeis

/** O catálogo de parâmetros: é o que a tela lista e o que a migration semeia (com valor nulo). */
export const CATALOGO_PARAMETROS: ReadonlyArray<{
  chave: ChaveParametro
  rotulo: string
  unidade: 'bp' | 'centavos'
  descricao: string
}> = [
  { chave: 'presuncaoLucroBp', rotulo: 'Presunção de lucro', unidade: 'bp', descricao: 'Percentual da receita bruta presumido como lucro (base do IRPJ e da CSLL).' },
  { chave: 'irpjBp', rotulo: 'IRPJ', unidade: 'bp', descricao: 'Alíquota do IRPJ sobre o lucro presumido.' },
  { chave: 'irpjAdicionalBp', rotulo: 'Adicional de IRPJ', unidade: 'bp', descricao: 'Alíquota do adicional sobre o que exceder o limite mensal.' },
  { chave: 'irpjAdicionalLimiteMensal', rotulo: 'Limite mensal do adicional', unidade: 'centavos', descricao: 'Parcela mensal do lucro presumido isenta do adicional.' },
  { chave: 'csllBp', rotulo: 'CSLL', unidade: 'bp', descricao: 'Alíquota da CSLL sobre o lucro presumido.' },
  { chave: 'pisBp', rotulo: 'PIS', unidade: 'bp', descricao: 'Alíquota do PIS sobre a receita bruta (cumulativo).' },
  { chave: 'cofinsBp', rotulo: 'COFINS', unidade: 'bp', descricao: 'Alíquota da COFINS sobre a receita bruta (cumulativo).' },
  { chave: 'issBp', rotulo: 'ISS', unidade: 'bp', descricao: 'Alíquota municipal sobre serviços.' },
]

/** round(base × bp / 10000), em centavos. Inteiro entra, inteiro sai. */
export function aplicarBp(base: Cents, bp: number): Cents {
  return Math.round((base * bp) / 10000)
}

/** Proporção em pontos-base: parte/total × 10000. null quando não há total. */
export function proporcaoBp(parte: Cents, total: Cents): number | null {
  if (total === 0) return null
  return Math.round((parte * 10000) / total)
}

/* ---------- plano de contas ---------- */

export type NaturezaConta = 'receita' | 'deducao' | 'despesa' | 'imposto'

export interface ContaContabil {
  codigo: string
  nome: string
  natureza: NaturezaConta
  /** true para as contas que a plataforma alimenta sozinha (não aceitam lançamento manual). */
  automatica: boolean
}

/**
 * O plano de contas mínimo de uma prestadora de serviço de custódia e
 * corretagem. Contas automáticas são alimentadas pelo ledger; as demais, por
 * lançamento manual. Códigos novos entram aqui E na migration que os semeia.
 */
export const PLANO_DE_CONTAS: readonly ContaContabil[] = [
  { codigo: '3.1.01', nome: 'Receita de comissões de corretagem', natureza: 'receita', automatica: true },
  { codigo: '3.1.02', nome: 'Receita de custódia', natureza: 'receita', automatica: true },
  { codigo: '3.1.99', nome: 'Outras receitas operacionais', natureza: 'receita', automatica: false },
  { codigo: '3.2.01', nome: 'ISS', natureza: 'deducao', automatica: true },
  { codigo: '3.2.02', nome: 'PIS', natureza: 'deducao', automatica: true },
  { codigo: '3.2.03', nome: 'COFINS', natureza: 'deducao', automatica: true },
  { codigo: '4.1.01', nome: 'Despesas com pessoal', natureza: 'despesa', automatica: false },
  { codigo: '4.1.02', nome: 'Serviços de terceiros (contabilidade, jurídico)', natureza: 'despesa', automatica: false },
  { codigo: '4.1.03', nome: 'Aluguel, condomínio e cofre', natureza: 'despesa', automatica: false },
  { codigo: '4.1.04', nome: 'Software e infraestrutura', natureza: 'despesa', automatica: false },
  { codigo: '4.1.05', nome: 'Seguro do acervo', natureza: 'despesa', automatica: false },
  { codigo: '4.1.06', nome: 'Frete e logística', natureza: 'despesa', automatica: false },
  { codigo: '4.1.07', nome: 'Tarifas de gateway de pagamento', natureza: 'despesa', automatica: false },
  { codigo: '4.1.08', nome: 'Marketing e comercial', natureza: 'despesa', automatica: false },
  { codigo: '4.1.99', nome: 'Outras despesas administrativas', natureza: 'despesa', automatica: false },
  { codigo: '4.2.01', nome: 'Despesas financeiras', natureza: 'despesa', automatica: false },
  { codigo: '5.1.01', nome: 'IRPJ', natureza: 'imposto', automatica: true },
  { codigo: '5.1.02', nome: 'CSLL', natureza: 'imposto', automatica: true },
]

export function contaPorCodigo(codigo: string): ContaContabil | undefined {
  return PLANO_DE_CONTAS.find((c) => c.codigo === codigo)
}

/** Lançamento feito à mão pela tela de relatórios: despesa ou receita fora da plataforma. */
export interface LancamentoManual {
  id?: number
  data: Timestamp
  contaCodigo: string
  descricao: string
  /** Sempre positivo; a natureza da conta diz se soma ou subtrai. */
  valor: Cents
  criadoPor: string
}

/* ---------- períodos ---------- */

export interface Periodo {
  /** Início inclusivo, ms. */
  inicio: Timestamp
  /** Fim EXCLUSIVO, ms. */
  fim: Timestamp
  rotulo: string
  /** Quantos meses cobre — o adicional de IRPJ é calculado por mês. */
  meses: number
}

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function periodoMensal(ano: number, mes: number): Periodo {
  return {
    inicio: new Date(ano, mes - 1, 1).getTime(),
    fim: new Date(ano, mes, 1).getTime(),
    rotulo: `${NOMES_MES[mes - 1]} de ${ano}`,
    meses: 1,
  }
}

export function periodoTrimestral(ano: number, trimestre: number): Periodo {
  const mes0 = (trimestre - 1) * 3
  return {
    inicio: new Date(ano, mes0, 1).getTime(),
    fim: new Date(ano, mes0 + 3, 1).getTime(),
    rotulo: `${trimestre}º trimestre de ${ano}`,
    meses: 3,
  }
}

export function periodoAnual(ano: number): Periodo {
  return {
    inicio: new Date(ano, 0, 1).getTime(),
    fim: new Date(ano + 1, 0, 1).getTime(),
    rotulo: `exercício de ${ano}`,
    meses: 12,
  }
}

/** Chave 'aaaa-mm' do mês local de um instante — para as séries mensais. */
export function chaveMes(ts: Timestamp): string {
  const d = new Date(dayStamp(ts))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function noPeriodo(ts: Timestamp, p: Periodo): boolean {
  return ts >= p.inicio && ts < p.fim
}

/* ---------- a DRE ---------- */

export interface LinhaDre {
  codigo: string
  descricao: string
  valor: Cents
  /** 0 = total em destaque, 1 = grupo, 2 = conta. */
  nivel: 0 | 1 | 2
  observacao: string | null
}

export interface TotaisDre {
  receitaComissoes: Cents
  receitaCustodia: Cents
  outrasReceitas: Cents
  receitaBruta: Cents
  iss: Cents
  pis: Cents
  cofins: Cents
  deducoes: Cents
  receitaLiquida: Cents
  despesasOperacionais: Cents
  resultadoOperacional: Cents
  basePresumida: Cents
  irpj: Cents
  irpjAdicional: Cents
  csll: Cents
  resultadoLiquido: Cents
}

export interface AnaliseDre {
  /** Margens em pontos-base sobre a receita bruta; null sem receita. */
  margemLiquidaBp: number | null
  margemOperacionalBp: number | null
  cargaTributariaBp: number | null
  numNegociacoes: number
  volumeNegociado: Cents
  ticketMedioComissao: Cents | null
  /** Receita de comissão por tipo de moeda, maior primeiro. */
  receitaPorTipo: Array<{ tipoMoeda: string; receita: Cents; negociacoes: number }>
  /** Série mensal dentro do período: comissões, custódia e despesas. */
  porMes: Array<{ mes: string; comissoes: Cents; custodia: Cents; despesas: Cents }>
  /** Soma dos `ajuste` do período — precisa ser zero num livro saudável. */
  ajustesNaoExplicados: Cents
}

export interface Dre {
  periodo: Periodo
  linhas: LinhaDre[]
  totais: TotaisDre
  analise: AnaliseDre
  /** O que o contador ainda precisa preencher para os impostos valerem. */
  pendencias: string[]
}

export interface EntradasDre {
  ledger: readonly LedgerEntry[]
  manuais: readonly LancamentoManual[]
  parametros: ParametrosContabeis
  periodo: Periodo
}

export function montarDre({ ledger, manuais, parametros, periodo }: EntradasDre): Dre {
  const pendencias: string[] = []

  const noPer = ledger.filter((l) => noPeriodo(l.createdAt, periodo))
  const comissoes = noPer.filter((l) => l.tipo === 'comissao')
  const custodias = noPer.filter((l) => l.tipo === 'custodia')
  const manuaisNoPer = manuais.filter((m) => noPeriodo(m.data, periodo))

  /* receita de comissões: o valor retido, congelado no ledger */
  const receitaComissoes = comissoes.reduce((s, l) => s + l.valor, 0)

  /* receita de custódia: a ÚLTIMA cobrança registrada por usuário no período */
  const vigentePorUsuario = new Map<string, LedgerEntry>()
  for (const l of custodias) vigentePorUsuario.set(l.userEmail, l) // o ledger vem em ordem de id
  const receitaCustodia = [...vigentePorUsuario.values()].reduce((s, l) => s + l.valor, 0)

  /* lançamentos manuais, por conta */
  const porConta = new Map<string, Cents>()
  for (const m of manuaisNoPer) {
    if (!contaPorCodigo(m.contaCodigo)) {
      pendencias.push(`Lançamento manual em conta desconhecida: ${m.contaCodigo}`)
      continue
    }
    porConta.set(m.contaCodigo, (porConta.get(m.contaCodigo) ?? 0) + m.valor)
  }
  const somaNatureza = (n: NaturezaConta): Cents =>
    PLANO_DE_CONTAS.filter((c) => c.natureza === n && !c.automatica).reduce(
      (s, c) => s + (porConta.get(c.codigo) ?? 0),
      0,
    )
  const outrasReceitas = somaNatureza('receita')
  const despesasOperacionais = somaNatureza('despesa')

  const receitaBruta = receitaComissoes + receitaCustodia + outrasReceitas

  /* deduções sobre a receita bruta */
  const comBp = (bp: number | null, rotulo: string): Cents => {
    if (bp === null) {
      pendencias.push(`${rotulo}: alíquota não configurada (linha zerada)`)
      return 0
    }
    return aplicarBp(receitaBruta, bp)
  }
  const iss = comBp(parametros.issBp, 'ISS')
  const pis = comBp(parametros.pisBp, 'PIS')
  const cofins = comBp(parametros.cofinsBp, 'COFINS')
  const deducoes = iss + pis + cofins
  const receitaLiquida = receitaBruta - deducoes
  const resultadoOperacional = receitaLiquida - despesasOperacionais

  /* IRPJ e CSLL sobre o lucro presumido */
  let basePresumida = 0
  if (parametros.presuncaoLucroBp === null) {
    pendencias.push('Presunção de lucro: não configurada (IRPJ e CSLL zerados)')
  } else {
    basePresumida = aplicarBp(receitaBruta, parametros.presuncaoLucroBp)
  }
  const irpj = parametros.presuncaoLucroBp === null ? 0 : comBpSobre(basePresumida, parametros.irpjBp, 'IRPJ', pendencias)
  const csll = parametros.presuncaoLucroBp === null ? 0 : comBpSobre(basePresumida, parametros.csllBp, 'CSLL', pendencias)

  let irpjAdicional = 0
  if (parametros.presuncaoLucroBp !== null && parametros.irpjAdicionalBp !== null) {
    if (parametros.irpjAdicionalLimiteMensal === null) {
      pendencias.push('Adicional de IRPJ: limite mensal não configurado (adicional zerado)')
    } else {
      const excedente = basePresumida - parametros.irpjAdicionalLimiteMensal * periodo.meses
      if (excedente > 0) irpjAdicional = aplicarBp(excedente, parametros.irpjAdicionalBp)
    }
  }

  const resultadoLiquido = resultadoOperacional - irpj - irpjAdicional - csll

  const totais: TotaisDre = {
    receitaComissoes,
    receitaCustodia,
    outrasReceitas,
    receitaBruta,
    iss,
    pis,
    cofins,
    deducoes,
    receitaLiquida,
    despesasOperacionais,
    resultadoOperacional,
    basePresumida,
    irpj,
    irpjAdicional,
    csll,
    resultadoLiquido,
  }

  /* as linhas, na ordem em que uma DRE se lê */
  const linhas: LinhaDre[] = []
  const linha = (codigo: string, descricao: string, valor: Cents, nivel: 0 | 1 | 2, observacao: string | null = null): void => {
    linhas.push({ codigo, descricao, valor, nivel, observacao })
  }
  linha('3', 'RECEITA BRUTA', receitaBruta, 0)
  linha('3.1.01', 'Receita de comissões de corretagem', receitaComissoes, 2, `${comissoes.length} negociação(ões)`)
  linha('3.1.02', 'Receita de custódia', receitaCustodia, 2, 'cobrança vigente por conta; registrada, não debitada')
  linha('3.1.99', 'Outras receitas operacionais', outrasReceitas, 2, outrasReceitas ? 'lançamento manual' : null)
  linha('3.2', '(−) Deduções da receita', -deducoes, 1)
  linha('3.2.01', 'ISS', -iss, 2, parametros.issBp === null ? 'não configurado' : `${fmtBp(parametros.issBp)} sobre a receita bruta`)
  linha('3.2.02', 'PIS', -pis, 2, parametros.pisBp === null ? 'não configurado' : `${fmtBp(parametros.pisBp)} sobre a receita bruta`)
  linha('3.2.03', 'COFINS', -cofins, 2, parametros.cofinsBp === null ? 'não configurado' : `${fmtBp(parametros.cofinsBp)} sobre a receita bruta`)
  linha('3.9', '= RECEITA LÍQUIDA', receitaLiquida, 0)
  linha('4', '(−) Despesas operacionais', -despesasOperacionais, 1)
  for (const c of PLANO_DE_CONTAS.filter((x) => x.natureza === 'despesa')) {
    const v = porConta.get(c.codigo) ?? 0
    if (v !== 0) linha(c.codigo, c.nome, -v, 2, 'lançamento manual')
  }
  linha('4.9', '= RESULTADO OPERACIONAL', resultadoOperacional, 0)
  linha('5.0', 'Base de cálculo (lucro presumido)', basePresumida, 1, parametros.presuncaoLucroBp === null ? 'não configurado' : `${fmtBp(parametros.presuncaoLucroBp)} da receita bruta`)
  linha('5.1.01', 'IRPJ', -irpj, 2, parametros.irpjBp === null ? 'não configurado' : `${fmtBp(parametros.irpjBp)} da base`)
  linha('5.1.01a', 'Adicional de IRPJ', -irpjAdicional, 2, parametros.irpjAdicionalBp === null ? 'não configurado' : `${fmtBp(parametros.irpjAdicionalBp)} sobre o excedente`)
  linha('5.1.02', 'CSLL', -csll, 2, parametros.csllBp === null ? 'não configurado' : `${fmtBp(parametros.csllBp)} da base`)
  linha('9', '= RESULTADO LÍQUIDO DO PERÍODO', resultadoLiquido, 0)

  /* análise básica */
  const negociacoes = new Set(comissoes.map((l) => l.refInterna ?? String(l.createdAt)))
  const vendas = noPer.filter((l) => l.tipo === 'venda')
  const volumeNegociado = vendas.reduce((s, l) => s + l.valor, 0)

  const porTipoMap = new Map<string, { receita: Cents; negociacoes: number }>()
  for (const l of comissoes) {
    const k = l.tipoMoeda ?? '—'
    const atual = porTipoMap.get(k) ?? { receita: 0, negociacoes: 0 }
    atual.receita += l.valor
    atual.negociacoes += 1
    porTipoMap.set(k, atual)
  }
  const receitaPorTipo = [...porTipoMap.entries()]
    .map(([tipoMoeda, v]) => ({ tipoMoeda, ...v }))
    .sort((a, b) => b.receita - a.receita)

  const meses = new Map<string, { comissoes: Cents; custodia: Cents; despesas: Cents }>()
  const mesDe = (ts: Timestamp): { comissoes: Cents; custodia: Cents; despesas: Cents } => {
    const k = chaveMes(ts)
    let m = meses.get(k)
    if (!m) {
      m = { comissoes: 0, custodia: 0, despesas: 0 }
      meses.set(k, m)
    }
    return m
  }
  for (const l of comissoes) mesDe(l.createdAt).comissoes += l.valor
  for (const l of vigentePorUsuario.values()) mesDe(l.createdAt).custodia += l.valor
  for (const m of manuaisNoPer) {
    const c = contaPorCodigo(m.contaCodigo)
    if (c && c.natureza === 'despesa') mesDe(m.data).despesas += m.valor
  }
  const porMes = [...meses.entries()].map(([mes, v]) => ({ mes, ...v })).sort((a, b) => (a.mes < b.mes ? -1 : 1))

  const ajustes = noPer.filter((l) => l.tipo === 'ajuste')
  const ajustesNaoExplicados = ajustes.reduce((s, l) => s + l.valor * l.sinal, 0)
  if (ajustes.length) pendencias.push(`${ajustes.length} lançamento(s) de ajuste no período — precisam de explicação`)

  const analise: AnaliseDre = {
    margemLiquidaBp: proporcaoBp(resultadoLiquido, receitaBruta),
    margemOperacionalBp: proporcaoBp(resultadoOperacional, receitaBruta),
    cargaTributariaBp: proporcaoBp(deducoes + irpj + irpjAdicional + csll, receitaBruta),
    numNegociacoes: negociacoes.size,
    volumeNegociado,
    ticketMedioComissao: negociacoes.size ? Math.round(receitaComissoes / negociacoes.size) : null,
    receitaPorTipo,
    porMes,
    ajustesNaoExplicados,
  }

  return { periodo, linhas, totais, analise, pendencias }
}

function comBpSobre(base: Cents, bp: number | null, rotulo: string, pendencias: string[]): Cents {
  if (bp === null) {
    pendencias.push(`${rotulo}: alíquota não configurada (linha zerada)`)
    return 0
  }
  return aplicarBp(base, bp)
}

/** 3200 -> '32%', 65 -> '0,65%'. Só para as observações das linhas. */
export function fmtBp(bp: number): string {
  const pct = bp / 100
  return (Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace('.', ',').replace(/0$/, '')) + '%'
}

/**
 * Controle financeiro da empresa — a regra pura dos custos e receitas recorrentes (25/10/2026).
 *
 * O QUE É. Um "recorrente" é um custo ou uma receita que acontece de novo a cada N meses
 * (HostGator, Claude, Fly.io, marketing, contador…) — ou uma vez só (`unica`). Cada ocorrência
 * vencida vira um LANÇAMENTO MANUAL comum (src/domain/dre.ts), na conta contábil escolhida, e por
 * isso entra na DRE como qualquer despesa 4.1.xx ou receita 3.1.99. Quem lança é o job diário
 * (decisão do Gabriel, 25/10/2026: "lançar sozinho todo mês"); o painel também lança na hora o
 * que já venceu quando o cadastro é salvo.
 *
 * A OCORRÊNCIA TEM DIA. A primeira é a data de início; as seguintes caem no mesmo dia do mês, a
 * cada N meses — dia 29 a 31 cai no último dia do mês curto, como o ciclo de custódia
 * (src/domain/ciclo-custodia.ts). Datas são 'AAAA-MM-DD' no dia de Brasília: o servidor roda em
 * UTC, e um custo que vence "dia 5" não pode ser lançado no dia 4 às 21 h.
 *
 * NADA DE IMPOSTO AQUI. O valor é o que a empresa paga ou recebe; ISS, PIS, COFINS, IRPJ e CSLL
 * continuam saindo da DRE com as alíquotas que o contador preenche.
 */

import { contaPorCodigo, type ContaContabil } from '@/domain/dre'
import type { Cents, Timestamp } from '@/domain/types'

import { LANCAMENTO_MAX } from '@/domain/admin/contabil'

export type TipoRecorrente = 'custo' | 'receita'

export const PERIODICIDADES = ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual', 'unica'] as const
export type Periodicidade = (typeof PERIODICIDADES)[number]

/** Meses entre duas ocorrências; `unica` = 0 (acontece uma vez). */
export const MESES_DA_PERIODICIDADE: Readonly<Record<Periodicidade, number>> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
  unica: 0,
}

export const ROTULO_PERIODICIDADE: Readonly<Record<Periodicidade, string>> = {
  mensal: 'Todo mês',
  bimestral: 'A cada 2 meses',
  trimestral: 'A cada 3 meses',
  semestral: 'A cada 6 meses',
  anual: 'Todo ano',
  unica: 'Uma vez só',
}

/** A lista sugerida com que a tabela de setores nasce (migration 046); a equipe edita no painel. */
export const SETORES_INICIAIS: readonly string[] = [
  'Tecnologia',
  'Marketing',
  'Operação e logística',
  'Jurídico e contábil',
  'Financeiro',
  'Pessoal',
  'Administrativo',
]

export interface Recorrente {
  id: number
  tipo: TipoRecorrente
  descricao: string
  fornecedor: string | null
  contaCodigo: string
  setorId: number | null
  valor: Cents
  periodicidade: Periodicidade
  /** 'AAAA-MM-DD', dia de Brasília da primeira ocorrência. */
  inicio: string
  /** 'AAAA-MM-DD' da última data em que ainda pode ocorrer; null = sem fim. */
  fim: string | null
  ativo: boolean
  observacao: string | null
}

/* ---------- datas no dia de Brasília ---------- */

const UMA_HORA = 3_600_000

/** 'AAAA-MM-DD' do dia em Brasília (UTC−3, sem horário de verão desde 2019). */
export function diaDeBrasilia(ts: Timestamp): string {
  return new Date(ts - 3 * UMA_HORA).toISOString().slice(0, 10)
}

/** Meio-dia de Brasília do dia: o instante que vai no lançamento — cai no mesmo dia em UTC e no local. */
export function meioDiaDeBrasilia(dia: string): Timestamp {
  const [a, m, d] = dia.split('-').map(Number)
  return Date.UTC(a!, m! - 1, d!, 15, 0, 0)
}

function ehDiaValido(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [a, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(a!, m! - 1, d!))
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d
}

/** A data `meses` meses depois de `dia`, no mesmo dia do mês ou no último dia do mês curto. */
export function somarMeses(dia: string, meses: number): string {
  const [a, m, d] = dia.split('-').map(Number)
  const alvoMes = m! - 1 + meses
  const ano = a! + Math.floor(alvoMes / 12)
  const mes = ((alvoMes % 12) + 12) % 12
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
  const dd = Math.min(d!, ultimo)
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

/* ---------- ocorrências ---------- */

/** Teto de ocorrências calculadas de uma vez: anteparo contra um início no ano 1900. */
const MAX_OCORRENCIAS = 600

/** Todas as datas de ocorrência de `inicio` até `ate` (inclusive), respeitando o fim. */
export function ocorrenciasAte(r: Pick<Recorrente, 'inicio' | 'fim' | 'periodicidade'>, ate: string): string[] {
  const limite = r.fim && r.fim < ate ? r.fim : ate
  if (r.inicio > limite) return []
  const passo = MESES_DA_PERIODICIDADE[r.periodicidade]
  if (passo === 0) return [r.inicio]
  const saida: string[] = []
  for (let i = 0; i < MAX_OCORRENCIAS; i++) {
    const dia = somarMeses(r.inicio, i * passo)
    if (dia > limite) break
    saida.push(dia)
  }
  return saida
}

/** A primeira ocorrência a partir de `hoje` (inclusive), ou null se não há mais nenhuma. */
export function proximaOcorrencia(r: Pick<Recorrente, 'inicio' | 'fim' | 'periodicidade' | 'ativo'>, hoje: string): string | null {
  if (!r.ativo) return null
  const passo = MESES_DA_PERIODICIDADE[r.periodicidade]
  if (passo === 0) return r.inicio >= hoje ? r.inicio : null
  for (let i = 0; i < MAX_OCORRENCIAS; i++) {
    const dia = somarMeses(r.inicio, i * passo)
    if (r.fim && dia > r.fim) return null
    if (dia >= hoje) return dia
  }
  return null
}

/** As ocorrências dentro de [de, ate] (inclusive) — para "o que vence nos próximos 30 dias". */
export function ocorrenciasEntre(r: Pick<Recorrente, 'inicio' | 'fim' | 'periodicidade' | 'ativo'>, de: string, ate: string): string[] {
  if (!r.ativo) return []
  return ocorrenciasAte(r, ate).filter((d) => d >= de)
}

/**
 * Quanto o recorrente pesa por mês: valor ÷ meses do intervalo, arredondado ao centavo. É o
 * número do "custo fixo mensal" — um anual de R$ 1.200,00 pesa R$ 100,00 por mês. `unica` não é
 * custo fixo e pesa zero.
 */
export function valorMensalizado(r: Pick<Recorrente, 'valor' | 'periodicidade'>): Cents {
  const meses = MESES_DA_PERIODICIDADE[r.periodicidade]
  return meses === 0 ? 0 : Math.round(r.valor / meses)
}

/** Recorrente que ainda vale hoje: ativo e sem fim no passado. */
export function vigente(r: Pick<Recorrente, 'ativo' | 'fim'>, hoje: string): boolean {
  return r.ativo && (r.fim === null || r.fim >= hoje)
}

/* ---------- contas aceitas ---------- */

/**
 * Custo vai para uma conta de DESPESA de lançamento manual (4.1.xx, 4.2.01); receita, para uma de
 * RECEITA de lançamento manual (3.1.99). As automáticas (4.1.07 tarifas de gateway, 3.1.01 a 04)
 * são do livro-razão e ficam de fora — mesma regra do lançamento manual da aba Contábil.
 */
export function contasDoTipo(contas: readonly ContaContabil[], tipo: TipoRecorrente): ContaContabil[] {
  return contas.filter((c) => !c.automatica && (tipo === 'custo' ? c.natureza === 'despesa' : c.natureza === 'receita'))
}

/* ---------- validação (toda entrada chega de uma Server Action) ---------- */

export type Validacao<T> = { ok: true; valor: T } | { ok: false; erro: string }

export interface EntradaRecorrente {
  tipo: unknown
  descricao: unknown
  fornecedor: unknown
  contaCodigo: unknown
  setorId: unknown
  valorCents: unknown
  periodicidade: unknown
  inicio: unknown
  fim: unknown
  observacao: unknown
}

export type RecorrenteValidado = Omit<Recorrente, 'id' | 'ativo'>

function texto(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

export function validarRecorrente(e: EntradaRecorrente): Validacao<RecorrenteValidado> {
  if (e.tipo !== 'custo' && e.tipo !== 'receita') return { ok: false, erro: 'Escolha se é custo ou receita.' }
  const tipo: TipoRecorrente = e.tipo
  const descricao = texto(e.descricao, 120)
  if (descricao.length < 3) return { ok: false, erro: 'Descreva o lançamento (mínimo 3 caracteres): ex.: "Hospedagem HostGator".' }
  const fornecedor = texto(e.fornecedor, 80) || null
  const conta = typeof e.contaCodigo === 'string' ? contaPorCodigo(e.contaCodigo) : undefined
  if (!conta) return { ok: false, erro: 'Escolha a conta contábil.' }
  if (conta.automatica) return { ok: false, erro: 'Esta conta é alimentada pelo livro-razão e não aceita lançamento manual.' }
  if (tipo === 'custo' && conta.natureza !== 'despesa') return { ok: false, erro: 'Custo vai para uma conta de despesa (4.x).' }
  if (tipo === 'receita' && conta.natureza !== 'receita') return { ok: false, erro: 'Receita vai para uma conta de receita (3.x).' }
  let setorId: number | null = null
  if (e.setorId !== null && e.setorId !== undefined && e.setorId !== '') {
    if (typeof e.setorId !== 'number' || !Number.isInteger(e.setorId) || e.setorId <= 0) return { ok: false, erro: 'Setor inválido.' }
    setorId = e.setorId
  }
  const valor = typeof e.valorCents === 'number' && Number.isFinite(e.valorCents) ? Math.floor(e.valorCents) : 0
  if (valor <= 0) return { ok: false, erro: 'Informe um valor maior que zero.' }
  if (valor > LANCAMENTO_MAX) return { ok: false, erro: 'O valor máximo é R$ 10.000.000,00.' }
  if (typeof e.periodicidade !== 'string' || !(PERIODICIDADES as readonly string[]).includes(e.periodicidade)) {
    return { ok: false, erro: 'Escolha a periodicidade.' }
  }
  const periodicidade = e.periodicidade as Periodicidade
  if (!ehDiaValido(e.inicio)) return { ok: false, erro: 'Informe a data da primeira ocorrência.' }
  const inicio = e.inicio
  let fim: string | null = null
  if (e.fim !== null && e.fim !== undefined && e.fim !== '') {
    if (!ehDiaValido(e.fim)) return { ok: false, erro: 'Data de término inválida.' }
    if (e.fim < inicio) return { ok: false, erro: 'O término não pode ser antes da primeira ocorrência.' }
    fim = e.fim
  }
  const observacao = texto(e.observacao, 300) || null
  return { ok: true, valor: { tipo, descricao, fornecedor, contaCodigo: conta.codigo, setorId, valor, periodicidade, inicio, fim, observacao } }
}

export function validarNomeDeSetor(nome: unknown): Validacao<string> {
  const n = texto(nome, 40)
  if (n.length < 2) return { ok: false, erro: 'Dê um nome ao setor (mínimo 2 caracteres).' }
  return { ok: true, valor: n }
}

/** Descrição do lançamento contábil gerado por uma ocorrência: legível no livro e na DRE. */
export function descricaoDaOcorrencia(r: Pick<Recorrente, 'descricao' | 'fornecedor'>, dia: string): string {
  const [a, m] = dia.split('-')
  return `${r.descricao}${r.fornecedor ? ` — ${r.fornecedor}` : ''} (${m}/${a})`.slice(0, 200)
}

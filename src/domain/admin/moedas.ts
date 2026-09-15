/**
 * A auditoria do acervo — toda moeda do sistema numa linha, e a conferência das correntes
 * (frente C, C3 — plano do Admin, 3.5).
 *
 * UMA LINHA POR MOEDA, COM A ORIGEM DELA. O relatório `estoque` já lista código, tipo, dono e
 * recibo; aqui a linha ganha o que só a análise sabe — peso, operador, caixa e posição, vídeo — e
 * a situação física, que vem da retirada: custodiada, em retirada ou retirada.
 *
 * TRÊS CONFERÊNCIAS, NENHUMA NOVA. A corrente das análises é conferida por `conferirCadeia()`
 * (src/domain/analise.ts) e a do livro-razão por `verificarCadeia()` (src/domain/ledger.ts) — as
 * funções que já existem, com a fórmula congelada. A terceira é o cruzamento que dá sentido às
 * duas: o hash do recibo de uma moeda que passou pela bancada precisa ser o hash da análise que a
 * aprovou (estacao/CONTRATO.md, seção 4). Moeda do seed não tem análise e declara o hash simulado.
 *
 * Regra pura: sem I/O. O relógio não entra — situação é derivada do estado, não da hora.
 */

import { conferirCadeia } from '@/domain/analise'
import { verificarCadeia, type LedgerEntry } from '@/domain/ledger'
import type { Analise, AppState, Retirada, StatusFisico, StatusRecibo } from '@/domain/types'

export type SituacaoMoeda = 'custodiada' | 'em_retirada' | 'retirada'

export const SITUACOES_MOEDA: readonly SituacaoMoeda[] = ['custodiada', 'em_retirada', 'retirada']

export const ROTULO_SITUACAO: Record<SituacaoMoeda, string> = {
  custodiada: 'Custodiada',
  em_retirada: 'Em retirada',
  retirada: 'Retirada',
}

/** Retirada que ainda não tirou a moeda do cofre. `cancelada` devolve a moeda à custódia. */
const EM_ANDAMENTO: ReadonlyArray<Retirada['status']> = ['solicitada', 'paga', 'separacao']
const CONCLUIDA: ReadonlyArray<Retirada['status']> = ['postada', 'entregue']

export interface AnaliseDaMoeda {
  protocolo: string
  protocoloEnvio: string
  pesoMg: number
  operador: string
  validadoEm: number
  caminhoVideo: string | null
  hash: string
}

export interface LinhaMoeda {
  codigo: string
  tipoMoeda: string
  ano: number
  dono: string
  nomeDono: string
  statusFisico: StatusFisico
  valorEstimado: number
  protocoloEnvio: string
  recibo: { codigo: string; hash: string; status: StatusRecibo; dataEmissao: string }
  analise: AnaliseDaMoeda | null
  caixa: string | null
  posicao: number | null
  /** true quando o hash do recibo é o hash da análise que aprovou a moeda. */
  hashConfere: boolean | null
  situacao: SituacaoMoeda
  retiradaId: string | null
  negociando: boolean
}

function situacaoDaRetirada(r: Retirada | undefined): SituacaoMoeda {
  if (!r) return 'custodiada'
  if (CONCLUIDA.includes(r.status)) return 'retirada'
  if (EM_ANDAMENTO.includes(r.status)) return 'em_retirada'
  return 'custodiada'
}

/**
 * A retirada que decide a situação de cada moeda: a mais recente que não foi cancelada.
 * Uma cancelada seguida de um pedido novo não pode esconder o pedido novo.
 */
function retiradaVigentePorMoeda(retiradas: readonly Retirada[]): Map<string, Retirada> {
  const porMoeda = new Map<string, Retirada>()
  for (const r of [...retiradas].sort((a, b) => a.solicitadoEm - b.solicitadoEm)) {
    if (r.status === 'cancelada') continue
    porMoeda.set(r.coinId, r)
  }
  return porMoeda
}

export function linhasDoAcervo(state: Pick<AppState, 'users' | 'analises' | 'sellOffers'>, retiradas: readonly Retirada[]): LinhaMoeda[] {
  const analisePorMoeda = new Map<string, Analise>()
  for (const a of state.analises) if (a.veredito === 'aprovada' && a.codigoMoeda) analisePorMoeda.set(a.codigoMoeda, a)
  const retiradaPorMoeda = retiradaVigentePorMoeda(retiradas)
  const emOferta = new Set(state.sellOffers.map((o) => o.coinId))

  const linhas: LinhaMoeda[] = []
  for (const [email, u] of Object.entries(state.users)) {
    for (const c of u.coins) {
      const a = analisePorMoeda.get(c.id)
      const r = retiradaPorMoeda.get(c.id)
      linhas.push({
        codigo: c.id,
        tipoMoeda: c.tipoMoeda,
        ano: c.ano,
        dono: email,
        nomeDono: u.name,
        statusFisico: c.statusFisico,
        valorEstimado: c.valorEstimado,
        protocoloEnvio: c.protocolo,
        recibo: { codigo: c.recibo.codigo, hash: c.recibo.hash, status: c.recibo.status, dataEmissao: c.recibo.dataEmissao },
        analise: a
          ? { protocolo: a.protocolo, protocoloEnvio: a.protocoloEnvio, pesoMg: a.pesoMg, operador: a.operador, validadoEm: a.validadoEm, caminhoVideo: a.caminhoVideo, hash: a.hash }
          : null,
        caixa: a?.caixa ?? null,
        posicao: a?.posicao ?? null,
        hashConfere: a ? c.recibo.hash === a.hash : null,
        situacao: situacaoDaRetirada(r),
        retiradaId: r?.id ?? null,
        negociando: emOferta.has(c.id),
      })
    }
  }
  return linhas.sort((x, y) => (x.codigo < y.codigo ? -1 : x.codigo > y.codigo ? 1 : 0))
}

/* ---------- filtro ---------- */

export interface FiltroMoedas {
  busca: string
  tipo: string
  situacao: SituacaoMoeda | 'todas'
  /** 'com' = passou pela bancada; 'sem' = sem análise (acervo do seed ou demonstração). */
  analise: 'todas' | 'com' | 'sem'
  caixa: string
}

export const FILTRO_MOEDAS_PADRAO: FiltroMoedas = { busca: '', tipo: '', situacao: 'todas', analise: 'todas', caixa: '' }

type Parametros = Record<string, string | string[] | undefined>

function um(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? ''
}

export function lerFiltroMoedas(p: Parametros): FiltroMoedas {
  const situacao = um(p.situacao)
  const analise = um(p.analise)
  return {
    busca: um(p.busca).trim().slice(0, 80),
    tipo: um(p.tipo).trim().slice(0, 80),
    situacao: (SITUACOES_MOEDA as readonly string[]).includes(situacao) ? (situacao as SituacaoMoeda) : 'todas',
    analise: analise === 'com' || analise === 'sem' ? analise : 'todas',
    caixa: um(p.caixa).trim().slice(0, 40),
  }
}

export function filtrarMoedas(linhas: readonly LinhaMoeda[], f: FiltroMoedas): LinhaMoeda[] {
  const busca = f.busca.toLowerCase()
  const caixa = f.caixa.toLowerCase().replace(/[^a-z0-9]/g, '')
  return linhas.filter((l) => {
    if (f.tipo && l.tipoMoeda !== f.tipo) return false
    if (f.situacao !== 'todas' && l.situacao !== f.situacao) return false
    if (f.analise === 'com' && !l.analise) return false
    if (f.analise === 'sem' && l.analise) return false
    if (caixa && (l.caixa ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') !== caixa) return false
    if (busca) {
      const alvo = [l.codigo, l.recibo.codigo, l.recibo.hash, l.dono, l.nomeDono, l.protocoloEnvio, l.analise?.protocolo ?? ''].join(' ').toLowerCase()
      if (!alvo.includes(busca)) return false
    }
    return true
  })
}

export interface ResumoAcervo {
  total: number
  custodiadas: number
  emRetirada: number
  retiradas: number
  comAnalise: number
  semVideo: number
  hashDivergente: number
}

export function resumirAcervo(linhas: readonly LinhaMoeda[]): ResumoAcervo {
  return {
    total: linhas.length,
    custodiadas: linhas.filter((l) => l.situacao === 'custodiada').length,
    emRetirada: linhas.filter((l) => l.situacao === 'em_retirada').length,
    retiradas: linhas.filter((l) => l.situacao === 'retirada').length,
    comAnalise: linhas.filter((l) => l.analise).length,
    semVideo: linhas.filter((l) => l.analise && !l.analise.caminhoVideo).length,
    hashDivergente: linhas.filter((l) => l.hashConfere === false).length,
  }
}

/* ---------- verificar corrente ---------- */

export interface VerificacaoDoAcervo {
  analises: { total: number; integra: boolean; primeiraQuebra: number | null; protocolo: string | null }
  /** `null` quando o ambiente não tem livro-razão (sem banco). */
  ledger: { total: number; integra: boolean; primeiraQuebra: number | null; motivo: string | null; id: number | null } | null
  recibos: { conferidos: number; divergentes: Array<{ codigo: string; analise: string }> }
}

/**
 * As três conferências de uma vez. `genesis` é o GENESIS de src/domain/hash.ts — passado por
 * parâmetro, como nas duas funções de origem.
 */
export function verificarAcervo(
  state: Pick<AppState, 'users' | 'analises'>,
  ledger: ReadonlyArray<LedgerEntry & { id?: number }> | null,
  genesis: string,
): VerificacaoDoAcervo {
  const quebraAnalise = conferirCadeia(state.analises, genesis)
  const analises = {
    total: state.analises.length,
    integra: quebraAnalise === -1,
    primeiraQuebra: quebraAnalise === -1 ? null : quebraAnalise,
    protocolo: quebraAnalise === -1 ? null : (state.analises[quebraAnalise]?.protocolo ?? null),
  }

  let verificacaoLedger: VerificacaoDoAcervo['ledger'] = null
  if (ledger) {
    const v = verificarCadeia(ledger, genesis)
    verificacaoLedger = {
      total: ledger.length,
      integra: v.ok,
      primeiraQuebra: v.primeiraQuebra,
      motivo: v.motivo,
      id: v.primeiraQuebra === null ? null : (ledger[v.primeiraQuebra]?.id ?? null),
    }
  }

  const linhas = linhasDoAcervo({ ...state, sellOffers: [] }, [])
  const comAnalise = linhas.filter((l) => l.analise)
  return {
    analises,
    ledger: verificacaoLedger,
    recibos: {
      conferidos: comAnalise.length,
      divergentes: comAnalise.filter((l) => l.hashConfere === false).map((l) => ({ codigo: l.codigo, analise: l.analise?.protocolo ?? '' })),
    },
  }
}

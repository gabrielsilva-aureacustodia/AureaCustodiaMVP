/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê o estado inteiro, o ledger, a trilha, os aceites e o Supabase Auth para
 * montar a lista e a ficha dos usuários. Não importe de Client Component: a
 * página entrega ao cliente só o que o papel do membro alcança.
 * ==========================================================================*/

import 'server-only'

import type { MembroAdmin } from '@/domain/admin/permissoes'
import { temPermissao } from '@/domain/admin/permissoes'
import {
  CONTA_ATIVA,
  acervoDaConta,
  filtrarUsuarios,
  linhasDeUsuarios,
  resumirConta,
  type FiltroUsuarios,
  type LinhaUsuario,
  type MoedaDoAcervo,
  type ResumoConta,
  type SituacaoConta,
} from '@/domain/admin/usuarios'
import { ACCOUNTS } from '@/domain/constants'
import { verificarStatusFatura } from '@/domain/custody'
import { statementTotals, userStatement, type StatementRow, type StatementTotals } from '@/domain/statement'
import type {
  AppState,
  BuyOrder,
  Cadastro,
  Cents,
  DadosBancarios,
  Deposit,
  Envio,
  FaturaCustodia,
  LegalBlockAcceptance,
  Retirada,
  Saque,
  StatusFatura,
  Trade,
} from '@/domain/types'
import { podeAbrirPainelAdmin } from '@/server/admin/acesso'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  contasDesativadas,
  datasDeCriacao,
  historicoDaSituacao,
  listarNotasDoUsuario,
  situacaoDaConta,
  trilhaDaConta,
  usoDaConta,
  type EventoDeUsoDaConta,
  type NotaDoUsuario,
} from '@/server/db/repositories/admin-usuarios'
import type { EntradaAuditoriaGravada } from '@/server/db/repositories/auditoria'
import { conversasDaConta, type ConversaListada } from '@/server/db/repositories/cs'
import { listarLancamentos, type LedgerEntryGravado } from '@/server/db/repositories/ledger'
import {
  aceitesDaConta,
  historicoDaFilaDaConta,
  recebimentosDaConta,
  type AceiteDaConta,
  type EventoDaFilaDaConta,
  type RecebimentoDaConta,
} from '@/server/db/repositories/painel-leituras'
import type { RastreioGravado } from '@/server/db/repositories/rastreios'
import type { Consulta } from '@/server/db/sql'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { rastreiosPorProtocolo } from '@/server/shipping/rastreios'
import { getState } from '@/server/state'

import { portaDeIdentidadeDoAmbiente } from './identidade'
import type { IdentidadeResumo } from './usuarios'

const LIMITE_EXTRATO = 300
const LIMITE_LEDGER = 300
const LIMITE_TRILHA = 200
const LIMITE_USO = 200
const LIMITE_FILA = 200
const LIMITE_RECEBIMENTOS = 100

/**
 * Leitura que pode faltar — tabela de outra frente ainda não migrada, tabela da própria C2
 * antes do `db:migrate`, banco instável. Uma transação por leitura (uma consulta que falha
 * aborta a transação inteira no Postgres), e a falha vira `null`: a aba mostra "indisponível"
 * no lugar daquele bloco, e o resto da ficha abre.
 */
async function opcional<T>(ler: (tx: Consulta) => Promise<T>): Promise<T | null> {
  if (!bancoConfigurado()) return null
  try {
    return await executarNoBanco(ler, { somenteLeitura: true })
  } catch (err) {
    console.error('[admin] leitura opcional da ficha indisponível:', err)
    return null
  }
}

/* ---------- a lista ---------- */

export interface DadosListaUsuarios {
  linhas: LinhaUsuario[]
  total: number
  semBanco: boolean
}

export async function carregarListaDeUsuarios(filtro: FiltroUsuarios, agora: number = Date.now()): Promise<DadosListaUsuarios> {
  const [state, criacao, inativas] = await Promise.all([getState(), opcional(datasDeCriacao), opcional(contasDesativadas)])
  const todas = linhasDeUsuarios(state, criacao ?? {}, inativas ?? new Set(), agora)
  return { linhas: filtrarUsuarios(todas, filtro), total: todas.length, semBanco: !bancoConfigurado() }
}

/* ---------- a ficha ---------- */

export const ABAS_FICHA = [
  { chave: 'cadastro', rotulo: 'Cadastro' },
  { chave: 'financeiro', rotulo: 'Financeiro' },
  { chave: 'acervo', rotulo: 'Acervo' },
  { chave: 'logistica', rotulo: 'Logística' },
  { chave: 'mercado', rotulo: 'Mercado' },
  { chave: 'atividade', rotulo: 'Atividade' },
  { chave: 'notas', rotulo: 'Notas' },
] as const

export type AbaFicha = (typeof ABAS_FICHA)[number]['chave']

export function lerAba(v: string | null | undefined): AbaFicha {
  return ABAS_FICHA.find((a) => a.chave === v)?.chave ?? 'cadastro'
}

export interface CabecalhoFicha {
  resumo: ResumoConta
  situacao: SituacaoConta
  criadaEm: number | null
  ehDaEquipe: boolean
  ehDoCatalogo: boolean
  semBanco: boolean
}

/** Os dados de cadastro que saem para a tela — sem os bancários, que têm permissão própria. */
export type CadastroSemBanco = Omit<Cadastro, 'dadosBancarios'>

export interface AbaCadastro {
  aba: 'cadastro'
  cadastro: CadastroSemBanco | null
  /** `undefined` = o papel não inclui `usuarios.dados_bancarios`; nem o dado sai do servidor. */
  dadosBancarios?: DadosBancarios | null
  aceites: AceiteDaConta[] | null
  aceiteAntigo: LegalBlockAcceptance | null
  identidade: IdentidadeResumo | null
  identidadeIndisponivel: string | null
  historicoSituacao: SituacaoConta[] | null
}

export interface FaturaNaFicha extends FaturaCustodia {
  situacao: StatusFatura
}

/** O plano de custódia da B2, lido pelo nome: o tipo entra no AppState quando a B2 chegar à `main`. */
export interface PlanoNaFicha {
  id: string
  modalidade: string
  quantidadeContratada: number
  valorTotalCents: Cents
  inicioCompetencia: string
  pagoAteCompetencia: string | null
  status: string
  formaPagamento: string | null
}

export interface AbaFinanceiro {
  aba: 'financeiro'
  saldo: Cents
  extrato: StatementRow[]
  totais: StatementTotals
  ledger: LedgerEntryGravado[] | null
  depositos: Deposit[]
  saques: Saque[]
  faturas: FaturaNaFicha[]
  planos: PlanoNaFicha[] | null
  recebimentos: RecebimentoDaConta[] | null
}

export interface AbaAcervo {
  aba: 'acervo'
  moedas: MoedaDoAcervo[]
}

export interface AbaLogistica {
  aba: 'logistica'
  envios: Envio[]
  retiradas: Retirada[]
  rastreios: Record<string, RastreioGravado>
}

export interface LoteDaConta {
  lotId: string
  tipoMoeda: string
  preco: Cents
  quantidade: number
  createdAt: number
  prioridadeEm: number | null
}

export interface AbaMercado {
  aba: 'mercado'
  lotes: LoteDaConta[]
  ordensDeCompra: BuyOrder[]
  negociacoes: Array<Trade & { lado: 'compra' | 'venda' }>
  historicoDaFila: EventoDaFilaDaConta[] | null
}

export interface AbaAtividade {
  aba: 'atividade'
  ultimoAcesso: number | null
  acessoAnterior: number | null
  uso: EventoDeUsoDaConta[] | null
  trilha: EntradaAuditoriaGravada[] | null
}

export interface AbaNotas {
  aba: 'notas'
  notas: NotaDoUsuario[] | null
  conversas: ConversaListada[] | null
}

export type ConteudoDaAba = AbaCadastro | AbaFinanceiro | AbaAcervo | AbaLogistica | AbaMercado | AbaAtividade | AbaNotas

export interface Ficha {
  cabecalho: CabecalhoFicha
  conteudo: ConteudoDaAba
}

function lotesDaConta(state: AppState, email: string): LoteDaConta[] {
  const mapa = new Map<string, LoteDaConta>()
  for (const o of state.sellOffers) {
    if (o.seller !== email) continue
    const prioridade = (o as typeof o & { prioridadeEm?: number }).prioridadeEm ?? null
    const lote = mapa.get(o.lotId)
    if (lote) lote.quantidade += 1
    else mapa.set(o.lotId, { lotId: o.lotId, tipoMoeda: o.tipoMoeda, preco: o.price, quantidade: 1, createdAt: o.createdAt, prioridadeEm: prioridade })
  }
  return [...mapa.values()].sort((a, b) => b.createdAt - a.createdAt)
}

async function conteudoDaAba(aba: AbaFicha, state: AppState, email: string, retiradas: Retirada[], membro: MembroAdmin, agora: number): Promise<ConteudoDaAba> {
  const u = state.users[email]
  switch (aba) {
    case 'cadastro': {
      const identidadePorta = portaDeIdentidadeDoAmbiente()
      let identidade: IdentidadeResumo | null = null
      let identidadeIndisponivel: string | null = null
      if (!identidadePorta.configurada) {
        identidadeIndisponivel = `Sem ${identidadePorta.faltando.join(' e ')} no ambiente: o painel não consulta o Supabase Auth.`
      } else {
        try {
          identidade = await identidadePorta.buscar(email)
        } catch (err) {
          identidadeIndisponivel = err instanceof Error ? err.message : 'Supabase Auth indisponível.'
        }
      }
      // Campo a campo, e não "tudo menos o bancário": um campo sensível acrescentado ao
      // cadastro depois não sai para a tela sem alguém decidir que ele sai.
      const c = u.cadastro
      const cadastro: CadastroSemBanco | null = c
        ? { cpf: c.cpf, nomeCompleto: c.nomeCompleto, dataNascimento: c.dataNascimento, telefone: c.telefone, endereco: c.endereco, completadoEm: c.completadoEm, confirmadoEm: c.confirmadoEm }
        : null
      const [aceites, historicoSituacao] = await Promise.all([opcional((tx) => aceitesDaConta(tx, email)), opcional((tx) => historicoDaSituacao(tx, email))])
      return {
        aba,
        cadastro,
        ...(temPermissao(membro, 'usuarios.dados_bancarios') ? { dadosBancarios: u.cadastro?.dadosBancarios ?? null } : {}),
        aceites,
        aceiteAntigo: u.settings?.legalAcceptance ?? null,
        identidade,
        identidadeIndisponivel,
        historicoSituacao,
      }
    }
    case 'financeiro': {
      const extrato = userStatement(state, email)
      const planos = ((state as AppState & { planosCustodia?: Array<PlanoNaFicha & { userEmail: string }> }).planosCustodia ?? null)
      const [ledger, recebimentos] = await Promise.all([
        opcional((tx) => listarLancamentos(tx, { userEmail: email, limite: LIMITE_LEDGER })),
        opcional((tx) => recebimentosDaConta(tx, email, LIMITE_RECEBIMENTOS)),
      ])
      return {
        aba,
        saldo: u.balance,
        extrato: extrato.slice(-LIMITE_EXTRATO).reverse(),
        totais: statementTotals(extrato),
        ledger: ledger ? [...ledger].reverse() : null,
        depositos: state.deposits.filter((d) => d.userEmail === email).reverse(),
        saques: (state.saques ?? []).filter((s) => s.userEmail === email).reverse(),
        faturas: (state.faturasCustodia ?? [])
          .filter((f) => f.userEmail === email)
          .map((f) => ({ ...f, situacao: verificarStatusFatura(f, agora) }))
          .reverse(),
        planos: planos
          ? planos
              .filter((p) => p.userEmail === email)
              .map((p) => ({
                id: p.id,
                modalidade: p.modalidade,
                quantidadeContratada: p.quantidadeContratada,
                valorTotalCents: p.valorTotalCents,
                inicioCompetencia: p.inicioCompetencia,
                pagoAteCompetencia: p.pagoAteCompetencia,
                status: p.status,
                formaPagamento: p.formaPagamento,
              }))
          : null,
        recebimentos,
      }
    }
    case 'acervo':
      return { aba, moedas: acervoDaConta(state, email, retiradas) }
    case 'logistica': {
      const rastreios = await rastreiosPorProtocolo().catch((err: unknown) => {
        console.error('[admin] rastreios indisponíveis na ficha:', err)
        return {} as Record<string, RastreioGravado>
      })
      const envios = state.envios.filter((e) => e.userEmail === email).reverse()
      const protocolos = new Set([...envios.map((e) => e.protocolo), ...retiradas.map((r) => r.id)])
      return {
        aba,
        envios,
        retiradas: [...retiradas].reverse(),
        rastreios: Object.fromEntries(Object.entries(rastreios).filter(([protocolo]) => protocolos.has(protocolo))),
      }
    }
    case 'mercado': {
      const historicoDaFila = await opcional((tx) => historicoDaFilaDaConta(tx, email, LIMITE_FILA))
      return {
        aba,
        lotes: lotesDaConta(state, email),
        ordensDeCompra: state.buyOrders.filter((b) => b.buyer === email),
        negociacoes: state.trades
          .filter((t) => t.buyer === email || t.seller === email)
          .map((t) => ({ ...t, lado: t.buyer === email ? ('compra' as const) : ('venda' as const) }))
          .reverse()
          .slice(0, 200),
        historicoDaFila: historicoDaFila,
      }
    }
    case 'atividade': {
      const [uso, trilha] = await Promise.all([opcional((tx) => usoDaConta(tx, email, LIMITE_USO)), opcional((tx) => trilhaDaConta(tx, email, LIMITE_TRILHA))])
      return { aba, ultimoAcesso: u.lastAccess ?? null, acessoAnterior: u.prevAccess ?? null, uso, trilha }
    }
    case 'notas': {
      const [notas, conversas] = await Promise.all([opcional((tx) => listarNotasDoUsuario(tx, email)), opcional((tx) => conversasDaConta(tx, email))])
      return { aba, notas, conversas }
    }
  }
}

/** `null` quando a conta não existe — a página responde com o "não encontrada". */
export async function carregarFicha(email: string, aba: AbaFicha, membro: MembroAdmin, agora: number = Date.now()): Promise<Ficha | null> {
  const state = await getState()
  if (!state.users[email]) return null
  const [retiradas, situacao, criacao, ehDaEquipe] = await Promise.all([
    repositorioRetiradas()
      .buscarPorUsuario(email)
      .catch((err: unknown) => {
        console.error('[admin] retiradas indisponíveis na ficha:', err)
        return [] as Retirada[]
      }),
    opcional((tx) => situacaoDaConta(tx, email)),
    opcional((tx) => datasDeCriacao(tx)),
    podeAbrirPainelAdmin(email),
  ])
  const resumo = resumirConta(state, email, retiradas, agora)
  if (!resumo) return null
  return {
    cabecalho: {
      resumo,
      situacao: situacao ?? CONTA_ATIVA,
      criadaEm: criacao?.[email] ?? null,
      ehDaEquipe,
      ehDoCatalogo: email in ACCOUNTS,
      semBanco: !bancoConfigurado(),
    },
    conteudo: await conteudoDaAba(aba, state, email, retiradas, membro, agora),
  }
}

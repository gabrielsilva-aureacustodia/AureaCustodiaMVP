/**
 * Leituras do painel administrativo em tabelas que NÃO são da frente C.
 *
 * Duas regras deste arquivo:
 *
 *  1. SÓ LEITURA. A trilha (`audit_log`) é da migration 003 e o histórico da fila
 *     (`ofertas_historico`) é da frente A. O painel lê; quem grava continua sendo o
 *     dono de cada tabela.
 *
 *  2. TABELA DE OUTRA FRENTE PODE AINDA NÃO EXISTIR. As três frentes entram na `main`
 *     em momentos diferentes, e o painel não pode cair porque a A2 ainda não chegou.
 *     Toda leitura desse tipo pergunta antes, com `to_regclass`, e devolve `null`
 *     quando a tabela não está lá — a tela mostra "disponível quando a A2 entrar".
 *     Quem chama roda cada leitura opcional numa transação própria: uma consulta que
 *     falha aborta a transação inteira no Postgres.
 */

import type { AcaoDaTrilha } from '@/domain/admin/uso'
import type { EntradaAuditoriaGravada } from '@/server/db/repositories/auditoria'

import { json, nomeDoSchema, num, type Consulta } from '../sql'

export async function tabelaExiste(tx: Consulta, tabela: string): Promise<boolean> {
  const S = nomeDoSchema()
  if (!/^[a-z_][a-z0-9_]*$/.test(tabela)) return false
  const { rows } = await tx.query<{ r: unknown }>(`SELECT to_regclass($1) AS r`, [`${S}.${tabela}`])
  return rows[0]?.r !== null && rows[0]?.r !== undefined
}

/* ---------- a trilha, filtrada para a tela ---------- */

export interface FiltroTrilha {
  /** Trecho do ator, sem diferenciar maiúsculas: 'gabriel' acha o e-mail inteiro. */
  atorContem?: string
  /** Começo da ação: 'admin.' traz tudo do painel; 'negociacao' traz as negociações. */
  acaoComeca?: string
  de?: number
  ate?: number
  limite: number
}

type LinhaTrilha = {
  id: unknown
  created_at: unknown
  ator: string
  acao: string
  entidade: string | null
  entidade_id: string | null
  usuarios_afetados: unknown
  detalhes: unknown
}

/** O `%` e o `_` do texto digitado viram literais: quem busca "_" não quer "qualquer caractere". */
function semCuringa(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/** Mais recente primeiro, como a trilha se lê. */
export async function listarTrilhaDoPainel(tx: Consulta, filtro: FiltroTrilha): Promise<EntradaAuditoriaGravada[]> {
  const S = nomeDoSchema()
  const condicoes: string[] = []
  const valores: unknown[] = []
  const param = (v: unknown): string => {
    valores.push(v)
    return `$${valores.length}`
  }
  if (filtro.atorContem) condicoes.push(`ator ILIKE ${param(`%${semCuringa(filtro.atorContem)}%`)}`)
  if (filtro.acaoComeca) condicoes.push(`acao LIKE ${param(`${semCuringa(filtro.acaoComeca)}%`)}`)
  if (filtro.de !== undefined) condicoes.push(`created_at >= ${param(filtro.de)}`)
  if (filtro.ate !== undefined) condicoes.push(`created_at < ${param(filtro.ate)}`)
  const where = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : ''
  const { rows } = await tx.query<LinhaTrilha>(
    `SELECT id, created_at, ator, acao, entidade, entidade_id, usuarios_afetados, detalhes
       FROM ${S}.audit_log${where} ORDER BY id DESC LIMIT ${param(filtro.limite)}`,
    valores,
  )
  return rows.map((r) => ({
    id: num(r.id),
    createdAt: num(r.created_at),
    ator: r.ator,
    acao: r.acao,
    entidade: r.entidade,
    entidadeId: r.entidade_id,
    usuariosAfetados: Array.isArray(r.usuarios_afetados) ? (r.usuarios_afetados as string[]) : [],
    detalhes: json<Record<string, unknown>>(r.detalhes) ?? {},
  }))
}

/** Só ator, ação e horário do período — o que o resumo de uso precisa, sem os detalhes. */
export async function listarAcoesDaTrilha(tx: Consulta, de: number, ate: number, limite: number): Promise<AcaoDaTrilha[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ created_at: unknown; ator: string; acao: string }>(
    `SELECT created_at, ator, acao FROM ${S}.audit_log
      WHERE created_at >= $1 AND created_at < $2
      ORDER BY id LIMIT $3`,
    [de, ate, limite],
  )
  return rows.map((r) => ({ createdAt: num(r.created_at), ator: r.ator, acao: r.acao }))
}

/* ---------- histórico da fila de ofertas (frente A, A2) ---------- */

export interface EventoDaFila {
  ofertaId: string
  lado: 'venda' | 'compra'
  tipoMoeda: string
  evento: string
  createdAt: number
}

/**
 * Publicações e execuções de `aurea.ofertas_historico`, a tabela que a A2 cria na
 * migration 015. `null` enquanto ela não existir neste banco.
 *
 * Lê desde `desde` e não só o período, porque o tempo até a execução precisa da
 * publicação, que pode ter acontecido antes do período escolhido.
 */
export async function lerHistoricoDaFila(tx: Consulta, desde: number, ate: number, limite: number): Promise<EventoDaFila[] | null> {
  if (!(await tabelaExiste(tx, 'ofertas_historico'))) return null
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ oferta_id: string; lado: string; tipo_moeda: string; evento: string; created_at: unknown }>(
    `SELECT oferta_id, lado, tipo_moeda, evento, created_at
       FROM ${S}.ofertas_historico
      WHERE evento IN ('publicada', 'executada') AND created_at >= $1 AND created_at < $2
      ORDER BY created_at
      LIMIT $3`,
    [desde, ate, limite],
  )
  return rows.map((r) => ({
    ofertaId: r.oferta_id,
    lado: r.lado === 'compra' ? 'compra' : 'venda',
    tipoMoeda: r.tipo_moeda,
    evento: r.evento,
    createdAt: num(r.created_at),
  }))
}

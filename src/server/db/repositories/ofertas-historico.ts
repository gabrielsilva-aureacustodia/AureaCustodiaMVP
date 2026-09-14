/**
 * Repositório de `aurea.ofertas_historico` — histórico append-only da fila do livro de ordens.
 *
 * Decisão F-3 (13/09/2026):
 * Registra o ciclo de vida das ofertas de compra e venda ('publicada', 'editada', 'cancelada', 'executada'),
 * permitindo auditoria detalhada de quem entrou na fila, quando, se perdeu a prioridade na edição e
 * por que uma ordem foi atendida antes de outra.
 *
 * APPEND-ONLY. Sem UPDATE nem DELETE.
 */

import { nomeDoSchema, num, type Consulta } from '../sql'

export type LadoOferta = 'venda' | 'compra'
export type EventoOferta = 'publicada' | 'editada' | 'cancelada' | 'executada'

export interface RegistroHistoricoOferta {
  createdAt: number
  lado: LadoOferta
  ofertaId: string
  lotId?: string | null
  conta: string
  tipoMoeda: string
  evento: EventoOferta
  precoAntes?: number | null
  precoDepois?: number | null
  qtdAntes?: number | null
  qtdDepois?: number | null
  prioridadeAntes?: number | null
  prioridadeDepois?: number | null
  perdeuAVez?: boolean
}

export interface RegistroHistoricoOfertaGravado extends RegistroHistoricoOferta {
  id: number
}

interface LinhaHistoricoOferta extends Record<string, unknown> {
  id: unknown
  created_at: unknown
  lado: string
  oferta_id: string
  lot_id: string | null
  conta: string
  tipo_moeda: string
  evento: string
  preco_antes: unknown
  preco_depois: unknown
  qtd_antes: unknown
  qtd_depois: unknown
  prioridade_antes: unknown
  prioridade_depois: unknown
  perdeu_a_vez: boolean
}

function paraRegistro(r: LinhaHistoricoOferta): RegistroHistoricoOfertaGravado {
  return {
    id: num(r.id),
    createdAt: num(r.created_at),
    lado: r.lado as LadoOferta,
    ofertaId: r.oferta_id,
    lotId: r.lot_id,
    conta: r.conta,
    tipoMoeda: r.tipo_moeda,
    evento: r.evento as EventoOferta,
    precoAntes: r.preco_antes !== null && r.preco_antes !== undefined ? num(r.preco_antes) : null,
    precoDepois: r.preco_depois !== null && r.preco_depois !== undefined ? num(r.preco_depois) : null,
    qtdAntes: r.qtd_antes !== null && r.qtd_antes !== undefined ? num(r.qtd_antes) : null,
    qtdDepois: r.qtd_depois !== null && r.qtd_depois !== undefined ? num(r.qtd_depois) : null,
    prioridadeAntes: r.prioridade_antes !== null && r.prioridade_antes !== undefined ? num(r.prioridade_antes) : null,
    prioridadeDepois: r.prioridade_depois !== null && r.prioridade_depois !== undefined ? num(r.prioridade_depois) : null,
    perdeuAVez: Boolean(r.perdeu_a_vez),
  }
}

/**
 * Insere registros em lote no histórico de ofertas.
 */
export async function inserirHistoricoOfertas(
  tx: Consulta,
  registros: readonly RegistroHistoricoOferta[],
): Promise<void> {
  if (registros.length === 0) return
  const S = nomeDoSchema()

  for (const reg of registros) {
    await tx.query(
      `INSERT INTO ${S}.ofertas_historico
         (created_at, lado, oferta_id, lot_id, conta, tipo_moeda, evento,
          preco_antes, preco_depois, qtd_antes, qtd_depois,
          prioridade_antes, prioridade_depois, perdeu_a_vez)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        reg.createdAt,
        reg.lado,
        reg.ofertaId,
        reg.lotId ?? null,
        reg.conta,
        reg.tipoMoeda,
        reg.evento,
        reg.precoAntes ?? null,
        reg.precoDepois ?? null,
        reg.qtdAntes ?? null,
        reg.qtdDepois ?? null,
        reg.prioridadeAntes ?? null,
        reg.prioridadeDepois ?? null,
        Boolean(reg.perdeuAVez),
      ],
    )
  }
}

/**
 * Lista o histórico de ofertas filtrando opcionalmente por ofertaId ou conta.
 */
export async function listarHistoricoOfertas(
  tx: Consulta,
  filtro?: { ofertaId?: string; conta?: string },
): Promise<RegistroHistoricoOfertaGravado[]> {
  const S = nomeDoSchema()
  const conds: string[] = []
  const params: unknown[] = []

  if (filtro?.ofertaId) {
    params.push(filtro.ofertaId)
    conds.push(`oferta_id = $${params.length}`)
  }
  if (filtro?.conta) {
    params.push(filtro.conta)
    conds.push(`conta = $${params.length}`)
  }

  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : ''
  const { rows } = await tx.query<LinhaHistoricoOferta>(
    `SELECT * FROM ${S}.ofertas_historico ${where} ORDER BY created_at ASC, id ASC`,
    params,
  )
  return rows.map(paraRegistro)
}

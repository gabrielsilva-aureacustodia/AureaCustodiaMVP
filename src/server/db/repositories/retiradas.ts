/**
 * Repositório de `aurea.retiradas` — solicitações de saída física de moedas (frente C).
 *
 * Módulo puro de banco sem server-only: os testes do PGlite importam daqui.
 * Toda operação recebe uma conexão `Consulta` (transacional).
 *
 * Regras do Bloco 10 e Bloco 13:
 *  - Tabela própria no schema aurea.
 *  - Endereço e histórico serializados em jsonb.
 *  - Valores e timestamps convertidos com segurança via `num` / `numOuNulo`.
 */

import type {
  EnderecoEntrega,
  EventoHistoricoRetirada,
  ModalidadeRetirada,
  Retirada,
  StatusRetirada,
} from '@/domain/types'

import { json, nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

type LinhaRetirada = {
  id: string
  coin_id: string
  recibo_codigo: string
  user_email: string
  modalidade: string
  status: string
  valor_taxa_cents: unknown
  endereco: unknown
  solicitado_em: unknown
  pago_em: unknown
  data_limite_d30: unknown
  codigo_rastreio: string | null
  historico: unknown
  created_at: unknown
  updated_at: unknown
}

function linhaParaRetirada(r: LinhaRetirada): Retirada {
  const end = json<EnderecoEntrega>(r.endereco) ?? (typeof r.endereco === 'object' && r.endereco !== null ? (r.endereco as EnderecoEntrega) : ({} as EnderecoEntrega))
  const hist = json<EventoHistoricoRetirada[]>(r.historico) ?? (Array.isArray(r.historico) ? (r.historico as EventoHistoricoRetirada[]) : [])

  return {
    id: r.id,
    coinId: r.coin_id,
    reciboCodigo: r.recibo_codigo,
    userEmail: r.user_email,
    modalidade: r.modalidade as ModalidadeRetirada,
    status: r.status as StatusRetirada,
    valorTaxaCents: num(r.valor_taxa_cents),
    endereco: end,
    solicitadoEm: num(r.solicitado_em),
    pagoEm: numOuNulo(r.pago_em) ?? undefined,
    dataLimiteD30: num(r.data_limite_d30),
    codigoRastreio: r.codigo_rastreio ?? undefined,
    historico: hist,
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
  }
}

export async function inserirRetirada(tx: Consulta, r: Retirada): Promise<void> {
  const S = nomeDoSchema()
  const agora = Date.now()
  await tx.query(
    `INSERT INTO ${S}.retiradas
       (id, coin_id, recibo_codigo, user_email, modalidade, status, valor_taxa_cents,
        endereco, solicitado_em, pago_em, data_limite_d30, codigo_rastreio, historico,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13::jsonb, $14, $15)`,
    [
      r.id,
      r.coinId,
      r.reciboCodigo,
      r.userEmail,
      r.modalidade,
      r.status,
      r.valorTaxaCents,
      JSON.stringify(r.endereco),
      r.solicitadoEm,
      r.pagoEm ?? null,
      r.dataLimiteD30,
      r.codigoRastreio ?? null,
      JSON.stringify(r.historico),
      r.createdAt ?? r.solicitadoEm ?? agora,
      r.updatedAt ?? agora,
    ],
  )
}

export async function atualizarRetirada(tx: Consulta, r: Retirada): Promise<void> {
  const S = nomeDoSchema()
  const agora = Date.now()
  await tx.query(
    `UPDATE ${S}.retiradas
        SET status = $2,
            pago_em = $3,
            codigo_rastreio = $4,
            historico = $5::jsonb,
            updated_at = $6
      WHERE id = $1`,
    [
      r.id,
      r.status,
      r.pagoEm ?? null,
      r.codigoRastreio ?? null,
      JSON.stringify(r.historico),
      r.updatedAt ?? agora,
    ],
  )
}

export async function buscarRetiradaPorId(tx: Consulta, id: string): Promise<Retirada | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRetirada>(
    `SELECT id, coin_id, recibo_codigo, user_email, modalidade, status, valor_taxa_cents,
            endereco, solicitado_em, pago_em, data_limite_d30, codigo_rastreio, historico,
            created_at, updated_at
       FROM ${S}.retiradas
      WHERE id = $1`,
    [id],
  )
  return rows.length ? linhaParaRetirada(rows[0]) : null
}

export async function buscarRetiradasPorUsuario(tx: Consulta, userEmail: string): Promise<Retirada[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRetirada>(
    `SELECT id, coin_id, recibo_codigo, user_email, modalidade, status, valor_taxa_cents,
            endereco, solicitado_em, pago_em, data_limite_d30, codigo_rastreio, historico,
            created_at, updated_at
       FROM ${S}.retiradas
      WHERE user_email = $1
      ORDER BY created_at DESC`,
    [userEmail],
  )
  return rows.map(linhaParaRetirada)
}

export async function buscarRetiradaPorCoinId(tx: Consulta, coinId: string): Promise<Retirada | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRetirada>(
    `SELECT id, coin_id, recibo_codigo, user_email, modalidade, status, valor_taxa_cents,
            endereco, solicitado_em, pago_em, data_limite_d30, codigo_rastreio, historico,
            created_at, updated_at
       FROM ${S}.retiradas
      WHERE coin_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [coinId],
  )
  return rows.length ? linhaParaRetirada(rows[0]) : null
}

export async function listarTodasRetiradas(tx: Consulta): Promise<Retirada[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRetirada>(
    `SELECT id, coin_id, recibo_codigo, user_email, modalidade, status, valor_taxa_cents,
            endereco, solicitado_em, pago_em, data_limite_d30, codigo_rastreio, historico,
            created_at, updated_at
       FROM ${S}.retiradas
      ORDER BY created_at DESC`,
  )
  return rows.map(linhaParaRetirada)
}

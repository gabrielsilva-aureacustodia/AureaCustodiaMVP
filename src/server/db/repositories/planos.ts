/**
 * Repositório de planos de custódia: `aurea.planos_custodia`.
 *
 * Persiste e consulta planos de custódia (Passo B2.2). São duas modalidades
 * desde 21/09/2026: mensal (R$ 3,00 por moeda por mês) e anual (R$ 24,00 por
 * moeda pelos 12 meses). Linhas antigas com modalidade 'bienal' continuam no
 * banco — o CHECK da migration 026 as aceita para não travar UPDATE, e nada
 * mais cria uma.
 *
 * `meses_contratados`, `origem` e `plano_origem_id` (migration 032) existem
 * para o plano que o sistema cria quando uma moeda em custódia é vendida: ele é
 * 'anual' mas cobre só os meses que faltavam.
 *
 * Opera dentro de transações de banco com `Consulta` (ou `tx`).
 */

import type {
  FormaPagamentoFatura,
  ModalidadePlanoCustodia,
  PlanoCustodia,
  StatusPlanoCustodia,
} from '@/domain/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

export type LinhaPlano = {
  id: string
  user_email: string
  protocolo_envio: string
  modalidade: string
  quantidade_contratada: unknown
  moeda_ids: string[] | string
  valor_por_moeda: unknown
  valor_total: unknown
  parcelas_max: unknown
  inicio_competencia: string
  pago_ate_competencia: string | null
  status: string
  forma_pagamento: string | null
  payment_intent_ref: string | null
  assinatura_id: string | null
  estornado: unknown
  criado_em: unknown
  atualizado_em: unknown
}

function linhaParaPlano(r: LinhaPlano): PlanoCustodia {
  let moedaIds: string[] = []
  if (Array.isArray(r.moeda_ids)) {
    moedaIds = r.moeda_ids
  } else if (typeof r.moeda_ids === 'string') {
    try {
      moedaIds = JSON.parse(r.moeda_ids)
    } catch {
      moedaIds = r.moeda_ids.replace(/^\{|\}$/g, '').split(',').filter(Boolean)
    }
  }

  return {
    id: r.id,
    userEmail: r.user_email,
    protocoloEnvio: r.protocolo_envio,
    modalidade: r.modalidade as ModalidadePlanoCustodia,
    quantidadeContratada: num(r.quantidade_contratada),
    moedaIds,
    valorPorMoedaCents: num(r.valor_por_moeda),
    valorTotalCents: num(r.valor_total),
    parcelasMax: num(r.parcelas_max) || 1,
    inicioCompetencia: r.inicio_competencia,
    pagoAteCompetencia: r.pago_ate_competencia ?? null,
    status: r.status as StatusPlanoCustodia,
    formaPagamento: (r.forma_pagamento as FormaPagamentoFatura) ?? null,
    paymentIntentRef: r.payment_intent_ref ?? null,
    assinaturaId: r.assinatura_id ?? null,
    estornadoCents: num(r.estornado),
    criadoEm: num(r.criado_em),
    atualizadoEm: num(r.atualizado_em),
  }
}

/** Carrega todos os planos de custódia ordenados por data de criação. */
export async function carregarPlanos(tx: Consulta): Promise<PlanoCustodia[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaPlano>(
    `SELECT id, user_email, protocolo_envio, modalidade, quantidade_contratada,
            moeda_ids, valor_por_moeda, valor_total, parcelas_max, inicio_competencia,
            pago_ate_competencia, status, forma_pagamento, payment_intent_ref,
            assinatura_id, estornado, criado_em, atualizado_em
       FROM ${S}.planos_custodia
      ORDER BY criado_em ASC`,
  )
  return rows.map(linhaParaPlano)
}

/** Carrega planos de um usuário específico ordenados pela criação decrescente. */
export async function buscarPlanosPorUsuario(
  tx: Consulta,
  userEmail: string,
): Promise<PlanoCustodia[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaPlano>(
    `SELECT id, user_email, protocolo_envio, modalidade, quantidade_contratada,
            moeda_ids, valor_por_moeda, valor_total, parcelas_max, inicio_competencia,
            pago_ate_competencia, status, forma_pagamento, payment_intent_ref,
            assinatura_id, estornado, criado_em, atualizado_em
       FROM ${S}.planos_custodia
      WHERE user_email = $1
      ORDER BY criado_em DESC`,
    [userEmail],
  )
  return rows.map(linhaParaPlano)
}

/** Busca plano pelo seu id único ('PLC-000001'). */
export async function buscarPlanoPorId(tx: Consulta, id: string): Promise<PlanoCustodia | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaPlano>(
    `SELECT id, user_email, protocolo_envio, modalidade, quantidade_contratada,
            moeda_ids, valor_por_moeda, valor_total, parcelas_max, inicio_competencia,
            pago_ate_competencia, status, forma_pagamento, payment_intent_ref,
            assinatura_id, estornado, criado_em, atualizado_em
       FROM ${S}.planos_custodia
      WHERE id = $1`,
    [id],
  )
  if (!rows.length) return null
  return linhaParaPlano(rows[0])
}

/** Busca plano vinculado a um protocolo de envio ('RO-ENV-0001'). */
export async function buscarPlanoPorProtocolo(
  tx: Consulta,
  protocolo: string,
): Promise<PlanoCustodia | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaPlano>(
    `SELECT id, user_email, protocolo_envio, modalidade, quantidade_contratada,
            moeda_ids, valor_por_moeda, valor_total, parcelas_max, inicio_competencia,
            pago_ate_competencia, status, forma_pagamento, payment_intent_ref,
            assinatura_id, estornado, criado_em, atualizado_em
       FROM ${S}.planos_custodia
      WHERE protocolo_envio = $1`,
    [protocolo],
  )
  if (!rows.length) return null
  return linhaParaPlano(rows[0])
}

/** Insere um novo plano de custódia. */
export async function inserirPlano(tx: Consulta, p: PlanoCustodia): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.planos_custodia (
       id, user_email, protocolo_envio, modalidade, quantidade_contratada,
       moeda_ids, valor_por_moeda, valor_total, parcelas_max, inicio_competencia,
       pago_ate_competencia, status, forma_pagamento, payment_intent_ref,
       assinatura_id, estornado, criado_em, atualizado_em
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      p.id,
      p.userEmail,
      p.protocoloEnvio,
      p.modalidade,
      p.quantidadeContratada,
      p.moedaIds,
      p.valorPorMoedaCents,
      p.valorTotalCents,
      p.parcelasMax || 1,
      p.inicioCompetencia,
      p.pagoAteCompetencia ?? null,
      p.status,
      p.formaPagamento ?? null,
      p.paymentIntentRef ?? null,
      p.assinaturaId ?? null,
      p.estornadoCents || 0,
      p.criadoEm,
      p.atualizadoEm,
    ],
  )
}

/**
 * Atualiza campos mutáveis de um plano de custódia.
 */
export async function atualizarPlano(tx: Consulta, p: PlanoCustodia): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.planos_custodia SET
       quantidade_contratada = $1,
       moeda_ids = $2,
       pago_ate_competencia = $3,
       status = $4,
       forma_pagamento = $5,
       payment_intent_ref = $6,
       assinatura_id = $7,
       estornado = $8,
       atualizado_em = $9,
       modalidade = $11,
       valor_por_moeda = $12,
       valor_total = $13,
       parcelas_max = $14,
       inicio_competencia = $15
     WHERE id = $10`,
    [
      p.quantidadeContratada,
      p.moedaIds,
      p.pagoAteCompetencia ?? null,
      p.status,
      p.formaPagamento ?? null,
      p.paymentIntentRef ?? null,
      p.assinaturaId ?? null,
      p.estornadoCents || 0,
      p.atualizadoEm,
      p.id,
      p.modalidade,
      p.valorPorMoedaCents,
      p.valorTotalCents,
      p.parcelasMax || 1,
      p.inicioCompetencia,
    ],
  )
}

/** Gera o próximo ID sequencial de plano de custódia ('PLC-000001'). */
export async function proximoIdPlano(tx: Consulta): Promise<string> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ plano_custodia: unknown }>(
    `UPDATE ${S}.seq
        SET plano_custodia = COALESCE(plano_custodia, 0) + 1
      WHERE id = 1
  RETURNING plano_custodia`,
  )
  const n = num(rows[0]?.plano_custodia)
  return `PLC-${String(n).padStart(6, '0')}`
}

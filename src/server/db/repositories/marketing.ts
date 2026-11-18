/**
 * Repositório dos KPIs de aquisição e atendimento: `aurea.marketing_gastos` (migration 057) e a leitura
 * dos casos de atendimento (`aurea.casos`, 048) no formato que `montarKpisDeAquisicao` pede.
 *
 * SÓ SQL. A validação mora em src/domain/kpis.ts (`validarGastoDeMarketing`) e a trilha, em
 * src/server/admin/marketing.ts. Nada aqui apaga linha: o gasto errado se CANCELA (e fica visível), como toda
 * trilha do projeto.
 *
 * Os casos não ganharam função em `casos.ts` de propósito: aquele arquivo é da frente de atendimento, e este
 * leitor só devolve números para o painel de resultados — nunca o texto de um relato.
 */

import type { CasoParaKpi, CanalDeMarketing, GastoDeMarketing } from '@/domain/kpis'
import type { EstadoDoCaso } from '@/domain/atendimento/casos'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

export interface GastoGravado extends GastoDeMarketing {
  observacao: string
  criadoPor: string
  criadoEm: number
  canceladoEm: number | null
  canceladoPor: string | null
  motivoCancelamento: string | null
}

type Linha = Record<string, unknown>

const COLUNAS = `id, canal, periodo_de, periodo_ate, valor_cents, visitas, observacao, criado_por, criado_em,
  cancelado_em, cancelado_por, motivo_cancelamento`

function gasto(r: Linha): GastoGravado {
  return {
    id: num(r.id),
    canal: r.canal as CanalDeMarketing,
    de: String(r.periodo_de),
    ate: String(r.periodo_ate),
    valor: num(r.valor_cents),
    visitas: numOuNulo(r.visitas),
    observacao: String(r.observacao ?? ''),
    criadoPor: String(r.criado_por),
    criadoEm: num(r.criado_em),
    canceladoEm: numOuNulo(r.cancelado_em),
    canceladoPor: (r.cancelado_por as string | null) ?? null,
    motivoCancelamento: (r.motivo_cancelamento as string | null) ?? null,
  }
}

export async function inserirGasto(
  tx: Consulta,
  g: { canal: string; de: string; ate: string; valor: number; visitas: number | null; observacao: string; criadoPor: string; agora: number },
): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.marketing_gastos (canal, periodo_de, periodo_ate, valor_cents, visitas, observacao, criado_por, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [g.canal, g.de, g.ate, g.valor, g.visitas, g.observacao, g.criadoPor, g.agora],
  )
  return num(rows[0]!.id)
}

/** Cancela uma entrada ainda vigente e devolve como ela estava. `null` = não existe ou já estava cancelada. */
export async function cancelarGasto(tx: Consulta, id: number, por: string, motivo: string, agora: number): Promise<GastoGravado | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<Linha>(
    `UPDATE ${S}.marketing_gastos
        SET cancelado_em = $2, cancelado_por = $3, motivo_cancelamento = $4
      WHERE id = $1 AND cancelado_em IS NULL
      RETURNING ${COLUNAS}`,
    [id, agora, por, motivo],
  )
  return rows[0] ? gasto(rows[0]) : null
}

/** As entradas para a tela: as mais recentes primeiro, com as canceladas (a tela as risca). */
export async function listarGastos(tx: Consulta, limite: number): Promise<GastoGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<Linha>(`SELECT ${COLUNAS} FROM ${S}.marketing_gastos ORDER BY periodo_de DESC, id DESC LIMIT $1`, [limite])
  return rows.map(gasto)
}

/**
 * Casos de atendimento no formato dos KPIs: os que ainda esperam alguém, os criados ou fechados no intervalo, e a
 * 1ª resposta da equipe de cada um (a mensagem mais antiga de autor `equipe`). `de`/`ate` em ms, `ate` exclusivo.
 */
export async function lerCasosParaKpi(tx: Consulta, de: number, ate: number, limite: number): Promise<CasoParaKpi[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<Linha>(
    `SELECT c.estado, c.criado_em, c.fechado_em,
            (SELECT min(m.criado_em) FROM ${S}.casos_mensagens m WHERE m.caso_id = c.id AND m.autor = 'equipe') AS primeira_resposta
       FROM ${S}.casos c
      WHERE c.estado IN ('aberto', 'em_andamento')
         OR (c.criado_em >= $1 AND c.criado_em < $2)
         OR (c.fechado_em >= $1 AND c.fechado_em < $2)
      ORDER BY c.id DESC
      LIMIT $3`,
    [de, ate, limite],
  )
  return rows.map((r) => ({
    estado: r.estado as EstadoDoCaso,
    criadoEm: num(r.criado_em),
    fechadoEm: numOuNulo(r.fechado_em),
    primeiraRespostaDaEquipeEm: numOuNulo(r.primeira_resposta),
  }))
}

/**
 * Repositório do controle financeiro (migration 046): setores, lançamentos recorrentes e as
 * leituras que a tela de controle junta — lançamentos manuais com setor, tarifas do Mercado Pago
 * por meio de pagamento e notas fiscais do período.
 *
 * Mesmo desenho de `contabil.ts`: SQL parametrizado pelo `Consulta`, sem `server-only`, testável
 * no PGlite. A ocorrência de um recorrente é gravada em `lancamentos_manuais` (a tabela que a DRE
 * lê), com `recorrente_id` + `competencia`, e o índice único parcial da 046 garante que a mesma
 * ocorrência nunca é lançada duas vezes.
 */

import type { Periodicidade, Recorrente, TipoRecorrente } from '@/domain/financeiro/controle'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

/* ---------- setores ---------- */

export interface Setor {
  id: number
  nome: string
  ativo: boolean
  ord: number
}

export async function listarSetores(tx: Consulta): Promise<Setor[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown; nome: string; ativo: boolean; ord: unknown }>(
    `SELECT id, nome, ativo, ord FROM ${S}.setores_financeiros ORDER BY ativo DESC, ord, lower(nome)`,
  )
  return rows.map((r) => ({ id: num(r.id), nome: r.nome, ativo: r.ativo, ord: num(r.ord) }))
}

/** Cria; devolve null quando já existe um setor com o mesmo nome (sem diferenciar maiúsculas). */
export async function criarSetor(tx: Consulta, nome: string, ator: string, agora: number): Promise<number | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.setores_financeiros (nome, ord, criado_por, created_at)
     VALUES ($1, (SELECT COALESCE(MAX(ord), 0) + 1 FROM ${S}.setores_financeiros), $2, $3)
     ON CONFLICT DO NOTHING RETURNING id`,
    [nome, ator, agora],
  )
  return rows[0] ? num(rows[0].id) : null
}

export async function alterarSetor(tx: Consulta, id: number, dados: { nome: string; ativo: boolean }, ator: string, agora: number): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `UPDATE ${S}.setores_financeiros SET nome = $2, ativo = $3, atualizado_por = $4, atualizado_em = $5 WHERE id = $1 RETURNING id`,
    [id, dados.nome, dados.ativo, ator, agora],
  )
  return rows.length > 0
}

export async function nomeDeSetorEmUso(tx: Consulta, nome: string, exceto: number | null): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `SELECT id FROM ${S}.setores_financeiros WHERE lower(nome) = lower($1) AND ($2::bigint IS NULL OR id <> $2)`,
    [nome, exceto],
  )
  return rows.length > 0
}

/* ---------- recorrentes ---------- */

type LinhaRecorrente = {
  id: unknown
  tipo: string
  descricao: string
  fornecedor: string | null
  conta_codigo: string
  setor_id: unknown
  valor: unknown
  periodicidade: string
  inicio: string
  fim: string | null
  ativo: boolean
  observacao: string | null
  lancados: unknown
  ultimo_lancado: string | null
}

export interface RecorrenteGravado extends Recorrente {
  /** Quantas ocorrências já viraram lançamento contábil. */
  lancados: number
  /** Dia ('AAAA-MM-DD') da última ocorrência lançada. */
  ultimoLancado: string | null
}

export async function listarRecorrentes(tx: Consulta): Promise<RecorrenteGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaRecorrente>(
    `SELECT r.id, r.tipo, r.descricao, r.fornecedor, r.conta_codigo, r.setor_id, r.valor, r.periodicidade,
            r.inicio, r.fim, r.ativo, r.observacao,
            (SELECT COUNT(*) FROM ${S}.lancamentos_manuais m WHERE m.recorrente_id = r.id) AS lancados,
            (SELECT MAX(m.competencia) FROM ${S}.lancamentos_manuais m WHERE m.recorrente_id = r.id) AS ultimo_lancado
       FROM ${S}.lancamentos_recorrentes r
      ORDER BY r.ativo DESC, r.tipo, lower(r.descricao)`,
  )
  return rows.map((r) => ({
    id: num(r.id),
    tipo: r.tipo as TipoRecorrente,
    descricao: r.descricao,
    fornecedor: r.fornecedor,
    contaCodigo: r.conta_codigo,
    setorId: numOuNulo(r.setor_id),
    valor: num(r.valor),
    periodicidade: r.periodicidade as Periodicidade,
    inicio: r.inicio,
    fim: r.fim,
    ativo: r.ativo,
    observacao: r.observacao,
    lancados: num(r.lancados),
    ultimoLancado: r.ultimo_lancado,
  }))
}

export type DadosRecorrente = Omit<Recorrente, 'id' | 'ativo'>

export async function inserirRecorrente(tx: Consulta, d: DadosRecorrente, ator: string, agora: number): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.lancamentos_recorrentes
       (tipo, descricao, fornecedor, conta_codigo, setor_id, valor, periodicidade, inicio, fim, observacao, criado_por, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [d.tipo, d.descricao, d.fornecedor, d.contaCodigo, d.setorId, d.valor, d.periodicidade, d.inicio, d.fim, d.observacao, ator, agora],
  )
  return num(rows[0].id)
}

export async function atualizarRecorrente(tx: Consulta, id: number, d: DadosRecorrente, ator: string, agora: number): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `UPDATE ${S}.lancamentos_recorrentes
        SET tipo = $2, descricao = $3, fornecedor = $4, conta_codigo = $5, setor_id = $6, valor = $7,
            periodicidade = $8, inicio = $9, fim = $10, observacao = $11, atualizado_por = $12, atualizado_em = $13
      WHERE id = $1 RETURNING id`,
    [id, d.tipo, d.descricao, d.fornecedor, d.contaCodigo, d.setorId, d.valor, d.periodicidade, d.inicio, d.fim, d.observacao, ator, agora],
  )
  return rows.length > 0
}

export async function definirRecorrenteAtivo(tx: Consulta, id: number, ativo: boolean, ator: string, agora: number): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `UPDATE ${S}.lancamentos_recorrentes SET ativo = $2, atualizado_por = $3, atualizado_em = $4 WHERE id = $1 RETURNING id`,
    [id, ativo, ator, agora],
  )
  return rows.length > 0
}

/** As ocorrências (`competencia`) de um recorrente que já viraram lançamento. */
export async function competenciasLancadas(tx: Consulta, recorrenteId: number): Promise<Set<string>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ competencia: string }>(
    `SELECT competencia FROM ${S}.lancamentos_manuais WHERE recorrente_id = $1`,
    [recorrenteId],
  )
  return new Set(rows.map((r) => r.competencia))
}

/**
 * Lança uma ocorrência na tabela que a DRE lê. `ON CONFLICT DO NOTHING` sobre o índice parcial
 * da 046: se o job e o botão do painel correrem juntos, só um grava. Devolve o id, ou null quando
 * a ocorrência já existia.
 */
export async function lancarOcorrencia(
  tx: Consulta,
  o: { recorrenteId: number; competencia: string; data: number; contaCodigo: string; descricao: string; valor: number; setorId: number | null; criadoPor: string },
  agora: number,
): Promise<number | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.lancamentos_manuais (data, conta_codigo, descricao, valor, criado_por, created_at, recorrente_id, competencia, setor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (recorrente_id, competencia) WHERE recorrente_id IS NOT NULL DO NOTHING
     RETURNING id`,
    [o.data, o.contaCodigo, o.descricao, o.valor, o.criadoPor, agora, o.recorrenteId, o.competencia, o.setorId],
  )
  return rows[0] ? num(rows[0].id) : null
}

/* ---------- leituras da tela de controle ---------- */

export interface LancamentoDoControle {
  id: number
  data: number
  contaCodigo: string
  descricao: string
  valor: number
  setorId: number | null
  recorrenteId: number | null
  criadoPor: string
}

/**
 * Os lançamentos manuais que VALEM no período (sem estornos nem estornados — mesma regra da DRE),
 * com o setor. O setor vem do próprio lançamento ou, se ele foi gerado antes de o setor existir,
 * do recorrente que o gerou.
 */
export async function lancamentosValidosDoPeriodo(tx: Consulta, inicio: number, fim: number): Promise<LancamentoDoControle[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{
    id: unknown
    data: unknown
    conta_codigo: string
    descricao: string
    valor: unknown
    setor_id: unknown
    recorrente_id: unknown
    criado_por: string
  }>(
    `SELECT m.id, m.data, m.conta_codigo, m.descricao, m.valor,
            COALESCE(m.setor_id, r.setor_id) AS setor_id, m.recorrente_id, m.criado_por
       FROM ${S}.lancamentos_manuais m
       LEFT JOIN ${S}.lancamentos_recorrentes r ON r.id = m.recorrente_id
      WHERE m.data >= $1 AND m.data < $2
        AND m.estorna_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM ${S}.lancamentos_manuais e WHERE e.estorna_id = m.id)
      ORDER BY m.data DESC, m.id DESC`,
    [inicio, fim],
  )
  return rows.map((r) => ({
    id: num(r.id),
    data: num(r.data),
    contaCodigo: r.conta_codigo,
    descricao: r.descricao,
    valor: num(r.valor),
    setorId: numOuNulo(r.setor_id),
    recorrenteId: numOuNulo(r.recorrente_id),
    criadoPor: r.criado_por,
  }))
}

export interface TarifasPorMeio {
  metodo: string
  pagamentos: number
  bruto: number
  tarifa: number
  liquido: number
}

/** As tarifas do Mercado Pago gravadas pela conciliação (`recebimentos_gateway`), por meio de pagamento. */
export async function tarifasDoGatewayPorMeio(tx: Consulta, inicio: number, fim: number): Promise<TarifasPorMeio[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ metodo: string; pagamentos: unknown; bruto: unknown; tarifa: unknown; liquido: unknown }>(
    `SELECT metodo, COUNT(*) AS pagamentos, SUM(valor_bruto) AS bruto, SUM(tarifa_gateway) AS tarifa, SUM(valor_liquido) AS liquido
       FROM ${S}.recebimentos_gateway
      WHERE aprovado_em >= $1 AND aprovado_em < $2
      GROUP BY metodo ORDER BY SUM(tarifa_gateway) DESC`,
    [inicio, fim],
  )
  return rows.map((r) => ({ metodo: r.metodo, pagamentos: num(r.pagamentos), bruto: num(r.bruto), tarifa: num(r.tarifa), liquido: num(r.liquido) }))
}

export interface NotasDoPeriodo {
  servico: string
  status: string
  notas: number
  valor: number
}

/** NFS-e do período (pelo dia do fato), por serviço e situação — só leitura, para o painel de controle. */
export async function notasDoPeriodo(tx: Consulta, inicio: number, fim: number): Promise<NotasDoPeriodo[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ servico: string; status: string; notas: unknown; valor: unknown }>(
    `SELECT servico, status, COUNT(*) AS notas, SUM(valor) AS valor
       FROM ${S}.nfse_emissoes
      WHERE ocorrido_em >= $1 AND ocorrido_em < $2
      GROUP BY servico, status`,
    [inicio, fim],
  )
  return rows.map((r) => ({ servico: r.servico, status: r.status, notas: num(r.notas), valor: num(r.valor) }))
}

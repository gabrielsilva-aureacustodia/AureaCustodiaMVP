/**
 * Repositório de `aurea.nfse_emissoes` e `aurea.nfse_numeracao` — a fila das notas fiscais.
 *
 * O ciclo de uma linha: `pendente` (nasce junto com a negociação ou a fatura paga) → `processando`
 * (reivindicada por um envio, com número de DPS reservado) → `autorizada` | `rejeitada` | `erro`.
 * `erro` é falha transitória (rede, Sefin fora do ar) e volta para a fila; `rejeitada` é recusa de
 * regra (cadastro incompleto, E0187…) e volta só quando alguém manda reprocessar, ou na rodada diária
 * até `TENTATIVAS_AUTOMATICAS`.
 *
 * `reivindicar` usa `FOR UPDATE SKIP LOCKED`: dois envios simultâneos (o `after()` de uma negociação
 * e o cron) nunca pegam a mesma linha — o segundo pula a que está travada.
 */

import type { PedidoNfse } from '@/domain/nfse/pedidos'
import type { ServicoNfse } from '@/domain/nfse/codigos'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

export type StatusNfse = 'pendente' | 'processando' | 'autorizada' | 'rejeitada' | 'erro' | 'cancelada'
export type AmbienteGravado = 'producao' | 'restrita'

export interface ErroNfse {
  codigo: string
  descricao: string
  complemento?: string
}

export interface EmissaoNfse {
  id: number
  chave: string
  servico: ServicoNfse
  refFato: string
  tomadorEmail: string
  valorCents: number
  ocorridoEm: number
  competencia: string
  descricao: string
  quantidadeMoedas: number
  status: StatusNfse
  ambiente: AmbienteGravado | null
  serie: number | null
  nDps: number | null
  idDps: string | null
  chaveAcesso: string | null
  numeroNfse: string | null
  erros: ErroNfse[] | null
  tentativas: number
  criadoEm: number
  atualizadoEm: number
  autorizadaEm: number | null
}

/** Rejeitada volta sozinha para a fila na rodada diária até este número de tentativas. */
export const TENTATIVAS_AUTOMATICAS = 5
/** Linha "processando" há mais que isto é de um envio que morreu no meio: volta para a fila. */
const PROCESSANDO_ABANDONADA_MS = 10 * 60_000

const COLUNAS = `id, chave, servico, ref_fato, tomador_email, valor, ocorrido_em, competencia, descricao, quantidade_moedas,
  status, ambiente, serie, n_dps, id_dps, chave_acesso, numero_nfse, erros, tentativas, criado_em, atualizado_em, autorizada_em`

function errosDe(v: unknown): ErroNfse[] | null {
  if (v === null || v === undefined) return null
  const lista = typeof v === 'string' ? (JSON.parse(v) as unknown) : v
  return Array.isArray(lista) ? (lista as ErroNfse[]) : null
}

function paraEmissao(r: Record<string, unknown>): EmissaoNfse {
  return {
    id: num(r.id),
    chave: String(r.chave),
    servico: r.servico as ServicoNfse,
    refFato: String(r.ref_fato),
    tomadorEmail: String(r.tomador_email),
    valorCents: num(r.valor),
    ocorridoEm: num(r.ocorrido_em),
    competencia: String(r.competencia),
    descricao: String(r.descricao),
    quantidadeMoedas: num(r.quantidade_moedas),
    status: r.status as StatusNfse,
    ambiente: (r.ambiente as AmbienteGravado | null) ?? null,
    serie: numOuNulo(r.serie),
    nDps: numOuNulo(r.n_dps),
    idDps: (r.id_dps as string | null) ?? null,
    chaveAcesso: (r.chave_acesso as string | null) ?? null,
    numeroNfse: (r.numero_nfse as string | null) ?? null,
    erros: errosDe(r.erros),
    tentativas: num(r.tentativas),
    criadoEm: num(r.criado_em),
    atualizadoEm: num(r.atualizado_em),
    autorizadaEm: numOuNulo(r.autorizada_em),
  }
}

export function pedidoDaEmissao(e: EmissaoNfse): PedidoNfse {
  return {
    chave: e.chave,
    servico: e.servico,
    refFato: e.refFato,
    tomadorEmail: e.tomadorEmail,
    valorCents: e.valorCents,
    ocorridoEm: e.ocorridoEm,
    competencia: e.competencia,
    descricao: e.descricao,
    quantidadeMoedas: e.quantidadeMoedas,
  }
}

/** Grava os pedidos novos. A chave única faz a mesma mutação derivada duas vezes não pedir duas notas. */
export async function inserirPedidosNfse(tx: Consulta, pedidos: readonly PedidoNfse[], agora: number): Promise<number> {
  const S = nomeDoSchema()
  let inseridos = 0
  for (const p of pedidos) {
    const { rows } = await tx.query(
      `INSERT INTO ${S}.nfse_emissoes
         (chave, servico, ref_fato, tomador_email, valor, ocorrido_em, competencia, descricao, quantidade_moedas, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       ON CONFLICT (chave) DO NOTHING
       RETURNING id`,
      [p.chave, p.servico, p.refFato, p.tomadorEmail, p.valorCents, p.ocorridoEm, p.competencia, p.descricao, p.quantidadeMoedas, agora],
    )
    inseridos += rows.length
  }
  return inseridos
}

/**
 * Pega até `limite` linhas para enviar e as marca `processando`, tudo na transação de quem chama.
 *
 * Entram: pendentes; erros transitórios; "processando" abandonadas; rejeitadas ainda dentro das
 * tentativas automáticas (só quando `incluirRejeitadas`, que é a rodada diária); e — quando o envio é
 * em PRODUÇÃO — as autorizadas só na produção restrita, que eram nota de teste e precisam da de verdade.
 */
export async function reivindicarParaEnvio(
  tx: Consulta,
  opcoes: { limite: number; agora: number; ambiente: AmbienteGravado; incluirRejeitadas: boolean },
): Promise<EmissaoNfse[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query(
    `SELECT ${COLUNAS} FROM ${S}.nfse_emissoes
      WHERE status IN ('pendente', 'erro')
         OR (status = 'processando' AND atualizado_em < $2)
         OR ($3 AND status = 'rejeitada' AND tentativas < $4)
         OR ($5 = 'producao' AND status = 'autorizada' AND ambiente = 'restrita')
      ORDER BY ocorrido_em, id
      LIMIT $1
      FOR UPDATE SKIP LOCKED`,
    [opcoes.limite, opcoes.agora - PROCESSANDO_ABANDONADA_MS, opcoes.incluirRejeitadas, TENTATIVAS_AUTOMATICAS, opcoes.ambiente],
  )
  const emissoes = rows.map(paraEmissao)
  if (emissoes.length) {
    await tx.query(`UPDATE ${S}.nfse_emissoes SET status = 'processando', atualizado_em = $2 WHERE id = ANY($1::bigint[])`, [
      emissoes.map((e) => e.id),
      opcoes.agora,
    ])
  }
  return emissoes
}

/** O próximo número de DPS do ambiente e da série, com a linha travada até o commit. */
export async function reservarNumeroDps(tx: Consulta, ambiente: AmbienteGravado, serie: number): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ ultimo: unknown }>(
    `INSERT INTO ${S}.nfse_numeracao (ambiente, serie, ultimo) VALUES ($1, $2, 1)
     ON CONFLICT (ambiente, serie) DO UPDATE SET ultimo = ${S}.nfse_numeracao.ultimo + 1
     RETURNING ultimo`,
    [ambiente, serie],
  )
  return num(rows[0]?.ultimo)
}

/** Antes de ir à Sefin: o número reservado e o XML assinado ficam gravados (é o que permite conferir depois de um timeout). */
export async function gravarDpsPreparada(
  tx: Consulta,
  id: number,
  dados: { ambiente: AmbienteGravado; serie: number; nDps: number; idDps: string; xmlDps: string; agora: number },
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.nfse_emissoes
        SET ambiente = $2, serie = $3, n_dps = $4, id_dps = $5, xml_dps = $6, atualizado_em = $7
      WHERE id = $1`,
    [id, dados.ambiente, dados.serie, dados.nDps, dados.idDps, dados.xmlDps, dados.agora],
  )
}

export async function gravarAutorizada(
  tx: Consulta,
  id: number,
  dados: { chaveAcesso: string; numeroNfse: string | null; xmlNfse: string; agora: number },
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.nfse_emissoes
        SET status = 'autorizada', chave_acesso = $2, numero_nfse = $3, xml_nfse = $4, erros = NULL,
            tentativas = tentativas + 1, autorizada_em = $5, atualizado_em = $5
      WHERE id = $1`,
    [id, dados.chaveAcesso, dados.numeroNfse, dados.xmlNfse, dados.agora],
  )
}

export async function gravarFalha(
  tx: Consulta,
  id: number,
  dados: { status: 'rejeitada' | 'erro'; erros: ErroNfse[]; agora: number },
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.nfse_emissoes
        SET status = $2, erros = $3::jsonb, tentativas = tentativas + 1, atualizado_em = $4
      WHERE id = $1`,
    [id, dados.status, JSON.stringify(dados.erros), dados.agora],
  )
}

/** Devolve rejeitadas e erros à fila, zerando as tentativas — o botão "reprocessar" do painel. */
export async function reabrirParaEnvio(tx: Consulta, ids: readonly number[] | 'todas', agora: number): Promise<number> {
  const S = nomeDoSchema()
  const { rows } =
    ids === 'todas'
      ? await tx.query(
          `UPDATE ${S}.nfse_emissoes SET status = 'pendente', tentativas = 0, atualizado_em = $1
            WHERE status IN ('rejeitada', 'erro') RETURNING id`,
          [agora],
        )
      : await tx.query(
          `UPDATE ${S}.nfse_emissoes SET status = 'pendente', tentativas = 0, atualizado_em = $2
            WHERE id = ANY($1::bigint[]) AND status IN ('rejeitada', 'erro') RETURNING id`,
          [ids, agora],
        )
  return rows.length
}

export interface FiltroEmissoes {
  status?: StatusNfse | null
  /** Busca simples em e-mail do tomador, referência do fato ou número da nota. */
  busca?: string | null
  limite?: number
}

export async function listarEmissoes(tx: Consulta, filtro: FiltroEmissoes = {}): Promise<EmissaoNfse[]> {
  const S = nomeDoSchema()
  const busca = filtro.busca?.trim() ? `%${filtro.busca.trim().toLowerCase()}%` : null
  const { rows } = await tx.query(
    `SELECT ${COLUNAS} FROM ${S}.nfse_emissoes
      WHERE ($1::text IS NULL OR status = $1)
        AND ($2::text IS NULL OR lower(tomador_email) LIKE $2 OR lower(ref_fato) LIKE $2 OR coalesce(numero_nfse, '') LIKE $2)
      ORDER BY ocorrido_em DESC, id DESC
      LIMIT $3`,
    [filtro.status ?? null, busca, Math.min(filtro.limite ?? 200, 1000)],
  )
  return rows.map(paraEmissao)
}

export async function contarPorStatus(tx: Consulta): Promise<Record<StatusNfse, number>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ status: string; n: unknown }>(`SELECT status, count(*) AS n FROM ${S}.nfse_emissoes GROUP BY status`)
  const base: Record<StatusNfse, number> = { pendente: 0, processando: 0, autorizada: 0, rejeitada: 0, erro: 0, cancelada: 0 }
  for (const r of rows) base[r.status as StatusNfse] = num(r.n)
  return base
}

/** O XML autorizado de uma nota, para download no painel. */
export async function xmlDaNfse(tx: Consulta, id: number): Promise<{ chaveAcesso: string | null; xml: string | null } | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ chave_acesso: string | null; xml_nfse: string | null }>(
    `SELECT chave_acesso, xml_nfse FROM ${S}.nfse_emissoes WHERE id = $1`,
    [id],
  )
  return rows[0] ? { chaveAcesso: rows[0].chave_acesso, xml: rows[0].xml_nfse } : null
}

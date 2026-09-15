/**
 * Repositório da configuração do site (migration 024, frente C, C3): `aurea.config_plataforma`,
 * `aurea.config_historico` e `aurea.tipos_moeda`.
 *
 * SÓ SQL. `config_historico` é APPEND-ONLY — aqui só existe INSERT e SELECT nela. `config_plataforma`
 * guarda o valor vigente de cada chave (upsert); `tipos_moeda` é catálogo e se edita no lugar, com o
 * antes e o depois indo para o histórico e para `audit_log` na mesma transação, pelo serviço.
 */

import type { TipoMoedaGravado, TipoMoedaValidado } from '@/domain/admin/catalogo'
import type { TipoConfig, ValorConfig } from '@/domain/admin/configuracao'

import { nomeDoSchema, num, type Consulta } from '../sql'

/** Texto JSON vindo de `coluna::text` → valor. `null` do SQL continua `null`. */
function lerJson(texto: string | null): unknown {
  return texto === null || texto === undefined ? null : JSON.parse(texto)
}

/* ---------- valores ---------- */

export interface ConfigGravada {
  chave: string
  valor: unknown
  atualizadoEm: number
  atualizadoPor: string
}

export async function lerConfiguracao(tx: Consulta): Promise<Record<string, ConfigGravada>> {
  const S = nomeDoSchema()
  // `valor::text` e JSON.parse aqui, sempre: o driver devolve jsonb já convertido, e um valor que é
  // texto ("14/09/2026") chegaria como string sem aspas — indistinguível de JSON cru ainda por ler.
  const { rows } = await tx.query<{ chave: string; valor: string; atualizado_em: unknown; atualizado_por: string }>(
    `SELECT chave, valor::text AS valor, atualizado_em, atualizado_por FROM ${S}.config_plataforma`,
  )
  const saida: Record<string, ConfigGravada> = {}
  for (const r of rows) saida[r.chave] = { chave: r.chave, valor: lerJson(r.valor), atualizadoEm: num(r.atualizado_em), atualizadoPor: r.atualizado_por }
  return saida
}

export async function gravarConfiguracao(
  tx: Consulta,
  c: { chave: string; valor: ValorConfig; tipo: TipoConfig; rotulo: string; descricao: string; agora: number; ator: string },
): Promise<void> {
  const S = nomeDoSchema()
  // O valor vai como texto JSON e vira jsonb no banco: `JSON.stringify(12)` é "12", e "\"12\"" seria texto.
  await tx.query(
    `INSERT INTO ${S}.config_plataforma (chave, valor, tipo, rotulo, descricao, atualizado_em, atualizado_por)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, tipo = EXCLUDED.tipo, rotulo = EXCLUDED.rotulo,
       descricao = EXCLUDED.descricao, atualizado_em = EXCLUDED.atualizado_em, atualizado_por = EXCLUDED.atualizado_por`,
    [c.chave, JSON.stringify(c.valor), c.tipo, c.rotulo, c.descricao, c.agora, c.ator],
  )
}

/* ---------- histórico ---------- */

export interface HistoricoConfig {
  id: number
  chave: string
  valorAntigo: unknown
  valorNovo: unknown
  ator: string
  createdAt: number
}

export async function inserirHistoricoConfig(tx: Consulta, h: { chave: string; valorAntigo: unknown; valorNovo: unknown; ator: string; agora: number }): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`INSERT INTO ${S}.config_historico (chave, valor_antigo, valor_novo, ator, created_at) VALUES ($1, $2::jsonb, $3::jsonb, $4, $5)`, [
    h.chave,
    h.valorAntigo === null || h.valorAntigo === undefined ? null : JSON.stringify(h.valorAntigo),
    JSON.stringify(h.valorNovo),
    h.ator,
    h.agora,
  ])
}

export async function listarHistoricoConfig(tx: Consulta, limite: number): Promise<HistoricoConfig[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown; chave: string; valor_antigo: string | null; valor_novo: string; ator: string; created_at: unknown }>(
    `SELECT id, chave, valor_antigo::text AS valor_antigo, valor_novo::text AS valor_novo, ator, created_at FROM ${S}.config_historico ORDER BY id DESC LIMIT $1`,
    [limite],
  )
  return rows.map((r) => ({ id: num(r.id), chave: r.chave, valorAntigo: lerJson(r.valor_antigo), valorNovo: lerJson(r.valor_novo), ator: r.ator, createdAt: num(r.created_at) }))
}

/* ---------- catálogo de tipos de moeda ---------- */

type LinhaTipo = {
  chave: string
  ano_padrao: unknown
  tiragem: string
  categoria: string
  negociavel: unknown
  detail: string
  ord: unknown
  ativo: unknown
  criado_por: string
  created_at: unknown
}

function paraTipo(r: LinhaTipo): TipoMoedaGravado {
  return {
    chave: r.chave,
    anoPadrao: num(r.ano_padrao),
    tiragem: r.tiragem,
    categoria: r.categoria,
    negociavel: r.negociavel === true,
    detail: r.detail,
    ord: num(r.ord),
    ativo: r.ativo === true,
    criadoPor: r.criado_por,
    criadoEm: num(r.created_at),
  }
}

const COLUNAS_TIPO = 'chave, ano_padrao, tiragem, categoria, negociavel, detail, ord, ativo, criado_por, created_at'

export async function listarTiposMoeda(tx: Consulta): Promise<TipoMoedaGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaTipo>(`SELECT ${COLUNAS_TIPO} FROM ${S}.tipos_moeda ORDER BY ord, chave`)
  return rows.map(paraTipo)
}

export async function buscarTipoMoeda(tx: Consulta, chave: string): Promise<TipoMoedaGravado | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaTipo>(`SELECT ${COLUNAS_TIPO} FROM ${S}.tipos_moeda WHERE chave = $1 FOR UPDATE`, [chave])
  return rows[0] ? paraTipo(rows[0]) : null
}

/** Semeia a tabela vazia. Idempotente: tipo que já existe fica como está. */
export async function garantirTiposMoeda(tx: Consulta, iniciais: readonly TipoMoedaValidado[], agora: number): Promise<void> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ n: unknown }>(`SELECT count(*)::int AS n FROM ${S}.tipos_moeda`)
  if (num(rows[0]?.n ?? 0) > 0) return
  for (const t of iniciais) await inserirTipoMoeda(tx, t, 'sistema', agora, true)
}

export async function inserirTipoMoeda(tx: Consulta, t: TipoMoedaValidado, criadoPor: string, agora: number, seNaoExistir = false): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.tipos_moeda (${COLUNAS_TIPO}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)${seNaoExistir ? ' ON CONFLICT (chave) DO NOTHING' : ''}`,
    [t.chave, t.anoPadrao, t.tiragem, t.categoria, t.negociavel, t.detail, t.ord, t.ativo, criadoPor, agora],
  )
}

export async function atualizarTipoMoeda(tx: Consulta, t: TipoMoedaValidado): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.tipos_moeda SET ano_padrao = $2, tiragem = $3, categoria = $4, negociavel = $5, detail = $6, ord = $7, ativo = $8 WHERE chave = $1`,
    [t.chave, t.anoPadrao, t.tiragem, t.categoria, t.negociavel, t.detail, t.ord, t.ativo],
  )
}

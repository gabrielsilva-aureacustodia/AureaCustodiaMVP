/**
 * Repositório do RBAC do painel: `admin_permissoes`, `admin_papeis`,
 * `admin_papel_permissoes` e `admin_membros` (migration 020, frente C).
 *
 * Quatro tabelas num arquivo porque contam uma história só — quem pode o quê no
 * painel —, como `contabil.ts` faz com as quatro tabelas da DRE. Nenhuma delas entra
 * no `AppState`: o painel lê direto daqui, e o polling de 10 s das telas do cliente
 * não carrega nada disto.
 *
 * O CATÁLOGO VEM DO DOMÍNIO. `upsertPermissoes` recebe a lista de
 * src/domain/admin/permissoes.ts; quem decide quando chamar é
 * src/server/admin/rbac.ts. As escritas são SET-BASED (um `unnest` por lista) para
 * que o upsert do catálogo custe três consultas, não trinta, no primeiro acesso de
 * cada instância serverless.
 *
 * As concessões e os membros NÃO são append-only: são configuração, e a trilha do
 * que mudou fica em `audit_log`, gravada na mesma transação pelo serviço.
 */

import type { MembroGravado, PapelGravado, StatusMembro, VariantePainel } from '@/domain/admin/permissoes'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

/* ---------- conversões ---------- */

function textos(v: unknown): string[] {
  if (Array.isArray(v)) return (v as unknown[]).filter((x): x is string => typeof x === 'string')
  // O `pg` e o PGlite devolvem text[] como array; a string crua ('{a,b}') é defesa.
  if (typeof v === 'string') return v.replace(/^\{|\}$/g, '').split(',').filter(Boolean)
  return []
}

type LinhaPapel = {
  id: unknown
  slug: string
  nome: string
  rank: unknown
  variante_painel: string
  sistema: boolean
  permissoes: unknown
}

function paraPapel(r: LinhaPapel): PapelGravado {
  return {
    id: num(r.id),
    slug: r.slug,
    nome: r.nome,
    rank: num(r.rank),
    variantePainel: r.variante_painel as VariantePainel,
    sistema: r.sistema,
    permissoes: textos(r.permissoes),
  }
}

const COLUNAS_PAPEL = `p.id, p.slug, p.nome, p.rank, p.variante_painel, p.sistema,
  COALESCE((SELECT array_agg(pp.permissao_chave ORDER BY pp.permissao_chave)
              FROM __S__.admin_papel_permissoes pp WHERE pp.papel_id = p.id), '{}'::text[]) AS permissoes`

function colunasPapel(S: string): string {
  return COLUNAS_PAPEL.replace('__S__', S)
}

/* ---------- catálogo ---------- */

export async function upsertPermissoes(
  tx: Consulta,
  lista: ReadonlyArray<{ chave: string; modulo: string; rotulo: string; descricao: string }>,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.admin_permissoes (chave, modulo, rotulo, descricao)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
     ON CONFLICT (chave) DO UPDATE
       SET modulo = EXCLUDED.modulo, rotulo = EXCLUDED.rotulo, descricao = EXCLUDED.descricao`,
    [lista.map((p) => p.chave), lista.map((p) => p.modulo), lista.map((p) => p.rotulo), lista.map((p) => p.descricao)],
  )
}

/**
 * Cria o papel de sistema se ele ainda não existir e devolve o id SÓ quando criou.
 * É isso que permite conceder as permissões iniciais uma única vez: depois de
 * criado, quem decide as concessões do sócio e da operação é a tela de papéis.
 */
export async function inserirPapelDeSistemaSeFaltar(
  tx: Consulta,
  p: { slug: string; nome: string; rank: number; variantePainel: VariantePainel },
  agora: number,
): Promise<number | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.admin_papeis (slug, nome, rank, variante_painel, sistema, created_at)
     VALUES ($1, $2, $3, $4, true, $5)
     ON CONFLICT (slug) DO NOTHING
     RETURNING id`,
    [p.slug, p.nome, p.rank, p.variantePainel, agora],
  )
  return rows.length ? num(rows[0].id) : null
}

/** Concede, sem apagar o que já estava concedido. Chave repetida é ignorada. */
export async function concederPermissoes(tx: Consulta, papelId: number, chaves: readonly string[]): Promise<void> {
  if (!chaves.length) return
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.admin_papel_permissoes (papel_id, permissao_chave)
     SELECT $1, k FROM unnest($2::text[]) AS k
     ON CONFLICT DO NOTHING`,
    [papelId, [...chaves]],
  )
}

/**
 * O papel `dev` tem o catálogo inteiro, sempre. Rodado a cada garantia de catálogo,
 * é o que faz uma permissão criada amanhã chegar ao dev sem ninguém lembrar de
 * concedê-la — e o que torna impossível tirar do dev a administração da equipe.
 */
export async function concederCatalogoAoPapel(tx: Consulta, slug: string): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.admin_papel_permissoes (papel_id, permissao_chave)
     SELECT p.id, k.chave FROM ${S}.admin_papeis p CROSS JOIN ${S}.admin_permissoes k
      WHERE p.slug = $1
     ON CONFLICT DO NOTHING`,
    [slug],
  )
}

/* ---------- leitura ---------- */

type LinhaMembroComPapel = LinhaPapel & {
  email: string
  nome_exibicao: string
  papel_id: unknown
  status: string
}

export async function buscarMembroPorEmail(
  tx: Consulta,
  email: string,
): Promise<{ membro: MembroGravado; papel: PapelGravado } | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaMembroComPapel>(
    `SELECT m.email, m.nome_exibicao, m.papel_id, m.status, ${colunasPapel(S)}
       FROM ${S}.admin_membros m
       JOIN ${S}.admin_papeis p ON p.id = m.papel_id
      WHERE m.email = $1`,
    [email],
  )
  const r = rows[0]
  if (!r) return null
  return {
    membro: { email: r.email, nomeExibicao: r.nome_exibicao, papelId: num(r.papel_id), status: r.status as StatusMembro },
    papel: paraPapel(r),
  }
}

/** Existe linha para o e-mail? Leitura mínima, sem catálogo — é a do menu do app. */
export async function situacaoDoMembro(
  tx: Consulta,
  email: string,
): Promise<{ status: StatusMembro; papelSlug: string } | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ status: string; slug: string }>(
    `SELECT m.status, p.slug FROM ${S}.admin_membros m JOIN ${S}.admin_papeis p ON p.id = m.papel_id WHERE m.email = $1`,
    [email],
  )
  return rows[0] ? { status: rows[0].status as StatusMembro, papelSlug: rows[0].slug } : null
}

/** Maior rank primeiro, depois por nome — a ordem da tela de papéis. */
export async function listarPapeis(tx: Consulta): Promise<PapelGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaPapel>(
    `SELECT ${colunasPapel(S)} FROM ${S}.admin_papeis p ORDER BY p.rank DESC, p.nome`,
  )
  return rows.map(paraPapel)
}

export async function buscarPapelPorSlug(tx: Consulta, slug: string): Promise<PapelGravado | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaPapel>(
    `SELECT ${colunasPapel(S)} FROM ${S}.admin_papeis p WHERE p.slug = $1`,
    [slug],
  )
  return rows[0] ? paraPapel(rows[0]) : null
}

export interface MembroListado extends MembroGravado {
  id: number
  papelSlug: string
  papelNome: string
  criadoPor: string
  createdAt: number
  atualizadoPor: string | null
  atualizadoEm: number | null
}

type LinhaMembroListado = {
  id: unknown
  email: string
  nome_exibicao: string
  papel_id: unknown
  status: string
  criado_por: string
  created_at: unknown
  atualizado_por: string | null
  atualizado_em: unknown
  papel_slug: string
  papel_nome: string
}

/** Na ordem de cadastro: o primeiro membro é quem montou a equipe. */
export async function listarMembros(tx: Consulta): Promise<MembroListado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaMembroListado>(
    `SELECT m.id, m.email, m.nome_exibicao, m.papel_id, m.status, m.criado_por, m.created_at,
            m.atualizado_por, m.atualizado_em, p.slug AS papel_slug, p.nome AS papel_nome
       FROM ${S}.admin_membros m JOIN ${S}.admin_papeis p ON p.id = m.papel_id
      ORDER BY m.id`,
  )
  return rows.map((r) => ({
    id: num(r.id),
    email: r.email,
    nomeExibicao: r.nome_exibicao,
    papelId: num(r.papel_id),
    status: r.status as StatusMembro,
    criadoPor: r.criado_por,
    createdAt: num(r.created_at),
    atualizadoPor: r.atualizado_por,
    atualizadoEm: numOuNulo(r.atualizado_em),
    papelSlug: r.papel_slug,
    papelNome: r.papel_nome,
  }))
}

export async function contarMembrosDoPapel(tx: Consulta, papelId: number): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ n: unknown }>(
    `SELECT count(*)::int AS n FROM ${S}.admin_membros WHERE papel_id = $1`,
    [papelId],
  )
  return num(rows[0]?.n ?? 0)
}

/**
 * O nome da conta em `aurea.users`, para o cabeçalho do painel mostrar "Gabriel
 * Silva" em vez do e-mail quando a linha do membro não traz nome. Leitura de uma
 * linha, sem carregar o `AppState`.
 */
export async function nomeDaConta(tx: Consulta, email: string): Promise<string | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ name: string }>(`SELECT name FROM ${S}.users WHERE email = $1`, [email])
  return rows[0]?.name ?? null
}

/* ---------- escrita ---------- */

export async function inserirMembro(
  tx: Consulta,
  m: { email: string; nomeExibicao: string; papelId: number; status: StatusMembro; criadoPor: string },
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.admin_membros (email, nome_exibicao, papel_id, status, criado_por, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [m.email, m.nomeExibicao, m.papelId, m.status, m.criadoPor, agora],
  )
}

export async function atualizarMembro(
  tx: Consulta,
  email: string,
  m: { nomeExibicao: string; papelId: number; status: StatusMembro; atualizadoPor: string },
  agora: number,
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.admin_membros
        SET nome_exibicao = $2, papel_id = $3, status = $4, atualizado_por = $5, atualizado_em = $6
      WHERE email = $1`,
    [email, m.nomeExibicao, m.papelId, m.status, m.atualizadoPor, agora],
  )
}

export async function inserirPapel(
  tx: Consulta,
  p: { slug: string; nome: string; rank: number; variantePainel: VariantePainel },
  agora: number,
): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.admin_papeis (slug, nome, rank, variante_painel, sistema, created_at)
     VALUES ($1, $2, $3, $4, false, $5) RETURNING id`,
    [p.slug, p.nome, p.rank, p.variantePainel, agora],
  )
  return num(rows[0].id)
}

export async function atualizarPapel(
  tx: Consulta,
  id: number,
  p: { nome: string; rank: number; variantePainel: VariantePainel },
): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.admin_papeis SET nome = $2, rank = $3, variante_painel = $4 WHERE id = $1`,
    [id, p.nome, p.rank, p.variantePainel],
  )
}

/** Troca o conjunto inteiro de concessões de um papel, dentro da transação de quem chama. */
export async function substituirPermissoes(tx: Consulta, papelId: number, chaves: readonly string[]): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.admin_papel_permissoes WHERE papel_id = $1`, [papelId])
  await concederPermissoes(tx, papelId, chaves)
}

export async function excluirPapel(tx: Consulta, id: number): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.admin_papeis WHERE id = $1 AND sistema = false`, [id])
}

/**
 * Repositório dos casos de atendimento: `aurea.casos`, `casos_mensagens` e `casos_anexos`
 * (migration 048). SÓ SQL — a regra do estado e a trilha moram em src/server/atendimento/casos.ts.
 *
 * TODA LEITURA DO CLIENTE PASSA `userEmail`: é a consulta, e não a tela, que isola um cliente do outro.
 */

import type { AutorDaMensagem, EstadoDoCaso, FiltroDeCasos, TipoDeCaso } from '@/domain/atendimento/casos'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

export interface CasoGravado {
  id: number
  userEmail: string
  tipo: TipoDeCaso
  estado: EstadoDoCaso
  titulo: string
  paginaOrigem: string | null
  criadoEm: number
  atualizadoEm: number
  ultimaDoClienteEm: number
  ultimaDaEquipeEm: number | null
  clienteViuAte: number
  fechadoPor: string | null
  fechadoEm: number | null
}

export interface MensagemDeCaso {
  id: number
  casoId: number
  autor: AutorDaMensagem
  autorEmail: string
  texto: string
  anexo: { id: number; nome: string; tipoMime: string } | null
  criadoEm: number
}

export interface AnexoGravado {
  id: number
  casoId: number
  nome: string
  tipoMime: string
  conteudo: Uint8Array
}

type Linha = Record<string, unknown>

const COLUNAS = `c.id, c.user_email, c.tipo, c.estado, c.titulo, c.pagina_origem, c.criado_em, c.atualizado_em,
  c.ultima_do_cliente_em, c.ultima_da_equipe_em, c.cliente_viu_ate, c.fechado_por, c.fechado_em`

function caso(r: Linha): CasoGravado {
  return {
    id: num(r.id),
    userEmail: String(r.user_email),
    tipo: r.tipo as TipoDeCaso,
    estado: r.estado as EstadoDoCaso,
    titulo: String(r.titulo),
    paginaOrigem: (r.pagina_origem as string | null) ?? null,
    criadoEm: num(r.criado_em),
    atualizadoEm: num(r.atualizado_em),
    ultimaDoClienteEm: num(r.ultima_do_cliente_em),
    ultimaDaEquipeEm: numOuNulo(r.ultima_da_equipe_em),
    clienteViuAte: num(r.cliente_viu_ate),
    fechadoPor: (r.fechado_por as string | null) ?? null,
    fechadoEm: numOuNulo(r.fechado_em),
  }
}

export async function inserirCaso(
  tx: Consulta,
  c: { userEmail: string; tipo: TipoDeCaso; titulo: string; paginaOrigem: string | null; agora: number },
): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.casos (user_email, tipo, estado, titulo, pagina_origem, criado_em, atualizado_em, ultima_do_cliente_em)
     VALUES ($1, $2, 'aberto', $3, $4, $5, $5, $5) RETURNING id`,
    [c.userEmail, c.tipo, c.titulo, c.paginaOrigem, c.agora],
  )
  return num(rows[0]!.id)
}

export async function inserirAnexo(
  tx: Consulta,
  a: { casoId: number; nome: string; tipoMime: string; bytes: Uint8Array; agora: number },
): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.casos_anexos (caso_id, nome, tipo_mime, tamanho, conteudo, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [a.casoId, a.nome, a.tipoMime, a.bytes.length, a.bytes, a.agora],
  )
  return num(rows[0]!.id)
}

export async function inserirMensagem(
  tx: Consulta,
  m: { casoId: number; autor: AutorDaMensagem; autorEmail: string; texto: string; anexoId: number | null; agora: number },
): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.casos_mensagens (caso_id, autor, autor_email, texto, anexo_id, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [m.casoId, m.autor, m.autorEmail, m.texto, m.anexoId, m.agora],
  )
  return num(rows[0]!.id)
}

/** `paraEmail` restringe ao dono do caso; a equipe lê sem restrição (a permissão já foi conferida acima). */
export async function buscarCaso(tx: Consulta, id: number, paraEmail?: string): Promise<CasoGravado | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<Linha>(
    `SELECT ${COLUNAS} FROM ${S}.casos c WHERE c.id = $1 ${paraEmail ? 'AND c.user_email = $2' : ''}`,
    paraEmail ? [id, paraEmail] : [id],
  )
  return rows[0] ? caso(rows[0]) : null
}

export async function atualizarCaso(
  tx: Consulta,
  id: number,
  mudancas: { estado: EstadoDoCaso; agora: number; daEquipe?: boolean; doCliente?: boolean; fechadoPor?: string | null },
): Promise<void> {
  const S = nomeDoSchema()
  const encerra = mudancas.estado === 'resolvido' || mudancas.estado === 'nao_resolvido'
  await tx.query(
    `UPDATE ${S}.casos SET estado = $2, atualizado_em = $3,
       ultima_da_equipe_em = CASE WHEN $4 THEN $3 ELSE ultima_da_equipe_em END,
       ultima_do_cliente_em = CASE WHEN $5 THEN $3 ELSE ultima_do_cliente_em END,
       fechado_por = CASE WHEN $6 THEN $7 ELSE NULL END,
       fechado_em = CASE WHEN $6 THEN $3 ELSE NULL END
     WHERE id = $1`,
    [id, mudancas.estado, mudancas.agora, mudancas.daEquipe === true, mudancas.doCliente === true, encerra, mudancas.fechadoPor ?? null],
  )
}

export async function marcarVistoPeloCliente(tx: Consulta, id: number, userEmail: string, agora: number): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.casos SET cliente_viu_ate = $3 WHERE id = $1 AND user_email = $2`, [id, userEmail, agora])
}

export async function mensagensDoCaso(tx: Consulta, casoId: number): Promise<MensagemDeCaso[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<Linha>(
    `SELECT m.id, m.caso_id, m.autor, m.autor_email, m.texto, m.criado_em, m.anexo_id, a.nome AS anexo_nome, a.tipo_mime AS anexo_mime
       FROM ${S}.casos_mensagens m LEFT JOIN ${S}.casos_anexos a ON a.id = m.anexo_id
      WHERE m.caso_id = $1 ORDER BY m.criado_em, m.id`,
    [casoId],
  )
  return rows.map((r) => ({
    id: num(r.id),
    casoId: num(r.caso_id),
    autor: r.autor as AutorDaMensagem,
    autorEmail: String(r.autor_email),
    texto: String(r.texto),
    anexo: r.anexo_id == null ? null : { id: num(r.anexo_id), nome: String(r.anexo_nome), tipoMime: String(r.anexo_mime) },
    criadoEm: num(r.criado_em),
  }))
}

export async function buscarAnexo(tx: Consulta, id: number): Promise<(AnexoGravado & { userEmail: string }) | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<Linha>(
    `SELECT a.id, a.caso_id, a.nome, a.tipo_mime, a.conteudo, c.user_email
       FROM ${S}.casos_anexos a JOIN ${S}.casos c ON c.id = a.caso_id WHERE a.id = $1`,
    [id],
  )
  const r = rows[0]
  if (!r) return null
  return {
    id: num(r.id),
    casoId: num(r.caso_id),
    nome: String(r.nome),
    tipoMime: String(r.tipo_mime),
    conteudo: r.conteudo instanceof Uint8Array ? r.conteudo : new Uint8Array(r.conteudo as ArrayBuffer),
    userEmail: String(r.user_email),
  }
}

export async function listarCasosDoCliente(tx: Consulta, userEmail: string): Promise<CasoGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<Linha>(
    `SELECT ${COLUNAS} FROM ${S}.casos c WHERE c.user_email = $1 ORDER BY c.atualizado_em DESC, c.id DESC LIMIT 100`,
    [userEmail],
  )
  return rows.map(caso)
}

/** Quantas respostas da equipe o cliente ainda não viu: é o número que o botão e o menu mostram. */
export async function contarRespostasNaoVistas(tx: Consulta, userEmail: string): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ n: unknown }>(
    `SELECT count(*) AS n FROM ${S}.casos WHERE user_email = $1 AND ultima_da_equipe_em IS NOT NULL AND ultima_da_equipe_em > cliente_viu_ate`,
    [userEmail],
  )
  return num(rows[0]?.n)
}

export async function listarCasosDaEquipe(tx: Consulta, f: FiltroDeCasos, limite: number): Promise<Array<CasoGravado & { ultimaMensagem: string | null }>> {
  const S = nomeDoSchema()
  const onde: string[] = []
  const valores: unknown[] = []
  if (f.estado !== 'todos') {
    valores.push(f.estado)
    onde.push(`c.estado = $${valores.length}`)
  }
  if (f.tipo !== 'todos') {
    valores.push(f.tipo)
    onde.push(`c.tipo = $${valores.length}`)
  }
  if (f.busca) {
    // Escapa % e _ para a busca ser literal: quem digita "50%" procura "50%".
    valores.push(`%${f.busca.replace(/[\\%_]/g, '\\$&')}%`)
    onde.push(`(c.titulo ILIKE $${valores.length} OR c.user_email ILIKE $${valores.length} OR EXISTS (SELECT 1 FROM ${S}.casos_mensagens m WHERE m.caso_id = c.id AND m.texto ILIKE $${valores.length}))`)
  }
  valores.push(limite)
  const { rows } = await tx.query<Linha>(
    `SELECT ${COLUNAS},
       (SELECT m.texto FROM ${S}.casos_mensagens m WHERE m.caso_id = c.id ORDER BY m.criado_em DESC, m.id DESC LIMIT 1) AS ultima_mensagem
       FROM ${S}.casos c ${onde.length ? `WHERE ${onde.join(' AND ')}` : ''}
      ORDER BY (c.estado = 'aberto') DESC, c.atualizado_em DESC, c.id DESC LIMIT $${valores.length}`,
    valores,
  )
  return rows.map((r) => ({ ...caso(r), ultimaMensagem: (r.ultima_mensagem as string | null) ?? null }))
}

export async function contarCasosAbertos(tx: Consulta): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ n: unknown }>(`SELECT count(*) AS n FROM ${S}.casos WHERE estado = 'aberto'`)
  return num(rows[0]?.n)
}

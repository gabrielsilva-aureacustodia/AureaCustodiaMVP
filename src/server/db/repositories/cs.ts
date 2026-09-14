/**
 * Repositório do atendimento: `aurea.cs_canais`, `cs_contatos`, `cs_conversas`,
 * `cs_mensagens`, `cs_notas`, `cs_etiquetas` e `cs_conversa_etiquetas` (migrations 022 e
 * 023, frente C, C2).
 *
 * SÓ SQL. A regra de avanço do estado de entrega, o casamento do telefone com a conta e a
 * trilha `admin.cs.<verbo>` moram em src/server/admin/cs.ts; aqui só se lê e se grava.
 *
 * DUAS GARANTIAS QUE SÃO DO BANCO, NÃO DO CÓDIGO:
 *  - mensagem reentregue pelo webhook não duplica: `id_no_provedor` é UNIQUE, e a entrada
 *    usa `ON CONFLICT DO NOTHING`;
 *  - a resposta enviada pelo painel e o eco dela no webhook (a Evolution avisa também das
 *    mensagens que o próprio atendimento mandou) viram UMA linha, chegue quem chegar
 *    primeiro: a gravação da saída faz `ON CONFLICT DO UPDATE` e fica com o autor certo.
 *
 * `cs_notas` é append-only: só INSERT e SELECT.
 */

import type { CorEtiqueta, DirecaoMensagem, StatusConversa, StatusMensagem } from '@/domain/admin/cs'
import { digitosDaBusca, type FiltroConversas } from '@/domain/admin/cs'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

/* ---------- tipos que saem daqui ---------- */

export interface CanalGravado {
  id: number
  tipo: string
  provedor: string
  identificador: string
  status: string
  createdAt: number
}

export interface ContatoGravado {
  id: number
  telefone: string
  nome: string | null
  userEmail: string | null
}

export interface ConversaListada {
  id: number
  status: StatusConversa
  responsavel: string | null
  assunto: string | null
  ultimaMensagemEm: number | null
  naoLidas: number
  createdAt: number
  contato: ContatoGravado
  canal: { provedor: string; identificador: string }
  ultima: { corpo: string; direcao: DirecaoMensagem; midiaTipo: string | null } | null
  etiquetas: string[]
}

export interface MensagemGravada {
  id: number
  conversaId: number
  direcao: DirecaoMensagem
  corpo: string
  midiaUrl: string | null
  midiaTipo: string | null
  idNoProvedor: string | null
  status: StatusMensagem
  autor: string | null
  createdAt: number
}

export interface NotaGravada {
  id: number
  autor: string
  corpo: string
  createdAt: number
}

export interface EtiquetaGravada {
  slug: string
  rotulo: string
  cor: CorEtiqueta
}

/** O `%` e o `_` do texto digitado viram literais. */
function semCuringa(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`)
}

function textos(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
  if (typeof v === 'string') return v.replace(/^\{|\}$/g, '').split(',').filter(Boolean)
  return []
}

/* ---------- canais ---------- */

/** Cria o canal na primeira mensagem, e reativa o que já existia. Devolve o id. */
export async function garantirCanal(
  tx: Consulta,
  c: { tipo: 'whatsapp' | 'email'; provedor: string; identificador: string },
  agora: number,
): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.cs_canais (tipo, provedor, identificador, status, created_at)
     VALUES ($1, $2, $3, 'ativo', $4)
     ON CONFLICT (provedor, identificador) DO UPDATE SET status = 'ativo'
     RETURNING id`,
    [c.tipo, c.provedor, c.identificador, agora],
  )
  return num(rows[0].id)
}

export async function listarCanais(tx: Consulta): Promise<CanalGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown; tipo: string; provedor: string; identificador: string; status: string; created_at: unknown }>(
    `SELECT id, tipo, provedor, identificador, status, created_at FROM ${S}.cs_canais ORDER BY id`,
  )
  return rows.map((r) => ({ id: num(r.id), tipo: r.tipo, provedor: r.provedor, identificador: r.identificador, status: r.status, createdAt: num(r.created_at) }))
}

/* ---------- contatos ---------- */

type LinhaContato = { id: unknown; telefone_e164: string; nome: string | null; user_email: string | null }

function paraContato(r: LinhaContato): ContatoGravado {
  return { id: num(r.id), telefone: r.telefone_e164, nome: r.nome, userEmail: r.user_email }
}

/**
 * Cria ou devolve o contato do telefone. O nome que já estava gravado vence: o que o
 * atendente digitou não é sobrescrito pelo apelido do WhatsApp a cada mensagem.
 */
export async function garantirContato(tx: Consulta, telefone: string, nome: string | null, agora: number): Promise<ContatoGravado> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaContato>(
    `INSERT INTO ${S}.cs_contatos AS ct (telefone_e164, nome, created_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (telefone_e164) DO UPDATE SET nome = COALESCE(ct.nome, EXCLUDED.nome)
     RETURNING id, telefone_e164, nome, user_email`,
    [telefone, nome, agora],
  )
  return paraContato(rows[0])
}

export async function buscarContato(tx: Consulta, id: number): Promise<ContatoGravado | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaContato>(`SELECT id, telefone_e164, nome, user_email FROM ${S}.cs_contatos WHERE id = $1`, [id])
  return rows[0] ? paraContato(rows[0]) : null
}

export async function vincularContatoAConta(tx: Consulta, contatoId: number, email: string | null): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.cs_contatos SET user_email = $2 WHERE id = $1`, [contatoId, email])
}

export async function renomearContato(tx: Consulta, contatoId: number, nome: string | null): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.cs_contatos SET nome = $2 WHERE id = $1`, [contatoId, nome])
}

/**
 * Os telefones do cadastro das contas — só leitura em `aurea.users`, que é do AppState. É o
 * que o serviço compara com o telefone do contato para achar a ficha.
 */
export async function telefonesDasContas(tx: Consulta): Promise<Array<{ email: string; telefone: string }>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ email: string; telefone: string }>(
    `SELECT email, telefone FROM ${S}.users WHERE telefone IS NOT NULL AND telefone <> ''`,
  )
  return rows
}

/* ---------- conversas ---------- */

/** A conversa com um contato é uma só por canal: devolve a existente ou cria. */
export async function garantirConversa(tx: Consulta, canalId: number, contatoId: number, agora: number): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.cs_conversas (canal_id, contato_id, status, nao_lidas, created_at)
     VALUES ($1, $2, 'aberta', 0, $3)
     ON CONFLICT (canal_id, contato_id) DO UPDATE SET canal_id = EXCLUDED.canal_id
     RETURNING id`,
    [canalId, contatoId, agora],
  )
  return num(rows[0].id)
}

/**
 * Uma mensagem chegou ou saiu. Entrada conta como não lida e REABRE a conversa (cliente que
 * volta a escrever num caso resolvido tem caso aberto de novo); saída só move a data.
 */
export async function registrarMovimento(tx: Consulta, conversaId: number, direcao: DirecaoMensagem, em: number): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `UPDATE ${S}.cs_conversas
        SET ultima_mensagem_em = GREATEST(COALESCE(ultima_mensagem_em, 0), $3),
            nao_lidas = nao_lidas + CASE WHEN $2 = 'entrada' THEN 1 ELSE 0 END,
            status = CASE WHEN $2 = 'entrada' THEN 'aberta' ELSE status END
      WHERE id = $1`,
    [conversaId, direcao, em],
  )
}

export async function zerarNaoLidas(tx: Consulta, conversaId: number): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.cs_conversas SET nao_lidas = 0 WHERE id = $1 AND nao_lidas <> 0`, [conversaId])
}

export async function definirStatusConversa(tx: Consulta, conversaId: number, status: StatusConversa): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.cs_conversas SET status = $2 WHERE id = $1`, [conversaId, status])
}

export async function definirResponsavel(tx: Consulta, conversaId: number, responsavel: string | null): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.cs_conversas SET responsavel = $2 WHERE id = $1`, [conversaId, responsavel])
}

type LinhaConversa = {
  id: unknown
  status: string
  responsavel: string | null
  assunto: string | null
  ultima_mensagem_em: unknown
  nao_lidas: unknown
  created_at: unknown
  contato_id: unknown
  telefone_e164: string
  nome: string | null
  user_email: string | null
  provedor: string
  identificador: string
  ultima_corpo: string | null
  ultima_direcao: string | null
  ultima_midia: string | null
  etiquetas: unknown
}

const SELECT_CONVERSA = (S: string): string => `
  SELECT cv.id, cv.status, cv.responsavel, cv.assunto, cv.ultima_mensagem_em, cv.nao_lidas, cv.created_at,
         ct.id AS contato_id, ct.telefone_e164, ct.nome, ct.user_email,
         ca.provedor, ca.identificador,
         um.corpo AS ultima_corpo, um.direcao AS ultima_direcao, um.midia_tipo AS ultima_midia,
         COALESCE((SELECT array_agg(ce.etiqueta_slug ORDER BY ce.etiqueta_slug)
                     FROM ${S}.cs_conversa_etiquetas ce WHERE ce.conversa_id = cv.id), '{}') AS etiquetas
    FROM ${S}.cs_conversas cv
    JOIN ${S}.cs_contatos ct ON ct.id = cv.contato_id
    JOIN ${S}.cs_canais ca ON ca.id = cv.canal_id
    LEFT JOIN LATERAL (
      SELECT m.corpo, m.direcao, m.midia_tipo FROM ${S}.cs_mensagens m
       WHERE m.conversa_id = cv.id ORDER BY m.id DESC LIMIT 1
    ) um ON true`

function paraConversa(r: LinhaConversa): ConversaListada {
  return {
    id: num(r.id),
    status: r.status as StatusConversa,
    responsavel: r.responsavel,
    assunto: r.assunto,
    ultimaMensagemEm: numOuNulo(r.ultima_mensagem_em),
    naoLidas: num(r.nao_lidas),
    createdAt: num(r.created_at),
    contato: { id: num(r.contato_id), telefone: r.telefone_e164, nome: r.nome, userEmail: r.user_email },
    canal: { provedor: r.provedor, identificador: r.identificador },
    ultima: r.ultima_direcao
      ? { corpo: r.ultima_corpo ?? '', direcao: r.ultima_direcao as DirecaoMensagem, midiaTipo: r.ultima_midia }
      : null,
    etiquetas: textos(r.etiquetas),
  }
}

/** A caixa de conversas: mais recente primeiro, com a última mensagem e as etiquetas. */
export async function listarConversas(tx: Consulta, filtro: FiltroConversas, limite: number): Promise<ConversaListada[]> {
  const S = nomeDoSchema()
  const condicoes: string[] = []
  const valores: unknown[] = []
  const param = (v: unknown): string => {
    valores.push(v)
    return `$${valores.length}`
  }
  if (filtro.status) condicoes.push(`cv.status = ${param(filtro.status)}`)
  if (filtro.responsavel === 'ninguem') condicoes.push('cv.responsavel IS NULL')
  else if (filtro.responsavel) condicoes.push(`cv.responsavel = ${param(filtro.responsavel)}`)
  if (filtro.etiqueta) {
    condicoes.push(`EXISTS (SELECT 1 FROM ${S}.cs_conversa_etiquetas ce WHERE ce.conversa_id = cv.id AND ce.etiqueta_slug = ${param(filtro.etiqueta)})`)
  }
  if (filtro.soNaoLidas) condicoes.push('cv.nao_lidas > 0')
  if (filtro.busca) {
    const texto = param(`%${semCuringa(filtro.busca)}%`)
    const digitos = digitosDaBusca(filtro.busca)
    const porTelefone = digitos ? ` OR ct.telefone_e164 LIKE ${param(`%${digitos}%`)}` : ''
    condicoes.push(`(ct.nome ILIKE ${texto} OR ct.user_email ILIKE ${texto}${porTelefone})`)
  }
  const where = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : ''
  const { rows } = await tx.query<LinhaConversa>(
    `${SELECT_CONVERSA(S)}${where}
      ORDER BY cv.ultima_mensagem_em DESC NULLS LAST, cv.id DESC
      LIMIT ${param(limite)}`,
    valores,
  )
  return rows.map(paraConversa)
}

export async function buscarConversa(tx: Consulta, id: number): Promise<ConversaListada | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaConversa>(`${SELECT_CONVERSA(S)} WHERE cv.id = $1`, [id])
  return rows[0] ? paraConversa(rows[0]) : null
}

/** As conversas de uma conta, para a ficha do usuário. */
export async function conversasDaConta(tx: Consulta, email: string): Promise<ConversaListada[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaConversa>(
    `${SELECT_CONVERSA(S)} WHERE ct.user_email = $1 ORDER BY cv.ultima_mensagem_em DESC NULLS LAST, cv.id DESC LIMIT 50`,
    [email],
  )
  return rows.map(paraConversa)
}

/** Quantas conversas por situação e quantas mensagens não lidas no total. */
export async function resumoDaCaixa(tx: Consulta): Promise<{ porStatus: Record<StatusConversa, number>; naoLidas: number }> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ status: string; conversas: unknown; nao_lidas: unknown }>(
    `SELECT status, count(*) AS conversas, COALESCE(sum(nao_lidas), 0) AS nao_lidas FROM ${S}.cs_conversas GROUP BY status`,
  )
  const porStatus: Record<StatusConversa, number> = { aberta: 0, pendente: 0, resolvida: 0 }
  let naoLidas = 0
  for (const r of rows) {
    if (r.status === 'aberta' || r.status === 'pendente' || r.status === 'resolvida') porStatus[r.status] = num(r.conversas)
    naoLidas += num(r.nao_lidas)
  }
  return { porStatus, naoLidas }
}

/* ---------- mensagens ---------- */

type LinhaMensagem = {
  id: unknown
  conversa_id: unknown
  direcao: string
  corpo: string
  midia_url: string | null
  midia_tipo: string | null
  id_no_provedor: string | null
  status: string
  autor: string | null
  created_at: unknown
}

function paraMensagem(r: LinhaMensagem): MensagemGravada {
  return {
    id: num(r.id),
    conversaId: num(r.conversa_id),
    direcao: r.direcao as DirecaoMensagem,
    corpo: r.corpo,
    midiaUrl: r.midia_url,
    midiaTipo: r.midia_tipo,
    idNoProvedor: r.id_no_provedor,
    status: r.status as StatusMensagem,
    autor: r.autor,
    createdAt: num(r.created_at),
  }
}

export interface NovaMensagem {
  conversaId: number
  direcao: DirecaoMensagem
  corpo: string
  midiaUrl: string | null
  midiaTipo: string | null
  idNoProvedor: string | null
  status: StatusMensagem
  autor: string | null
  createdAt: number
}

/** Entrada pelo webhook. Reentrega do mesmo id não grava nada e devolve `null`. */
export async function inserirMensagemRecebida(tx: Consulta, m: NovaMensagem): Promise<number | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.cs_mensagens (conversa_id, direcao, corpo, midia_url, midia_tipo, id_no_provedor, status, autor, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id_no_provedor) DO NOTHING
     RETURNING id`,
    [m.conversaId, m.direcao, m.corpo, m.midiaUrl, m.midiaTipo, m.idNoProvedor, m.status, m.autor, m.createdAt],
  )
  return rows[0] ? num(rows[0].id) : null
}

/**
 * Saída pelo painel. Se o eco do webhook chegou antes e gravou a mensagem como escrita "no
 * aparelho", esta gravação corrige o autor para o atendente — e a conversa continua com uma
 * linha só. `inserida` diz se a linha é nova (para mover a data da conversa uma vez).
 */
export async function gravarMensagemEnviada(tx: Consulta, m: NovaMensagem): Promise<{ id: number; inserida: boolean }> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown; inserida: unknown }>(
    `INSERT INTO ${S}.cs_mensagens (conversa_id, direcao, corpo, midia_url, midia_tipo, id_no_provedor, status, autor, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id_no_provedor) DO UPDATE SET autor = EXCLUDED.autor
     RETURNING id, (xmax = 0) AS inserida`,
    [m.conversaId, m.direcao, m.corpo, m.midiaUrl, m.midiaTipo, m.idNoProvedor, m.status, m.autor, m.createdAt],
  )
  return { id: num(rows[0].id), inserida: rows[0].inserida === true }
}

export async function buscarMensagemPorIdNoProvedor(tx: Consulta, idNoProvedor: string): Promise<MensagemGravada | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaMensagem>(
    `SELECT id, conversa_id, direcao, corpo, midia_url, midia_tipo, id_no_provedor, status, autor, created_at
       FROM ${S}.cs_mensagens WHERE id_no_provedor = $1 FOR UPDATE`,
    [idNoProvedor],
  )
  return rows[0] ? paraMensagem(rows[0]) : null
}

export async function definirStatusMensagem(tx: Consulta, id: number, status: StatusMensagem): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`UPDATE ${S}.cs_mensagens SET status = $2 WHERE id = $1`, [id, status])
}

/** As últimas `limite` mensagens, em ordem de chegada. */
export async function listarMensagens(tx: Consulta, conversaId: number, limite: number): Promise<MensagemGravada[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaMensagem>(
    `SELECT * FROM (
       SELECT id, conversa_id, direcao, corpo, midia_url, midia_tipo, id_no_provedor, status, autor, created_at
         FROM ${S}.cs_mensagens WHERE conversa_id = $1 ORDER BY id DESC LIMIT $2
     ) ultimas ORDER BY id`,
    [conversaId, limite],
  )
  return rows.map(paraMensagem)
}

/* ---------- notas (append-only) ---------- */

export async function inserirNotaDaConversa(tx: Consulta, n: { conversaId: number; autor: string; corpo: string; createdAt: number }): Promise<number> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown }>(
    `INSERT INTO ${S}.cs_notas (conversa_id, autor, corpo, created_at) VALUES ($1, $2, $3, $4) RETURNING id`,
    [n.conversaId, n.autor, n.corpo, n.createdAt],
  )
  return num(rows[0].id)
}

export async function listarNotasDaConversa(tx: Consulta, conversaId: number): Promise<NotaGravada[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ id: unknown; autor: string; corpo: string; created_at: unknown }>(
    `SELECT id, autor, corpo, created_at FROM ${S}.cs_notas WHERE conversa_id = $1 ORDER BY id`,
    [conversaId],
  )
  return rows.map((r) => ({ id: num(r.id), autor: r.autor, corpo: r.corpo, createdAt: num(r.created_at) }))
}

/* ---------- etiquetas ---------- */

export async function listarEtiquetas(tx: Consulta): Promise<EtiquetaGravada[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ slug: string; rotulo: string; cor: string }>(`SELECT slug, rotulo, cor FROM ${S}.cs_etiquetas ORDER BY rotulo`)
  return rows.map((r) => ({ slug: r.slug, rotulo: r.rotulo, cor: r.cor as CorEtiqueta }))
}

/** `false` quando o slug já existia — a etiqueta não é sobrescrita. */
export async function inserirEtiqueta(tx: Consulta, e: EtiquetaGravada): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ slug: string }>(
    `INSERT INTO ${S}.cs_etiquetas (slug, rotulo, cor) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING RETURNING slug`,
    [e.slug, e.rotulo, e.cor],
  )
  return rows.length > 0
}

export async function etiquetaExiste(tx: Consulta, slug: string): Promise<boolean> {
  const S = nomeDoSchema()
  const { rows } = await tx.query(`SELECT 1 FROM ${S}.cs_etiquetas WHERE slug = $1`, [slug])
  return rows.length > 0
}

export async function marcarEtiqueta(tx: Consulta, conversaId: number, slug: string): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(
    `INSERT INTO ${S}.cs_conversa_etiquetas (conversa_id, etiqueta_slug) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [conversaId, slug],
  )
}

export async function desmarcarEtiqueta(tx: Consulta, conversaId: number, slug: string): Promise<void> {
  const S = nomeDoSchema()
  await tx.query(`DELETE FROM ${S}.cs_conversa_etiquetas WHERE conversa_id = $1 AND etiqueta_slug = $2`, [conversaId, slug])
}

/**
 * Repositório de `aurea.aceites_documentos` — registro formal de aceite de documentos legais.
 *
 * APPEND-ONLY: sem UPDATE nem DELETE.
 *
 * Cada registro é encadeado por SHA-256 ao registro imediatamente anterior (ou GENESIS se
 * a tabela estiver vazia).
 *
 * A lista de campos incluídos no hash e a sua ordenação são fixadas por CAMPOS_DO_ACEITE
 * em src/domain/aceite.ts.
 */

import {
  encadearAceites,
  type AceiteDocumento,
  type AceitePendente,
} from '@/domain/aceite'
import type { CanalAceite, ChaveDocumento, MetodoAceite } from '@/domain/documentos-legais/types'
import { GENESIS } from '@/domain/hash'

import { nomeDoSchema, num, type Consulta } from '../sql'

export interface AceiteDocumentoGravado extends AceiteDocumento {
  id: number
}

interface LinhaAceiteDocumento extends Record<string, unknown> {
  id: unknown
  created_at: unknown
  user_email: string
  documento_chave: string
  documento_versao: string
  hash_conteudo: string
  canal: string
  metodo: string
  texto_exibido: string
  nome_digitado: string | null
  ip: string | null
  user_agent: string | null
  hash_anterior: string
  hash: string
}

function paraRegistro(r: LinhaAceiteDocumento): AceiteDocumentoGravado {
  return {
    id: num(r.id),
    createdAt: num(r.created_at),
    userEmail: r.user_email,
    documentoChave: r.documento_chave as ChaveDocumento,
    documentoVersao: r.documento_versao,
    hashConteudo: r.hash_conteudo,
    canal: r.canal as CanalAceite,
    metodo: r.metodo as MetodoAceite,
    textoExibido: r.texto_exibido,
    nomeDigitado: r.nome_digitado ?? null,
    ip: r.ip ?? null,
    userAgent: r.user_agent ?? null,
    hashAnterior: r.hash_anterior,
    hash: r.hash,
  }
}

/**
 * Obtém o hash do último aceite gravado na tabela, ou GENESIS se vazia.
 */
export async function ultimoHashAceite(tx: Consulta): Promise<string> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ hash: string }>(
    `SELECT hash FROM ${S}.aceites_documentos ORDER BY id DESC LIMIT 1`,
  )
  return rows[0]?.hash ?? GENESIS
}

/**
 * Insere um lote de aceites pendentes, encadeando-os sequencialmente a partir
 * do último hash gravado na tabela.
 */
export async function inserirAceites(
  tx: Consulta,
  pendentes: readonly AceitePendente[],
): Promise<AceiteDocumentoGravado[]> {
  if (pendentes.length === 0) return []
  const S = nomeDoSchema()

  const hashInicial = await ultimoHashAceite(tx)
  const encadeados = encadearAceites(pendentes, hashInicial)
  const gravados: AceiteDocumentoGravado[] = []

  for (const a of encadeados) {
    const { rows } = await tx.query<LinhaAceiteDocumento>(
      `INSERT INTO ${S}.aceites_documentos
         (created_at, user_email, documento_chave, documento_versao, hash_conteudo,
          canal, metodo, texto_exibido, nome_digitado, ip, user_agent, hash_anterior, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        a.createdAt,
        a.userEmail,
        a.documentoChave,
        a.documentoVersao,
        a.hashConteudo,
        a.canal,
        a.metodo,
        a.textoExibido,
        a.nomeDigitado ?? null,
        a.ip ?? null,
        a.userAgent ?? null,
        a.hashAnterior,
        a.hash,
      ],
    )
    gravados.push(paraRegistro(rows[0]))
  }

  return gravados
}

/**
 * Lista todos os aceites de um determinado usuário, do mais recente ao mais antigo.
 */
export async function listarAceitesPorUsuario(
  tx: Consulta,
  userEmail: string,
): Promise<AceiteDocumentoGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaAceiteDocumento>(
    `SELECT * FROM ${S}.aceites_documentos
     WHERE user_email = $1
     ORDER BY id DESC`,
    [userEmail.trim().toLowerCase()],
  )
  return rows.map(paraRegistro)
}

/**
 * Busca um aceite específico pelo ID.
 */
export async function buscarAceitePorId(
  tx: Consulta,
  id: number,
): Promise<AceiteDocumentoGravado | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaAceiteDocumento>(
    `SELECT * FROM ${S}.aceites_documentos WHERE id = $1`,
    [id],
  )
  return rows[0] ? paraRegistro(rows[0]) : null
}

/**
 * Busca o aceite mais recente de um usuário para um documento específico.
 */
export async function buscarUltimoAceitePorDocumento(
  tx: Consulta,
  userEmail: string,
  documentoChave: ChaveDocumento,
): Promise<AceiteDocumentoGravado | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaAceiteDocumento>(
    `SELECT * FROM ${S}.aceites_documentos
     WHERE user_email = $1 AND documento_chave = $2
     ORDER BY id DESC
     LIMIT 1`,
    [userEmail.trim().toLowerCase(), documentoChave],
  )
  return rows[0] ? paraRegistro(rows[0]) : null
}

/**
 * Lista todos os aceites em ordem sequencial (útil para verificação de cadeia e auditoria).
 */
export async function listarTodosAceites(tx: Consulta): Promise<AceiteDocumentoGravado[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaAceiteDocumento>(
    `SELECT * FROM ${S}.aceites_documentos ORDER BY id ASC`,
  )
  return rows.map(paraRegistro)
}

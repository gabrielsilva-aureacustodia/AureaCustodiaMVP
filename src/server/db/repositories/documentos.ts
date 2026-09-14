/**
 * Repositório de `aurea.documentos_legais` — versões oficiais dos documentos legais.
 *
 * Armazena o texto integral canônico, o hash SHA-256 e os metadados
 * de vigência de cada documento legal da plataforma.
 */

import { DOCUMENTOS_VIGENTES } from '@/domain/documentos-legais'
import type { ChaveDocumento } from '@/domain/documentos-legais/types'

import { nomeDoSchema, num, type Consulta } from '../sql'

export interface DocumentoLegalRegistro {
  id: number
  chave: ChaveDocumento
  versao: string
  vigenteDesde: number
  hashConteudo: string
  conteudo: string
  publicadoPor: string
  createdAt: number
}

interface LinhaDocumentoLegal extends Record<string, unknown> {
  id: unknown
  chave: string
  versao: string
  vigente_desde: unknown
  hash_conteudo: string
  conteudo: string
  publicado_por: string
  created_at: unknown
}

function paraRegistro(r: LinhaDocumentoLegal): DocumentoLegalRegistro {
  return {
    id: num(r.id),
    chave: r.chave as ChaveDocumento,
    versao: r.versao,
    vigenteDesde: num(r.vigente_desde),
    hashConteudo: r.hash_conteudo,
    conteudo: r.conteudo,
    publicadoPor: r.publicado_por,
    createdAt: num(r.created_at),
  }
}

function parseDataVigencia(str: string): number {
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length === 3) {
      const d = Number(parts[0])
      const m = Number(parts[1])
      const y = Number(parts[2])
      return new Date(Date.UTC(y, m - 1, d)).getTime()
    }
  }
  const parsed = Date.parse(str)
  return isNaN(parsed) ? Date.now() : parsed
}

/**
 * Garante que todos os documentos vigentes definidos em código estejam inseridos no banco.
 * Idempotente: atualiza se já existir para manter o conteúdo/hash sincronizado.
 */
export async function garantirDocumentosVigentes(tx: Consulta): Promise<void> {
  const S = nomeDoSchema()
  const agora = Date.now()

  for (const item of Object.values(DOCUMENTOS_VIGENTES)) {
    const doc = item.documento
    const vigenteDesdeMs = parseDataVigencia(doc.vigenteDesde)

    await tx.query(
      `INSERT INTO ${S}.documentos_legais
         (chave, versao, vigente_desde, hash_conteudo, conteudo, publicado_por, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (chave, versao) DO UPDATE SET
         vigente_desde = EXCLUDED.vigente_desde,
         hash_conteudo = EXCLUDED.hash_conteudo,
         conteudo = EXCLUDED.conteudo,
         publicado_por = EXCLUDED.publicado_por`,
      [
        doc.chave,
        doc.versao,
        vigenteDesdeMs,
        item.hash,
        item.textoCanonico,
        'sistema',
        agora,
      ],
    )
  }
}

/**
 * Busca a versão vigente mais recente de um documento legal por chave.
 */
export async function buscarDocumentoVigente(
  tx: Consulta,
  chave: ChaveDocumento,
): Promise<DocumentoLegalRegistro | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaDocumentoLegal>(
    `SELECT * FROM ${S}.documentos_legais
     WHERE chave = $1
     ORDER BY vigente_desde DESC, id DESC
     LIMIT 1`,
    [chave],
  )
  return rows[0] ? paraRegistro(rows[0]) : null
}

/**
 * Busca uma versão específica de um documento legal.
 */
export async function buscarDocumentoPorChaveEVersao(
  tx: Consulta,
  chave: ChaveDocumento,
  versao: string,
): Promise<DocumentoLegalRegistro | null> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaDocumentoLegal>(
    `SELECT * FROM ${S}.documentos_legais
     WHERE chave = $1 AND versao = $2
     LIMIT 1`,
    [chave, versao],
  )
  return rows[0] ? paraRegistro(rows[0]) : null
}

/**
 * Lista o histórico completo de versões de um documento legal.
 */
export async function listarHistoricoDocumento(
  tx: Consulta,
  chave: ChaveDocumento,
): Promise<DocumentoLegalRegistro[]> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaDocumentoLegal>(
    `SELECT * FROM ${S}.documentos_legais
     WHERE chave = $1
     ORDER BY vigente_desde DESC, id DESC`,
    [chave],
  )
  return rows.map(paraRegistro)
}

/**
 * Insere uma nova versão de documento legal (utilizado pelo fluxo de publicação C3).
 */
export async function inserirDocumentoLegal(
  tx: Consulta,
  doc: Omit<DocumentoLegalRegistro, 'id'>,
): Promise<DocumentoLegalRegistro> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<LinhaDocumentoLegal>(
    `INSERT INTO ${S}.documentos_legais
       (chave, versao, vigente_desde, hash_conteudo, conteudo, publicado_por, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      doc.chave,
      doc.versao,
      doc.vigenteDesde,
      doc.hashConteudo,
      doc.conteudo,
      doc.publicadoPor,
      doc.createdAt,
    ],
  )
  return paraRegistro(rows[0])
}

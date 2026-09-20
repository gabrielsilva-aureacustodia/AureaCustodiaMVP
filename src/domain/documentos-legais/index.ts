/**
 * DOMÍNIO — Catálogo oficial de Documentos Legais Vigentes do Real Olímpico.
 *
 * Ponto de entrada unificado para leitura, canonicidade e cálculo de hash.
 */

import { hashDoDocumento, textoCanonico } from './canonico'
import { CLAUSULA_ARBITRAGEM_V1 } from './clausula-arbitragem-v1'
import { POLITICA_PRIVACIDADE_V1 } from './politica-privacidade-v1'
import { TABELA_DE_TAXAS_V1 } from './tabela-de-taxas-v1'
import { TERMOS_DE_USO_V1 } from './termos-de-uso-v1'
import type { ChaveDocumento, DocumentoLegalEstruturado } from './types'

export * from './types'
export * from './parametros'
export * from './canonico'
export * from './termos-de-uso-v1'
export * from './politica-privacidade-v1'
export * from './tabela-de-taxas-v1'
export * from './clausula-arbitragem-v1'

export interface DocumentoVigenteComHash {
  documento: DocumentoLegalEstruturado
  textoCanonico: string
  hash: string
  versao: string
  vigenteDesde: string
  titulo: string
}

function compilarDocumento(doc: DocumentoLegalEstruturado): DocumentoVigenteComHash {
  const texto = textoCanonico(doc)
  const hash = hashDoDocumento(doc)
  return {
    documento: doc,
    textoCanonico: texto,
    hash,
    versao: doc.versao,
    vigenteDesde: doc.vigenteDesde,
    titulo: doc.titulo,
  }
}

export const DOCUMENTOS_VIGENTES: Record<ChaveDocumento, DocumentoVigenteComHash> = {
  termos_de_uso: compilarDocumento(TERMOS_DE_USO_V1),
  politica_privacidade: compilarDocumento(POLITICA_PRIVACIDADE_V1),
  tabela_de_taxas: compilarDocumento(TABELA_DE_TAXAS_V1),
  clausula_arbitragem: compilarDocumento(CLAUSULA_ARBITRAGEM_V1),
}

export function obterDocumentoVigente(chave: ChaveDocumento): DocumentoVigenteComHash {
  const doc = DOCUMENTOS_VIGENTES[chave]
  if (!doc) {
    throw new Error(`Documento legal não encontrado para a chave: ${chave}`)
  }
  return doc
}

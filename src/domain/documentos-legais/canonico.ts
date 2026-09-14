/**
 * DOMÍNIO — Geração de texto canônico e hash criptográfico de documentos legais.
 *
 * Regra pura: sem I/O, determinístico, reprodutível em qualquer ambiente.
 * Normalização: Unicode NFC, remoção de espaços em branco ao fim de linha, quebras \n.
 */

import { sha256Hex } from '@/domain/hash'
import type { Alinea, DocumentoLegalEstruturado, Paragrafo } from './types'

function formatarAlinea(a: Alinea, linhas: string[]): void {
  const prefix = a.letra.trim()
  const corpo = a.texto.trim()
  linhas.push(`${prefix} ${corpo}`.trim())
  if (a.subalineas) {
    for (const sub of a.subalineas) {
      formatarAlinea(sub, linhas)
    }
  }
}

function formatarParagrafo(p: Paragrafo, linhas: string[]): void {
  const partes: string[] = []
  if (p.numero) {
    partes.push(`${p.numero.trim()}.`)
  }
  if (p.titulo) {
    partes.push(`${p.titulo.trim()}.`)
  }
  if (p.texto) {
    partes.push(p.texto.trim())
  }
  if (partes.length > 0) {
    linhas.push(partes.join(' ').trim())
  }
  if (p.alineas) {
    for (const a of p.alineas) {
      formatarAlinea(a, linhas)
    }
  }
}

/**
 * Gera a representação canônica em texto puro de um documento legal estruturado.
 */
export function textoCanonico(doc: DocumentoLegalEstruturado): string {
  const linhas: string[] = []

  if (doc.titulo) {
    linhas.push(doc.titulo.trim())
  }
  if (doc.vigenteDesde) {
    linhas.push(`Data de entrada em vigor: ${doc.vigenteDesde.trim()}`)
  }

  if (doc.preambulo) {
    for (const p of doc.preambulo) {
      if (p.trim()) linhas.push(p.trim())
    }
  }

  for (const cap of doc.capitulos) {
    linhas.push(`${cap.numero}. ${cap.titulo.trim()}`)
    for (const par of cap.paragrafos) {
      formatarParagrafo(par, linhas)
    }
  }

  if (doc.posambulo) {
    for (const pos of doc.posambulo) {
      if (pos.trim()) linhas.push(pos.trim())
    }
  }

  // Normalização estrita: Unicode NFC, sem espaços ao fim de cada linha, \n como separador
  return linhas
    .map((l) => l.trimEnd())
    .join('\n')
    .normalize('NFC')
}

/**
 * Calcula o hash SHA-256 do texto canônico do documento legal em hexadecimal minúsculo.
 */
export function hashDoDocumento(doc: DocumentoLegalEstruturado): string {
  return sha256Hex(textoCanonico(doc))
}


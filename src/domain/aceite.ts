/**
 * DOMÍNIO — Registro formal do aceite de termos e documentos legais.
 *
 * Módulo puro: sem I/O, determinístico e testável isoladamente.
 *
 * A prova legal do aceite é imutável e encadeada por SHA-256 (como o livro-razão):
 * qualquer adulteração de linha histórica rompe a cadeia matemática de prova.
 */

import { GENESIS, hashEncadeado, type CampoDeHash } from '@/domain/hash'
import type { Timestamp } from '@/domain/types'
import type {
  CanalAceite,
  ChaveDocumento,
  MetodoAceite,
} from './documentos-legais/types'

/** A ordem é congelada: mudar a lista invalida a prova de todo aceite já gravado. */
export const CAMPOS_DO_ACEITE = [
  'createdAt',
  'userEmail',
  'documentoChave',
  'documentoVersao',
  'hashConteudo',
  'canal',
  'metodo',
  'textoExibido',
  'nomeDigitado',
  'ip',
  'userAgent',
] as const

export type CampoDoAceite = (typeof CAMPOS_DO_ACEITE)[number]

/**
 * Registro de aceite antes do encadeamento criptográfico.
 */
export interface AceitePendente {
  createdAt: Timestamp
  userEmail: string
  documentoChave: ChaveDocumento
  documentoVersao: string
  hashConteudo: string
  canal: CanalAceite
  metodo: MetodoAceite
  textoExibido: string
  nomeDigitado: string | null
  ip: string | null
  userAgent: string | null
}

/**
 * Registro de aceite formal persistido, contendo prova encadeada.
 */
export interface AceiteDocumento extends AceitePendente {
  id?: number
  hashAnterior: string
  hash: string
}

/**
 * Extrai os valores canônicos para hashing estritamente na ordem de CAMPOS_DO_ACEITE.
 */
export function camposParaHash(a: AceitePendente): CampoDeHash[] {
  return CAMPOS_DO_ACEITE.map((c) => a[c])
}

/**
 * Calcula o hash SHA-256 encadeado de um registro de aceite individual.
 */
export function hashDeAceite(a: Omit<AceiteDocumento, 'hash'>): string {
  return hashEncadeado(a.hashAnterior, camposParaHash(a))
}

/**
 * Encadeia uma lista de aceites pendentes sobre um hash anterior.
 */
export function encadearAceites(
  pendentes: readonly AceitePendente[],
  ultimoHash: string = GENESIS,
): AceiteDocumento[] {
  let anterior = ultimoHash
  const resultado: AceiteDocumento[] = []

  for (const p of pendentes) {
    const semHash = { ...p, hashAnterior: anterior }
    const hash = hashDeAceite(semHash)
    const completo: AceiteDocumento = { ...semHash, hash }
    resultado.push(completo)
    anterior = hash
  }

  return resultado
}

/**
 * Verifica a integridade matemática da cadeia de aceites gravados.
 * Retorna true se todos os elos e hashes baterem, ou false em caso de adulteração.
 */
export function verificarCadeiaAceites(
  aceites: readonly AceiteDocumento[],
  hashInicial: string = GENESIS,
): boolean {
  let esperadoAnterior = hashInicial

  for (const a of aceites) {
    if (a.hashAnterior !== esperadoAnterior) {
      return false
    }
    const hashCalculado = hashDeAceite(a)
    if (hashCalculado !== a.hash) {
      return false
    }
    esperadoAnterior = a.hash
  }

  return true
}


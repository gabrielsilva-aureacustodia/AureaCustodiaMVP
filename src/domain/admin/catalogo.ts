/**
 * O catálogo de tipos de moeda editável pelo painel (frente C, C3 — plano do Admin, 3.1 e 3.3).
 *
 * `COIN_TYPES` (src/domain/constants.ts) é o padrão com que `aurea.tipos_moeda` nasce; depois
 * disso quem decide nome, ano padrão, tiragem, pasta, ficha, ordem na vitrine e o interruptor de
 * negociável é a tela de configuração — e `isNegociavel()` passa a consultar a tabela.
 *
 * A CHAVE NÃO MUDA DEPOIS DE CRIADA. Ela está gravada em moeda, envio, oferta e negociação; renomear
 * o tipo deixaria esses registros apontando para nada. Tipo que não deve mais receber moeda se
 * desativa. O texto exibido (`detail`) muda à vontade.
 *
 * Regra pura: sem I/O.
 */

import { COIN_TYPES } from '@/domain/constants'
import type { CoinType } from '@/domain/types'

export interface TipoMoedaGravado {
  chave: string
  anoPadrao: number
  tiragem: string
  categoria: string
  negociavel: boolean
  detail: string
  ord: number
  ativo: boolean
  criadoPor: string
  criadoEm: number
}

export interface EntradaTipoMoeda {
  chave: string
  anoPadrao: string | number
  tiragem: string
  categoria: string
  negociavel: boolean
  detail: string
  ord: string | number
  ativo: boolean
}

export type TipoMoedaValidado = Omit<TipoMoedaGravado, 'criadoPor' | 'criadoEm'>

/** Letras (com acento), dígitos, espaço e a pontuação que o catálogo já usa ("Rio 2016 – Estádio"). */
const CHAVE = /^[\p{L}\p{N}][\p{L}\p{N} .,'’()–-]{1,79}$/u

function inteiro(v: string | number, min: number, max: number): number | null {
  const t = String(v ?? '').trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= min && n <= max ? n : null
}

export function mesmaChave(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR')
}

export function validarTipoMoeda(
  e: EntradaTipoMoeda,
  existentes: readonly Pick<TipoMoedaGravado, 'chave'>[],
  criando: boolean,
): { ok: true; tipo: TipoMoedaValidado } | { ok: false; erro: string } {
  const chave = String(e?.chave ?? '').trim().replace(/\s+/g, ' ')
  if (!CHAVE.test(chave)) return { ok: false, erro: 'O nome do tipo usa letras, números e espaço, de 2 a 80 caracteres.' }
  const existente = existentes.find((x) => mesmaChave(x.chave, chave))
  if (criando && existente) return { ok: false, erro: `Já existe o tipo "${existente.chave}".` }
  if (!criando && !existente) return { ok: false, erro: `O tipo "${chave}" não está no catálogo.` }

  const anoPadrao = inteiro(e.anoPadrao, 1900, 2100)
  if (anoPadrao === null) return { ok: false, erro: 'O ano padrão é um ano de 1900 a 2100.' }
  const tiragem = String(e.tiragem ?? '').trim()
  if (tiragem.length > 40) return { ok: false, erro: 'A tiragem tem no máximo 40 caracteres.' }
  const categoria = String(e.categoria ?? '').trim().replace(/\s+/g, ' ')
  if (categoria.length < 2 || categoria.length > 60) return { ok: false, erro: 'A pasta (categoria) tem de 2 a 60 caracteres.' }
  const detail = String(e.detail ?? '').trim()
  if (detail.length > 200) return { ok: false, erro: 'A ficha técnica tem no máximo 200 caracteres.' }
  const ord = inteiro(e.ord, 0, 10000)
  if (ord === null) return { ok: false, erro: 'A ordem na vitrine é um número inteiro de 0 a 10.000.' }

  return {
    ok: true,
    tipo: {
      // Na edição vale a chave gravada, com a grafia original: ela está nas moedas.
      chave: existente && !criando ? existente.chave : chave,
      anoPadrao,
      tiragem,
      categoria,
      negociavel: e.negociavel === true,
      detail,
      ord,
      ativo: e.ativo !== false,
    },
  }
}

/** As linhas com que a tabela nasce: `COIN_TYPES` na ordem do código, de 10 em 10 para caber tipo no meio. */
export function linhasIniciaisDoCatalogo(): TipoMoedaValidado[] {
  return COIN_TYPES.map((t, i) => ({
    chave: t.key,
    anoPadrao: t.anoPadrao,
    tiragem: t.tiragem,
    categoria: t.categoria,
    negociavel: t.negociavel,
    detail: t.detail,
    ord: (i + 1) * 10,
    ativo: true,
  }))
}

/** O catálogo no formato do domínio, na ordem da vitrine. Vazio vira `COIN_TYPES`. */
export function catalogoDasLinhas(linhas: readonly TipoMoedaValidado[]): CoinType[] {
  if (linhas.length === 0) return COIN_TYPES.map((t) => ({ ...t, ativo: true }))
  return [...linhas]
    .sort((a, b) => a.ord - b.ord || a.chave.localeCompare(b.chave, 'pt-BR'))
    .map((l) => ({ key: l.chave, anoPadrao: l.anoPadrao, tiragem: l.tiragem, categoria: l.categoria, negociavel: l.negociavel, detail: l.detail, ativo: l.ativo }))
}

/** Os campos que mudaram, para a trilha e o histórico. */
export function camposDoTipoAlterados(antes: TipoMoedaValidado, depois: TipoMoedaValidado): string[] {
  const campos: Array<keyof TipoMoedaValidado> = ['anoPadrao', 'tiragem', 'categoria', 'negociavel', 'detail', 'ord', 'ativo']
  return campos.filter((c) => antes[c] !== depois[c])
}

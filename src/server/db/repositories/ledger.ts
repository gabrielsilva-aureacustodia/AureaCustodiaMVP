/**
 * Repositório de `aurea.ledger_entries` — o livro-razão.
 *
 * APPEND-ONLY: só existe `inserir` e leitura. Não há `atualizar` nem `remover`,
 * e não deve haver — a correção de um lançamento é outro lançamento
 * (`estorno`), nunca um UPDATE. O hash encadeado (src/domain/hash.ts) existe
 * justamente para que uma edição por fora do código seja detectável.
 *
 * `ultimoHash` é lido DENTRO da transação de escrita, que já está atrás da
 * trava de `aurea.seq` (ver estado.ts). É isso que garante que duas mutações
 * concorrentes não encadeiem as duas a partir do mesmo hash anterior: a
 * segunda espera a primeira commitar e lê o hash que ela gravou.
 *
 * `ORDER BY id` é a ordem do livro — e a ordem em que a cadeia se verifica.
 */

import { GENESIS } from '@/domain/hash'
import type { LedgerEntry, LedgerTipo, Sinal } from '@/domain/ledger'

import { nomeDoSchema, num, numOuNulo, type Consulta } from '../sql'

type LinhaLedger = {
  id: unknown
  created_at: unknown
  user_email: string
  tipo: string
  valor: unknown
  sinal: unknown
  saldo_apos: unknown
  tipo_moeda: string | null
  quantidade: unknown
  ref_interna: string | null
  ref_externa: string | null
  descricao: string
  hash_anterior: string
  hash: string
}

/** O lançamento como sai do banco: com `id`, que o domínio não conhece ao criar. */
export interface LedgerEntryGravado extends LedgerEntry {
  id: number
}

const COLUNAS =
  'id, created_at, user_email, tipo, valor, sinal, saldo_apos, tipo_moeda, quantidade, ref_interna, ref_externa, descricao, hash_anterior, hash'

function paraEntry(r: LinhaLedger): LedgerEntryGravado {
  return {
    id: num(r.id),
    createdAt: num(r.created_at),
    userEmail: r.user_email,
    tipo: r.tipo as LedgerTipo,
    valor: num(r.valor),
    sinal: num(r.sinal) as Sinal,
    saldoApos: num(r.saldo_apos),
    tipoMoeda: r.tipo_moeda,
    quantidade: numOuNulo(r.quantidade),
    refInterna: r.ref_interna,
    refExterna: r.ref_externa,
    descricao: r.descricao,
    hashAnterior: r.hash_anterior,
    hash: r.hash,
  }
}

/** O hash do último lançamento gravado, ou GENESIS num livro vazio. */
export async function ultimoHash(tx: Consulta): Promise<string> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ hash: string }>(
    `SELECT hash FROM ${S}.ledger_entries ORDER BY id DESC LIMIT 1`,
  )
  return rows[0]?.hash ?? GENESIS
}

export async function inserirLancamentos(tx: Consulta, lancamentos: readonly LedgerEntry[]): Promise<void> {
  const S = nomeDoSchema()
  // Sequencial de propósito: a ordem de inserção é a ordem do livro, e o id
  // serial precisa acompanhar a cadeia de hashes.
  for (const l of lancamentos) {
    await tx.query(
      `INSERT INTO ${S}.ledger_entries
         (created_at, user_email, tipo, valor, sinal, saldo_apos, tipo_moeda, quantidade,
          ref_interna, ref_externa, descricao, hash_anterior, hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        l.createdAt,
        l.userEmail,
        l.tipo,
        l.valor,
        l.sinal,
        l.saldoApos,
        l.tipoMoeda,
        l.quantidade,
        l.refInterna,
        l.refExterna,
        l.descricao,
        l.hashAnterior,
        l.hash,
      ],
    )
  }
}

export interface FiltroLedger {
  userEmail?: string
  tipo?: LedgerTipo
  /** Início inclusivo, ms. */
  de?: number
  /** Fim exclusivo, ms. */
  ate?: number
  limite?: number
}

/** Lê o livro (ou um recorte dele) na ordem de gravação. */
export async function listarLancamentos(tx: Consulta, filtro: FiltroLedger = {}): Promise<LedgerEntryGravado[]> {
  const S = nomeDoSchema()
  const condicoes: string[] = []
  const valores: unknown[] = []
  const param = (v: unknown): string => {
    valores.push(v)
    return `$${valores.length}`
  }
  if (filtro.userEmail) condicoes.push(`user_email = ${param(filtro.userEmail)}`)
  if (filtro.tipo) condicoes.push(`tipo = ${param(filtro.tipo)}`)
  if (filtro.de !== undefined) condicoes.push(`created_at >= ${param(filtro.de)}`)
  if (filtro.ate !== undefined) condicoes.push(`created_at < ${param(filtro.ate)}`)
  const where = condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : ''
  const limit = filtro.limite ? ` LIMIT ${param(filtro.limite)}` : ''
  const { rows } = await tx.query<LinhaLedger>(
    `SELECT ${COLUNAS} FROM ${S}.ledger_entries${where} ORDER BY id${limit}`,
    valores,
  )
  return rows.map(paraEntry)
}

/** Saldo de cada conta pela soma do livro — para conferir contra `users.balance`. */
export async function saldosPeloLedger(tx: Consulta): Promise<Record<string, number>> {
  const S = nomeDoSchema()
  const { rows } = await tx.query<{ user_email: string; saldo: unknown }>(
    `SELECT user_email, COALESCE(SUM(valor * sinal), 0) AS saldo
       FROM ${S}.ledger_entries GROUP BY user_email`,
  )
  const saida: Record<string, number> = {}
  for (const r of rows) saida[r.user_email] = num(r.saldo)
  return saida
}

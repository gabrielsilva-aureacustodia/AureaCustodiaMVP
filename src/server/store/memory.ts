import type { StateStore, StoreKind } from './types'

/**
 * Store em memória — o modo de desenvolvimento sem infraestrutura nenhuma.
 *
 * O Map vive no escopo do módulo, então sobrevive entre requisições do mesmo
 * processo `next dev` e morre junto com ele. Em serverless isso quer dizer que
 * cada cold start recomeça do zero; o aviso a respeito é emitido em index.ts,
 * onde a escolha do backend acontece.
 *
 * Guardamos a STRING JSON, não o objeto. Não é economia de memória: é para o
 * store em memória ter exatamente a mesma semântica dos remotos — o que sai de
 * `get` é sempre uma cópia recém-desserializada, e uma referência antiga
 * segurada por um chamador não consegue alterar o que está gravado pelas
 * costas. Sem isso, um bug de mutação acidental só apareceria em produção.
 */

const documents = new Map<string, string>()

export function createMemoryStore(): StateStore {
  const kind: StoreKind = 'memory'

  return {
    kind,

    async get<T>(key: string): Promise<T | null> {
      const raw = documents.get(key)
      if (raw === undefined) return null
      // JSON.parse devolve `any`; este é o único ponto do módulo onde o tipo
      // é afirmado, e ele é garantido pelo par set/get da mesma chave.
      return JSON.parse(raw) as T
    },

    async set<T>(key: string, value: T): Promise<void> {
      documents.set(key, JSON.stringify(value))
    },

    async mutate<T, S>(
      key: string,
      mutator: (current: S | null) => S | Promise<S>,
      pick: (s: S) => T,
    ): Promise<{ state: S; result: T }> {
      const raw = documents.get(key)
      const current = raw === undefined ? null : (JSON.parse(raw) as S)
      const next = await mutator(current)
      documents.set(key, JSON.stringify(next))
      return { state: next, result: pick(next) }
    },
  }
}

import type { StateStore, StoreKind } from './types'

/**
 * Store sobre a API REST da Upstash (Vercel KV é a mesma coisa com outro nome
 * nas variáveis de ambiente).
 *
 * Falamos HTTP puro com `fetch` nativo de propósito: o cliente oficial traria
 * uma dependência inteira para fazer exatamente estas duas chamadas, e o
 * runtime da Vercel já entrega o fetch. Menos pacote, menos cold start.
 *
 *   GET  -> POST <url>/get/<chave>
 *   SET  -> POST <url>/set/<chave>   com o valor no corpo da requisição
 *
 * As respostas vêm sempre embrulhadas em { result: ... }. O valor guardado é a
 * string JSON do documento — a mesma que o MVP passava para window.storage.set.
 */

export interface RedisStoreConfig {
  /** Base REST, sem barra final. Ex.: https://xxx.upstash.io */
  url: string
  token: string
}

/** Envelope de resposta da Upstash. `result` é null quando a chave não existe. */
interface UpstashResponse {
  result?: string | null
  error?: string
}

export function createRedisStore(config: RedisStoreConfig): StateStore {
  const kind: StoreKind = 'redis'
  const base = config.url.replace(/\/+$/, '')

  const authHeader = `Bearer ${config.token}`

  async function call(path: string, body?: string): Promise<string | null> {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        // O corpo do SET é o valor cru, não um JSON de comando.
        'Content-Type': 'text/plain',
      },
      body,
      // O fetch do Next é instrumentado com cache; estado de aplicação nunca
      // pode ser servido de cache, nem por um instante.
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error(`Upstash HTTP ${res.status} em ${path}`)
    }

    const payload: UpstashResponse = await res.json()
    if (payload.error) {
      throw new Error(`Upstash: ${payload.error}`)
    }
    return payload.result ?? null
  }

  async function read<T>(key: string): Promise<T | null> {
    const raw = await call(`/get/${encodeURIComponent(key)}`)
    if (raw === null || raw === '') return null
    // JSON.parse devolve `any`; o tipo é garantido pelo par set/get da chave.
    return JSON.parse(raw) as T
  }

  async function write<T>(key: string, value: T): Promise<void> {
    await call(`/set/${encodeURIComponent(key)}`, JSON.stringify(value))
  }

  return {
    kind,

    get: read,
    set: write,

    async mutate<T, S>(
      key: string,
      mutator: (current: S | null) => S | Promise<S>,
      pick: (s: S) => T,
    ): Promise<{ state: S; result: T }> {
      // Leitura -> modificação -> escrita, sem trava. Duas requisições
      // simultâneas que mexam no mesmo documento resultam em "última gravação
      // vence": a segunda sobrescreve o que a primeira acabou de gravar.
      //
      // É exatamente o comportamento do MVP, que fazia loadState/saveState
      // sobre uma chave compartilhada única. A Seção 4.6 do documento técnico
      // registra esse limite conscientemente — a mitigação de verdade é o
      // backend Postgres (SELECT ... FOR UPDATE em postgres.ts). Aqui não
      // simulamos trava com WATCH/Lua para não divergir do original.
      const current = await read<S>(key)
      const next = await mutator(current)
      await write(key, next)
      return { state: next, result: pick(next) }
    },
  }
}

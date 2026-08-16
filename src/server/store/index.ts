import { createMemoryStore } from './memory'
import { createPostgresStore } from './postgres'
import { createRedisStore } from './redis'
import type { StateStore } from './types'

export type { StateStore, StoreKind } from './types'

/**
 * Escolha do backend de persistência.
 *
 * A ordem de prioridade não é arbitrária: o Postgres vem primeiro porque é o
 * único que resolve concorrência de verdade (transação com FOR UPDATE); o
 * Redis vem depois como "melhor que nada, com última gravação vencendo"; e a
 * memória fecha a lista para que `npm run dev` funcione sem infraestrutura
 * alguma. Nenhuma variável de ambiente precisa ser criada à mão: o mesmo
 * código roda nos três cenários.
 *
 * As variáveis do Vercel KV (KV_REST_API_*) têm precedência sobre as da
 * Upstash direta (UPSTASH_REDIS_REST_*) porque, quando as duas existem, é
 * porque o projeto foi ligado pelo painel da Vercel — e é essa a conexão que o
 * painel mantém rotacionada.
 */

// Singleton de módulo, criado sob demanda: em serverless o processo é
// reaproveitado entre invocações, então instanciar por requisição desperdiçaria
// pool de conexões e repetiria o aviso do modo memória a cada chamada.
let store: StateStore | null = null

function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.length > 0 ? v : undefined
}

function createStore(): StateStore {
  const postgresUrl = env('POSTGRES_URL') ?? env('DATABASE_URL')
  if (postgresUrl) {
    return createPostgresStore(postgresUrl)
  }

  const kvUrl = env('KV_REST_API_URL')
  const kvToken = env('KV_REST_API_TOKEN')
  if (kvUrl && kvToken) {
    return createRedisStore({ url: kvUrl, token: kvToken })
  }

  const upstashUrl = env('UPSTASH_REDIS_REST_URL')
  const upstashToken = env('UPSTASH_REDIS_REST_TOKEN')
  if (upstashUrl && upstashToken) {
    return createRedisStore({ url: upstashUrl, token: upstashToken })
  }

  console.warn(
    '[aurea] Nenhuma persistência configurada — usando store EM MEMÓRIA. ' +
      'O estado (contas, moedas, ofertas, negociações) é recriado do seed a cada ' +
      'cold start e some quando o processo morre; em serverless isso acontece o ' +
      'tempo todo. Para persistir de verdade, defina POSTGRES_URL (ou DATABASE_URL), ' +
      'ou KV_REST_API_URL + KV_REST_API_TOKEN, ou UPSTASH_REDIS_REST_URL + ' +
      'UPSTASH_REDIS_REST_TOKEN.',
  )
  return createMemoryStore()
}

export function getStore(): StateStore {
  store ??= createStore()
  return store
}

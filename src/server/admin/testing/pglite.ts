/**
 * O Postgres embutido dos testes do painel — e SÓ deles.
 *
 * É o mesmo executor de src/server/db/db.test.ts (PGlite: Postgres compilado para
 * WebAssembly, dentro do processo do Vitest, sem Docker e sem rede), num arquivo
 * próprio para que os testes da frente C não precisem importar de dentro de outro
 * arquivo de teste. A migration aplicada é a MESMA SQL que vai para o Supabase.
 *
 * Um cuidado que vem do README de src/server/db/: cada instância do PGlite ocupa
 * memória de verdade, e várias ao mesmo tempo derrubam workers do Vitest em
 * silêncio. Por isso os testes de banco do painel vivem num arquivo só
 * (`../banco.test.ts`), com uma instância.
 */

import { PGlite } from '@electric-sql/pglite'

import { aplicarMigrations } from '@/server/db/migrar'
import type { Consulta, Executor } from '@/server/db/sql'

/** Uma transação por chamada; instruções sem parâmetro podem ser várias (migrations). */
export function executorPGlite(db: PGlite): Executor {
  return (fn) =>
    db.transaction(async (tx) => {
      const consulta: Consulta = {
        async query<R extends Record<string, unknown>>(texto: string, valores?: readonly unknown[]) {
          if (!valores || valores.length === 0) {
            const resultados = await tx.exec(texto)
            const ultimo = resultados[resultados.length - 1]
            return { rows: (ultimo?.rows ?? []) as R[] }
          }
          const r = await tx.query<R>(texto, [...valores])
          return { rows: r.rows }
        },
      }
      return fn(consulta)
    })
}

export interface BancoDeTeste {
  db: PGlite
  executar: Executor
  fechar(): Promise<void>
}

/** Sobe o Postgres embutido com todas as migrations aplicadas, no schema padrão. */
export async function bancoDeTeste(): Promise<BancoDeTeste> {
  const db = new PGlite()
  const executar = executorPGlite(db)
  await aplicarMigrations(executar)
  return { db, executar, fechar: () => db.close() }
}

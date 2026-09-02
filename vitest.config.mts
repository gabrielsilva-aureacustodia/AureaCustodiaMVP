/**
 * Configuração do Vitest — a rede de testes do domínio (item CD-03).
 *
 * O alias `@` é obrigatório: sem ele, os imports de `@/domain/...` não
 * resolvem no teste e a suíte inteira falha por motivo que não é dela.
 *
 * `environment: 'node'`: regra pura de src/domain/ (sem React, sem DOM) e,
 * desde 02/09/2026, a camada de banco em src/server/db/ — que roda contra
 * um Postgres real embutido (PGlite), sem infraestrutura.
 *
 * Módulos com `import 'server-only'` continuam FORA da suíte: o pacote
 * estoura fora do contexto de servidor do Next, e é assim que deve ser —
 * essa é a barreira do CD-04 funcionando. Em src/server/db/ só client.ts
 * tem a barreira; o resto é parametrizado pelo Executor e por isso testável.
 */

import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})

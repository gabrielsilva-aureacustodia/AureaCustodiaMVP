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
 *
 * `oxc.jsx` (15/09/2026): o tsconfig do Next usa `"jsx": "preserve"` — quem transforma JSX
 * é o Next —, e sem esta linha um teste que importa `page.tsx` ou componente falha com
 * "make sure to not set jsx to preserve". Entrou na main antes das branches de execução
 * E5 e E6 (docs/execucao-pendencias/), que renderizam telas, para as duas não
 * escreverem versões diferentes do mesmo bloco.
 */

import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
})

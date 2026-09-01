/**
 * Configuração do Vitest — a rede de testes do domínio (item CD-03).
 *
 * O alias `@` é obrigatório: sem ele, os imports de `@/domain/...` não
 * resolvem no teste e a suíte inteira falha por motivo que não é dela.
 *
 * `environment: 'node'` porque tudo que se testa aqui é regra pura de
 * src/domain/ — sem React, sem DOM, sem I/O. Módulos de src/server/ NÃO
 * entram na suíte: eles importam 'server-only', que estoura fora do
 * contexto de servidor do Next (e é assim que deve ser — essa é a barreira
 * do CD-04 funcionando).
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

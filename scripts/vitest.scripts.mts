/**
 * Config separada para os executores de uso único de `scripts/`.
 *
 * A config principal tem `include: ['src/**​/*.test.ts']`, e é por isso que um
 * executor aqui fora NÃO entra no `npm test` — que é exatamente a proteção
 * desejada: nenhum deles roda contra o banco de produção por acidente. O preço
 * é que nem o `vitest run <caminho>` explícito os encontra, porque o filtro é
 * aplicado sobre o include. Daí esta config, usada só quando chamada pelo nome.
 */
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': resolve(import.meta.dirname, '..', 'src') } },
  test: {
    include: ['scripts/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120000,
    root: resolve(import.meta.dirname, '..'),
  },
})

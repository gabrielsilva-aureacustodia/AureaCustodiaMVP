// Gera a semente do store em memória (ver semear-store-local.cjs). Só roda com SEMENTE_SAIDA definida, para não
// entrar na suíte normal (o vitest só procura testes em src/; este arquivo roda com --dir apontado para cá).
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { STORE_KEY } from '@/domain/constants'
import { seedState } from '@/domain/seed'

it.skipIf(!process.env.SEMENTE_SAIDA)('gera a semente local', () => {
  writeFileSync(process.env.SEMENTE_SAIDA as string, JSON.stringify({ key: STORE_KEY, state: seedState() }))
})

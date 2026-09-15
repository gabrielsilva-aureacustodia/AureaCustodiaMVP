/**
 * Testes unitários de `barrarContaDesativada` e `ehIdentidadeBloqueada`.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/server/admin/situacao', () => ({
  contaDesativada: vi.fn(),
}))

import { contaDesativada } from '@/server/admin/situacao'
import {
  barrarContaDesativada,
  ehIdentidadeBloqueada,
  SAIDA_DA_CONTA_DESATIVADA,
} from './conta-desativada'

describe('conta-desativada nas portas de entrada (P-C2-04)', () => {
  it('barrarContaDesativada responde o que contaDesativada responde', async () => {
    vi.mocked(contaDesativada).mockResolvedValueOnce(true)
    await expect(barrarContaDesativada('bloqueado@teste.com')).resolves.toBe(true)

    vi.mocked(contaDesativada).mockResolvedValueOnce(false)
    await expect(barrarContaDesativada('ativo@teste.com')).resolves.toBe(false)
  })

  it('exceção de contaDesativada libera a conta', async () => {
    vi.mocked(contaDesativada).mockRejectedValueOnce(new Error('Banco indisponível'))
    await expect(barrarContaDesativada('qualquer@teste.com')).resolves.toBe(false)
  })

  it('ehIdentidadeBloqueada reconhece user_banned pelo código e pela mensagem', () => {
    expect(ehIdentidadeBloqueada({ code: 'user_banned' })).toBe(true)
    expect(ehIdentidadeBloqueada({ message: 'User is banned' })).toBe(true)
    expect(ehIdentidadeBloqueada({ message: 'Error: user is BANNED from system' })).toBe(true)
    expect(ehIdentidadeBloqueada({ code: 'invalid_credentials' })).toBe(false)
    expect(ehIdentidadeBloqueada({ message: 'Invalid login credentials' })).toBe(false)
    expect(ehIdentidadeBloqueada(null)).toBe(false)
    expect(ehIdentidadeBloqueada(undefined)).toBe(false)
  })

  it('o 401 do AppProvider leva ao endereço de saída', () => {
    const providerPath = resolve(process.cwd(), 'src/components/providers/AppProvider.tsx')
    const providerCode = readFileSync(providerPath, 'utf-8')

    expect(providerCode).toContain(`window.location.assign('${SAIDA_DA_CONTA_DESATIVADA}')`)
    expect(providerCode).not.toContain("router.replace('/')")
  })
})

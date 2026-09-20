import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mutateStateMock } = vi.hoisted(() => ({ mutateStateMock: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock }))

import { seedState } from '@/domain/seed'
import type { AppState } from '@/domain/types'
import {
  MOEDAS_INICIAIS,
  provisionAuthenticatedUser,
  SALDO_INICIAL,
} from './provisioning'

let state: AppState

beforeEach(() => {
  state = seedState()
  mutateStateMock.mockReset()
  mutateStateMock.mockImplementation(async (mutator: (current: AppState) => unknown) => ({
    state,
    result: await mutator(state),
  }))
})

describe('provisionAuthenticatedUser', () => {
  it('cria a conta ZERADA para uma nova identidade confirmada', async () => {
    const result = await provisionAuthenticatedUser(' Nova@Exemplo.com ', 'Nova Sócia')
    const user = state.users['nova@exemplo.com']

    expect(result).toEqual({ created: true, email: 'nova@exemplo.com' })
    expect(user.name).toBe('Nova Sócia')
    // O valor destas duas asserções é ser exatamente zero: até 20/09/2026 uma
    // conta nova nascia com R$ 5.000 e 6 moedas, e num site publicado isso é
    // saldo que ninguém depositou e moeda que ninguém enviou.
    expect(user.balance).toBe(0)
    expect(user.coins).toHaveLength(0)
    expect(SALDO_INICIAL).toBe(0)
    expect(MOEDAS_INICIAIS).toBe(0)
  })

  it('é idempotente e não altera a conta existente', async () => {
    await provisionAuthenticatedUser('nova@exemplo.com', 'Nova Sócia')
    state.users['nova@exemplo.com'].balance = 12_345
    const result = await provisionAuthenticatedUser('NOVA@EXEMPLO.COM', 'Nome alterado')

    expect(result.created).toBe(false)
    // Chegada repetida do callback não pode zerar saldo de quem já depositou.
    expect(state.users['nova@exemplo.com'].balance).toBe(12_345)
    expect(state.users['nova@exemplo.com'].name).toBe('Nova Sócia')
  })
})

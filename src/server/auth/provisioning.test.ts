import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mutateStateMock } = vi.hoisted(() => ({ mutateStateMock: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock }))

import { seedState } from '@/domain/seed'
import type { AppState } from '@/domain/types'
import {
  MOEDAS_MOCK_INICIAIS,
  provisionAuthenticatedUser,
  SALDO_MOCK_INICIAL,
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
  it('cria dados mockados para uma nova identidade confirmada', async () => {
    const result = await provisionAuthenticatedUser(' Nova@Exemplo.com ', 'Nova Sócia')
    const user = state.users['nova@exemplo.com']

    expect(result).toEqual({ created: true, email: 'nova@exemplo.com' })
    expect(user.name).toBe('Nova Sócia')
    expect(user.balance).toBe(SALDO_MOCK_INICIAL)
    expect(user.coins).toHaveLength(MOEDAS_MOCK_INICIAIS)
  })

  it('é idempotente e não recria o acervo de uma conta existente', async () => {
    await provisionAuthenticatedUser('nova@exemplo.com', 'Nova Sócia')
    const coinIds = state.users['nova@exemplo.com'].coins.map((coin) => coin.id)
    const result = await provisionAuthenticatedUser('NOVA@EXEMPLO.COM', 'Nome alterado')

    expect(result.created).toBe(false)
    expect(state.users['nova@exemplo.com'].coins.map((coin) => coin.id)).toEqual(coinIds)
    expect(state.users['nova@exemplo.com'].name).toBe('Nova Sócia')
  })
})

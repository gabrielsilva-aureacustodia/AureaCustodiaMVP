/**
 * Nenhum caminho de criação duplica uma pessoa em `state.users`.
 *
 * Os três pontos que criam conta — Admin > Usuários (`criarUsuario`), cadastro público e
 * callback do Google (`provisionAuthenticatedUser`) e a autorização do login — dividem o
 * mesmo `AppState`. Aqui eles rodam sobre UM estado em memória, com o e-mail em todas as
 * variações de caixa e espaço, e o teste afirma que sempre sobra uma entrada só.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mutateStateMock, getStateMock } = vi.hoisted(() => ({ mutateStateMock: vi.fn(), getStateMock: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock, getState: getStateMock }))

import type { AppState } from '@/domain/types'
import { seedState } from '@/domain/seed'
import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'

import { criarUsuario, type PortaDeEstado, type PortaDeIdentidade } from './usuarios'

let state: AppState

/** Porta em memória. `ler` devolve um retrato, como o banco faz: a validação vê o estado de ANTES. */
function portaEmMemoria(): PortaDeEstado {
  return {
    ler: async () => structuredClone(state),
    mutarComTrilha: async (fn) => fn(state),
  }
}

const SEM_IDENTIDADE = { configurada: false, faltando: [] } as unknown as PortaDeIdentidade

const entrada = (email: string, nome = 'Pessoa Teste') => ({ email, nome, senha: '', demonstracao: false })
const emailsParecidos = (base: string) => Object.keys(state.users).filter((k) => k.trim().toLowerCase() === base)

beforeEach(() => {
  state = seedState()
  mutateStateMock.mockReset()
  mutateStateMock.mockImplementation(async (mutator: (s: AppState) => unknown) => ({ state, result: await mutator(state) }))
  getStateMock.mockReset()
  getStateMock.mockImplementation(async () => state)
})

describe('uma pessoa, uma entrada em state.users', () => {
  it('criar pelo Admin e depois pelo cadastro público, com caixa e espaço diferentes, não duplica', async () => {
    const r = await criarUsuario(portaEmMemoria(), SEM_IDENTIDADE, 'admin@x.com', entrada('  Pessoa@Exemplo.com '))
    expect(r.ok).toBe(true)

    const publico = await provisionAuthenticatedUser('PESSOA@exemplo.COM', 'Nome do cadastro')
    expect(publico).toEqual({ created: false, email: 'pessoa@exemplo.com' })
    expect(emailsParecidos('pessoa@exemplo.com')).toEqual(['pessoa@exemplo.com'])
    // Reconhecida, não sobrescrita: o nome que o atendente digitou continua.
    expect(state.users['pessoa@exemplo.com'].name).toBe('Pessoa Teste')
  })

  it('cadastro público primeiro e Admin depois: o Admin recusa em vez de criar a segunda conta', async () => {
    await provisionAuthenticatedUser(' Outra@Exemplo.com ', 'Outra')
    const r = await criarUsuario(portaEmMemoria(), SEM_IDENTIDADE, 'admin@x.com', entrada('outra@EXEMPLO.com'))
    expect(r).toMatchObject({ ok: false })
    expect(emailsParecidos('outra@exemplo.com')).toHaveLength(1)
  })

  it('conta legada gravada com maiúscula é reconhecida pelas duas portas, nunca ganha irmã normalizada', async () => {
    state.users['Legada@Exemplo.com'] = { name: 'Legada', balance: 777, coins: [] }

    expect(await criarUsuario(portaEmMemoria(), SEM_IDENTIDADE, 'admin@x.com', entrada('legada@exemplo.com'))).toMatchObject({ ok: false })
    expect((await provisionAuthenticatedUser('legada@exemplo.com', 'Legada')).created).toBe(false)
    expect(await authorizeProvisionedUser('LEGADA@exemplo.com')).toBe(true)

    expect(emailsParecidos('legada@exemplo.com')).toEqual(['Legada@Exemplo.com'])
    expect(state.users['Legada@Exemplo.com'].balance).toBe(777)
  })

  it('duas criações simultâneas do mesmo e-mail: só uma entra (o guarda dentro da mutação fecha a corrida)', async () => {
    const porta = portaEmMemoria()
    const [a, b] = await Promise.all([
      criarUsuario(porta, SEM_IDENTIDADE, 'admin@x.com', entrada('corrida@exemplo.com')),
      criarUsuario(porta, SEM_IDENTIDADE, 'admin@x.com', entrada(' CORRIDA@exemplo.com ')),
    ])
    expect([a.ok, b.ok].sort()).toEqual([false, true])
    expect(emailsParecidos('corrida@exemplo.com')).toHaveLength(1)
  })

  it('cadastro público e Admin ao mesmo tempo: uma conta só, qualquer que seja a ordem de chegada', async () => {
    await Promise.all([
      provisionAuthenticatedUser('Mista@Exemplo.com', 'Mista'),
      criarUsuario(portaEmMemoria(), SEM_IDENTIDADE, 'admin@x.com', entrada('mista@exemplo.com')),
    ])
    expect(emailsParecidos('mista@exemplo.com')).toHaveLength(1)
  })
})

describe('troca de e-mail sem banco', () => {
  it('recusa e-mail que já é de outra conta em vez de sobrescrevê-la', async () => {
    const { renomearEmailNoAppState } = await import('@/server/db/repositories/users')
    state.users['a@exemplo.com'] = { name: 'A', balance: 100, coins: [] }
    state.users['b@exemplo.com'] = { name: 'B', balance: 900, coins: [] }
    expect(() => renomearEmailNoAppState(state, 'a@exemplo.com', ' B@Exemplo.com ')).toThrow('Já existe uma conta')
    expect(state.users['b@exemplo.com'].balance).toBe(900)
    expect(state.users['a@exemplo.com']).toBeDefined()
  })
})

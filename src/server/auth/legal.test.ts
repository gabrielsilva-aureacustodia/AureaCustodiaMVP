import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mutateStateMock, getStateMock, cookiesMock } = vi.hoisted(() => ({
  mutateStateMock: vi.fn(),
  getStateMock: vi.fn(),
  cookiesMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/server/state', () => ({
  getState: getStateMock,
  mutateState: mutateStateMock,
}))
vi.mock('@/server/auth/client', () => ({
  createAuthClient: vi.fn().mockResolvedValue({
    auth: {
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}))
vi.mock('@/server/auth/config', () => ({
  getRegistrationStatus: vi.fn().mockReturnValue({
    enabled: true,
    authConfigured: false,
    termsVersion: '1.0-2026-09-10',
    privacyVersion: '1.0-2026-09-10',
  }),
  isAuthConfigured: vi.fn().mockReturnValue(false),
}))

import { TODOS_OS_BLOCOS_IDS } from '@/domain/legal'
import { seedState } from '@/domain/seed'
import type { AppState } from '@/domain/types'
import {
  consumePendingLegalAcceptance,
  exigirAceiteLegal,
  obterStatusAceiteLegal,
  registrarAceiteLegal,
  setPendingLegalAcceptance,
} from './legal'

let state: AppState
let cookieStore: Map<string, { value: string }>

beforeEach(() => {
  state = seedState()
  cookieStore = new Map()

  getStateMock.mockReset()
  getStateMock.mockImplementation(async () => state)

  mutateStateMock.mockReset()
  mutateStateMock.mockImplementation(async (mutator: (current: AppState) => unknown) => ({
    state,
    result: await mutator(state),
  }))

  cookiesMock.mockReset()
  cookiesMock.mockImplementation(async () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => {
      cookieStore.set(name, { value })
    },
    delete: (name: string) => {
      cookieStore.delete(name)
    },
  }))
})

describe('Módulo de Servidor · Aceite Legal (legal.ts)', () => {
  describe('OAuth Cookies (setPendingLegalAcceptance & consumePendingLegalAcceptance)', () => {
    it('grava e recupera versões e blocos aceitos no cookie assinado', async () => {
      await setPendingLegalAcceptance(
        {
          enabled: true,
          authConfigured: true,
          termsVersion: '1.0-2026-09-10',
          privacyVersion: '1.0-2026-09-10',
        },
        [...TODOS_OS_BLOCOS_IDS],
      )

      expect(cookieStore.has('aurea_oauth_legal')).toBe(true)

      const consumido = await consumePendingLegalAcceptance()
      expect(consumido).not.toBeNull()
      expect(consumido?.termsVersion).toBe('1.0-2026-09-10')
      expect(consumido?.privacyVersion).toBe('1.0-2026-09-10')
      expect(consumido?.blocks).toEqual(TODOS_OS_BLOCOS_IDS)

      // Após o consumo, o cookie deve ter sido excluído
      expect(cookieStore.has('aurea_oauth_legal')).toBe(false)
    })

    it('recusa cookie adulterado ou com assinatura divergente', async () => {
      await setPendingLegalAcceptance({
        enabled: true,
        authConfigured: true,
        termsVersion: '1.0-2026-09-10',
        privacyVersion: '1.0-2026-09-10',
      })

      const raw = cookieStore.get('aurea_oauth_legal')!.value
      const parts = raw.split('.')
      // Adulterar assinatura
      cookieStore.set('aurea_oauth_legal', { value: `${parts[0]}.assinatura_falsa` })

      const consumido = await consumePendingLegalAcceptance()
      expect(consumido).toBeNull()
    })
  })

  describe('obterStatusAceiteLegal', () => {
    const email = 'rogeriopena@testeaurea.com.br'

    it('identifica conta sem aceite (nova ou sem marcação)', async () => {
      const status = await obterStatusAceiteLegal(email)
      expect(status.aceito).toBe(false)
      expect(status.aceite).toBeNull()
      expect(status.blocosFaltando).toEqual(TODOS_OS_BLOCOS_IDS)
      expect(status.versaoTermos).toBe('1.0-2026-09-10')
    })

    it('identifica conta com aceite vigente e completo', async () => {
      state.users[email].settings = {
        twoFA: false,
        notifEnvios: true,
        notifNegociacoes: true,
        notifNovidades: false,
        legalAcceptance: {
          termsVersion: '1.0-2026-09-10',
          privacyVersion: '1.0-2026-09-10',
          acceptedAt: new Date().toISOString(),
          blocks: [...TODOS_OS_BLOCOS_IDS],
        },
      }

      const status = await obterStatusAceiteLegal(email)
      expect(status.aceito).toBe(true)
      expect(status.aceite).not.toBeNull()
      expect(status.blocosFaltando).toEqual([])
    })

    it('identifica conta com versão desatualizada como não aceita', async () => {
      state.users[email].settings = {
        twoFA: false,
        notifEnvios: true,
        notifNegociacoes: true,
        notifNovidades: false,
        legalAcceptance: {
          termsVersion: 'RASCUNHO-0.1-2026-09-02',
          privacyVersion: '1.0-2026-09-10',
          acceptedAt: new Date().toISOString(),
          blocks: [...TODOS_OS_BLOCOS_IDS],
        },
      }

      const status = await obterStatusAceiteLegal(email)
      expect(status.aceito).toBe(false)
    })
  })

  describe('registrarAceiteLegal', () => {
    const email = 'rogeriopena@testeaurea.com.br'

    it('recusa submissão com blocos incompletos', async () => {
      const res = await registrarAceiteLegal(email, ['moeda_equiparavel', 'prazos_d3_d30'])
      expect(res.ok).toBe(false)
      expect(res.error).toContain('Todos os blocos de condições operacionais')
      expect(state.users[email].settings?.legalAcceptance).toBeUndefined()
    })

    it('persiste aceite no estado quando todos os 6 blocos constam', async () => {
      const res = await registrarAceiteLegal(email, [...TODOS_OS_BLOCOS_IDS])
      expect(res.ok).toBe(true)
      expect(res.data?.termsVersion).toBe('1.0-2026-09-10')
      expect(res.data?.privacyVersion).toBe('1.0-2026-09-10')
      expect(res.data?.blocks).toEqual(TODOS_OS_BLOCOS_IDS)

      expect(state.users[email].settings?.legalAcceptance).toBeDefined()
      expect(state.users[email].settings?.legalAcceptance?.blocks).toEqual(TODOS_OS_BLOCOS_IDS)
    })
  })

  describe('exigirAceiteLegal (Trava Operacional)', () => {
    const email = 'rogeriopena@testeaurea.com.br'

    it('rejeita operação para conta sem aceite com código de bloqueio', async () => {
      const res = await exigirAceiteLegal(email)
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe('LEGAL_ACCEPTANCE_REQUIRED')
        expect(res.error).toContain('É necessário confirmar as condições operacionais')
      }
    })

    it('autoriza operação para conta com aceite vigente', async () => {
      await registrarAceiteLegal(email, [...TODOS_OS_BLOCOS_IDS])
      const res = await exigirAceiteLegal(email)
      expect(res.ok).toBe(true)
    })
  })
})

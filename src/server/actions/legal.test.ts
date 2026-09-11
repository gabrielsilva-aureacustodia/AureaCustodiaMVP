import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSessionEmailMock, registrarAceiteLegalMock, obterStatusAceiteLegalMock } =
  vi.hoisted(() => ({
    getSessionEmailMock: vi.fn(),
    registrarAceiteLegalMock: vi.fn(),
    obterStatusAceiteLegalMock: vi.fn(),
  }))

vi.mock('@/server/session', () => ({
  getSessionEmail: getSessionEmailMock,
}))

vi.mock('@/server/auth/legal', () => ({
  registrarAceiteLegal: registrarAceiteLegalMock,
  obterStatusAceiteLegal: obterStatusAceiteLegalMock,
}))

import { TODOS_OS_BLOCOS_IDS } from '@/domain/legal'
import { consultarStatusAceiteLegal, salvarAceiteLegal } from './legal'

beforeEach(() => {
  getSessionEmailMock.mockReset()
  registrarAceiteLegalMock.mockReset()
  obterStatusAceiteLegalMock.mockReset()
})

describe('Server Actions · Aceite Legal (actions/legal.ts)', () => {
  it('rejeita salvarAceiteLegal se a sessão estiver expirada', async () => {
    getSessionEmailMock.mockResolvedValue(null)

    const res = await salvarAceiteLegal([...TODOS_OS_BLOCOS_IDS])
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Sessão expirada.')
    expect(registrarAceiteLegalMock).not.toHaveBeenCalled()
  })

  it('delega salvarAceiteLegal ao módulo de auth quando a sessão for válida', async () => {
    getSessionEmailMock.mockResolvedValue('rogeriopena@testeaurea.com.br')
    registrarAceiteLegalMock.mockResolvedValue({ ok: true, message: 'Aceito.' })

    const res = await salvarAceiteLegal([...TODOS_OS_BLOCOS_IDS])
    expect(res.ok).toBe(true)
    expect(registrarAceiteLegalMock).toHaveBeenCalledWith(
      'rogeriopena@testeaurea.com.br',
      TODOS_OS_BLOCOS_IDS,
    )
  })

  it('rejeita consultarStatusAceiteLegal se a sessão estiver expirada', async () => {
    getSessionEmailMock.mockResolvedValue(null)

    const res = await consultarStatusAceiteLegal()
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Sessão expirada.')
    expect(obterStatusAceiteLegalMock).not.toHaveBeenCalled()
  })

  it('delega consultarStatusAceiteLegal ao módulo de auth quando a sessão for válida', async () => {
    getSessionEmailMock.mockResolvedValue('rogeriopena@testeaurea.com.br')
    obterStatusAceiteLegalMock.mockResolvedValue({
      aceito: true,
      versaoTermos: '1.0-2026-09-10',
      versaoPrivacidade: '1.0-2026-09-10',
      blocosFaltando: [],
    })

    const res = await consultarStatusAceiteLegal()
    expect(res.ok).toBe(true)
    expect(res.data?.aceito).toBe(true)
    expect(obterStatusAceiteLegalMock).toHaveBeenCalledWith('rogeriopena@testeaurea.com.br')
  })
})

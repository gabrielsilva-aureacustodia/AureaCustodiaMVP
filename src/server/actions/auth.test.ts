/**
 * Testes unitários das Server Actions de autenticação em `src/server/actions/auth.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

vi.mock('server-only', () => ({}))

const { jar } = vi.hoisted(() => {
  const valores = new Map<string, string>()
  return {
    jar: {
      valores,
      get: vi.fn((nome: string) => (valores.has(nome) ? { value: valores.get(nome) } : undefined)),
      set: vi.fn((nome: string, valor: string) => void valores.set(nome, valor)),
      delete: vi.fn((nome: string) => void valores.delete(nome)),
    },
  }
})
vi.mock('next/headers', () => ({
  cookies: async () => jar,
  headers: async () => new Headers(),
}))

// RA-50 (frente A): o interruptor da guarda da "nova senha" e o evento de segurança, controlados pelo teste.
const { interruptor, eventoMock } = vi.hoisted(() => ({ interruptor: { ligado: true }, eventoMock: vi.fn() }))
vi.mock('@/server/auth/reautenticacao-config', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/server/auth/reautenticacao-config')>()
  return {
    ...original,
    get EXIGIR_LINK_RECENTE_NA_NOVA_SENHA(): boolean {
      return interruptor.ligado
    },
  }
})
vi.mock('@/server/auth/reautenticacao-eventos', () => ({ registrarEventoDeSeguranca: eventoMock }))

vi.mock('@/server/state', () => ({
  getState: vi.fn(),
  mutateState: vi.fn(),
}))

vi.mock('@/server/session', () => ({
  getSessionEmail: vi.fn(),
  setSession: vi.fn(),
  clearSession: vi.fn(),
}))

vi.mock('@/server/auth/client', () => ({
  createAuthClient: vi.fn(),
}))

vi.mock('@/server/auth/conta-desativada', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/auth/conta-desativada')>()
  return {
    ...actual,
    barrarContaDesativada: vi.fn(),
  }
})

vi.mock('@/server/auth/authorization', () => ({
  authorizeProvisionedUser: vi.fn(),
}))

vi.mock('@/server/auth/provisioning', () => ({
  provisionAuthenticatedUser: vi.fn(),
}))

vi.mock('@/server/documentos/aceites', () => ({
  registrarAceitesFormais: vi.fn(),
}))

vi.mock('@/server/auth/destino', () => ({
  lembrarDestinoDoLogin: vi.fn(),
  destinoPermitido: vi.fn((d) => d || '/inicio'),
}))

import type { AppState } from '@/domain/types'
import { definirNovaSenha, login } from './auth'
import { authorizeProvisionedUser } from '@/server/auth/authorization'
import { createAuthClient } from '@/server/auth/client'
import {
  barrarContaDesativada,
  MENSAGEM_CONTA_DESATIVADA,
} from '@/server/auth/conta-desativada'
import { provisionAuthenticatedUser } from '@/server/auth/provisioning'
import { getSessionEmail, setSession } from '@/server/session'
import { getState, mutateState } from '@/server/state'

describe('login() — portas 1 e 2 (P-C2-04)', () => {
  const mockSignInWithPassword = vi.fn()
  const mockSignOut = vi.fn().mockResolvedValue({})

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(getState).mockResolvedValue({
      users: {
        'rogeriopena@testeaurea.com.br': {
          name: 'Rogério Siqueira',
          balance: 6200000,
          pass: '12345678',
          coins: [],
        },
      },
      seq: { coin: 0, envio: 0, analise: 0, planoCustodia: 0 },
    } as unknown as AppState)

    vi.mocked(createAuthClient).mockResolvedValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
      },
    } as unknown as ReturnType<typeof createAuthClient> extends Promise<infer T> ? T : never)

    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    vi.mocked(authorizeProvisionedUser).mockResolvedValue(true)
  })

  // Os três testes de "catálogo" saíram em 20/09/2026 junto com a função que
  // eles cobriam. `loginDoCatalogoLocal` deixava oito contas entrarem com senha
  // escrita no código, sem passar pelo Supabase, e criava saldo e moedas de
  // `DEMO_DATA` para quem ainda não existisse no estado. Num site publicado isso
  // era uma porta para dinheiro que ninguém depositou. Toda senha passa pelo
  // Supabase Auth, e os testes de Supabase abaixo são o contrato inteiro agora.

  it('Supabase: identidade bloqueada pelo painel recebe a frase de conta desativada', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { code: 'user_banned', message: 'User is banned' },
    })

    const res = await login('externo@teste.com', 'qualquer_senha')

    expect(res.ok).toBe(false)
    expect(res.error).toBe(MENSAGEM_CONTA_DESATIVADA)
    expect(setSession).not.toHaveBeenCalled()
  })

  it('Supabase: conta desativada sem bloqueio no Supabase sai sem sessão e sem provisionar', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { email: 'externo@teste.com', user_metadata: {} } },
      error: null,
    })
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)
    vi.mocked(authorizeProvisionedUser).mockResolvedValue(false)

    const res = await login('externo@teste.com', 'senha_valida')

    expect(res.ok).toBe(false)
    expect(res.error).toBe(MENSAGEM_CONTA_DESATIVADA)
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(setSession).not.toHaveBeenCalled()
    expect(provisionAuthenticatedUser).not.toHaveBeenCalled()
  })

  it('Supabase: conta ativa entra como antes', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { email: 'externo@teste.com', user_metadata: { full_name: 'Externo' } } },
      error: null,
    })
    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    vi.mocked(authorizeProvisionedUser).mockResolvedValue(true)

    const res = await login('externo@teste.com', 'senha_valida')

    expect(res.ok).toBe(true)
    expect(setSession).toHaveBeenCalledWith('externo@teste.com')
  })
})

/**
 * Token de acesso de mentira só com a claim `amr` (o que `definirNovaSenha` lê). A assinatura não importa
 * aqui: quem valida o token é o `getUser()` do Supabase, que o teste simula.
 */
function tokenComMetodos(metodos: Array<{ method: string; timestamp: number }>): string {
  const emBase64Url = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${emBase64Url({ alg: 'HS256', typ: 'JWT' })}.${emBase64Url({ amr: metodos })}.assinatura-de-teste`
}

const agoraEmSegundos = (): number => Math.floor(Date.now() / 1000)

describe('definirNovaSenha() — link de redefinição (P-C2-05)', () => {
  const mockGetUser = vi.fn()
  const mockGetSession = vi.fn()
  const mockUpdateUser = vi.fn()
  const mockSignInWithPassword = vi.fn()

  /** O que o Supabase devolve depois que a pessoa abriu o link de redefinição agora há pouco. */
  function sessaoAbertaPeloLink(metodo = 'recovery', haSegundos = 30): void {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: tokenComMetodos([{ method: metodo, timestamp: agoraEmSegundos() - haSegundos }]) } },
      error: null,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    interruptor.ligado = true
    eventoMock.mockResolvedValue(undefined)
    vi.mocked(getSessionEmail).mockResolvedValue('externo@teste.com')
    vi.mocked(barrarContaDesativada).mockResolvedValue(false)
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'externo@teste.com' } },
      error: null,
    })
    sessaoAbertaPeloLink()
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null })
    vi.mocked(createAuthClient).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        getSession: mockGetSession,
        updateUser: mockUpdateUser,
        signInWithPassword: mockSignInWithPassword,
      },
    } as unknown as ReturnType<typeof createAuthClient> extends Promise<infer T> ? T : never)
  })

  it('sem sessão pede link novo', async () => {
    vi.mocked(getSessionEmail).mockResolvedValue(null)

    const res = await definirNovaSenha('senha-nova', 'senha-nova')

    expect(res).toEqual({
      ok: false,
      error: 'O link de redefinição expirou ou já foi usado. Peça um novo ao atendimento.',
    })
    expect(createAuthClient).not.toHaveBeenCalled()
  })

  it('confirmação diferente não chama o Supabase', async () => {
    const res = await definirNovaSenha('senha-nova', 'outra-senha')

    expect(res).toEqual({ ok: false, error: 'A confirmação da nova senha não confere.' })
    expect(createAuthClient).not.toHaveBeenCalled()
  })

  it('sessão do Supabase de outro e-mail é recusada', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { email: 'outra@teste.com' } },
      error: null,
    })

    const res = await definirNovaSenha('senha-nova', 'senha-nova')

    expect(res.ok).toBe(false)
    expect(res.error).toContain('link de redefinição expirou')
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('conta desativada é recusada', async () => {
    vi.mocked(barrarContaDesativada).mockResolvedValue(true)

    const res = await definirNovaSenha('senha-nova', 'senha-nova')

    expect(res).toEqual({ ok: false, error: MENSAGEM_CONTA_DESATIVADA })
    expect(createAuthClient).not.toHaveBeenCalled()
  })

  it('senha repetida e senha fraca viram frase em português', async () => {
    mockUpdateUser
      .mockResolvedValueOnce({
        data: { user: null },
        error: { code: 'same_password', message: 'New password should be different' },
      })
      .mockResolvedValueOnce({
        data: { user: null },
        error: { code: 'weak_password', message: 'Password should be at least 8 characters' },
      })

    await expect(definirNovaSenha('senha-nova', 'senha-nova')).resolves.toEqual({
      ok: false,
      error: 'A senha nova precisa ser diferente da anterior.',
    })
    await expect(definirNovaSenha('curta', 'curta')).resolves.toEqual({
      ok: false,
      error: 'Senha fraca: Password should be at least 8 characters',
    })
  })

  it('troca a senha sem pedir a atual', async () => {
    const res = await definirNovaSenha('senha-nova', 'senha-nova')

    expect(res).toEqual({ ok: true, message: 'Senha nova salva. Use-a no próximo login.' })
    expect(mockUpdateUser).toHaveBeenCalledTimes(1)
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'senha-nova' })
    expect(mockSignInWithPassword).not.toHaveBeenCalled()
  })

  /*
   * RA-50 (frente A, 17/11/2026): sem a senha atual, só a sessão que um link do e-mail abriu agora há pouco troca a
   * senha. Uma sessão comum — de quem entrou com senha ou Google, inclusive roubada — tem de usar "Alterar senha".
   */
  describe('só a sessão aberta por um link de e-mail recente troca a senha sem a atual', () => {
    const LINK_VENCIDO = 'O link de redefinição expirou ou já foi usado. Peça um novo ao atendimento.'
    let aviso: MockInstance<typeof console.warn>

    beforeEach(() => {
      aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => {
      aviso.mockRestore()
    })

    it('sessão de quem entrou com SENHA (método password) é recusada e a senha não muda', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: tokenComMetodos([{ method: 'password', timestamp: agoraEmSegundos() - 5 }]) } },
        error: null,
      })

      const res = await definirNovaSenha('senha-nova', 'senha-nova')

      expect(res).toEqual({ ok: false, error: LINK_VENCIDO })
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    it('sessão de quem entrou com GOOGLE (método oauth) também é recusada', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: tokenComMetodos([{ method: 'oauth', timestamp: agoraEmSegundos() - 5 }]) } },
        error: null,
      })

      const res = await definirNovaSenha('senha-nova', 'senha-nova')

      expect(res.ok).toBe(false)
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    it('entrou com senha E abriu o link agora há pouco: vale (o que conta é haver o método do link)', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: tokenComMetodos([
              { method: 'password', timestamp: agoraEmSegundos() - 3_600 },
              { method: 'recovery', timestamp: agoraEmSegundos() - 60 },
            ]),
          },
        },
        error: null,
      })

      const res = await definirNovaSenha('senha-nova', 'senha-nova')

      expect(res.ok).toBe(true)
      expect(mockUpdateUser).toHaveBeenCalledTimes(1)
    })

    it('link aberto há mais de 30 minutos não vale mais: peça um link novo', async () => {
      sessaoAbertaPeloLink('recovery', 31 * 60)

      const res = await definirNovaSenha('senha-nova', 'senha-nova')

      expect(res).toEqual({ ok: false, error: LINK_VENCIDO })
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    it('os outros nomes de "abri um link do e-mail" (otp e magiclink) valem, se recentes', async () => {
      for (const metodo of ['otp', 'magiclink']) {
        mockUpdateUser.mockClear()
        sessaoAbertaPeloLink(metodo)

        const res = await definirNovaSenha('senha-nova', 'senha-nova')

        expect(res.ok, `método ${metodo}`).toBe(true)
      }
    })

    it('sem token, token ilegível ou sem claim amr: bloqueia (na dúvida, bloqueia)', async () => {
      const semAmr = `${Buffer.from('{}').toString('base64url')}.${Buffer.from('{"sub":"x"}').toString('base64url')}.s`
      for (const resposta of [
        { data: { session: null }, error: null },
        { data: { session: { access_token: 'isto-nao-e-um-jwt' } }, error: null },
        { data: { session: { access_token: semAmr } }, error: null },
        { data: undefined, error: { message: 'falha' } },
      ]) {
        mockGetSession.mockResolvedValue(resposta)

        const res = await definirNovaSenha('senha-nova', 'senha-nova')

        expect(res).toEqual({ ok: false, error: LINK_VENCIDO })
      }
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })

    it('INTERRUPTOR desligado: volta ao comportamento antigo (qualquer sessão do mesmo e-mail troca) e nem lê o token', async () => {
      interruptor.ligado = false
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: tokenComMetodos([{ method: 'password', timestamp: agoraEmSegundos() }]) } },
        error: null,
      })

      const res = await definirNovaSenha('senha-nova', 'senha-nova')

      expect(res.ok).toBe(true)
      expect(mockGetSession).not.toHaveBeenCalled()
      expect(mockUpdateUser).toHaveBeenCalledTimes(1)
    })

    it('troca feita: emite senha_alterada (via link de redefinição) e nenhuma recusa emite nada', async () => {
      await definirNovaSenha('senha-nova', 'senha-nova')

      expect(eventoMock).toHaveBeenCalledTimes(1)
      expect(eventoMock).toHaveBeenCalledWith({
        tipo: 'senha_alterada',
        conta: 'externo@teste.com',
        detalhes: { via: 'link_de_redefinicao' },
      })
      expect(JSON.stringify(eventoMock.mock.calls)).not.toContain('senha-nova')

      eventoMock.mockClear()
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      await definirNovaSenha('senha-nova', 'senha-nova')
      mockUpdateUser.mockResolvedValueOnce({ data: { user: null }, error: { code: 'weak_password', message: 'fraca' } })
      sessaoAbertaPeloLink()
      await definirNovaSenha('curta', 'curta')
      await definirNovaSenha('senha-nova', 'outra-senha')

      expect(eventoMock).not.toHaveBeenCalled()
    })

    it('o aviso no log do servidor traz só os NOMES dos métodos, nunca o token', async () => {
      const token = tokenComMetodos([{ method: 'password', timestamp: agoraEmSegundos() }])
      mockGetSession.mockResolvedValue({ data: { session: { access_token: token } }, error: null })

      await definirNovaSenha('senha-nova', 'senha-nova')

      expect(aviso).toHaveBeenCalledTimes(1)
      expect(aviso.mock.calls[0]![1]).toEqual(['password'])
      expect(JSON.stringify(aviso.mock.calls)).not.toContain(token)
    })
  })
})

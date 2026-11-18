/**
 * A página /cadastrar: quem já tem sessão vai para /inicio, quem não tem vê o formulário com o que o servidor sabe
 * (cadastro aberto ou fechado, erro de aceite do Google). Frente D: o Google passou a ser a ação principal, mas a
 * porta continua a mesma — este teste trava o que NÃO pode mudar junto.
 *
 * `pagina.test.ts` e não `page.test.ts`: o App Router trataria um `page.*` dentro da pasta da rota como a rota.
 * O formulário é trocado por um marcador; o que ele desenha tem teste próprio em components/login.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { redirectMock, sessaoMock, estadoMock, statusMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`)
  }),
  sessaoMock: vi.fn(),
  estadoMock: vi.fn(),
  statusMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('@/server/session', () => ({ getSessionEmail: sessaoMock }))
vi.mock('@/server/state', () => ({ getState: estadoMock }))
vi.mock('@/server/auth/config', () => ({ getRegistrationStatus: statusMock }))
vi.mock('@/components/login/RegisterForm', () => ({ RegisterForm: () => null }))

import CadastrarPage from './page'

interface PropsDoFormulario {
  registration: { enabled: boolean }
  initialError?: string
}

async function abrir(erro?: string): Promise<PropsDoFormulario> {
  const elemento = (await CadastrarPage({ searchParams: Promise.resolve({ erro }) })) as {
    props: PropsDoFormulario
  }
  return elemento.props
}

describe('/cadastrar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessaoMock.mockResolvedValue(null)
    estadoMock.mockResolvedValue({ users: {} })
    statusMock.mockReturnValue({ enabled: true })
  })

  it('com sessão de conta existente manda para /inicio', async () => {
    sessaoMock.mockResolvedValue('cliente@exemplo.com.br')
    estadoMock.mockResolvedValue({ users: { 'cliente@exemplo.com.br': {} } })
    await expect(abrir()).rejects.toThrow('REDIRECT:/inicio')
    expect(redirectMock).toHaveBeenCalledWith('/inicio')
  })

  it('sessão sem conta no estado não entra em laço: mostra o formulário', async () => {
    sessaoMock.mockResolvedValue('fantasma@exemplo.com.br')
    const props = await abrir()
    expect(redirectMock).not.toHaveBeenCalled()
    expect(props.registration).toEqual({ enabled: true })
  })

  it('sem sessão mostra o formulário com o status do cadastro vindo do servidor', async () => {
    statusMock.mockReturnValue({ enabled: false, reason: 'Fechado.' })
    const props = await abrir()
    expect(props.registration).toEqual({ enabled: false, reason: 'Fechado.' })
    expect(props.initialError).toBeUndefined()
  })

  it('aceite do Google expirado volta com a mensagem, que abre o e-mail recolhido', async () => {
    const props = await abrir('aceite-oauth')
    expect(props.initialError).toBe(
      'O aceite legal do acesso com Google expirou. Inicie o cadastro novamente.',
    )
  })
})

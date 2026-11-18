/**
 * A página /entrar: quem já tem sessão vai para /inicio; quem não tem vê o formulário com os avisos que o servidor
 * mandou na URL (conta desativada, e-mail confirmado, retorno do Google que falhou). Frente D: o Google virou a
 * ação principal e o e-mail ficou recolhido — mas é com estes avisos que o formulário abre o bloco de e-mail, então
 * eles precisam continuar chegando exatamente iguais.
 *
 * `pagina.test.ts` e não `page.test.ts`: o App Router trataria um `page.*` dentro da pasta da rota como a rota.
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
// `server-only` estoura fora do servidor do Next; as duas constantes são as mesmas do módulo real.
vi.mock('@/server/auth/conta-desativada', () => ({
  MENSAGEM_CONTA_DESATIVADA: 'Esta conta está desativada. Fale com o atendimento.',
  STATUS_CONTA_DESATIVADA: 'conta-desativada',
}))
vi.mock('@/components/login/LoginForm', () => ({ LoginForm: () => null }))

import EntrarPage from './page'

interface PropsDoFormulario {
  initialError?: string
  initialMessage?: string
  registrationOpen: boolean
}

async function abrir(params: { erro?: string; status?: string; motivo?: string } = {}): Promise<PropsDoFormulario> {
  const elemento = (await EntrarPage({ searchParams: Promise.resolve(params) })) as {
    props: PropsDoFormulario
  }
  return elemento.props
}

describe('/entrar', () => {
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
    expect(props.registrationOpen).toBe(true)
  })

  it('sem aviso na URL, o formulário abre limpo e diz se o cadastro está aberto', async () => {
    statusMock.mockReturnValue({ enabled: false })
    const props = await abrir()
    expect(props.initialError).toBeUndefined()
    expect(props.initialMessage).toBeUndefined()
    expect(props.registrationOpen).toBe(false)
  })

  it('conta desativada chega como erro', async () => {
    const props = await abrir({ status: 'conta-desativada' })
    expect(props.initialError).toBe('Esta conta está desativada. Fale com o atendimento.')
  })

  it('e-mail confirmado sem dados carregados chega como aviso, não como erro', async () => {
    const props = await abrir({ status: 'conta-pendente' })
    expect(props.initialError).toBeUndefined()
    expect(props.initialMessage).toContain('E-mail confirmado.')
  })

  it('retorno do Google que falhou chega como erro com o motivo real', async () => {
    const props = await abrir({ erro: 'callback', motivo: 'access_denied' })
    expect(props.initialError).toBe('Não foi possível concluir a autenticação: access_denied')
  })

  it('retorno do Google que falhou sem motivo usa a mensagem de link expirado', async () => {
    const props = await abrir({ erro: 'callback' })
    expect(props.initialError).toBe(
      'O link de autenticação expirou ou não pôde ser validado. Tente novamente.',
    )
  })
})

/**
 * A confirmação por senha (ou código) nas ações sensíveis — frente A, 17/11/2026.
 *
 * O que estes testes provam, na ordem em que importam:
 *  1. a prova é assinada e não se forja nem se transfere (outra conta, outro nível,
 *     outro cookie assinado com o mesmo segredo);
 *  2. a janela vence e o nível `sempre` gasta a prova no primeiro uso;
 *  3. a senha é conferida SEM trocar a sessão do site (cliente sem persistência e sem
 *     cookies) e a sessão descartável é revogada;
 *  4. conta que só entra com Google confirma por código, com prazo nosso de 10
 *     minutos, e nunca pela senha (nem o inverso).
 */

import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { cookiesMock, getSessionEmailMock, createClientMock, buscarMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  getSessionEmailMock: vi.fn(),
  createClientMock: vi.fn(),
  buscarMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/server/session', () => ({ getSessionEmail: getSessionEmailMock }))
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))
vi.mock('@/server/admin/identidade', () => ({
  portaDeIdentidadeDoAmbiente: () => ({ configurada: true, faltando: [], buscar: buscarMock }),
}))

import {
  confirmarComCodigo,
  confirmarComSenha,
  enviarCodigoPorEmail,
  exigirReautenticacao,
  lerProva,
  metodoDeConfirmacao,
  provaServe,
  valorDaProva,
} from './reautenticacao'
import {
  COOKIE_DA_PROVA,
  COOKIE_DO_CODIGO,
  INTERVALO_ENTRE_CODIGOS_MS,
  JANELA_COMPRA_VENDA_MS,
  TOLERANCIA_ACAO_SENSIVEL_MS,
  VALIDADE_DO_CODIGO_MS,
} from './reautenticacao-config'

const EMAIL = 'cliente@exemplo.com.br'
const OUTRO_EMAIL = 'outra@exemplo.com.br'
const AGORA = new Date('2026-11-17T15:00:00Z').getTime()

interface Biscoito {
  value: string
  options?: Record<string, unknown>
}
let jar: Map<string, Biscoito>

/** Cliente do Supabase de mentira, com as quatro chamadas que o módulo usa. */
function clienteFalso(respostas: {
  senha?: { error: unknown; data: { session: unknown } }
  otp?: { error: unknown }
  verificacao?: { error: unknown; data: { session: unknown } }
} = {}) {
  const sessao = { access_token: 'descartavel' }
  const auth = {
    signInWithPassword: vi.fn().mockResolvedValue(respostas.senha ?? { error: null, data: { session: sessao } }),
    signInWithOtp: vi.fn().mockResolvedValue(respostas.otp ?? { error: null }),
    verifyOtp: vi.fn().mockResolvedValue(respostas.verificacao ?? { error: null, data: { session: sessao } }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }
  createClientMock.mockReturnValue({ auth })
  return auth
}

const SENHA_ERRADA = { error: { message: 'Invalid login credentials' }, data: { session: null } }
const CODIGO_ERRADO = { error: { message: 'Token has expired or is invalid' }, data: { session: null } }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(AGORA)
  process.env.SESSION_SECRET = 'segredo-de-teste-da-reautenticacao'
  process.env.SUPABASE_URL = 'https://projeto.supabase.test'
  process.env.SUPABASE_ANON_KEY = 'chave-publicavel-de-teste'

  jar = new Map()
  cookiesMock.mockReset()
  cookiesMock.mockImplementation(async () => ({
    get: (nome: string) => jar.get(nome),
    set: (nome: string, value: string, options?: Record<string, unknown>) => {
      jar.set(nome, { value, options })
    },
    delete: (nome: string) => {
      jar.delete(nome)
    },
  }))

  getSessionEmailMock.mockReset()
  getSessionEmailMock.mockResolvedValue(EMAIL)

  buscarMock.mockReset()
  buscarMock.mockResolvedValue({ id: 'u1', provedores: ['email'] })

  createClientMock.mockReset()
  clienteFalso()
})

afterEach(() => {
  vi.useRealTimers()
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_ANON_KEY
})

function guardarProva(nivel: 'sempre' | 'janela', idadeMs = 0, email = EMAIL): void {
  jar.set(COOKIE_DA_PROVA, { value: valorDaProva({ email, nivel, emitidoEm: AGORA - idadeMs }) })
}

describe('a prova (cookie assinado)', () => {
  it('ida e volta: o que se assina se lê', () => {
    const lida = lerProva(valorDaProva({ email: EMAIL, nivel: 'janela', emitidoEm: AGORA }), EMAIL)
    expect(lida).toEqual({ email: EMAIL, nivel: 'janela', emitidoEm: AGORA })
  })

  it('recusa assinatura adulterada e valor mal formado', () => {
    const valor = valorDaProva({ email: EMAIL, nivel: 'janela', emitidoEm: AGORA })
    const [payload] = valor.split('.')
    expect(lerProva(`${payload}.${'0'.repeat(64)}`, EMAIL)).toBeNull()
    expect(lerProva('lixo', EMAIL)).toBeNull()
    expect(lerProva('', EMAIL)).toBeNull()
    expect(lerProva(undefined, EMAIL)).toBeNull()
  })

  it('recusa payload trocado com a assinatura antiga (nível promovido à mão)', () => {
    const valor = valorDaProva({ email: EMAIL, nivel: 'janela', emitidoEm: AGORA })
    const assinatura = valor.slice(valor.lastIndexOf('.') + 1)
    const falso = Buffer.from(JSON.stringify({ e: EMAIL, n: 'sempre', t: AGORA }), 'utf8').toString('base64url')
    expect(lerProva(`${falso}.${assinatura}`, EMAIL)).toBeNull()
  })

  it('não vale para outra conta (cookie de quem usou o navegador antes)', () => {
    const valor = valorDaProva({ email: OUTRO_EMAIL, nivel: 'janela', emitidoEm: AGORA })
    expect(lerProva(valor, EMAIL)).toBeNull()
  })

  it('o cookie assinado da sessão não passa por prova (domínios de assinatura separados)', () => {
    // O cookie de sessão assina só o e-mail com o mesmo SESSION_SECRET (formato de session-core.ts);
    // mesmo assim, nunca vale como prova.
    const payload = Buffer.from(EMAIL, 'utf8').toString('base64url')
    const assinatura = createHmac('sha256', process.env.SESSION_SECRET ?? '').update(payload).digest('hex')
    expect(lerProva(`${payload}.${assinatura}`, EMAIL)).toBeNull()

    // E a prova assinada como "código" também não vale como prova.
    const comoCodigo = Buffer.from(JSON.stringify({ e: EMAIL, n: 'sempre', t: AGORA }), 'utf8').toString('base64url')
    const assinaturaDoCodigo = createHmac('sha256', process.env.SESSION_SECRET ?? '')
      .update(`codigo|${comoCodigo}`)
      .digest('hex')
    expect(lerProva(`${comoCodigo}.${assinaturaDoCodigo}`, EMAIL)).toBeNull()
  })
})

describe('quando a prova serve', () => {
  const prova = (nivel: 'sempre' | 'janela', idadeMs: number) => ({ email: EMAIL, nivel, emitidoEm: AGORA - idadeMs })

  it('janela: vale por 5 minutos e vence depois', () => {
    expect(JANELA_COMPRA_VENDA_MS).toBe(5 * 60 * 1000)
    expect(provaServe(prova('janela', 0), 'janela', AGORA)).toBe(true)
    expect(provaServe(prova('janela', JANELA_COMPRA_VENDA_MS), 'janela', AGORA)).toBe(true)
    expect(provaServe(prova('janela', JANELA_COMPRA_VENDA_MS + 1), 'janela', AGORA)).toBe(false)
  })

  it('sempre: só dá tempo de reenviar a ação (1 minuto)', () => {
    expect(provaServe(prova('sempre', TOLERANCIA_ACAO_SENSIVEL_MS), 'sempre', AGORA)).toBe(true)
    expect(provaServe(prova('sempre', TOLERANCIA_ACAO_SENSIVEL_MS + 1), 'sempre', AGORA)).toBe(false)
  })

  it('os níveis não se misturam', () => {
    expect(provaServe(prova('janela', 0), 'sempre', AGORA)).toBe(false)
    expect(provaServe(prova('sempre', 0), 'janela', AGORA)).toBe(false)
  })

  it('prova com hora no futuro (relógio adulterado) não vale', () => {
    expect(provaServe(prova('janela', -60_000), 'janela', AGORA)).toBe(false)
  })

  it('sem prova não serve', () => {
    expect(provaServe(null, 'janela', AGORA)).toBe(false)
  })
})

describe('exigirReautenticacao — a guarda das ações', () => {
  it('sem sessão: recusa com "Sessão expirada." e sem abrir o modal', async () => {
    getSessionEmailMock.mockResolvedValue(null)
    const r = await exigirReautenticacao('janela')
    expect(r).toEqual({ ok: false, error: 'Sessão expirada.' })
    expect(r?.precisaSenha).toBeUndefined()
  })

  it('sem prova: pede a senha, com o nível e o método da conta', async () => {
    const r = await exigirReautenticacao('sempre')
    expect(r).toEqual({ ok: false, precisaSenha: true, nivel: 'sempre', metodo: 'senha' })
  })

  it('conta que só entra com Google: pede o código por e-mail', async () => {
    buscarMock.mockResolvedValue({ id: 'u1', provedores: ['google'] })
    const r = await exigirReautenticacao('janela')
    expect(r).toEqual({ ok: false, precisaSenha: true, nivel: 'janela', metodo: 'codigo' })
  })

  it('janela dentro do prazo libera, e libera de novo (não é gasta)', async () => {
    guardarProva('janela', 60_000)
    expect(await exigirReautenticacao('janela')).toBeNull()
    expect(await exigirReautenticacao('janela')).toBeNull()
    expect(jar.has(COOKIE_DA_PROVA)).toBe(true)
  })

  it('janela vencida volta a pedir', async () => {
    guardarProva('janela', JANELA_COMPRA_VENDA_MS + 1000)
    const r = await exigirReautenticacao('janela')
    expect(r?.precisaSenha).toBe(true)
  })

  it('sempre: libera UMA vez e gasta a prova; o segundo uso pede de novo', async () => {
    guardarProva('sempre', 1000)
    expect(await exigirReautenticacao('sempre')).toBeNull()
    expect(jar.has(COOKIE_DA_PROVA)).toBe(false)
    const segundo = await exigirReautenticacao('sempre')
    expect(segundo?.precisaSenha).toBe(true)
  })

  it('a prova da compra (janela) não libera um saque (sempre)', async () => {
    guardarProva('janela', 1000)
    const r = await exigirReautenticacao('sempre')
    expect(r?.precisaSenha).toBe(true)
    expect(jar.has(COOKIE_DA_PROVA)).toBe(true)
  })

  it('prova de outra conta no cookie não libera', async () => {
    guardarProva('janela', 1000, OUTRO_EMAIL)
    const r = await exigirReautenticacao('janela')
    expect(r?.precisaSenha).toBe(true)
  })
})

describe('exigirReautenticacao com a senha digitada na própria ação (troca de senha)', () => {
  it('senha certa: libera sem prova no cookie e sem gastar nada (não há cookie a gastar)', async () => {
    const auth = clienteFalso()
    expect(await exigirReautenticacao('sempre', { senhaDigitada: 'minha-senha' })).toBeNull()
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: EMAIL, password: 'minha-senha' })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(jar.size).toBe(0)
  })

  it('senha errada: devolve o erro da tela de troca de senha, SEM abrir o modal', async () => {
    clienteFalso({ senha: SENHA_ERRADA })
    const r = await exigirReautenticacao('sempre', { senhaDigitada: 'errada' })
    expect(r).toEqual({ ok: false, error: 'Senha atual incorreta.' })
    expect(r?.precisaSenha).toBeUndefined()
  })

  it('senha vazia também é recusada (não vira "libera")', async () => {
    clienteFalso({ senha: SENHA_ERRADA })
    const r = await exigirReautenticacao('sempre', { senhaDigitada: '' })
    expect(r?.error).toBe('Senha atual incorreta.')
  })

  it('conta que só entra com Google: a senha digitada é ignorada e a guarda pede o código', async () => {
    buscarMock.mockResolvedValue({ id: 'u1', provedores: ['google'] })
    const auth = clienteFalso()
    const r = await exigirReautenticacao('sempre', { senhaDigitada: 'qualquer-coisa' })
    expect(r).toEqual({ ok: false, precisaSenha: true, nivel: 'sempre', metodo: 'codigo' })
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('com prova válida no cookie a senha digitada nem é conferida (e a prova de uso único é gasta)', async () => {
    guardarProva('sempre', 1000)
    const auth = clienteFalso()
    expect(await exigirReautenticacao('sempre', { senhaDigitada: 'qualquer' })).toBeNull()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
    expect(jar.has(COOKIE_DA_PROVA)).toBe(false)
  })

  it('não troca a sessão do site: cliente sem persistência, sem cookies', async () => {
    clienteFalso()
    await exigirReautenticacao('sempre', { senhaDigitada: 'minha-senha' })
    expect(createClientMock.mock.calls[0]?.[2]).toMatchObject({
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  })

  it('Supabase indisponível: fecha com mensagem, não libera', async () => {
    createClientMock.mockImplementation(() => {
      throw new Error('rede fora do ar')
    })
    const r = await exigirReautenticacao('sempre', { senhaDigitada: 'minha-senha' })
    expect(r?.ok).toBe(false)
    expect(r?.error).toMatch(/Não foi possível conferir a senha/)
    expect(r?.precisaSenha).toBeUndefined()
  })
})

describe('metodoDeConfirmacao', () => {
  it('provedor email → senha; só google → código; desconhecida → senha', async () => {
    buscarMock.mockResolvedValue({ id: 'u1', provedores: ['email', 'google'] })
    expect(await metodoDeConfirmacao(EMAIL)).toBe('senha')
    buscarMock.mockResolvedValue({ id: 'u1', provedores: ['google'] })
    expect(await metodoDeConfirmacao(EMAIL)).toBe('codigo')
    buscarMock.mockResolvedValue(null)
    expect(await metodoDeConfirmacao(EMAIL)).toBe('senha')
    buscarMock.mockRejectedValue(new Error('supabase fora do ar'))
    expect(await metodoDeConfirmacao(EMAIL)).toBe('senha')
  })
})

describe('confirmarComSenha', () => {
  it('senha certa: emite a prova do nível pedido, httpOnly, com a duração do nível', async () => {
    const auth = clienteFalso()
    const r = await confirmarComSenha('minha-senha', 'janela')
    expect(r).toEqual({ ok: true })

    const prova = lerProva(jar.get(COOKIE_DA_PROVA)?.value, EMAIL)
    expect(prova?.nivel).toBe('janela')
    expect(prova?.emitidoEm).toBe(AGORA)
    expect(jar.get(COOKIE_DA_PROVA)?.options).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: JANELA_COMPRA_VENDA_MS / 1000,
    })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: EMAIL, password: 'minha-senha' })
  })

  it('o nível sempre dura só o minuto de folga', async () => {
    await confirmarComSenha('minha-senha', 'sempre')
    expect(jar.get(COOKIE_DA_PROVA)?.options?.maxAge).toBe(TOLERANCIA_ACAO_SENSIVEL_MS / 1000)
  })

  it('NÃO troca a sessão do site: cliente sem persistência e sem cookies, sessão revogada', async () => {
    const auth = clienteFalso()
    await confirmarComSenha('minha-senha', 'janela')

    const [url, chave, opcoes] = createClientMock.mock.calls[0]
    expect(url).toBe('https://projeto.supabase.test')
    expect(chave).toBe('chave-publicavel-de-teste')
    expect(opcoes.auth).toMatchObject({ persistSession: false, autoRefreshToken: false })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    // Os únicos cookies tocados são os da prova: o da sessão (aurea_session) e os do Supabase ficam de fora.
    expect([...jar.keys()]).toEqual([COOKIE_DA_PROVA])
  })

  it('senha errada: recusa, não emite prova', async () => {
    clienteFalso({ senha: SENHA_ERRADA })
    const r = await confirmarComSenha('errada', 'sempre')
    expect(r).toEqual({ ok: false, error: 'Senha incorreta.' })
    expect(jar.size).toBe(0)
  })

  it('senha vazia não chega ao Supabase', async () => {
    const auth = clienteFalso()
    expect((await confirmarComSenha('', 'sempre')).ok).toBe(false)
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('conta que só entra com Google não confirma por senha', async () => {
    buscarMock.mockResolvedValue({ id: 'u1', provedores: ['google'] })
    const auth = clienteFalso()
    const r = await confirmarComSenha('qualquer', 'sempre')
    expect(r.ok).toBe(false)
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
    expect(jar.size).toBe(0)
  })

  it('sem sessão: recusa', async () => {
    getSessionEmailMock.mockResolvedValue(null)
    expect(await confirmarComSenha('x', 'sempre')).toEqual({ ok: false, error: 'Sessão expirada.' })
  })

  it('Supabase não configurado no ambiente: recusa com a mensagem do ambiente (fecha, não abre)', async () => {
    for (const nome of [
      'SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ]) {
      delete process.env[nome]
    }
    const r = await confirmarComSenha('minha-senha', 'sempre')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/não está disponível/)
    expect(jar.size).toBe(0)
  })
})

describe('código por e-mail (conta que só entra com Google)', () => {
  beforeEach(() => {
    buscarMock.mockResolvedValue({ id: 'u1', provedores: ['google'] })
  })

  it('envia o código sem criar usuário e marca a hora do envio', async () => {
    const auth = clienteFalso()
    const r = await enviarCodigoPorEmail()
    expect(r.ok).toBe(true)
    expect(r.data?.reenvioEmMs).toBe(INTERVALO_ENTRE_CODIGOS_MS)
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: EMAIL, options: { shouldCreateUser: false } })
    expect(jar.get(COOKIE_DO_CODIGO)?.options).toMatchObject({ httpOnly: true, maxAge: VALIDADE_DO_CODIGO_MS / 1000 })
  })

  it('segundo pedido antes de 60 s é recusado sem chamar o Supabase', async () => {
    const auth = clienteFalso()
    await enviarCodigoPorEmail()
    vi.setSystemTime(AGORA + 20_000)
    const r = await enviarCodigoPorEmail()
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Aguarde 40 segundos/)
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(1)
  })

  it('depois de 60 s pode pedir outro', async () => {
    const auth = clienteFalso()
    await enviarCodigoPorEmail()
    vi.setSystemTime(AGORA + INTERVALO_ENTRE_CODIGOS_MS + 1)
    expect((await enviarCodigoPorEmail()).ok).toBe(true)
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(2)
  })

  it('falha do Supabase no envio: mensagem amigável, sem cookie de pedido', async () => {
    clienteFalso({ otp: { error: { message: 'smtp', status: 500 } } })
    const r = await enviarCodigoPorEmail()
    expect(r.ok).toBe(false)
    expect(jar.has(COOKIE_DO_CODIGO)).toBe(false)
  })

  it('limite do Supabase (429) vira "aguarde um minuto"', async () => {
    clienteFalso({ otp: { error: { message: 'rate', status: 429 } } })
    const r = await enviarCodigoPorEmail()
    expect(r.error).toMatch(/Aguarde um minuto/)
  })

  it('conta com senha não pede código', async () => {
    buscarMock.mockResolvedValue({ id: 'u1', provedores: ['email'] })
    const auth = clienteFalso()
    expect((await enviarCodigoPorEmail()).ok).toBe(false)
    expect(auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('código certo dentro do prazo: emite a prova e gasta o pedido', async () => {
    const auth = clienteFalso()
    await enviarCodigoPorEmail()
    vi.setSystemTime(AGORA + 60_000)

    const r = await confirmarComCodigo('123456', 'sempre')
    expect(r).toEqual({ ok: true })
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: EMAIL, token: '123456', type: 'email' })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(lerProva(jar.get(COOKIE_DA_PROVA)?.value, EMAIL)?.nivel).toBe('sempre')
    expect(jar.has(COOKIE_DO_CODIGO)).toBe(false)
  })

  it('aceita o código digitado com espaços', async () => {
    const auth = clienteFalso()
    await enviarCodigoPorEmail()
    expect((await confirmarComCodigo('123 456', 'janela')).ok).toBe(true)
    expect(auth.verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ token: '123456' }))
  })

  it('código vencido (mais de 10 minutos): recusa sem consultar o Supabase', async () => {
    const auth = clienteFalso()
    await enviarCodigoPorEmail()
    vi.setSystemTime(AGORA + VALIDADE_DO_CODIGO_MS + 1)

    const r = await confirmarComCodigo('123456', 'sempre')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/venceu/)
    expect(auth.verifyOtp).not.toHaveBeenCalled()
    expect(jar.has(COOKIE_DA_PROVA)).toBe(false)
  })

  it('código errado: recusa, não emite prova e mantém o pedido para outra tentativa', async () => {
    clienteFalso({ verificacao: CODIGO_ERRADO })
    await enviarCodigoPorEmail()
    const r = await confirmarComCodigo('000000', 'sempre')
    expect(r.ok).toBe(false)
    expect(jar.has(COOKIE_DA_PROVA)).toBe(false)
    expect(jar.has(COOKIE_DO_CODIGO)).toBe(true)
  })

  it('sem pedido de código em andamento: manda pedir um', async () => {
    const auth = clienteFalso()
    const r = await confirmarComCodigo('123456', 'sempre')
    expect(r.ok).toBe(false)
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('código que não tem 6 números não chega ao Supabase', async () => {
    const auth = clienteFalso()
    await enviarCodigoPorEmail()
    for (const ruim of ['12345', '1234567', 'abcdef', '12a456', '']) {
      expect((await confirmarComCodigo(ruim, 'sempre')).ok).toBe(false)
    }
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('pedido de código de outra conta não vale', async () => {
    clienteFalso()
    await enviarCodigoPorEmail()
    getSessionEmailMock.mockResolvedValue(OUTRO_EMAIL)
    const r = await confirmarComCodigo('123456', 'sempre')
    expect(r.ok).toBe(false)
  })

  it('conta com senha não confirma por código', async () => {
    buscarMock.mockResolvedValue({ id: 'u1', provedores: ['email'] })
    const auth = clienteFalso()
    expect((await confirmarComCodigo('123456', 'sempre')).ok).toBe(false)
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })
})

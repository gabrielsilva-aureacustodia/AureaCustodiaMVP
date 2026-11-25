/**
 * As ações sensíveis com a GUARDA REAL — frente A, 17/11/2026.
 *
 * Os outros testes de ação deste diretório trocam a guarda por um módulo que sempre libera
 * (a senha tem testes próprios) e provam a regra de negócio de cada ação. Este arquivo faz o
 * contrário: usa `exigirReautenticacao` de verdade, com o cookie da prova em um pote em
 * memória, e prova o que o aceite pede:
 *
 *   quem invade a conta e NÃO sabe a senha não saca, não compra, não vende, não troca senha,
 *   e-mail nem Pix — e a recusa não deixa rastro no estado nem chega ao Supabase ou ao gateway.
 *
 * O teste de varredura (`auth/reautenticacao-guardas.test.ts`) garante que a chamada existe em
 * cada ação e vem antes de qualquer efeito; este garante o comportamento de ponta a ponta:
 *  1. sem prova, cada ação devolve o pedido de confirmação NO NÍVEL CERTO e não muda nada;
 *  2. `sempre` (saque, retirada, dados de acesso) vale uma vez e gasta a prova ao liberar;
 *  3. `janela` (compra e venda) vale por 5 minutos, várias vezes, e vence;
 *  4. os níveis não se misturam, e a prova de outra conta não vale;
 *  5. conta que só entra com Google é mandada para o CÓDIGO, mesmo quando digita uma senha;
 *  6. a troca de senha usa a "senha atual" da própria tela como confirmação (sem pedir duas vezes);
 *  7. salvar o cadastro só pede confirmação quando MUDA um cadastro já gravado;
 *  8. trocar senha, e-mail ou Pix emite o evento de segurança (T5) — e só quando a troca deu certo, sem segredo nos detalhes.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  cookiesMock,
  getSessionEmail,
  setSession,
  createClientMock,
  buscarMock,
  atualizarLoginMock,
  authSignIn,
  authUpdate,
  eventoMock,
  featureLigadaMock,
} = vi.hoisted(() => ({
  featureLigadaMock: vi.fn(async (_chave: string) => true),
  cookiesMock: vi.fn(),
  getSessionEmail: vi.fn(),
  setSession: vi.fn(),
  createClientMock: vi.fn(),
  buscarMock: vi.fn(),
  atualizarLoginMock: vi.fn(),
  authSignIn: vi.fn(),
  authUpdate: vi.fn(),
  eventoMock: vi.fn(),
}))

vi.mock('server-only', () => ({}))
// O evento de segurança (T5): aqui só se confere QUANDO a ação o emite e com o quê; a gravação em si tem teste próprio
// (`auth/reautenticacao-eventos.test.ts`). `camposBancariosAlterados` segue real: é ela que decide se o Pix mudou.
vi.mock('@/server/auth/reautenticacao-eventos', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('@/server/auth/reautenticacao-eventos')>()),
  registrarEventoDeSeguranca: eventoMock,
}))
vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/server/session', () => ({ getSessionEmail, setSession }))
vi.mock('@/server/config/features', () => ({ featureLigada: featureLigadaMock }))
// O cliente descartável com que a guarda confere a senha (nunca o da sessão do site).
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))
// O cliente que `changePassword` usa para trocar a senha de fato.
vi.mock('@/server/auth/client', () => ({
  createAuthClient: async () => ({ auth: { signInWithPassword: authSignIn, updateUser: authUpdate } }),
}))
// A porta de identidade: diz se a conta tem senha (provedor `email`) ou só Google, e troca o login.
vi.mock('@/server/admin/identidade', () => ({
  portaDeIdentidadeDoAmbiente: () => ({
    configurada: true,
    faltando: [],
    buscar: buscarMock,
    atualizarLogin: atualizarLoginMock,
  }),
}))

import { pedeConfirmacao } from '@/components/seguranca/confirmacao'
import { COIN } from '@/domain/constants'
import { cadastroCompleto } from '@/domain/testing/fixtures'
import type { EnderecoEntrega } from '@/domain/types'
import { valorDaProva } from '@/server/auth/reautenticacao'
import {
  COOKIE_DA_PROVA,
  JANELA_COMPRA_VENDA_MS,
  TOLERANCIA_ACAO_SENSIVEL_MS,
} from '@/server/auth/reautenticacao-config'
import { getState, mutateState } from '@/server/state'

import { changePassword, salvarCadastro, solicitarSaque, updatePersonal, type CadastroInput } from './account'
import { solicitarRetirada } from './custody'
import { buyLot, publishBid } from './market'
import { iniciarCompraDireta } from './payments'
import {
  iniciarOfertaPrePaga,
  iniciarPagamentoReserva,
  pagarReservaComSaldo,
  publicarOfertaPrePagaComSaldo,
} from './reserva'
import { publishOffer, sellToBid } from './sell'

const BANDEIRA = COIN.name
/** Conta do seed, com cadastro e saldo montados em cada teste. */
const EMAIL = 'rogeriopena@testeaurea.com.br'
/** Conta fora do domínio institucional: a troca de e-mail só é permitida a ela. */
const EMAIL_LIVRE = 'cliente@exemplo.com.br'
const OUTRA_CONTA = 'alex@testeaurea.com.br'

const ENDERECO_VALIDO: EnderecoEntrega = {
  nome: 'Gabriel Silva',
  cpfOuCnpj: '123.456.789-00',
  logradouro: 'Avenida Raja Gabaglia',
  numero: '2000',
  complemento: 'Sala 501',
  bairro: 'Estoril',
  cidade: 'Belo Horizonte',
  uf: 'MG',
  cep: '30494-170',
  telefone: '(31) 98888-7777',
}

const CADASTRO_VALIDO: CadastroInput = {
  cpf: '529.982.247-25',
  nomeCompleto: 'Rogério Pena',
  dataNascimento: '1990-08-20',
  telefone: '(11) 98765-4321',
  endereco: {
    logradouro: 'Rua das Moedas',
    numero: '100',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01001-000',
  },
  dadosBancarios: { chavePix: '52998224725', tipoChavePix: 'cpf' },
}

/* ---------- o pote de cookies e as pontas do Supabase ---------- */

let jar: Map<string, string>
let sessaoAtual: string

function guardarProva(nivel: 'sempre' | 'janela', opcoes: { idadeMs?: number; email?: string } = {}): void {
  const { idadeMs = 0, email = sessaoAtual } = opcoes
  jar.set(COOKIE_DA_PROVA, valorDaProva({ email, nivel, emitidoEm: Date.now() - idadeMs }))
}

/** Responde à conferência de senha do cliente descartável da guarda. */
function senhaConferidaPeloSupabase(certa: boolean) {
  const auth = {
    signInWithPassword: vi
      .fn()
      .mockResolvedValue(
        certa
          ? { error: null, data: { session: { access_token: 'descartavel' } } }
          : { error: { message: 'Invalid login credentials' }, data: { session: null } },
      ),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }
  createClientMock.mockReturnValue({ auth })
  return auth
}

/** Diz à porta de identidade quais provedores a conta da sessão tem. */
function contaComProvedores(...provedores: string[]): void {
  buscarMock.mockImplementation(async (email: string) =>
    email === sessaoAtual ? { id: 'usuario-1', provedores } : null,
  )
}

function bloqueioEsperado(res: unknown, nivel: 'sempre' | 'janela', metodo: 'senha' | 'codigo' = 'senha'): void {
  expect(pedeConfirmacao(res), 'a ação devia pedir a confirmação').toBe(true)
  expect(res).toMatchObject({ ok: false, precisaSenha: true, nivel, metodo })
}

async function fotoDoEstado(): Promise<string> {
  return JSON.stringify(await getState())
}

beforeEach(async () => {
  featureLigadaMock.mockReset()
  featureLigadaMock.mockResolvedValue(true) // estes testes são da confirmação LIGADA
  process.env.SESSION_SECRET = 'segredo-de-teste-das-acoes-sensiveis'
  process.env.SUPABASE_URL = 'https://projeto.supabase.test'
  process.env.SUPABASE_ANON_KEY = 'chave-publicavel-de-teste'

  jar = new Map()
  cookiesMock.mockReset()
  cookiesMock.mockImplementation(async () => ({
    get: (nome: string) => {
      const valor = jar.get(nome)
      return valor === undefined ? undefined : { value: valor }
    },
    set: (nome: string, valor: string) => {
      jar.set(nome, valor)
    },
    delete: (nome: string) => {
      jar.delete(nome)
    },
  }))

  sessaoAtual = EMAIL
  getSessionEmail.mockReset()
  getSessionEmail.mockImplementation(async () => sessaoAtual)
  setSession.mockReset()

  createClientMock.mockReset()
  senhaConferidaPeloSupabase(true)
  buscarMock.mockReset()
  contaComProvedores('email')
  atualizarLoginMock.mockReset()
  atualizarLoginMock.mockResolvedValue({ ok: false, erro: 'recusado pelo teste' })
  authSignIn.mockReset()
  authSignIn.mockResolvedValue({ error: null })
  authUpdate.mockReset()
  authUpdate.mockResolvedValue({ error: null })
  eventoMock.mockReset()
  eventoMock.mockResolvedValue(undefined)

  await mutateState((s) => {
    const u = s.users[EMAIL]
    if (u) {
      u.balance = 100_000
      u.cadastro = cadastroCompleto()
    }
    s.saques = []
    s.buyOrders = []
    s.sellOffers = []
    s.trades = []
  })
})

/* ---------- 1. sem prova, nada passa ---------- */

describe('sem prova de senha, cada ação sensível pede a confirmação e não mexe em nada', () => {
  const casos: ReadonlyArray<{
    nome: string
    nivel: 'sempre' | 'janela'
    chamar: () => Promise<unknown>
  }> = [
    // saque, dados de acesso e retirada: sempre
    { nome: 'solicitarSaque', nivel: 'sempre', chamar: () => solicitarSaque(10_000) },
    { nome: 'updatePersonal (só o nome)', nivel: 'sempre', chamar: () => updatePersonal('Nome Novo da Silva') },
    {
      nome: 'solicitarRetirada',
      nivel: 'sempre',
      chamar: async () => {
        const coinId = (await getState()).users[EMAIL]!.coins[0]!.id
        return solicitarRetirada(coinId, 'comum', ENDERECO_VALIDO)
      },
    },
    // compra e venda: janela
    { nome: 'buyLot', nivel: 'janela', chamar: () => buyLot('LOT-inexistente', 1) },
    { nome: 'publishBid', nivel: 'janela', chamar: () => publishBid(1, 20_000, BANDEIRA, 'saldo') },
    { nome: 'publishOffer', nivel: 'janela', chamar: () => publishOffer(['RO-000001'], 30_000, '') },
    { nome: 'sellToBid', nivel: 'janela', chamar: () => sellToBid('BID-inexistente', 1) },
    { nome: 'iniciarCompraDireta', nivel: 'janela', chamar: () => iniciarCompraDireta('LOT-inexistente', 1, 'pix') },
    { nome: 'pagarReservaComSaldo', nivel: 'janela', chamar: () => pagarReservaComSaldo('RES-inexistente') },
    { nome: 'iniciarPagamentoReserva', nivel: 'janela', chamar: () => iniciarPagamentoReserva('RES-inexistente', 'pix') },
    { nome: 'iniciarOfertaPrePaga', nivel: 'janela', chamar: () => iniciarOfertaPrePaga(1, 20_000, BANDEIRA, 'pix') },
    {
      nome: 'publicarOfertaPrePagaComSaldo',
      nivel: 'janela',
      chamar: () => publicarOfertaPrePagaComSaldo(1, 20_000, BANDEIRA),
    },
  ]

  for (const { nome, nivel, chamar } of casos) {
    it(`${nome} pede a senha (${nivel}) e deixa o estado intacto`, async () => {
      const antes = await fotoDoEstado()

      const res = await chamar()

      bloqueioEsperado(res, nivel)
      expect(await fotoDoEstado()).toBe(antes)
      // A guarda NÃO conferiu senha nenhuma: quem confere é o modal, depois.
      expect(createClientMock).not.toHaveBeenCalled()
    })
  }

  it('a troca de e-mail pede a senha e não chega ao Supabase nem ao banco', async () => {
    sessaoAtual = EMAIL_LIVRE
    contaComProvedores('email')

    const res = await updatePersonal('Cliente Livre', 'novo.endereco@exemplo.com.br')

    bloqueioEsperado(res, 'sempre')
    expect(atualizarLoginMock).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
  })

  it('com a prova, a troca de e-mail segue até o Supabase (e só então)', async () => {
    sessaoAtual = EMAIL_LIVRE
    contaComProvedores('email')
    guardarProva('sempre')

    const res = await updatePersonal('Cliente Livre', 'novo.endereco@exemplo.com.br')

    // O teste faz o Supabase recusar, para a troca não mexer no estado compartilhado: o que
    // importa é que a guarda deixou passar e o pedido foi feito uma única vez.
    expect(pedeConfirmacao(res)).toBe(false)
    expect(res).toMatchObject({ ok: false, error: 'recusado pelo teste' })
    expect(atualizarLoginMock).toHaveBeenCalledTimes(1)
    expect(jar.has(COOKIE_DA_PROVA), 'a prova de uso único devia ter sido gasta').toBe(false)
  })

  it('sem sessão, a recusa é "Sessão expirada." e não abre modal', async () => {
    getSessionEmail.mockResolvedValue(null)

    const res = await buyLot('LOT-x', 1)

    expect(pedeConfirmacao(res)).toBe(false)
    expect(res).toMatchObject({ ok: false, error: 'Sessão expirada.' })
  })
})

/* ---------- 2. `sempre`: uma vez só ---------- */

describe('nível sempre (saque e retirada): a prova vale para UMA ação', () => {
  beforeEach(async () => {
    await mutateState((s) => {
      s.users[EMAIL]!.cadastro = {
        ...cadastroCompleto(),
        dadosBancarios: { chavePix: '52998224725', tipoChavePix: 'cpf' },
      }
    })
  })

  it('o saque passa com a prova, debita o saldo e gasta a prova', async () => {
    guardarProva('sempre')

    const res = await solicitarSaque(10_000)

    expect(res.ok).toBe(true)
    expect((await getState()).users[EMAIL]!.balance).toBe(90_000)
    expect((await getState()).saques).toHaveLength(1)
    expect(jar.has(COOKIE_DA_PROVA)).toBe(false)
  })

  it('um segundo saque, sem nova confirmação, é barrado — mesmo dentro do minuto', async () => {
    guardarProva('sempre')
    expect((await solicitarSaque(10_000)).ok).toBe(true)

    const segundo = await solicitarSaque(10_000)

    bloqueioEsperado(segundo, 'sempre')
    expect((await getState()).saques).toHaveLength(1)
    expect((await getState()).users[EMAIL]!.balance).toBe(90_000)
  })

  it('prova de saque com mais de 1 minuto não vale', async () => {
    guardarProva('sempre', { idadeMs: TOLERANCIA_ACAO_SENSIVEL_MS + 1_000 })

    const res = await solicitarSaque(10_000)

    bloqueioEsperado(res, 'sempre')
    expect((await getState()).saques).toHaveLength(0)
  })

  it('a retirada física passa a guarda com a prova e a gasta', async () => {
    guardarProva('sempre')
    const coinId = (await getState()).users[EMAIL]!.coins[0]!.id

    const res = await solicitarRetirada(coinId, 'comum', ENDERECO_VALIDO)

    // O resultado da retirada em si (taxa, custódia, estado da moeda) tem os testes de retirada.test.ts.
    expect(pedeConfirmacao(res)).toBe(false)
    expect(jar.has(COOKIE_DA_PROVA)).toBe(false)
  })
})

/* ---------- 3. `janela`: 5 minutos, várias vezes ---------- */

describe('nível janela (compra e venda): a prova vale por 5 minutos', () => {
  it('libera várias ações seguidas sem pedir de novo', async () => {
    guardarProva('janela')

    const primeira = await publishBid(1, 20_000, BANDEIRA, 'saldo')
    const segunda = await publishBid(1, 21_000, BANDEIRA, 'saldo')

    expect(primeira.ok).toBe(true)
    expect(segunda.ok).toBe(true)
    expect((await getState()).buyOrders).toHaveLength(2)
    expect(jar.has(COOKIE_DA_PROVA), 'a janela não se gasta a cada uso').toBe(true)
  })

  it('vence depois de 5 minutos', async () => {
    guardarProva('janela', { idadeMs: JANELA_COMPRA_VENDA_MS + 1_000 })

    const res = await publishBid(1, 20_000, BANDEIRA, 'saldo')

    bloqueioEsperado(res, 'janela')
    expect((await getState()).buyOrders).toHaveLength(0)
  })

  it('a prova de saque (sempre) não abre a janela de compra', async () => {
    guardarProva('sempre')

    const res = await publishBid(1, 20_000, BANDEIRA, 'saldo')

    bloqueioEsperado(res, 'janela')
  })

  it('a prova de compra (janela) não libera o saque', async () => {
    guardarProva('janela')

    const res = await solicitarSaque(10_000)

    bloqueioEsperado(res, 'sempre')
  })

  it('a prova de OUTRA conta no mesmo navegador não vale', async () => {
    guardarProva('janela', { email: OUTRA_CONTA })

    const res = await publishBid(1, 20_000, BANDEIRA, 'saldo')

    bloqueioEsperado(res, 'janela')
  })

  it('cookie adulterado não vale (nível promovido à mão)', async () => {
    guardarProva('janela')
    const valor = jar.get(COOKIE_DA_PROVA) ?? ''
    const assinatura = valor.slice(valor.lastIndexOf('.') + 1)
    const falso = Buffer.from(
      JSON.stringify({ e: EMAIL, n: 'sempre', t: Date.now() }),
      'utf8',
    ).toString('base64url')
    jar.set(COOKIE_DA_PROVA, `${falso}.${assinatura}`)

    bloqueioEsperado(await solicitarSaque(10_000), 'sempre')
  })
})

/* ---------- 4. conta que só entra com Google ---------- */

describe('conta que só entra com Google confirma por código, nunca por senha', () => {
  beforeEach(() => {
    contaComProvedores('google')
  })

  it('o saque pede o CÓDIGO', async () => {
    const res = await solicitarSaque(10_000)

    bloqueioEsperado(res, 'sempre', 'codigo')
  })

  it('a compra pede o CÓDIGO', async () => {
    const res = await publishBid(1, 20_000, BANDEIRA, 'saldo')

    bloqueioEsperado(res, 'janela', 'codigo')
  })

  it('a troca de senha pede o código mesmo que o cliente digite uma "senha atual"', async () => {
    const res = await changePassword('qualquer-coisa', 'NovaSenha123', 'NovaSenha123')

    bloqueioEsperado(res, 'sempre', 'codigo')
    // A senha digitada nem foi levada ao Supabase: conta sem senha não tem o que conferir.
    expect(createClientMock).not.toHaveBeenCalled()
    expect(authUpdate).not.toHaveBeenCalled()
  })

  it('a prova emitida depois do código libera a ação, como a da senha', async () => {
    guardarProva('sempre')
    await mutateState((s) => {
      s.users[EMAIL]!.cadastro = {
        ...cadastroCompleto(),
        dadosBancarios: { chavePix: '52998224725', tipoChavePix: 'cpf' },
      }
    })

    expect((await solicitarSaque(10_000)).ok).toBe(true)
  })
})

/* ---------- 5. troca de senha: a senha atual da tela é a confirmação ---------- */

describe('changePassword: a "senha atual" digitada é a confirmação (não pede duas vezes)', () => {
  it('senha atual ERRADA: devolve o erro de sempre, não abre modal e não troca nada', async () => {
    senhaConferidaPeloSupabase(false)

    const res = await changePassword('errada', 'NovaSenha123', 'NovaSenha123')

    expect(pedeConfirmacao(res)).toBe(false)
    expect(res).toEqual({ ok: false, error: 'Senha atual incorreta.' })
    expect(authUpdate).not.toHaveBeenCalled()
  })

  it('senha atual CERTA: troca a senha, e nenhum modal intermediário', async () => {
    const res = await changePassword('senha-atual-certa', 'NovaSenha123', 'NovaSenha123')

    expect(res.ok).toBe(true)
    expect(authUpdate).toHaveBeenCalledTimes(1)
    expect(authUpdate).toHaveBeenCalledWith({ password: 'NovaSenha123' })
  })

  it('conferir a senha não troca a sessão do site (cliente sem persistência e sessão revogada)', async () => {
    const descartavel = senhaConferidaPeloSupabase(true)

    await changePassword('senha-atual-certa', 'NovaSenha123', 'NovaSenha123')

    expect(createClientMock.mock.calls[0]?.[2]).toMatchObject({
      auth: { persistSession: false, autoRefreshToken: false },
    })
    expect(descartavel.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(setSession).not.toHaveBeenCalled()
  })

  it('nova senha curta: a confirmação foi dada, mas a regra de tamanho continua valendo', async () => {
    const res = await changePassword('senha-atual-certa', 'curta', 'curta')

    expect(res).toMatchObject({ ok: false, error: 'A nova senha precisa de pelo menos 8 caracteres.' })
    expect(authUpdate).not.toHaveBeenCalled()
  })

  it('com a prova do modal, a senha atual errada AINDA é barrada pela própria ação', async () => {
    guardarProva('sempre')
    authSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    const res = await changePassword('errada', 'NovaSenha123', 'NovaSenha123')

    expect(res).toEqual({ ok: false, error: 'Senha atual incorreta.' })
    expect(authUpdate).not.toHaveBeenCalled()
  })
})

/* ---------- 6. salvar cadastro: só pede quando muda um cadastro gravado ---------- */

describe('salvarCadastro: o primeiro preenchimento não pede, mudar o que está gravado pede', () => {
  beforeEach(async () => {
    await mutateState((s) => {
      delete (s.users[EMAIL] as { cadastro?: unknown }).cadastro
    })
  })

  it('primeiro preenchimento: grava sem pedir senha (não há Pix antigo a proteger)', async () => {
    const res = await salvarCadastro(CADASTRO_VALIDO)

    expect(res.ok).toBe(true)
    expect((await getState()).users[EMAIL]!.cadastro?.dadosBancarios.chavePix).toBe('52998224725')
  })

  it('reenviar o mesmo cadastro (o que a tela faz ao confirmar) não pede nada', async () => {
    expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)

    const res = await salvarCadastro({ ...CADASTRO_VALIDO, nomeCompleto: '  Rogério Pena  ' })

    expect(res.ok).toBe(true)
    expect(pedeConfirmacao(res)).toBe(false)
  })

  it('trocar a chave Pix de um cadastro gravado pede a senha e NÃO grava a chave nova', async () => {
    expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)

    const res = await salvarCadastro({
      ...CADASTRO_VALIDO,
      dadosBancarios: { chavePix: 'invasor@exemplo.com.br', tipoChavePix: 'email' },
    })

    bloqueioEsperado(res, 'sempre')
    expect((await getState()).users[EMAIL]!.cadastro?.dadosBancarios.chavePix).toBe('52998224725')
  })

  it('trocar o telefone ou o endereço também pede (dados pessoais são dados de acesso à conta)', async () => {
    expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)

    bloqueioEsperado(await salvarCadastro({ ...CADASTRO_VALIDO, telefone: '(21) 91234-5678' }), 'sempre')
    bloqueioEsperado(
      await salvarCadastro({ ...CADASTRO_VALIDO, endereco: { ...CADASTRO_VALIDO.endereco, numero: '999' } }),
      'sempre',
    )
  })

  it('com a prova, a chave Pix nova é gravada e a prova é gasta', async () => {
    expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)
    guardarProva('sempre')

    const res = await salvarCadastro({
      ...CADASTRO_VALIDO,
      dadosBancarios: { chavePix: 'novo.pix@exemplo.com.br', tipoChavePix: 'email' },
    })

    expect(res.ok).toBe(true)
    expect((await getState()).users[EMAIL]!.cadastro?.dadosBancarios.chavePix).toBe('novo.pix@exemplo.com.br')
    expect(jar.has(COOKIE_DA_PROVA)).toBe(false)
  })

  it('cadastro mal preenchido continua devolvendo o erro de preenchimento, sem gastar a confirmação', async () => {
    expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)

    const res = await salvarCadastro({ ...CADASTRO_VALIDO, cpf: '123.456.789-00' })

    expect(pedeConfirmacao(res)).toBe(false)
    expect(res).toEqual({ ok: false, error: 'CPF ou CNPJ inválido.' })
  })
})

/* ---------- 7. evento de segurança (T5): troca de senha, e-mail ou Pix deixa rastro ---------- */

describe('evento de segurança: troca de senha, e-mail ou Pix é registrada, e só quando deu certo', () => {
  const NOVO_EMAIL = 'novo.endereco@exemplo.com.br'

  describe('senha', () => {
    it('troca feita: emite senha_alterada da conta da sessão, sem a senha antiga nem a nova', async () => {
      const res = await changePassword('senha-atual-certa', 'NovaSenha123', 'NovaSenha123')

      expect(res.ok).toBe(true)
      expect(eventoMock).toHaveBeenCalledTimes(1)
      expect(eventoMock).toHaveBeenCalledWith({ tipo: 'senha_alterada', conta: EMAIL })
      const tudo = JSON.stringify(eventoMock.mock.calls)
      expect(tudo).not.toContain('senha-atual-certa')
      expect(tudo).not.toContain('NovaSenha123')
    })

    it('senha atual errada, nova curta, confirmação diferente ou recusa do Supabase: nenhum evento', async () => {
      senhaConferidaPeloSupabase(false)
      await changePassword('errada', 'NovaSenha123', 'NovaSenha123')

      senhaConferidaPeloSupabase(true)
      await changePassword('senha-atual-certa', 'curta', 'curta')
      await changePassword('senha-atual-certa', 'NovaSenha123', 'OutraSenha456')

      authUpdate.mockResolvedValue({ error: { message: 'falha do provedor' } })
      const recusada = await changePassword('senha-atual-certa', 'NovaSenha123', 'NovaSenha123')

      expect(recusada.ok).toBe(false)
      expect(eventoMock).not.toHaveBeenCalled()
    })

    it('conta só Google sem a prova do código: a guarda barra antes e nada é emitido', async () => {
      contaComProvedores('google')

      const res = await changePassword('qualquer', 'NovaSenha123', 'NovaSenha123')

      bloqueioEsperado(res, 'sempre', 'codigo')
      expect(eventoMock).not.toHaveBeenCalled()
    })
  })

  describe('e-mail', () => {
    beforeEach(() => {
      sessaoAtual = EMAIL_LIVRE
      contaComProvedores('email')
      atualizarLoginMock.mockResolvedValue({ ok: true })
    })

    it('troca feita: emite email_alterado com o e-mail ANTIGO como conta e o novo como afetado', async () => {
      guardarProva('sempre')

      const res = await updatePersonal('Cliente Livre', 'Novo.Endereco@exemplo.com.br')

      expect(res).toMatchObject({ ok: true, data: { emailAlterado: true, novoEmail: NOVO_EMAIL } })
      expect(setSession).toHaveBeenCalledWith(NOVO_EMAIL)
      expect(eventoMock).toHaveBeenCalledTimes(1)
      expect(eventoMock).toHaveBeenCalledWith({
        tipo: 'email_alterado',
        conta: EMAIL_LIVRE,
        tambemAfeta: [NOVO_EMAIL],
        detalhes: { de: EMAIL_LIVRE, para: NOVO_EMAIL, senhaDefinida: false, googleDesvinculado: false },
      })
    })

    it('conta Google: a troca define senha e desvincula o Google, e o evento diz isso SEM a senha', async () => {
      contaComProvedores('google')
      guardarProva('sempre')

      const res = await updatePersonal('Cliente Livre', NOVO_EMAIL, 'NovaSenha123')

      expect(res.ok).toBe(true)
      expect(eventoMock).toHaveBeenCalledTimes(1)
      expect(eventoMock.mock.calls[0]![0]).toMatchObject({
        tipo: 'email_alterado',
        detalhes: { senhaDefinida: true, googleDesvinculado: true },
      })
      expect(JSON.stringify(eventoMock.mock.calls)).not.toContain('NovaSenha123')
    })

    it('sem a confirmação, ou com o Supabase recusando a troca: nenhum evento', async () => {
      const semProva = await updatePersonal('Cliente Livre', NOVO_EMAIL)
      bloqueioEsperado(semProva, 'sempre')

      guardarProva('sempre')
      atualizarLoginMock.mockResolvedValue({ ok: false, erro: 'recusado pelo teste' })
      const recusada = await updatePersonal('Cliente Livre', NOVO_EMAIL)

      expect(recusada).toMatchObject({ ok: false, error: 'recusado pelo teste' })
      expect(eventoMock).not.toHaveBeenCalled()
    })

    it('trocar só o nome não é evento de segurança', async () => {
      sessaoAtual = EMAIL
      contaComProvedores('email')
      guardarProva('sempre')

      const res = await updatePersonal('Nome Novo da Silva')

      expect(res.ok).toBe(true)
      expect(eventoMock).not.toHaveBeenCalled()
    })
  })

  describe('Pix', () => {
    beforeEach(async () => {
      await mutateState((s) => {
        delete (s.users[EMAIL] as { cadastro?: unknown }).cadastro
      })
    })

    it('primeiro preenchimento: fica na trilha com primeiroCadastro: true (a C decide se avisa)', async () => {
      const res = await salvarCadastro(CADASTRO_VALIDO)

      expect(res.ok).toBe(true)
      expect(eventoMock).toHaveBeenCalledTimes(1)
      expect(eventoMock).toHaveBeenCalledWith({
        tipo: 'pix_alterado',
        conta: EMAIL,
        detalhes: { primeiroCadastro: true, campos: ['chavePix', 'tipoChavePix'] },
      })
    })

    it('reenviar o mesmo cadastro não emite nada', async () => {
      expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)
      eventoMock.mockClear()

      const res = await salvarCadastro({ ...CADASTRO_VALIDO, nomeCompleto: '  Rogério Pena  ' })

      expect(res.ok).toBe(true)
      expect(eventoMock).not.toHaveBeenCalled()
    })

    it('trocar a chave Pix com a confirmação: emite pix_alterado com os NOMES dos campos, nunca a chave', async () => {
      expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)
      eventoMock.mockClear()
      guardarProva('sempre')

      const res = await salvarCadastro({
        ...CADASTRO_VALIDO,
        dadosBancarios: { chavePix: 'novo.pix@exemplo.com.br', tipoChavePix: 'email' },
      })

      expect(res.ok).toBe(true)
      expect(eventoMock).toHaveBeenCalledTimes(1)
      expect(eventoMock).toHaveBeenCalledWith({
        tipo: 'pix_alterado',
        conta: EMAIL,
        detalhes: { primeiroCadastro: false, campos: ['chavePix', 'tipoChavePix'] },
      })
      const tudo = JSON.stringify(eventoMock.mock.calls)
      expect(tudo).not.toContain('novo.pix@exemplo.com.br')
      expect(tudo).not.toContain('52998224725')
    })

    it('trocar só o telefone ou o endereço pede a confirmação mas não é evento de Pix', async () => {
      expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)
      eventoMock.mockClear()
      guardarProva('sempre')

      const res = await salvarCadastro({ ...CADASTRO_VALIDO, telefone: '(21) 91234-5678' })

      expect(res.ok).toBe(true)
      expect(eventoMock).not.toHaveBeenCalled()
    })

    it('Pix novo SEM a confirmação: a guarda barra, o Pix não muda e nada é emitido', async () => {
      expect((await salvarCadastro(CADASTRO_VALIDO)).ok).toBe(true)
      eventoMock.mockClear()

      const res = await salvarCadastro({
        ...CADASTRO_VALIDO,
        dadosBancarios: { chavePix: 'invasor@exemplo.com.br', tipoChavePix: 'email' },
      })

      bloqueioEsperado(res, 'sempre')
      expect(eventoMock).not.toHaveBeenCalled()
    })

    it('cadastro com erro de preenchimento não emite nada', async () => {
      const res = await salvarCadastro({ ...CADASTRO_VALIDO, cpf: '123.456.789-00' })

      expect(res).toEqual({ ok: false, error: 'CPF ou CNPJ inválido.' })
      expect(eventoMock).not.toHaveBeenCalled()
    })
  })
})

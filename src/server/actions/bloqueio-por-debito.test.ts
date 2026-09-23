/**
 * Bloqueio por pendência de custódia nas Server Actions (E4, pendência B-2).
 *
 * O que este arquivo prova, contra o estado real em memória: conta de cliente com
 * fatura vencida não vende nem retira, os anúncios dela ficam pausados sem sumir do
 * livro, pagar a fatura libera na hora, e as saídas do bloqueio (pagar fatura,
 * cancelar anúncio, cancelar retirada, comprar) continuam abertas.
 *
 * Por que a conta de cliente é criada aqui: sem banco, `carregarMembro` cai no
 * bootstrap do ambiente, e toda conta do seed é da equipe — isenta do bloqueio. As
 * moedas dela vêm de contas do seed (nunca um código de moeda duplicado).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

// `getState` embrulhado para simular leitura que falha; o resto do módulo é o real.
vi.mock('@/server/state', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/state')>()
  return { ...original, getState: vi.fn(original.getState) }
})

// `carregarMembro` embrulhado para simular a checagem de equipe que falha.
vi.mock('@/server/admin/acesso', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/server/admin/acesso')>()
  return { ...original, carregarMembro: vi.fn(original.carregarMembro) }
})

import { COIN } from '@/domain/constants'
import { apelidoComprador } from '@/domain/contraparte'
import { availableCoinsForSell } from '@/domain/market'
import { contaComPendenciaNoEstado } from '@/domain/bloqueio-por-debito'
import type { AppState, Coin, EnderecoEntrega, FaturaCustodia } from '@/domain/types'
import { carregarMembro } from '@/server/admin/acesso'
import { _limparRepositoriosEmMemoria, repositorioIntencoes } from '@/server/payments/repositorios'
import { _limparRetiradasMemoriaParaTestes } from '@/server/shipping/retiradas'
import { MENSAGEM_CUSTODIA_NAO_PAGA } from '@/domain/bloqueio-por-debito'
import { competenciaAtual } from '@/domain/custody'
import { getState, mutateState } from '@/server/state'
import { salvarCadastro } from './account'
import { situacaoDoBloqueioPorPendencia } from './bloqueio-por-debito'
import {
  bloquearReciboPorDebito,
  cancelarSolicitacaoRetirada,
  desbloquearRecibo,
  iniciarPixRetirada,
  pagarFaturaCustodia,
  pagarRetiradaComSaldo,
  solicitarRetirada,
} from './custody'
import { buyLot, publishBid } from './market'
import { iniciarCompraDireta } from './payments'
import { cancelLot, editLot, publishOffer, sellToBid } from './sell'

const BANDEIRA = COIN.name
const CLIENTE = 'cliente.novo@exemplo.com.br'
const ROGERIO = 'rogeriopena@testeaurea.com.br'
const GABRIEL = 'gabrielsilva@testeaurea.com.br'
// Contas da equipe neste arquivo. Antes de 20/09/2026 qualquer conta do catálogo
// local era equipe; com o catálogo vazio e a lista fixa reduzida ao e-mail
// institucional, quem é equipe passa a ser declarado por AUREA_ADMIN_EMAILS —
// que é o mecanismo real do bootstrap, e não um efeito colateral do seed.
const EQUIPE = 'rozane@testeaurea.com.br'
const MENSAGEM_PENDENCIA = 'fatura de custódia vencida'

const ENDERECO: EnderecoEntrega = {
  nome: 'Cliente Novo',
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

/** Garante ao cliente pelo menos 4 moedas de Bandeira livres, tiradas de contas do seed. */
function abastecerCliente(s: AppState): void {
  s.users[CLIENTE] ??= { name: 'Cliente Novo', balance: 0, coins: [] }
  const cliente = s.users[CLIENTE]
  cliente.balance = 500_000
  cliente.inadimplente = false
  cliente.coins = cliente.coins.filter((c) => c.recibo.status !== 'Extinto')
  cliente.coins.forEach((c) => {
    c.recibo.status = 'Ativo'
  })
  const doadores = Object.keys(s.users).filter((e) => e !== CLIENTE && e !== ROGERIO && e !== GABRIEL)
  for (const email of doadores) {
    while (cliente.coins.filter((c) => c.tipoMoeda === BANDEIRA).length < 4) {
      const doador = s.users[email]
      const livre = availableCoinsForSell(s, doador, BANDEIRA)[0]
      if (!livre) break
      doador.coins = doador.coins.filter((c) => c.id !== livre.id)
      cliente.coins.push(livre)
    }
  }
}

async function moedasDoCliente(): Promise<Coin[]> {
  const s = await getState()
  return s.users[CLIENTE].coins.filter((c) => c.tipoMoeda === BANDEIRA)
}

/**
 * Deixa a custódia de TODAS as moedas em dia, no mês corrente.
 *
 * Desde 23/09/2026 publicar venda exige prova de pagamento da custódia, e não
 * mais só ausência de dívida — moeda nunca cobrada deixou de ser vendável,
 * porque nunca cobrada é o mesmo que nunca paga. Sem esta linha de base, o
 * fixture parte de um acervo que ninguém pode vender, e os casos abaixo
 * deixariam de testar o que querem: cada um deles cria a SUA pendência.
 */
async function custodiaEmDia(): Promise<void> {
  await mutateState((s) => {
    s.faturasCustodia = s.faturasCustodia ?? []
    const competencia = competenciaAtual(Date.now())
    for (const [email, u] of Object.entries(s.users)) {
      if (u.coins.length === 0) continue
      s.faturasCustodia.push({
        id: `FAT-EM-DIA-${email}`,
        userEmail: email,
        competencia,
        quantidadeMoedas: u.coins.length,
        moedaIds: u.coins.map((c) => c.id),
        valorCents: 200 * u.coins.length,
        status: 'paga',
        dataEmissao: Date.now() - 86_400_000,
        dataVencimento: Date.now() + 9 * 86_400_000,
        dataPagamento: Date.now() - 86_400_000,
        formaPagamento: 'saldo',
        paymentIntentId: null,
        planoId: null,
        origem: 'ciclo_mensal',
      })
    }
  })
}

/** Fatura pendente vencida ontem — a pendência que o bloqueio lê. */
async function criarPendencia(email: string, id = `FAT-${email}`): Promise<void> {
  await mutateState((s) => {
    s.faturasCustodia = s.faturasCustodia ?? []
    const fatura: FaturaCustodia = {
      id,
      userEmail: email,
      competencia: '2026-08',
      quantidadeMoedas: 1,
      moedaIds: [],
      valorCents: 200,
      status: 'pendente',
      dataEmissao: Date.now() - 20 * 86_400_000,
      dataVencimento: Date.now() - 86_400_000,
    }
    s.faturasCustodia.push(fatura)
  })
}

async function marcarFaturaPaga(id: string): Promise<void> {
  await mutateState((s) => {
    const f = (s.faturasCustodia ?? []).find((x) => x.id === id)
    if (f) f.status = 'paga'
  })
}

async function publicarComo(email: string, coinIds: string[], preco: number): Promise<string> {
  getSessionEmail.mockResolvedValue(email)
  const res = await publishOffer(coinIds, preco, '')
  expect(res.ok).toBe(true)
  const s = await getState()
  const oferta = s.sellOffers.find((o) => o.coinId === coinIds[0])
  if (!oferta) throw new Error('oferta não publicada')
  return oferta.lotId
}

beforeEach(async () => {
  vi.stubEnv('AUREA_ADMIN_EMAILS', `${EQUIPE},${ROGERIO}`)
  getSessionEmail.mockReset()
  getSessionEmail.mockResolvedValue(CLIENTE)
  vi.mocked(getState).mockReset()
  vi.mocked(carregarMembro).mockReset()
  _limparRetiradasMemoriaParaTestes()
  _limparRepositoriosEmMemoria()

  await mutateState((s) => {
    s.sellOffers = []
    s.buyOrders = []
    s.trades = []
    s.retiradas = []
    s.faturasCustodia = []
    abastecerCliente(s)
    s.users[ROGERIO].balance = 1_000_000
    s.users[ROGERIO].inadimplente = false
    s.users[ROGERIO].coins.forEach((c) => {
      if (c.recibo.status === 'Bloqueado') c.recibo.status = 'Ativo'
    })
    s.users[GABRIEL].balance = 1_000_000
  })

  await custodiaEmDia()
})

describe('retirada com pendência de custódia', () => {
  it('solicitarRetirada recusa com fatura vencida e aceita depois de paga', async () => {
    const [moeda] = await moedasDoCliente()
    await criarPendencia(CLIENTE)

    const recusa = await solicitarRetirada(moeda.id, 'comum', ENDERECO)
    expect(recusa.ok).toBe(false)
    expect(recusa.error).toContain(MENSAGEM_PENDENCIA)
    expect((await getState()).retiradas ?? []).toHaveLength(0)

    await marcarFaturaPaga(`FAT-${CLIENTE}`)
    const aceita = await solicitarRetirada(moeda.id, 'comum', ENDERECO)
    expect(aceita.ok).toBe(true)
  })

  it('solicitarRetirada recusa com a marca manual de inadimplência, sem fatura', async () => {
    const [moeda] = await moedasDoCliente()
    await mutateState((s) => {
      s.users[CLIENTE].inadimplente = true
    })
    const res = await solicitarRetirada(moeda.id, 'comum', ENDERECO)
    expect(res.ok).toBe(false)
    expect(res.error).toContain(MENSAGEM_PENDENCIA)
  })

  it('pagarRetiradaComSaldo recusa com pendência: saldo e recibo intactos', async () => {
    const [moeda] = await moedasDoCliente()
    const sol = await solicitarRetirada(moeda.id, 'comum', ENDERECO)
    expect(sol.ok).toBe(true)
    await criarPendencia(CLIENTE)
    const saldoAntes = (await getState()).users[CLIENTE].balance

    const res = await pagarRetiradaComSaldo(sol.data!.retiradaId)
    expect(res.ok).toBe(false)
    expect(res.error).toContain(MENSAGEM_PENDENCIA)
    const depois = await getState()
    expect(depois.users[CLIENTE].balance).toBe(saldoAntes)
    expect(depois.users[CLIENTE].coins.find((c) => c.id === moeda.id)?.recibo.status).toBe('Ativo')
  })

  it('pagarRetiradaComSaldo recusa recibo bloqueado depois da solicitação e não extingue', async () => {
    const [moeda] = await moedasDoCliente()
    const sol = await solicitarRetirada(moeda.id, 'comum', ENDERECO)
    expect(sol.ok).toBe(true)
    await mutateState((s) => {
      const c = s.users[CLIENTE].coins.find((x) => x.id === moeda.id)
      if (c) c.recibo.status = 'Bloqueado'
    })

    const res = await pagarRetiradaComSaldo(sol.data!.retiradaId)
    expect(res.ok).toBe(false)
    expect(res.error).toContain('bloqueado')
    const c = (await getState()).users[CLIENTE].coins.find((x) => x.id === moeda.id)
    expect(c?.recibo.status).toBe('Bloqueado')
  })

  it('iniciarPixRetirada recusa sem criar intenção; com a leitura falhando, libera e gera a cobrança', async () => {
    const [moeda] = await moedasDoCliente()
    const sol = await solicitarRetirada(moeda.id, 'comum', ENDERECO)
    expect(sol.ok).toBe(true)
    await criarPendencia(CLIENTE)

    const recusa = await iniciarPixRetirada(sol.data!.retiradaId)
    expect(recusa.ok).toBe(false)
    expect(recusa.error).toContain(MENSAGEM_PENDENCIA)
    expect(await repositorioIntencoes().listar()).toHaveLength(0)

    vi.mocked(getState).mockRejectedValueOnce(new Error('banco fora'))
    const liberada = await iniciarPixRetirada(sol.data!.retiradaId)
    expect(liberada.ok).toBe(true)
    expect(await repositorioIntencoes().listar()).toHaveLength(1)
  })
})

describe('venda com pendência de custódia', () => {
  it('publishOffer recusa e o livro não muda', async () => {
    const [moeda] = await moedasDoCliente()
    await criarPendencia(CLIENTE)
    const res = await publishOffer([moeda.id], 30_000, '')
    expect(res.ok).toBe(false)
    expect(res.error).toContain(MENSAGEM_PENDENCIA)
    expect((await getState()).sellOffers).toHaveLength(0)
  })

  it('sellToBid recusa e nenhuma negociação acontece', async () => {
    getSessionEmail.mockResolvedValue(GABRIEL)
    expect((await publishBid(1, 20_000, BANDEIRA)).ok).toBe(true)
    const bid = (await getState()).buyOrders[0]
    await criarPendencia(CLIENTE)

    getSessionEmail.mockResolvedValue(CLIENTE)
    const res = await sellToBid(bid.id, 1)
    expect(res.ok).toBe(false)
    expect(res.error).toContain(MENSAGEM_PENDENCIA)
    expect((await getState()).trades).toHaveLength(0)
  })

  it('editLot recusa aumento de quantidade e aceita redução', async () => {
    const moedas = await moedasDoCliente()
    const lotId = await publicarComo(CLIENTE, [moedas[0].id, moedas[1].id], 90_000)
    await criarPendencia(CLIENTE)

    getSessionEmail.mockResolvedValue(CLIENTE)
    const aumento = await editLot(lotId, 90_000, 3)
    expect(aumento.ok).toBe(false)
    expect(aumento.error).toContain(MENSAGEM_PENDENCIA)

    const reducao = await editLot(lotId, 90_000, 1)
    expect(reducao.ok).toBe(true)
    expect((await getState()).sellOffers.filter((o) => o.lotId === lotId)).toHaveLength(1)
  })

  it('anúncio de vendedor com pendência não casa com bid; pago a fatura, casa', async () => {
    const [moeda] = await moedasDoCliente()
    await publicarComo(CLIENTE, [moeda.id], 25_000)
    await criarPendencia(CLIENTE)
    const prioridadeAntes = (await getState()).sellOffers[0].prioridadeEm

    getSessionEmail.mockResolvedValue(GABRIEL)
    expect((await publishBid(1, 30_000, BANDEIRA)).ok).toBe(true)
    let s = await getState()
    expect(s.trades).toHaveLength(0)
    expect(s.sellOffers).toHaveLength(1)
    expect(s.sellOffers[0].prioridadeEm).toBe(prioridadeAntes)

    await marcarFaturaPaga(`FAT-${CLIENTE}`)
    expect((await publishBid(1, 30_000, BANDEIRA)).ok).toBe(true)
    s = await getState()
    expect(s.trades.length).toBeGreaterThan(0)
    expect(s.trades[0].seller).toBe(CLIENTE)
  })

  it('buyLot e iniciarCompraDireta recusam lote de vendedor com pendência', async () => {
    const [moeda] = await moedasDoCliente()
    const lotId = await publicarComo(CLIENTE, [moeda.id], 25_000)
    await criarPendencia(CLIENTE)

    getSessionEmail.mockResolvedValue(GABRIEL)
    const compra = await buyLot(lotId, 1)
    expect(compra.ok).toBe(false)
    expect(compra.error).toContain('pausado')

    await salvarCadastro({
      cpf: '529.982.247-25',
      nomeCompleto: 'Gabriel Silva',
      dataNascimento: '1990-01-01',
      telefone: '(11) 98765-4321',
      endereco: {
        logradouro: 'Rua das Moedas',
        numero: '10',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01001-000',
      },
      dadosBancarios: {
        chavePix: '52998224725',
        tipoChavePix: 'cpf',
      },
    })
    const direta = await iniciarCompraDireta(lotId, 1, 'pix')
    expect(direta.ok).toBe(false)
    expect(direta.error).toContain('pausado')
  })

  it('sellToBid concluída mostra o apelido do comprador, nunca o nome', async () => {
    getSessionEmail.mockResolvedValue(GABRIEL)
    expect((await publishBid(1, 20_000, BANDEIRA)).ok).toBe(true)
    const bid = (await getState()).buyOrders[0]

    getSessionEmail.mockResolvedValue(CLIENTE)
    const res = await sellToBid(bid.id, 1)
    expect(res.ok).toBe(true)
    expect(res.message).toContain(apelidoComprador(bid.id))
    expect(res.message).not.toContain('Gabriel Silva')
  })
})

describe('o que continua liberado para a conta com pendência', () => {
  it('pagarFaturaCustodia paga e a conta sai da pendência', async () => {
    await criarPendencia(CLIENTE)
    const res = await pagarFaturaCustodia(`FAT-${CLIENTE}`)
    expect(res.ok).toBe(true)
    expect(contaComPendenciaNoEstado(await getState(), CLIENTE, Date.now())).toBe(false)
  })

  it('cancelLot, cancelarSolicitacaoRetirada e publishBid como compradora', async () => {
    const moedas = await moedasDoCliente()
    const lotId = await publicarComo(CLIENTE, [moedas[0].id], 90_000)
    getSessionEmail.mockResolvedValue(CLIENTE)
    const sol = await solicitarRetirada(moedas[1].id, 'comum', ENDERECO)
    expect(sol.ok).toBe(true)
    await criarPendencia(CLIENTE)

    expect((await cancelLot(lotId)).ok).toBe(true)
    expect((await cancelarSolicitacaoRetirada(sol.data!.retiradaId)).ok).toBe(true)
    expect((await publishBid(1, 10_000, BANDEIRA)).ok).toBe(true)
  })
})

describe('conta da equipe fica isenta', () => {
  it('sócio do seed com fatura atrasada vende, retira e tem o anúncio casado', async () => {
    const livres = availableCoinsForSell(await getState(), (await getState()).users[ROGERIO], BANDEIRA)
    expect(livres.length).toBeGreaterThanOrEqual(3)
    await criarPendencia(ROGERIO)

    const lotId = await publicarComo(ROGERIO, [livres[0].id], 90_000)
    expect(lotId).toBeTruthy()

    getSessionEmail.mockResolvedValue(GABRIEL)
    expect((await publishBid(1, 20_000, BANDEIRA)).ok).toBe(true)
    const bid = (await getState()).buyOrders[0]
    getSessionEmail.mockResolvedValue(ROGERIO)
    expect((await sellToBid(bid.id, 1)).ok).toBe(true)

    const retirada = await solicitarRetirada(livres[2].id, 'comum', ENDERECO)
    expect(retirada.ok).toBe(true)

    const situacao = await situacaoDoBloqueioPorPendencia()
    expect(situacao.minhaContaBloqueada).toBe(false)
    expect(situacao.vendedoresPausados).not.toContain(ROGERIO)

    getSessionEmail.mockResolvedValue(GABRIEL)
    const tradesAntes = (await getState()).trades.length
    expect((await publishBid(1, 95_000, BANDEIRA)).ok).toBe(true)
    const s = await getState()
    expect(s.trades.length).toBe(tradesAntes + 1)
    expect(s.trades[s.trades.length - 1].seller).toBe(ROGERIO)
  })

  it('situacaoDoBloqueioPorPendencia marca e lista o cliente fora da equipe', async () => {
    const [moeda] = await moedasDoCliente()
    await publicarComo(CLIENTE, [moeda.id], 90_000)
    await criarPendencia(CLIENTE)

    getSessionEmail.mockResolvedValue(CLIENTE)
    const situacao = await situacaoDoBloqueioPorPendencia()
    expect(situacao.minhaContaBloqueada).toBe(true)
    expect(situacao.vendedoresPausados).toContain(CLIENTE)
  })

  it('checagem de equipe que falha libera o cliente com pendência', async () => {
    vi.mocked(carregarMembro).mockRejectedValue(new Error('banco fora'))
    const moedas = await moedasDoCliente()
    await criarPendencia(CLIENTE)

    const oferta = await publishOffer([moedas[0].id], 90_000, '')
    expect(oferta.ok).toBe(true)
    const retirada = await solicitarRetirada(moedas[1].id, 'comum', ENDERECO)
    expect(retirada.ok).toBe(true)
  })
})

describe('bloquear e desbloquear recibo são da equipe', () => {
  it('cliente fora da equipe, mesmo dono do recibo, é recusado e o status não muda', async () => {
    const [moeda] = await moedasDoCliente()

    const bloq = await bloquearReciboPorDebito(moeda.id)
    expect(bloq).toEqual({ ok: false, error: 'Ação restrita à equipe do Real Olímpico.' })
    expect((await moedasDoCliente()).find((c) => c.id === moeda.id)?.recibo.status).toBe('Ativo')

    await mutateState((s) => {
      const c = s.users[CLIENTE].coins.find((x) => x.id === moeda.id)
      if (c) c.recibo.status = 'Bloqueado'
    })
    const desbloq = await desbloquearRecibo(moeda.id)
    expect(desbloq).toEqual({ ok: false, error: 'Ação restrita à equipe do Real Olímpico.' })
    expect((await moedasDoCliente()).find((c) => c.id === moeda.id)?.recibo.status).toBe('Bloqueado')
  })

  it('conta da equipe pelo bootstrap bloqueia e desbloqueia como antes', async () => {
    const [moeda] = await moedasDoCliente()
    getSessionEmail.mockResolvedValue(EQUIPE)

    const bloq = await bloquearReciboPorDebito(moeda.id)
    expect(bloq.ok).toBe(true)
    expect((await moedasDoCliente()).find((c) => c.id === moeda.id)?.recibo.status).toBe('Bloqueado')

    const desbloq = await desbloquearRecibo(moeda.id)
    expect(desbloq.ok).toBe(true)
    expect((await moedasDoCliente()).find((c) => c.id === moeda.id)?.recibo.status).toBe('Ativo')
  })
})

/**
 * O buraco que o Gabriel encontrou em 23/09/2026: onze moedas sem cobrança
 * alguma foram publicadas à venda. A trava perguntava "existe fatura em
 * aberto?", e moeda nunca cobrada não tem fatura nenhuma — respondia "sem
 * dívida" e liberava.
 */
describe('moeda que nunca foi cobrada não pode ser vendida', () => {
  it('publishOffer recusa quando não há prova de pagamento da custódia', async () => {
    // Sem nenhuma fatura: é o estado de toda moeda recém-cadastrada, entre o
    // cadastro e a primeira passagem do ciclo mensal.
    await mutateState((s) => {
      s.faturasCustodia = []
      s.planosCustodia = []
    })

    const moedas = await moedasDoCliente()
    getSessionEmail.mockResolvedValue(CLIENTE)
    const res = await publishOffer([moedas[0].id], 20_000, '')

    expect(res.ok).toBe(false)
    expect(res.error).toBe(MENSAGEM_CUSTODIA_NAO_PAGA)

    const s = await getState()
    expect(s.sellOffers).toHaveLength(0)
  })

  it('paga a custódia do mês corrente, a mesma moeda passa a ser vendável', async () => {
    await mutateState((s) => {
      s.faturasCustodia = []
      s.planosCustodia = []
    })
    await custodiaEmDia()

    const moedas = await moedasDoCliente()
    getSessionEmail.mockResolvedValue(CLIENTE)
    const res = await publishOffer([moedas[0].id], 20_000, '')

    expect(res.ok).toBe(true)
    const s = await getState()
    expect(s.sellOffers).toHaveLength(1)
  })
})

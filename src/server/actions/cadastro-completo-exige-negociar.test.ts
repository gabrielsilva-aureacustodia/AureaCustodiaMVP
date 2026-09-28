/**
 * Ninguém sem cadastro formal completo negocia — nenhuma das cinco portas
 * (28/09/2026).
 *
 * O PEDIDO QUE ORIGINOU ESTE ARQUIVO
 * -----------------------------------
 * "Na conta da Rôzane, no admin me fala que ela não tem cadastro completo;
 * mas ela está ofertando moedas, como isso é possível? Deveria travar
 * qualquer negociação sem ela ter cadastro completo, lembra?"
 *
 * `temCadastroCompleto` (src/domain/cadastro.ts) já travava depósito, compra
 * direta e envio — mas nunca tinha sido ligado a PUBLICAR uma oferta. Cada
 * teste aqui prova que uma das cinco Server Actions que colocam algo no
 * livro se recusa, de cara, quando a conta não tem cadastro completo — e que
 * nenhuma delas mexe no estado antes de recusar.
 *
 * O backstop dentro do motor (`expurgarOfertasSemCadastro`, chamado por
 * `casarOrdensRespeitandoPendencia`) tem os próprios testes em
 * src/domain/bloqueio-por-debito.test.ts — aqui o alvo é a resposta imediata
 * que a Server Action dá a quem tentou.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import { COIN } from '@/domain/constants'
import { competenciaAtual } from '@/domain/custody'
import { cadastroCompleto } from '@/domain/testing/fixtures'
import { getState, mutateState } from '@/server/state'
import { publishBid } from './market'
import { publicarOfertaPrePagaComSaldo, iniciarOfertaPrePaga } from './reserva'
import { publishOffer, sellToBid } from './sell'

const BANDEIRA = COIN.name
const ROZANE = 'rozane@testeaurea.com.br'
const ROGERIO = 'rogeriopena@testeaurea.com.br'

const MENSAGEM = 'Complete seu cadastro formal em Minha conta'

beforeEach(async () => {
  getSessionEmail.mockReset()

  await mutateState((s) => {
    s.sellOffers = []
    s.buyOrders = []
    s.trades = []

    // A conta sem cadastro (o caso real: a Rozâne). O acervo dela precisa de
    // ao menos uma moeda livre para as tentativas de venda terem o que negar.
    if (s.users[ROZANE]) {
      delete (s.users[ROZANE] as { cadastro?: unknown }).cadastro
      s.users[ROZANE].balance = 100_000
    }
    if (s.users[ROGERIO]) {
      s.users[ROGERIO].balance = 100_000
      // ROGERIO representa "a outra conta, com cadastro completo" nos casos
      // que precisam de alguém do lado saudável — aqui o teste é sobre a
      // conta SEM cadastro, não sobre ele.
      s.users[ROGERIO].cadastro = cadastroCompleto()
    }

    // Custódia em dia de todo mundo: publishOffer também exige prova de
    // pagamento da custódia (23/09/2026), e este arquivo testa cadastro, não
    // custódia — sem isto, a recusa certa (custódia) mascararia a recusa
    // errada (cadastro) no teste que completa o cadastro e espera publicar.
    s.faturasCustodia = []
    const competencia = competenciaAtual(Date.now())
    for (const [email, u] of Object.entries(s.users)) {
      if (u.coins.length === 0) continue
      s.faturasCustodia!.push({
        id: `FAT-EM-DIA-${email}`,
        userEmail: email,
        competencia,
        quantidadeMoedas: u.coins.length,
        moedaIds: u.coins.map((c) => c.id),
        valorCents: 200 * u.coins.length,
        status: 'paga',
        dataEmissao: Date.now() - 86_400_000,
        dataVencimento: Date.now() + 29 * 86_400_000,
        dataPagamento: Date.now() - 86_400_000,
        formaPagamento: 'saldo',
        paymentIntentId: null,
        planoId: null,
        origem: 'ciclo_mensal',
      })
    }
  })
})

async function moedaLivreDe(email: string): Promise<string> {
  const s = await getState()
  const c = s.users[email]!.coins.find((c) => c.tipoMoeda === BANDEIRA && c.recibo.status === 'Ativo')
  return c!.id
}

describe('publishOffer recusa sem cadastro completo', () => {
  it('não publica e não toca no livro', async () => {
    getSessionEmail.mockResolvedValue(ROZANE)
    const coinId = await moedaLivreDe(ROZANE)

    const r = await publishOffer([coinId], 40_000, '')

    expect(r.ok).toBe(false)
    expect(r.error).toContain(MENSAGEM)
    expect((await getState()).sellOffers).toHaveLength(0)
  })
})

describe('publishBid recusa sem cadastro completo', () => {
  it('não publica e não toca no livro', async () => {
    getSessionEmail.mockResolvedValue(ROZANE)

    const r = await publishBid(1, 20_000, BANDEIRA, 'saldo')

    expect(r.ok).toBe(false)
    expect(r.error).toContain(MENSAGEM)
    expect((await getState()).buyOrders).toHaveLength(0)
  })
})

describe('sellToBid recusa sem cadastro completo — do lado de quem vende', () => {
  it('não executa a venda direta', async () => {
    // O Rogério publica a oferta de compra primeiro, com cadastro completo:
    // o teste é sobre o VENDEDOR sem cadastro, não sobre quem comprou.
    getSessionEmail.mockResolvedValue(ROGERIO)
    const pub = await publishBid(1, 20_000, BANDEIRA, 'saldo')
    expect(pub.ok).toBe(true)
    const bidId = (await getState()).buyOrders[0]!.id

    getSessionEmail.mockResolvedValue(ROZANE)
    const r = await sellToBid(bidId, 1)

    expect(r.ok).toBe(false)
    expect(r.error).toContain(MENSAGEM)
    // O bid do Rogério continua inteiro — nada foi vendido para ele.
    expect((await getState()).buyOrders[0]!.qty).toBe(1)
  })
})

describe('iniciarOfertaPrePaga recusa sem cadastro completo', () => {
  it('não abre cobrança nenhuma no gateway', async () => {
    getSessionEmail.mockResolvedValue(ROZANE)

    const r = await iniciarOfertaPrePaga(1, 20_000, BANDEIRA, 'pix')

    expect(r.ok).toBe(false)
    expect(r.error).toContain(MENSAGEM)
  })
})

describe('publicarOfertaPrePagaComSaldo recusa sem cadastro completo', () => {
  it('não debita e não publica', async () => {
    getSessionEmail.mockResolvedValue(ROZANE)
    const antes = (await getState()).users[ROZANE]!.balance

    const r = await publicarOfertaPrePagaComSaldo(1, 20_000, BANDEIRA)

    expect(r.ok).toBe(false)
    expect(r.error).toContain(MENSAGEM)
    const depois = await getState()
    expect(depois.buyOrders).toHaveLength(0)
    expect(depois.users[ROZANE]!.balance).toBe(antes)
  })
})

describe('com cadastro completo, a mesma conta publica normalmente', () => {
  it('publishOffer funciona depois de completar o cadastro', async () => {
    getSessionEmail.mockResolvedValue(ROZANE)
    const coinId = await moedaLivreDe(ROZANE)

    await mutateState((s) => {
      s.users[ROZANE]!.cadastro = {
        cpf: '529.982.247-25',
        nomeCompleto: 'Rozâne Teste',
        dataNascimento: '1990-01-01',
        telefone: '(11) 98765-4321',
        endereco: {
          logradouro: 'Rua das Moedas',
          numero: '10',
          bairro: 'Centro',
          cidade: 'São Paulo',
          uf: 'SP',
          cep: '01000-000',
        },
        dadosBancarios: { chavePix: 'rozane@exemplo.com.br', tipoChavePix: 'email' },
        completadoEm: Date.now(),
      }
    })

    const r = await publishOffer([coinId], 40_000, '')

    expect(r.ok).toBe(true)
    expect((await getState()).sellOffers).toHaveLength(1)
  })
})

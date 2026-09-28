/**
 * Quando duas ordens casam, a transação acontece DE VERDADE.
 *
 * O PEDIDO QUE ORIGINOU ESTE ARQUIVO (28/09/2026)
 * -----------------------------------------------
 * "Se a oferta casar, tem que de fato acontecer a transação no automático, não
 * adianta dizer que aconteceu no sistema e nada acontecer para os clientes."
 *
 * Os testes de `market.test.ts` exercitam o motor puro. Estes aqui exercitam o
 * caminho inteiro pelas Server Actions — publicar de um lado, publicar do
 * outro, e conferir o que sobrou no estado — porque é ali que mora a diferença
 * entre "o motor casou" e "o cliente recebeu":
 *
 *   - a moeda mudou de dono e saiu do acervo de quem vendeu;
 *   - o dinheiro saiu de uma conta e entrou na outra, com as duas taxas;
 *   - a oferta saiu do livro, para não ser vendida duas vezes;
 *   - a negociação ficou registrada no histórico.
 *
 * E o casamento tem de disparar pelos DOIS lados: tanto faz quem chegou
 * primeiro, o comprador ou o vendedor.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import { COIN } from '@/domain/constants'
import { competenciaAtual } from '@/domain/custody'
import { getState, mutateState } from '@/server/state'
import { publishBid } from './market'
import { publishOffer } from './sell'

const BANDEIRA = COIN.name
const VENDEDOR = 'rogeriopena@testeaurea.com.br'
const COMPRADOR = 'gabrielsilva@testeaurea.com.br'

/** Preço + taxa de compra: 0,5% + R$ 1,00 (TAXAS_PADRAO). */
const PRECO = 20_000
const TAXA_COMPRADOR = Math.round(PRECO * 0.005) + 100 // R$ 2,00
const TAXA_VENDEDOR = Math.round(PRECO * 0.005) + 100

beforeEach(async () => {
  getSessionEmail.mockReset()

  await mutateState((s) => {
    s.sellOffers = []
    s.buyOrders = []
    s.trades = []
    s.reservas = []

    s.users[VENDEDOR]!.balance = 0
    s.users[COMPRADOR]!.balance = 100_000
    s.users[COMPRADOR]!.coins = []

    // Custódia em dia: desde 23/09/2026 publicar venda exige prova de
    // pagamento, e este arquivo é sobre casamento, não sobre custódia.
    s.faturasCustodia = []
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

async function moedaDoVendedor(): Promise<string> {
  const s = await getState()
  return s.users[VENDEDOR]!.coins.find((c) => c.tipoMoeda === BANDEIRA)!.id
}

/** O que precisa ter mudado para a negociação ter acontecido de verdade. */
async function conferirExecucao(coinId: string): Promise<void> {
  const s = await getState()

  // 1. A moeda mudou de dono.
  expect(s.users[COMPRADOR]!.coins.some((c) => c.id === coinId)).toBe(true)
  expect(s.users[VENDEDOR]!.coins.some((c) => c.id === coinId)).toBe(false)

  // 2. O dinheiro andou, com as duas taxas.
  expect(s.users[COMPRADOR]!.balance).toBe(100_000 - (PRECO + TAXA_COMPRADOR))
  expect(s.users[VENDEDOR]!.balance).toBe(PRECO - TAXA_VENDEDOR)

  // 3. A oferta saiu do livro — moeda vendida não fica à venda.
  expect(s.sellOffers.some((o) => o.coinId === coinId)).toBe(false)

  // 4. A ordem de compra foi consumida.
  expect(s.buyOrders.filter((b) => b.buyer === COMPRADOR && b.qty > 0)).toHaveLength(0)

  // 5. Ficou registrado no histórico.
  const t = s.trades[s.trades.length - 1]!
  expect(t).toMatchObject({ buyer: COMPRADOR, seller: VENDEDOR, price: PRECO, tipoMoeda: BANDEIRA })
}

describe('casamento automático executa a transação inteira', () => {
  it('a venda chega depois da compra e executa na hora', async () => {
    const coinId = await moedaDoVendedor()

    getSessionEmail.mockResolvedValue(COMPRADOR)
    expect((await publishBid(1, PRECO, BANDEIRA, 'saldo')).ok).toBe(true)

    getSessionEmail.mockResolvedValue(VENDEDOR)
    expect((await publishOffer([coinId], PRECO, '')).ok).toBe(true)

    await conferirExecucao(coinId)
  })

  it('a compra chega depois da venda e executa na hora', async () => {
    const coinId = await moedaDoVendedor()

    getSessionEmail.mockResolvedValue(VENDEDOR)
    expect((await publishOffer([coinId], PRECO, '')).ok).toBe(true)

    getSessionEmail.mockResolvedValue(COMPRADOR)
    expect((await publishBid(1, PRECO, BANDEIRA, 'saldo')).ok).toBe(true)

    await conferirExecucao(coinId)
  })

  it('bid ACIMA do preço pedido paga o preço do VENDEDOR, não o teto do comprador', async () => {
    const coinId = await moedaDoVendedor()

    getSessionEmail.mockResolvedValue(VENDEDOR)
    expect((await publishOffer([coinId], PRECO, '')).ok).toBe(true)

    getSessionEmail.mockResolvedValue(COMPRADOR)
    expect((await publishBid(1, PRECO + 5_000, BANDEIRA, 'saldo')).ok).toBe(true)

    // O comprador ofereceu até R$ 250,00 e pagou os R$ 200,00 pedidos.
    await conferirExecucao(coinId)
  })

  it('ninguém compra da própria oferta — e nada se move', async () => {
    const coinId = await moedaDoVendedor()

    getSessionEmail.mockResolvedValue(VENDEDOR)
    expect((await publishOffer([coinId], PRECO, '')).ok).toBe(true)
    await mutateState((s) => {
      s.users[VENDEDOR]!.balance = 100_000
    })
    expect((await publishBid(1, PRECO, BANDEIRA, 'saldo')).ok).toBe(true)

    const s = await getState()
    expect(s.users[VENDEDOR]!.coins.some((c) => c.id === coinId)).toBe(true)
    expect(s.sellOffers.some((o) => o.coinId === coinId)).toBe(true)
    expect(s.trades).toHaveLength(0)
  })
})

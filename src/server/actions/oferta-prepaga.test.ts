/**
 * A oferta pré-paga só existe depois de paga (28/09/2026).
 *
 * A regra que estes testes protegem é a do Gabriel: "o sistema já publicou
 * antes de eu pagar; só pode publicar após eu pagar". Até 27/09 a ordem era
 * gravada no livro com `pagoAntecipadoCents: 0` e o motor a pulava — mas ela
 * APARECIA publicada em toda tela que lê `state.buyOrders`, que são oito.
 *
 * O que se prova aqui:
 *  1. `publishBid` com 'prepago' não cria linha nenhuma no livro;
 *  2. pagar com saldo cria a ordem já bancada, e o dinheiro sai da conta;
 *  3. a prioridade na fila conta do PAGAMENTO — oferta não paga não guarda lugar;
 *  4. saldo insuficiente não deixa meia-oferta para trás.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import { COIN } from '@/domain/constants'
import { cadastroCompleto } from '@/domain/testing/fixtures'
import { getState, mutateState } from '@/server/state'
import { publishBid } from './market'
import { publicarOfertaPrePagaComSaldo } from './reserva'

const BANDEIRA = COIN.name
const ROGERIO = 'rogeriopena@testeaurea.com.br'

describe('oferta de compra pré-paga', () => {
  beforeEach(async () => {
    getSessionEmail.mockReset()
    getSessionEmail.mockResolvedValue(ROGERIO)

    await mutateState((s) => {
      s.sellOffers = []
      s.buyOrders = []
      s.trades = []
      if (s.users[ROGERIO]) {
        s.users[ROGERIO].balance = 100_000
        // Cadastro completo (28/09/2026): publicar oferta de compra passou a
        // exigir cadastro formal completo, e este arquivo testa a cobrança
        // pré-paga, não o cadastro.
        s.users[ROGERIO].cadastro = cadastroCompleto()
      }
    })
  })

  it('publishBid recusa a modalidade pré-paga e NÃO deixa ordem no livro', async () => {
    const r = await publishBid(1, 20_000, BANDEIRA, 'prepago')

    expect(r.ok).toBe(false)
    expect(r.error).toContain('publicada pelo pagamento')

    const s = await getState()
    expect(s.buyOrders).toHaveLength(0)
  })

  it('pagar com saldo cria a ordem já bancada e debita a conta', async () => {
    const antes = (await getState()).users[ROGERIO]!.balance

    const r = await publicarOfertaPrePagaComSaldo(1, 20_000, BANDEIRA)
    expect(r.ok).toBe(true)

    const s = await getState()
    expect(s.buyOrders).toHaveLength(1)

    const bo = s.buyOrders[0]!
    expect(bo.modalidade).toBe('prepago')
    expect(bo.buyer).toBe(ROGERIO)
    expect(bo.price).toBe(20_000)
    // Preço mais a taxa de compra (0,5% + R$ 1,00): R$ 200,00 -> R$ 202,00.
    expect(bo.pagoAntecipadoCents).toBe(20_200)
    expect(s.users[ROGERIO]!.balance).toBe(antes - 20_200)
  })

  it('a prioridade na fila conta do pagamento, não de uma publicação anterior', async () => {
    const r = await publicarOfertaPrePagaComSaldo(1, 20_000, BANDEIRA)
    expect(r.ok).toBe(true)

    const bo = (await getState()).buyOrders[0]!
    // Nasce no mesmo instante em que foi paga: não há janela entre "publicada"
    // e "paga" em que a oferta pudesse guardar lugar na fila de graça.
    expect(bo.prioridadeEm).toBe(bo.createdAt)
  })

  it('saldo insuficiente recusa sem criar ordem nem mexer no saldo', async () => {
    await mutateState((s) => {
      s.users[ROGERIO]!.balance = 100
    })

    const r = await publicarOfertaPrePagaComSaldo(1, 20_000, BANDEIRA)

    expect(r.ok).toBe(false)
    expect(r.error).toContain('Saldo insuficiente')

    const s = await getState()
    expect(s.buyOrders).toHaveLength(0)
    expect(s.users[ROGERIO]!.balance).toBe(100)
  })

  it('recusa quantidade ou preço inválidos sem tocar no livro', async () => {
    expect((await publicarOfertaPrePagaComSaldo(0, 20_000, BANDEIRA)).ok).toBe(false)
    expect((await publicarOfertaPrePagaComSaldo(1, 0, BANDEIRA)).ok).toBe(false)
    expect((await publicarOfertaPrePagaComSaldo(1, 20_000, 'Moeda Inexistente')).ok).toBe(false)

    expect((await getState()).buyOrders).toHaveLength(0)
  })
})

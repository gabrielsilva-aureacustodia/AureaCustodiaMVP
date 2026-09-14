import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getSessionEmail } = vi.hoisted(() => ({ getSessionEmail: vi.fn() }))
vi.mock('@/server/session', () => ({ getSessionEmail }))

import { COIN } from '@/domain/constants'
import { getState, mutateState } from '@/server/state'
import { publishBid, editBid } from './market'
import { publishOffer, editLot } from './sell'

const BANDEIRA = COIN.name
const ROGERIO = 'rogeriopena@testeaurea.com.br'
const GABRIEL = 'gabrielsilva@testeaurea.com.br'

describe('Ações de ordens — prioridade, edição e fila justa (A2, Decisão F-3)', () => {
  beforeEach(async () => {
    getSessionEmail.mockReset()
    getSessionEmail.mockResolvedValue(ROGERIO)

    await mutateState((s) => {
      s.sellOffers = []
      s.buyOrders = []
      s.trades = []
      if (s.users[ROGERIO]) {
        s.users[ROGERIO].balance = 100_000
      }
      if (s.users[GABRIEL]) {
        s.users[GABRIEL].balance = 100_000
      }
    })
  })

  it('moedas do mesmo anúncio nascem com a mesma prioridadeEm e createdAt', async () => {
    const state = await getState()
    const rogerioCoins = state.users[ROGERIO].coins.filter((c) => c.tipoMoeda === BANDEIRA)
    expect(rogerioCoins.length).toBeGreaterThanOrEqual(2)

    const ids = [rogerioCoins[0].id, rogerioCoins[1].id]
    const res = await publishOffer(ids, 25_000, 'Lote com 2 moedas')
    expect(res.ok).toBe(true)

    const apos = await getState()
    expect(apos.sellOffers).toHaveLength(2)
    const [o1, o2] = apos.sellOffers
    expect(o1.createdAt).toBe(o2.createdAt)
    expect(o1.prioridadeEm).toBe(o2.prioridadeEm)
    expect(o1.prioridadeEm).toBe(o1.createdAt)
    expect(o1.lotId).toBe(o2.lotId)
  })

  it('reduzir quantidade mantém a vez; createdAt nunca muda na edição', async () => {
    const state = await getState()
    const rogerioCoins = state.users[ROGERIO].coins.filter((c) => c.tipoMoeda === BANDEIRA)
    const ids = [rogerioCoins[0].id, rogerioCoins[1].id]
    await publishOffer(ids, 25_000, 'Original')

    const antes = await getState()
    const lotId = antes.sellOffers[0].lotId
    const prioridadeOriginal = antes.sellOffers[0].prioridadeEm
    const createdAtOriginal = antes.sellOffers[0].createdAt

    const res = await editLot(lotId, 25_000, 1, 'Original')
    expect(res.ok).toBe(true)
    expect(res.message).toContain('Oferta atualizada.')
    expect(res.message).not.toContain('fim da fila')

    const depois = await getState()
    expect(depois.sellOffers).toHaveLength(1)
    const restante = depois.sellOffers[0]
    expect(restante.prioridadeEm).toBe(prioridadeOriginal)
    expect(restante.createdAt).toBe(createdAtOriginal)
  })

  it('editar observação mantém a vez', async () => {
    const state = await getState()
    const rogerioCoins = state.users[ROGERIO].coins.filter((c) => c.tipoMoeda === BANDEIRA)
    await publishOffer([rogerioCoins[0].id], 25_000, 'Obs antiga')

    const antes = await getState()
    const lotId = antes.sellOffers[0].lotId
    const prioridadeOriginal = antes.sellOffers[0].prioridadeEm

    const res = await editLot(lotId, 25_000, 1, 'Obs nova revisada')
    expect(res.ok).toBe(true)

    const depois = await getState()
    const oferta = depois.sellOffers[0]
    expect(oferta.obs).toBe('Obs nova revisada')
    expect(oferta.prioridadeEm).toBe(prioridadeOriginal)
  })

  it('aumentar quantidade vai para o fim da fila', async () => {
    const state = await getState()
    const rogerioCoins = state.users[ROGERIO].coins.filter((c) => c.tipoMoeda === BANDEIRA)
    expect(rogerioCoins.length).toBeGreaterThanOrEqual(2)

    await publishOffer([rogerioCoins[0].id], 25_000, 'Inicial 1')
    const antes = await getState()
    const lotId = antes.sellOffers[0].lotId
    const prioridadeOriginal = antes.sellOffers[0].prioridadeEm

    await new Promise((r) => setTimeout(r, 20))

    const res = await editLot(lotId, 25_000, 2, 'Inicial 1')
    expect(res.ok).toBe(true)
    expect(res.message).toContain('fim da fila')

    const depois = await getState()
    expect(depois.sellOffers).toHaveLength(2)
    for (const o of depois.sellOffers) {
      expect(o.prioridadeEm!).toBeGreaterThan(prioridadeOriginal!)
    }
  })

  it('editLot acrescenta moedas livres do tipo e recusa quando não há', async () => {
    const state = await getState()
    const rogerioCoins = state.users[ROGERIO].coins.filter((c) => c.tipoMoeda === BANDEIRA)
    const totalDisponivel = rogerioCoins.length

    await publishOffer(rogerioCoins.map((c) => c.id), 25_000)
    const antes = await getState()
    const lotId = antes.sellOffers[0].lotId

    const res = await editLot(lotId, 25_000, totalDisponivel + 1)
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Você tem 0 moeda(s) livre(s) desse tipo para acrescentar.')
  })

  it('editBid: mudar preço ou aumentar quantidade joga ordem para o fim da fila', async () => {
    getSessionEmail.mockResolvedValue(GABRIEL)
    const resPub = await publishBid(2, 20_000, BANDEIRA)
    expect(resPub.ok).toBe(true)

    const antes = await getState()
    const bid = antes.buyOrders[0]
    const prioridadeOriginal = bid.prioridadeEm

    await new Promise((r) => setTimeout(r, 20))

    const resReduz = await editBid(bid.id, 1, 20_000)
    expect(resReduz.ok).toBe(true)
    expect(resReduz.message).not.toContain('fim da fila')
    let depois = await getState()
    expect(depois.buyOrders[0].prioridadeEm).toBe(prioridadeOriginal)

    const resAumenta = await editBid(bid.id, 2, 20_000)
    expect(resAumenta.ok).toBe(true)
    expect(resAumenta.message).toContain('fim da fila')
    depois = await getState()
    expect(depois.buyOrders[0].prioridadeEm!).toBeGreaterThan(prioridadeOriginal!)
  })
})
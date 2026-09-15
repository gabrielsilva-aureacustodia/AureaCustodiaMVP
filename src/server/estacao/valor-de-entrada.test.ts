/**
 * Testes do valor de entrada da análise com o catálogo vigente (C3 / P-C3-03).
 *
 * Prova que:
 * 1. Tipo ligado ao mercado no catálogo vigente nasce com a mediana das ofertas abertas dele.
 * 2. Tipo desligado do mercado no catálogo vigente nasce com o meio da faixa de referência.
 * 3. Falha na leitura do catálogo cai no catálogo padrão do código sem travar a análise (RA-47).
 * 4. O catálogo não altera a fórmula do hash da análise: mesmo hash com valores estimados diferentes.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mutateStateMock, getStateMock, carregarCatalogo } = vi.hoisted(() => ({
  mutateStateMock: vi.fn(),
  getStateMock: vi.fn(),
  carregarCatalogo: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/server/state', () => ({ mutateState: mutateStateMock, getState: getStateMock }))
vi.mock('@/server/config/carregar', () => ({ carregarCatalogo }))

import { COIN_TYPES } from '@/domain/constants'
import { seedState } from '@/domain/seed'
import type { AppState, Envio } from '@/domain/types'

import { fecharAnalise } from './analise'

let state: AppState

const CLIENTE = 'rogeriopena@testeaurea.com.br'
const OPERADOR = 'gabriel.silva@aureacustodia.com.br'

function envio(parcial: Partial<Envio> = {}): Envio {
  return {
    protocolo: 'RO-ENV-0001',
    userEmail: CLIENTE,
    tipoMoeda: 'Entrega da Bandeira Olímpica',
    ano: 2016,
    quantidade: 1,
    codigoRastreio: 'BR123456789BR',
    dataPostagem: 1757000000000,
    dataRecebimento: 1757400000000,
    etapaAtual: 'Recebido pela custódia',
    createdAt: 1756900000000,
    codigosAtivosGerados: [],
    ...parcial,
  }
}

beforeEach(() => {
  state = seedState()
  mutateStateMock.mockReset()
  getStateMock.mockReset()
  carregarCatalogo.mockReset()

  mutateStateMock.mockImplementation(async (mutator: (current: AppState) => unknown) => ({
    state,
    result: await mutator(state),
  }))
  getStateMock.mockImplementation(async () => state)
})

describe('valor de entrada da análise com o catálogo vigente (P-C3-03)', () => {
  it('tipo ligado ao mercado no painel nasce com a mediana das ofertas dele', async () => {
    state.envios = [envio({ tipoMoeda: 'Atletismo', quantidade: 1 })]
    state.sellOffers.push(
      {
        id: 'OFF-AT-1',
        coinId: 'RO-TEST-01',
        seller: 'alex@testeaurea.com.br',
        price: 50_000,
        obs: '',
        lotId: 'LOT-AT-1',
        createdAt: Date.now(),
        tipoMoeda: 'Atletismo',
      },
      {
        id: 'OFF-AT-2',
        coinId: 'RO-TEST-02',
        seller: 'alex@testeaurea.com.br',
        price: 60_000,
        obs: '',
        lotId: 'LOT-AT-2',
        createdAt: Date.now(),
        tipoMoeda: 'Atletismo',
      },
    )

    const catalogo = COIN_TYPES.map((t) => (t.key === 'Atletismo' ? { ...t, negociavel: true } : t))
    carregarCatalogo.mockResolvedValue(catalogo)

    const r = await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 }],
    })

    expect(r.ok).toBe(true)
    const coin = state.users[CLIENTE].coins[state.users[CLIENTE].coins.length - 1]
    expect(coin.valorEstimado).toBe(55_000)
  })

  it('tipo desligado do mercado no painel nasce com o meio da faixa, mesmo com oferta aberta', async () => {
    state.envios = [envio({ tipoMoeda: 'Entrega da Bandeira Olímpica', quantidade: 1 })]
    state.sellOffers.push({
      id: 'OFF-BAN-1',
      coinId: 'RO-TEST-03',
      seller: 'alex@testeaurea.com.br',
      price: 40_000,
      obs: '',
      lotId: 'LOT-BAN-1',
      createdAt: Date.now(),
      tipoMoeda: 'Entrega da Bandeira Olímpica',
    })

    const catalogo = COIN_TYPES.map((t) =>
      t.key === 'Entrega da Bandeira Olímpica' ? { ...t, negociavel: false } : t,
    )
    carregarCatalogo.mockResolvedValue(catalogo)

    const r = await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 }],
    })

    expect(r.ok).toBe(true)
    const coin = state.users[CLIENTE].coins[state.users[CLIENTE].coins.length - 1]
    // Faixa da Bandeira: (23_500 + 30_000) / 2 = 26_750 -> arredondado para múltiplo de 500 = 27_000
    expect(coin.valorEstimado).toBe(27_000)
  })

  it('catálogo que não lê cai no catálogo do código e a análise fecha', async () => {
    state.envios = [envio({ tipoMoeda: 'Entrega da Bandeira Olímpica', quantidade: 1 })]
    state.sellOffers.push({
      id: 'OFF-BAN-2',
      coinId: 'RO-TEST-04',
      seller: 'alex@testeaurea.com.br',
      price: 40_000,
      obs: '',
      lotId: 'LOT-BAN-2',
      createdAt: Date.now(),
      tipoMoeda: 'Entrega da Bandeira Olímpica',
    })

    carregarCatalogo.mockRejectedValue(new Error('banco fora'))

    const r = await fecharAnalise({
      protocolo: 'RO-ENV-0001',
      operador: OPERADOR,
      moedas: [{ pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 }],
    })

    expect(r.ok).toBe(true)
    const coin = state.users[CLIENTE].coins[state.users[CLIENTE].coins.length - 1]
    // No catálogo do código (COIN_TYPES), Bandeira é negociável, logo usa a mediana da oferta (40_000)
    expect(coin.valorEstimado).toBe(40_000)
  })

  it('o catálogo não entra no hash: a mesma análise com catálogos diferentes dá o mesmo hash', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_757_900_000_000)

    try {
      // Cenário A: Atletismo no catálogo A com negociavel: true
      state = seedState()
      state.envios = [envio({ tipoMoeda: 'Atletismo', quantidade: 1 })]
      state.sellOffers.push(
        {
          id: 'OFF-1',
          coinId: 'RO-TEST-10',
          seller: 'alex@testeaurea.com.br',
          price: 50_000,
          obs: '',
          lotId: 'LOT-A-1',
          createdAt: 1_757_900_000_000,
          tipoMoeda: 'Atletismo',
        },
        {
          id: 'OFF-2',
          coinId: 'RO-TEST-11',
          seller: 'alex@testeaurea.com.br',
          price: 60_000,
          obs: '',
          lotId: 'LOT-A-2',
          createdAt: 1_757_900_000_000,
          tipoMoeda: 'Atletismo',
        },
      )
      const catalogoA = COIN_TYPES.map((t) => (t.key === 'Atletismo' ? { ...t, negociavel: true } : t))
      carregarCatalogo.mockResolvedValue(catalogoA)

      const rA = await fecharAnalise({
        protocolo: 'RO-ENV-0001',
        operador: OPERADOR,
        moedas: [{ pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 }],
      })
      expect(rA.ok).toBe(true)

      const analiseA = state.analises[0]
      const coinA = state.users[CLIENTE].coins[state.users[CLIENTE].coins.length - 1]
      expect(analiseA).toBeDefined()
      expect(coinA).toBeDefined()
      const hashA = analiseA?.hash
      const valorA = coinA?.valorEstimado

      // Cenário B: mesmo estado inicial, mas Atletismo no catálogo B com negociavel: false
      state = seedState()
      state.envios = [envio({ tipoMoeda: 'Atletismo', quantidade: 1 })]
      state.sellOffers.push(
        {
          id: 'OFF-1',
          coinId: 'RO-TEST-10',
          seller: 'alex@testeaurea.com.br',
          price: 50_000,
          obs: '',
          lotId: 'LOT-A-1',
          createdAt: 1_757_900_000_000,
          tipoMoeda: 'Atletismo',
        },
        {
          id: 'OFF-2',
          coinId: 'RO-TEST-11',
          seller: 'alex@testeaurea.com.br',
          price: 60_000,
          obs: '',
          lotId: 'LOT-A-2',
          createdAt: 1_757_900_000_000,
          tipoMoeda: 'Atletismo',
        },
      )
      const catalogoB = COIN_TYPES.map((t) => (t.key === 'Atletismo' ? { ...t, negociavel: false } : t))
      carregarCatalogo.mockResolvedValue(catalogoB)

      const rB = await fecharAnalise({
        protocolo: 'RO-ENV-0001',
        operador: OPERADOR,
        moedas: [{ pesoMg: 27000, veredito: 'aprovada', caixa: 'EB-001', posicao: 1 }],
      })
      expect(rB.ok).toBe(true)

      const analiseB = state.analises[0]
      const coinB = state.users[CLIENTE].coins[state.users[CLIENTE].coins.length - 1]
      expect(analiseB).toBeDefined()
      expect(coinB).toBeDefined()
      const hashB = analiseB?.hash
      const valorB = coinB?.valorEstimado

      expect(hashA).toBe(hashB)
      expect(valorA).not.toBe(valorB)
      expect(valorA).toBe(55_000)
      expect(valorB).toBe(25_000)
    } finally {
      vi.useRealTimers()
    }
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  casarOrdensRespeitandoPendencia,
  contaComPendenciaDeCustodia,
  contaComPendenciaNoEstado,
  MENSAGEM_ANUNCIO_PAUSADO,
  MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA,
  vendedoresComPendencia,
} from '@/domain/bloqueio-por-debito'
import { matchOrders } from '@/domain/market'
import { TAXAS_PADRAO } from '@/domain/fees'
import type { AppState, BuyOrder, FaturaCustodia, SellOffer, User } from '@/domain/types'

function criarUsuario(email: string, inadimplente = false): User & { email: string } {
  return {
    email,
    name: 'Usuário Teste',
    balance: 100000,
    coins: [],
    inadimplente,
  }
}

describe('bloqueio-por-debito — constantes', () => {
  it('exporta mensagens descritivas para recibo bloqueado e anúncio pausado', () => {
    expect(MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA).toContain('fatura de custódia vencida')
    expect(MENSAGEM_ANUNCIO_PAUSADO).toContain('pausado')
  })
})

describe('contaComPendenciaDeCustodia', () => {
  const agora = 1757894400000

  it('retorna false sem faturas e sem inadimplência manual', () => {
    const user = criarUsuario('u1@exemplo.com.br')
    expect(contaComPendenciaDeCustodia(user, [], agora)).toBe(false)
  })

  it('retorna false com fatura pendente dentro do prazo', () => {
    const user = criarUsuario('u1@exemplo.com.br')
    const fatura: FaturaCustodia = {
      id: 'FAT-1',
      userEmail: user.email,
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: [],
      valorCents: 200,
      status: 'pendente',
      dataEmissao: agora - 1000,
      dataVencimento: agora + 86_400_000,
    }
    expect(contaComPendenciaDeCustodia(user, [fatura], agora)).toBe(false)
  })

  it('retorna true com fatura pendente com dataVencimento < agora', () => {
    const user = criarUsuario('u1@exemplo.com.br')
    const fatura: FaturaCustodia = {
      id: 'FAT-1',
      userEmail: user.email,
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: [],
      valorCents: 200,
      status: 'pendente',
      dataEmissao: agora - 200_000,
      dataVencimento: agora - 100_000,
    }
    expect(contaComPendenciaDeCustodia(user, [fatura], agora)).toBe(true)
  })

  it('retorna true com fatura com status atrasada', () => {
    const user = criarUsuario('u1@exemplo.com.br')
    const fatura: FaturaCustodia = {
      id: 'FAT-1',
      userEmail: user.email,
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: [],
      valorCents: 200,
      status: 'atrasada',
      dataEmissao: agora - 200_000,
      dataVencimento: agora + 100_000,
    }
    expect(contaComPendenciaDeCustodia(user, [fatura], agora)).toBe(true)
  })

  it('retorna false para fatura paga ou cancelada mesmo vencida', () => {
    const user = criarUsuario('u1@exemplo.com.br')
    const faturaPaga: FaturaCustodia = {
      id: 'FAT-1',
      userEmail: user.email,
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: [],
      valorCents: 200,
      status: 'paga',
      dataEmissao: agora - 200_000,
      dataVencimento: agora - 100_000,
      dataPagamento: agora - 50_000,
    }
    const faturaCancelada: FaturaCustodia = {
      id: 'FAT-2',
      userEmail: user.email,
      competencia: '2026-09',
      quantidadeMoedas: 1,
      moedaIds: [],
      valorCents: 200,
      status: 'cancelada',
      dataEmissao: agora - 200_000,
      dataVencimento: agora - 100_000,
    }
    expect(contaComPendenciaDeCustodia(user, [faturaPaga, faturaCancelada], agora)).toBe(false)
  })

  it('retorna true quando user.inadimplente = true mesmo sem faturas', () => {
    const user = criarUsuario('u1@exemplo.com.br', true)
    expect(contaComPendenciaDeCustodia(user, [], agora)).toBe(true)
  })
})

describe('contaComPendenciaNoEstado', () => {
  const agora = 1757894400000

  it('retorna false para conta inexistente', () => {
    const state: AppState = {
      users: {},
      sellOffers: [],
      buyOrders: [],
      trades: [],
      envios: [],
      seq: { coin: 0, envio: 0 },
      deposits: [],
      analises: [],
    }
    expect(contaComPendenciaNoEstado(state, 'fantasma@exemplo.com.br', agora)).toBe(false)
  })

  it('não bloqueia conta quando a fatura vencida é de outro usuário', () => {
    const u1 = criarUsuario('u1@exemplo.com.br')
    const u2 = criarUsuario('u2@exemplo.com.br')
    const state: AppState = {
      users: { [u1.email]: u1, [u2.email]: u2 },
      sellOffers: [],
      buyOrders: [],
      trades: [],
      envios: [],
      seq: { coin: 0, envio: 0 },
      deposits: [],
      analises: [],
      faturasCustodia: [
        {
          id: 'FAT-U2',
          userEmail: u2.email,
          competencia: '2026-09',
          quantidadeMoedas: 1,
          moedaIds: [],
          valorCents: 200,
          status: 'atrasada',
          dataEmissao: agora - 200_000,
          dataVencimento: agora - 100_000,
        },
      ],
    }
    expect(contaComPendenciaNoEstado(state, u1.email, agora)).toBe(false)
    expect(contaComPendenciaNoEstado(state, u2.email, agora)).toBe(true)
  })
})

describe('vendedoresComPendencia', () => {
  const agora = 1757894400000

  it('devolve apenas quem tem oferta aberta e pendência', () => {
    const u1 = criarUsuario('u1@exemplo.com.br', true) // inadimplente mas sem oferta
    const u2 = criarUsuario('u2@exemplo.com.br', true) // inadimplente e com oferta
    const u3 = criarUsuario('u3@exemplo.com.br', false) // sem pendência e com oferta
    const state: AppState = {
      users: { [u1.email]: u1, [u2.email]: u2, [u3.email]: u3 },
      sellOffers: [
        {
          id: 'SO-1',
          lotId: 'LOT-1',
          seller: u2.email,
          coinId: 'RO-001',
          price: 20000,
          tipoMoeda: 'Entrega da Bandeira Olímpica',
          createdAt: agora,
          obs: '',
        },
        {
          id: 'SO-2',
          lotId: 'LOT-2',
          seller: u3.email,
          coinId: 'RO-002',
          price: 20000,
          tipoMoeda: 'Entrega da Bandeira Olímpica',
          createdAt: agora,
          obs: '',
        },
      ],
      buyOrders: [],
      trades: [],
      envios: [],
      seq: { coin: 0, envio: 0 },
      deposits: [],
      analises: [],
    }

    const res = vendedoresComPendencia(state, agora)
    expect(res.has(u2.email)).toBe(true)
    expect(res.has(u1.email)).toBe(false)
    expect(res.has(u3.email)).toBe(false)
    expect(res.size).toBe(1)
  })
})

describe('casarOrdensRespeitandoPendencia', () => {
  const agora = 1757894400000
  const tipoMoeda = 'Entrega da Bandeira Olímpica'

  function setupState(): {
    state: AppState
    vendedorBloqueado: User & { email: string }
    vendedorEquipe: User & { email: string }
    vendedorLimpo: User & { email: string }
    comprador: User & { email: string }
  } {
    const vendedorBloqueado = criarUsuario('bloqueado@exemplo.com.br', true)
    const vendedorEquipe = criarUsuario('socio@testeaurea.com.br', true)
    const vendedorLimpo = criarUsuario('limpo@exemplo.com.br', false)
    const comprador = criarUsuario('comprador@exemplo.com.br', false)
    comprador.balance = 500000

    vendedorBloqueado.coins = [
      {
        id: 'RO-B1',
        tipoMoeda,
        ano: 2016,
        entrada: '15/09/2026',
        statusFisico: 'Armazenado',
        statusDigital: 'Validado',
        valorEstimado: 20000,
        protocolo: 'RO-ENV-B1',
        recibo: {
          codigo: 'REC-B1',
          hash: 'h',
          dataEmissao: '15/09/2026',
          status: 'Ativo',
        },
      },
    ]

    vendedorEquipe.coins = [
      {
        id: 'RO-E1',
        tipoMoeda,
        ano: 2016,
        entrada: '15/09/2026',
        statusFisico: 'Armazenado',
        statusDigital: 'Validado',
        valorEstimado: 20000,
        protocolo: 'RO-ENV-E1',
        recibo: {
          codigo: 'REC-E1',
          hash: 'h',
          dataEmissao: '15/09/2026',
          status: 'Ativo',
        },
      },
    ]

    vendedorLimpo.coins = [
      {
        id: 'RO-L1',
        tipoMoeda,
        ano: 2016,
        entrada: '15/09/2026',
        statusFisico: 'Armazenado',
        statusDigital: 'Validado',
        valorEstimado: 20000,
        protocolo: 'RO-ENV-L1',
        recibo: {
          codigo: 'REC-L1',
          hash: 'h',
          dataEmissao: '15/09/2026',
          status: 'Ativo',
        },
      },
    ]

    const offerBloqueado: SellOffer = {
      id: 'SO-B1',
      lotId: 'LOT-B1',
      seller: vendedorBloqueado.email,
      coinId: 'RO-B1',
      price: 20000,
      tipoMoeda,
      createdAt: agora - 3000,
      prioridadeEm: agora - 3000,
      obs: '',
    }

    const offerEquipe: SellOffer = {
      id: 'SO-E1',
      lotId: 'LOT-E1',
      seller: vendedorEquipe.email,
      coinId: 'RO-E1',
      price: 20000,
      tipoMoeda,
      createdAt: agora - 2000,
      prioridadeEm: agora - 2000,
      obs: '',
    }

    const offerLimpo: SellOffer = {
      id: 'SO-L1',
      lotId: 'LOT-L1',
      seller: vendedorLimpo.email,
      coinId: 'RO-L1',
      price: 20000,
      tipoMoeda,
      createdAt: agora - 1000,
      prioridadeEm: agora - 1000,
      obs: '',
    }

    const state: AppState = {
      users: {
        [vendedorBloqueado.email]: vendedorBloqueado,
        [vendedorEquipe.email]: vendedorEquipe,
        [vendedorLimpo.email]: vendedorLimpo,
        [comprador.email]: comprador,
      },
      sellOffers: [offerBloqueado, offerEquipe, offerLimpo],
      buyOrders: [],
      trades: [],
      envios: [],
      seq: { coin: 0, envio: 0 },
      deposits: [],
      analises: [],
    }

    return { state, vendedorBloqueado, vendedorEquipe, vendedorLimpo, comprador }
  }

  it('bid compatível NÃO casa com oferta de vendedor com pendência em bloqueaveis e preserva a oferta intacta', () => {
    const { state, vendedorBloqueado, comprador } = setupState()
    // Apenas a oferta do bloqueado no livro
    state.sellOffers = state.sellOffers.filter((o) => o.seller === vendedorBloqueado.email)
    const prioridadeOriginal = state.sellOffers[0].prioridadeEm

    const bid: BuyOrder = {
      id: 'BO-1',
      buyer: comprador.email,
      price: 20000,
      qty: 1,
      tipoMoeda,
      createdAt: agora,
    }
    state.buyOrders = [bid]

    const bloqueaveis = new Set([vendedorBloqueado.email])
    const res = casarOrdensRespeitandoPendencia(state, TAXAS_PADRAO, agora, bloqueaveis)

    expect(res.matched).toBe(false)
    expect(res.trades.length).toBe(0)
    expect(state.sellOffers.length).toBe(1)
    expect(state.sellOffers[0].id).toBe('SO-B1')
    expect(state.sellOffers[0].prioridadeEm).toBe(prioridadeOriginal)
    expect(state.buyOrders.length).toBe(1)
  })

  it('casa com oferta de vendedor sem pendência', () => {
    const { state, vendedorBloqueado, vendedorLimpo, comprador } = setupState()
    // Somente o bloqueado e o limpo no livro
    state.sellOffers = state.sellOffers.filter((o) => o.seller !== 'socio@testeaurea.com.br')

    const bid: BuyOrder = {
      id: 'BO-1',
      buyer: comprador.email,
      price: 20000,
      qty: 1,
      tipoMoeda,
      createdAt: agora,
    }
    state.buyOrders = [bid]

    const bloqueaveis = new Set([vendedorBloqueado.email])
    const res = casarOrdensRespeitandoPendencia(state, TAXAS_PADRAO, agora, bloqueaveis)

    expect(res.matched).toBe(true)
    expect(res.trades.length).toBe(1)
    expect(res.trades[0].seller).toBe(vendedorLimpo.email)
    // A oferta do bloqueado permaneceu no livro
    expect(state.sellOffers.length).toBe(1)
    expect(state.sellOffers[0].seller).toBe(vendedorBloqueado.email)
  })

  it('casa com vendedor com pendência que está fora de bloqueaveis (equipe)', () => {
    const { state, vendedorEquipe, comprador } = setupState()
    state.sellOffers = state.sellOffers.filter((o) => o.seller === vendedorEquipe.email)

    const bid: BuyOrder = {
      id: 'BO-1',
      buyer: comprador.email,
      price: 20000,
      qty: 1,
      tipoMoeda,
      createdAt: agora,
    }
    state.buyOrders = [bid]

    // vendedorEquipe NÃO está em bloqueaveis
    const bloqueaveis = new Set(['outro@exemplo.com.br'])
    const res = casarOrdensRespeitandoPendencia(state, TAXAS_PADRAO, agora, bloqueaveis)

    expect(res.matched).toBe(true)
    expect(res.trades.length).toBe(1)
    expect(res.trades[0].seller).toBe(vendedorEquipe.email)
    expect(state.sellOffers.length).toBe(0)
  })

  it('sem pendência ou com bloqueaveis vazio, estado e resultado são idênticos a matchOrders', () => {
    vi.useFakeTimers()
    vi.setSystemTime(agora)
    try {
      const { state, comprador } = setupState()
      // Todos sem pendência
      Object.values(state.users).forEach((u) => {
        u.inadimplente = false
      })
      const bid: BuyOrder = {
        id: 'BO-1',
        buyer: comprador.email,
        price: 20000,
        qty: 2,
        tipoMoeda,
        createdAt: agora,
      }
      state.buyOrders = [bid]

      const stateClone = structuredClone(state)
      const resDireto = matchOrders(stateClone, TAXAS_PADRAO)

      const bloqueaveisVazio = new Set<string>()
      const resPendente = casarOrdensRespeitandoPendencia(state, TAXAS_PADRAO, agora, bloqueaveisVazio)

      expect(resPendente).toEqual(resDireto)
      expect(state).toEqual(stateClone)
    } finally {
      vi.useRealTimers()
    }
  })

  it('depois que a fatura vira paga, a mesma oferta volta a casar', () => {
    const { state, vendedorBloqueado, comprador } = setupState()
    state.sellOffers = state.sellOffers.filter((o) => o.seller === vendedorBloqueado.email)

    // Inicialmente bloqueado
    const bid: BuyOrder = {
      id: 'BO-1',
      buyer: comprador.email,
      price: 20000,
      qty: 1,
      tipoMoeda,
      createdAt: agora,
    }
    state.buyOrders = [bid]

    const bloqueaveis = new Set([vendedorBloqueado.email])
    const res1 = casarOrdensRespeitandoPendencia(state, TAXAS_PADRAO, agora, bloqueaveis)
    expect(res1.matched).toBe(false)

    // Regulariza a pendência
    vendedorBloqueado.inadimplente = false
    const res2 = casarOrdensRespeitandoPendencia(state, TAXAS_PADRAO, agora, bloqueaveis)
    expect(res2.matched).toBe(true)
    expect(res2.trades.length).toBe(1)
    expect(res2.trades[0].seller).toBe(vendedorBloqueado.email)
  })
})

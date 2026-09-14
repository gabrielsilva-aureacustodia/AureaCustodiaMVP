/**
 * Testes de integração do livro de ordens, fila justa por prioridade e
 * histórico append-only de ofertas (Decisão F-3, 13/09/2026).
 *
 * Roda contra o Postgres real embutido (PGlite) com todas as migrations aplicadas
 * (incluindo a 015).
 */

import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { matchOrders } from '@/domain/market'
import { lerEstado, mutarEstado } from './estado'
import { aplicarMigrations } from './migrar'
import { listarHistoricoOfertas } from './repositories/ofertas-historico'
import type { Consulta, Executor } from './sql'

const BANDEIRA = 'Entrega da Bandeira Olímpica'
const SCHEMA = 'aurea'

function executorPGlite(db: PGlite): Executor {
  return (fn) =>
    db.transaction(async (tx) => {
      const consulta: Consulta = {
        async query<R extends Record<string, unknown>>(texto: string, valores?: readonly unknown[]) {
          if (!valores || valores.length === 0) {
            const resultados = await tx.exec(texto)
            const ultimo = resultados[resultados.length - 1]
            return { rows: (ultimo?.rows ?? []) as R[] }
          }
          const r = await tx.query<R>(texto, [...valores])
          return { rows: r.rows }
        },
      }
      return fn(consulta)
    })
}

describe('livro de ordens — fila justa, casamento e histórico (A2, Decisão F-3)', () => {
  let pglite: PGlite
  let executar: Executor

  beforeAll(async () => {
    process.env.AUREA_DB_SCHEMA = SCHEMA
    pglite = new PGlite()
    await pglite.waitReady
    executar = executorPGlite(pglite)
    await aplicarMigrations(executar)
  })

  afterAll(async () => {
    await pglite?.close()
    delete process.env.AUREA_DB_SCHEMA
  })

  beforeEach(async () => {
    const S = SCHEMA
    await executar(async (tx) => {
      await tx.query(
        `TRUNCATE ${S}.ofertas_historico, ${S}.retiradas, ${S}.payment_events, ${S}.payment_intents, ${S}.rastreios,
                  ${S}.ledger_entries, ${S}.audit_log, ${S}.lancamentos_manuais, ${S}.exportacoes,
                  ${S}.trades, ${S}.deposits, ${S}.envios,
                  ${S}.saques, ${S}.faturas_custodia,
                  ${S}.sell_offers, ${S}.buy_orders, ${S}.recibos, ${S}.coins, ${S}.users`,
      )
    })
  })

  it('A anuncia 1 moeda a R$ 200; B, com saldo, publica compra a R$ 200 -> negociação concluída e ofertas saem do livro', async () => {
    const semeado = await lerEstado(executar)
    const [vendedor, comprador] = Object.keys(semeado.users)
    const coinId = semeado.users[vendedor].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id

    // 1. Vendedor publica anúncio
    await mutarEstado(executar, (s) => {
      const agora = 1_000_000
      s.sellOffers.push({
        id: 'OF-A1',
        coinId,
        seller: vendedor,
        price: 20_000,
        obs: 'venda',
        lotId: 'LOT-A1',
        createdAt: agora,
        prioridadeEm: agora,
        tipoMoeda: BANDEIRA,
      })
      matchOrders(s)
    })

    // 2. Comprador publica compra com saldo suficiente
    const { result } = await mutarEstado(executar, (s) => {
      s.users[comprador].balance = 30_000
      const agora = 2_000_000
      s.buyOrders.push({
        id: 'BID-B1',
        buyer: comprador,
        price: 20_000,
        qty: 1,
        createdAt: agora,
        prioridadeEm: agora,
        tipoMoeda: BANDEIRA,
      })
      return matchOrders(s)
    })

    expect(result.matched).toBe(true)

    // Confere estado no banco
    const lido = await lerEstado(executar)
    expect(lido.sellOffers).toHaveLength(0)
    expect(lido.buyOrders).toHaveLength(0)
    expect(lido.users[comprador].coins.some((c) => c.id === coinId)).toBe(true)
    expect(lido.users[vendedor].coins.some((c) => c.id === coinId)).toBe(false)
    const ultimoTrade = lido.trades[lido.trades.length - 1]
    expect(ultimoTrade).toMatchObject({
      price: 20_000,
      qty: 1,
      buyer: comprador,
      seller: vendedor,
      tipoMoeda: BANDEIRA,
    })

    // Confere histórico de ofertas registrado: SO-A1 foi publicada e depois executada
    const historico = await executar((tx) => listarHistoricoOfertas(tx))
    expect(historico.map((h) => h.evento)).toEqual(['publicada', 'executada'])
  })

  it('ordem inversa: B publica compra a R$ 200, depois A anuncia a R$ 200 -> negociação concluída na venda', async () => {
    const semeado = await lerEstado(executar)
    const [vendedor, comprador] = Object.keys(semeado.users)
    const coinId = semeado.users[vendedor].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id

    // 1. Comprador publica compra
    await mutarEstado(executar, (s) => {
      s.users[comprador].balance = 30_000
      const agora = 1_000_000
      s.buyOrders.push({
        id: 'BID-B1',
        buyer: comprador,
        price: 20_000,
        qty: 1,
        createdAt: agora,
        prioridadeEm: agora,
        tipoMoeda: BANDEIRA,
      })
      matchOrders(s)
    })

    // 2. Vendedor anuncia
    const { result } = await mutarEstado(executar, (s) => {
      const agora = 2_000_000
      s.sellOffers.push({
        id: 'OF-A1',
        coinId,
        seller: vendedor,
        price: 20_000,
        obs: '',
        lotId: 'LOT-A1',
        createdAt: agora,
        prioridadeEm: agora,
        tipoMoeda: BANDEIRA,
      })
      return matchOrders(s)
    })

    expect(result.matched).toBe(true)

    const lido = await lerEstado(executar)
    expect(lido.sellOffers).toHaveLength(0)
    expect(lido.buyOrders).toHaveLength(0)
    expect(lido.users[comprador].coins.some((c) => c.id === coinId)).toBe(true)
  })

  it('dois vendedores no mesmo preço: executa quem tem menor prioridadeEm', async () => {
    const semeado = await lerEstado(executar)
    const [v1, v2, comprador] = Object.keys(semeado.users)
    const c1 = semeado.users[v1].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id
    const c2 = semeado.users[v2].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id

    await mutarEstado(executar, (s) => {
      s.sellOffers.push({
        id: 'OF-1',
        coinId: c1,
        seller: v1,
        price: 20_000,
        obs: '',
        lotId: 'LOT-1',
        createdAt: 1000,
        prioridadeEm: 1000,
        tipoMoeda: BANDEIRA,
      })
      s.sellOffers.push({
        id: 'OF-2',
        coinId: c2,
        seller: v2,
        price: 20_000,
        obs: '',
        lotId: 'LOT-2',
        createdAt: 2000,
        prioridadeEm: 2000,
        tipoMoeda: BANDEIRA,
      })
      s.users[comprador].balance = 50_000
      s.buyOrders.push({
        id: 'BID-1',
        buyer: comprador,
        price: 20_000,
        qty: 1,
        createdAt: 3000,
        prioridadeEm: 3000,
        tipoMoeda: BANDEIRA,
      })
      matchOrders(s)
    })

    const lido = await lerEstado(executar)
    // OF-1 foi executada com v1, OF-2 de v2 permanece
    expect(lido.sellOffers).toHaveLength(1)
    expect(lido.sellOffers[0].seller).toBe(v2)
    expect(lido.users[comprador].coins.some((c) => c.id === c1)).toBe(true)
  })

  it('vendedor que mudou preço vai para o fim da fila, mesmo tendo cadastrado antes', async () => {
    const semeado = await lerEstado(executar)
    const [v1, v2, comprador] = Object.keys(semeado.users)
    const c1 = semeado.users[v1].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id
    const c2 = semeado.users[v2].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id

    // v1 publica a R$ 250 em t=1000
    await mutarEstado(executar, (s) => {
      s.sellOffers.push({
        id: 'OF-1',
        coinId: c1,
        seller: v1,
        price: 25_000,
        obs: '',
        lotId: 'LOT-1',
        createdAt: 1000,
        prioridadeEm: 1000,
        tipoMoeda: BANDEIRA,
      })
    })

    // v2 publica a R$ 200 em t=2000
    await mutarEstado(executar, (s) => {
      s.sellOffers.push({
        id: 'OF-2',
        coinId: c2,
        seller: v2,
        price: 20_000,
        obs: '',
        lotId: 'LOT-2',
        createdAt: 2000,
        prioridadeEm: 2000,
        tipoMoeda: BANDEIRA,
      })
    })

    // v1 edita preço para R$ 200 em t=5000 -> perde a vez (prioridadeEm = 5000)
    await mutarEstado(executar, (s) => {
      const o1 = s.sellOffers.find((o) => o.id === 'OF-1')!
      o1.price = 20_000
      o1.prioridadeEm = 5000
    })

    // Comprador compra 1 a R$ 200
    await mutarEstado(executar, (s) => {
      s.users[comprador].balance = 50_000
      s.buyOrders.push({
        id: 'BID-1',
        buyer: comprador,
        price: 20_000,
        qty: 1,
        createdAt: 6000,
        prioridadeEm: 6000,
        tipoMoeda: BANDEIRA,
      })
      matchOrders(s)
    })

    const lido = await lerEstado(executar)
    // v2 executa primeiro! c2 vai para comprador, OF-1 (v1) continua no livro
    expect(lido.sellOffers).toHaveLength(1)
    expect(lido.sellOffers[0].seller).toBe(v1)
    expect(lido.users[comprador].coins.some((c) => c.id === c2)).toBe(true)

    // Confere histórico com evento editada e perdeu_a_vez = true
    const histV1 = await executar((tx) => listarHistoricoOfertas(tx, { ofertaId: 'OF-1' }))
    expect(histV1.some((h) => h.evento === 'editada' && h.perdeuAVez === true)).toBe(true)
  })

  it('cancelamento grava evento cancelada e execução grava executada no histórico', async () => {
    const semeado = await lerEstado(executar)
    const [vendedor] = Object.keys(semeado.users)
    const coinId = semeado.users[vendedor].coins.find((c) => c.tipoMoeda === BANDEIRA)!.id

    // Publica
    await mutarEstado(executar, (s) => {
      s.sellOffers.push({
        id: 'OF-CANCEL',
        coinId,
        seller: vendedor,
        price: 20_000,
        obs: '',
        lotId: 'LOT-C',
        createdAt: 1000,
        prioridadeEm: 1000,
        tipoMoeda: BANDEIRA,
      })
    })

    // Cancela (remove de sellOffers sem mover a moeda do inventário)
    await mutarEstado(executar, (s) => {
      s.sellOffers = s.sellOffers.filter((o) => o.id !== 'OF-CANCEL')
    })

    const hist = await executar((tx) => listarHistoricoOfertas(tx, { ofertaId: 'OF-CANCEL' }))
    expect(hist.map((h) => h.evento)).toEqual(['publicada', 'cancelada'])
  })
})

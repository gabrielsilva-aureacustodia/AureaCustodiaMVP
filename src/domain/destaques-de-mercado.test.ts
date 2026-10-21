import { describe, expect, it } from 'vitest'

import { REFERENCIA_EXTERNA_FDC, ROTULO_REFERENCIA_EXTERNA, referenciaExterna } from '@/domain/constants'
import { destaqueDeMercado } from '@/domain/destaques-de-mercado'
import { maiorOfertaDeCompra } from '@/domain/market'
import { BAN, DH, compra, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'

describe('maiorOfertaDeCompra', () => {
  it('devolve a maior oferta de compra aberta do tipo, e só dele', () => {
    const s = estado({ c: usuario('Comprador', 10_000_000, []) })
    s.buyOrders.push(compra('B1', 'c', 24_000, 1, BAN, 1000))
    s.buyOrders.push(compra('B2', 'c', 27_500, 2, BAN, 2000))
    s.buyOrders.push(compra('B3', 'c', 61_000, 1, DH, 3000))
    expect(maiorOfertaDeCompra(s, BAN)).toBe(27_500)
    expect(maiorOfertaDeCompra(s, DH)).toBe(61_000)
  })

  it('sem oferta de compra do tipo devolve null — nunca zero', () => {
    const s = estado({ c: usuario('Comprador', 10_000_000, []) })
    s.buyOrders.push(compra('B1', 'c', 24_000, 1, BAN, 1000))
    expect(maiorOfertaDeCompra(s, DH)).toBeNull()
    expect(maiorOfertaDeCompra(estado({}), BAN)).toBeNull()
  })

  it('ordem já consumida (qty 0) não conta', () => {
    const s = estado({ c: usuario('Comprador', 10_000_000, []) })
    s.buyOrders.push(compra('B1', 'c', 90_000, 0, BAN, 1000))
    s.buyOrders.push(compra('B2', 'c', 25_000, 1, BAN, 2000))
    expect(maiorOfertaDeCompra(s, BAN)).toBe(25_000)
  })
})

describe('referência de mercado externo (flor de cunho)', () => {
  it('o rótulo é o pedido pelo Gabriel', () => {
    expect(ROTULO_REFERENCIA_EXTERNA).toBe('Referência de mercado externo — flor de cunho')
  })

  it('cada tipo apresentado tem valor, fonte e data da cotação — preço de mercado envelhece', () => {
    for (const tipo of [BAN, DH]) {
      const r = referenciaExterna(tipo)
      expect(r).not.toBeNull()
      expect(Number.isInteger(r!.valor)).toBe(true) // centavos
      expect(r!.valor).toBeGreaterThan(0)
      expect(r!.fonte.length).toBeGreaterThan(5)
      expect(r!.cotadoEm).toMatch(/\d{4}/)
    }
    expect(REFERENCIA_EXTERNA_FDC[BAN]!.valor).toBe(26_000)
    expect(REFERENCIA_EXTERNA_FDC[DH]!.valor).toBe(60_000)
  })

  it('tipo sem cotação devolve null: a tela não inventa número', () => {
    expect(referenciaExterna('Mascote Vinicius')).toBeNull()
  })
})

describe('destaqueDeMercado', () => {
  it('junta maior oferta de compra, média de mercado e referência externa', () => {
    const s = estado({ v: usuario('Vendedor', 0, [moeda('RO-1', BAN), moeda('RO-2', BAN)]), c: usuario('Comprador', 10_000_000, []) })
    s.sellOffers.push(venda('OF-1', 'RO-1', 'v', 28_000, BAN, Date.now()))
    s.sellOffers.push(venda('OF-2', 'RO-2', 'v', 30_000, BAN, Date.now()))
    s.buyOrders.push(compra('B1', 'c', 25_000, 1, BAN, Date.now()))

    const d = destaqueDeMercado(s, BAN)

    expect(d.maiorOfertaDeCompra).toBe(25_000)
    expect(d.mediaDeMercado).toBe(29_000)
    expect(d.referenciaExterna?.valor).toBe(26_000)
  })

  it('mercado vazio: só a referência externa existe', () => {
    const d = destaqueDeMercado(estado({}), DH)
    expect(d.maiorOfertaDeCompra).toBeNull()
    expect(d.mediaDeMercado).toBeNull()
    expect(d.referenciaExterna?.valor).toBe(60_000)
  })
})

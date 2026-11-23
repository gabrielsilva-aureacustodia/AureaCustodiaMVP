/**
 * Isenção de taxas das duas contas (Gabriel, 22/11/2026): a conta da Áurea não paga nada à plataforma; o CEO não paga
 * custódia; o par Áurea ↔ CEO não paga comissão. Todo o resto — contraparte incluída — paga normalmente.
 *
 * Os e-mails são de TESTE, injetados por variável de ambiente só dentro de cada caso: nenhum e-mail real
 * aparece aqui, e sem variável ninguém é isento.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { emitirFaturasDosCiclos } from '@/domain/cobranca-de-entrada'
import { custodiaImpedeNegociar } from '@/domain/custodia-da-moeda'
import { TAXAS_PADRAO, custoDeCompraPorMoeda } from '@/domain/fees'
import { ehContaDaAurea, ehParAureaCeo, taxasDaNegociacao, taxasDeQuemCompra, taxasDeQuemVende } from '@/domain/isencao'
import { matchOrders } from '@/domain/market'
import { pedidosDeNfse } from '@/domain/nfse/pedidos'
import { BAN, compra, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'
import type { AppState } from '@/domain/types'

const AUREA = 'aurea@teste.local'
const CEO = 'ceo@teste.local'
const CLIENTE = 'cliente@teste.local'
const OUTRO = 'outro@teste.local'
const PRECO = 20_000

function ligar(): void {
  vi.stubEnv('NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL', AUREA)
  vi.stubEnv('NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL', CEO)
}

afterEach(() => vi.unstubAllEnvs())

/** Uma negociação de uma moeda, casada pelo motor de verdade; devolve o estado depois. */
function negociar(vendedor: string, comprador: string): AppState {
  const s = estado({
    [vendedor]: usuario('V', 0, [moeda('RO-000001', BAN)]),
    [comprador]: usuario('C', 1_000_000, []),
  })
  s.faturasCustodia = (s.faturasCustodia ?? []).filter((f) => f.userEmail !== comprador)
  s.sellOffers.push(venda('OF-1', 'RO-000001', vendedor, PRECO, BAN, 1000))
  s.buyOrders.push(compra('BID-1', comprador, PRECO, 1, BAN, 2000))
  expect(matchOrders(s).matched).toBe(true)
  return s
}

const pagoPeloComprador = (s: AppState, c: string): number => 1_000_000 - s.users[c]!.balance
const recebidoPeloVendedor = (s: AppState, v: string): number => s.users[v]!.balance

describe('variável vazia: ninguém é isento', () => {
  it('a tabela volta idêntica e a negociação cobra o padrão', () => {
    expect(ehContaDaAurea(AUREA)).toBe(false)
    expect(ehParAureaCeo(AUREA, CEO)).toBe(false)
    expect(taxasDaNegociacao(AUREA, CEO, TAXAS_PADRAO)).toBe(TAXAS_PADRAO)
    const s = negociar(AUREA, CEO)
    expect(pagoPeloComprador(s, CEO)).toBe(PRECO + 200 + 200)
    expect(recebidoPeloVendedor(s, AUREA)).toBe(PRECO - 200)
  })
})

describe('com as duas contas configuradas', () => {
  it('Áurea COMPRA de cliente: Áurea sem comissão e sem custódia; cliente paga a comissão de venda', () => {
    ligar()
    const s = negociar(CLIENTE, AUREA)
    expect(pagoPeloComprador(s, AUREA)).toBe(PRECO)
    expect(recebidoPeloVendedor(s, CLIENTE)).toBe(PRECO - 200)
    expect((s.faturasCustodia ?? []).some((f) => f.userEmail === AUREA)).toBe(false)
  })

  it('Áurea VENDE a cliente: cliente paga comissão e o 1º mês de custódia; Áurea não paga comissão de venda', () => {
    ligar()
    const s = negociar(AUREA, CLIENTE)
    expect(pagoPeloComprador(s, CLIENTE)).toBe(PRECO + 200 + 200)
    expect(recebidoPeloVendedor(s, AUREA)).toBe(PRECO)
    const f = (s.faturasCustodia ?? []).find((x) => x.userEmail === CLIENTE)
    expect(f).toMatchObject({ origem: 'compra', status: 'paga', valorCents: 200 })
  })

  it('Áurea ↔ CEO: nenhuma comissão dos dois lados, nos dois sentidos', () => {
    ligar()
    const a = negociar(AUREA, CEO)
    expect(recebidoPeloVendedor(a, AUREA)).toBe(PRECO)
    // Regra corrigida (22/11): o CEO não paga custódia em moeda nenhuma dele.
    expect(pagoPeloComprador(a, CEO)).toBe(PRECO)

    const b = negociar(CEO, AUREA)
    expect(recebidoPeloVendedor(b, CEO)).toBe(PRECO)
    expect(pagoPeloComprador(b, AUREA)).toBe(PRECO)
  })

  it('CEO ↔ cliente: comissão normal; custódia zero para o CEO, mas o cliente que compra do CEO paga a dele', () => {
    ligar()
    // CEO compra de cliente: comissão normal, sem 1º mês de custódia, sem fatura.
    const a = negociar(CLIENTE, CEO)
    expect(pagoPeloComprador(a, CEO)).toBe(PRECO + 200)
    expect(recebidoPeloVendedor(a, CLIENTE)).toBe(PRECO - 200)
    expect((a.faturasCustodia ?? []).some((f) => f.userEmail === CEO)).toBe(false)
    // Cliente compra do CEO: paga tudo normal, inclusive a custódia dele; o CEO paga a comissão de venda.
    const b = negociar(CEO, CLIENTE)
    expect(pagoPeloComprador(b, CLIENTE)).toBe(PRECO + 200 + 200)
    expect(recebidoPeloVendedor(b, CEO)).toBe(PRECO - 200)
    expect((b.faturasCustodia ?? []).find((f) => f.userEmail === CLIENTE)).toMatchObject({ origem: 'compra', valorCents: 200 })
  })

  it('cliente ↔ cliente: tudo normal', () => {
    ligar()
    for (const [v, c] of [[CLIENTE, OUTRO]] as const) {
      expect(taxasDaNegociacao(c, v, TAXAS_PADRAO)).toBe(TAXAS_PADRAO)
      const s = negociar(v, c)
      expect(pagoPeloComprador(s, c)).toBe(PRECO + 200 + 200)
      expect(recebidoPeloVendedor(s, v)).toBe(PRECO - 200)
    }
  })

  it('reconhece só pelo e-mail exato (caixa e espaços não importam), nunca por parecido', () => {
    ligar()
    expect(ehContaDaAurea(`  ${AUREA.toUpperCase()} `)).toBe(true)
    expect(ehContaDaAurea('x' + AUREA)).toBe(false)
    expect(ehContaDaAurea(null)).toBe(false)
  })

  it('custoDeCompraPorMoeda com a tabela da Áurea compradora é só o preço', () => {
    ligar()
    expect(custoDeCompraPorMoeda(PRECO, taxasDaNegociacao(AUREA, CLIENTE, TAXAS_PADRAO))).toBe(PRECO)
  })
})

describe('custódia da conta da Áurea e da do CEO', () => {
  it('moeda do CEO nunca trava por custódia e o ciclo dele não emite fatura', () => {
    ligar()
    const s = estado({ [CEO]: usuario('R', 0, [moeda('RO-000001', BAN)]) })
    s.faturasCustodia = []
    expect(custodiaImpedeNegociar(s, 'RO-000001', Date.now())).toBe(false)
    expect(emitirFaturasDosCiclos(s, CEO, 'ciclo_mensal', undefined)).toEqual([])
  })

  it('moeda dela nunca trava por custódia e o ciclo não emite fatura', () => {
    ligar()
    const s = estado({ [AUREA]: usuario('A', 0, [moeda('RO-000001', BAN)]) })
    s.faturasCustodia = []
    expect(custodiaImpedeNegociar(s, 'RO-000001', Date.now())).toBe(false)
    expect(emitirFaturasDosCiclos(s, AUREA, 'ciclo_mensal', undefined)).toEqual([])
    expect(s.faturasCustodia).toEqual([])
  })

  it('sem a variável, a mesma conta é tratada como cliente e a moeda sem custódia paga trava', () => {
    const s = estado({ [AUREA]: usuario('A', 0, [moeda('RO-000001', BAN)]) })
    s.faturasCustodia = []
    expect(custodiaImpedeNegociar(s, 'RO-000001', Date.now())).toBe(true)
  })
})

/** O estado "antes" da negociação: o mesmo, sem negociação nenhuma. */
function vazio(depois: AppState): AppState {
  return { ...depois, trades: [], faturasCustodia: [] }
}

describe('NFS-e: comissão zero não gera pedido de nota', () => {
  it('Áurea ↔ CEO: nenhuma nota de intermediação; cliente ↔ cliente: duas', () => {
    ligar()
    const par = negociar(AUREA, CEO)
    const normal = negociar(CLIENTE, OUTRO)
    const notasDoPar = pedidosDeNfse(vazio(par), par, Date.now())
    const notasNormais = pedidosDeNfse(vazio(normal), normal, Date.now())
    expect(notasDoPar.filter((p) => p.servico !== 'custodia')).toHaveLength(0)
    expect(notasNormais.filter((p) => p.servico !== 'custodia')).toHaveLength(2)
  })
})

describe('o que a tela mostra é o que o servidor cobra (23/11/2026)', () => {
  it('conta da Áurea comprando: sem comissão e sem custódia na tabela da tela', () => {
    ligar()
    const t = taxasDeQuemCompra(AUREA, TAXAS_PADRAO)
    expect(t.comissaoCompradorBp).toBe(0)
    expect(t.comissaoCompradorFixa).toBe(0)
    expect(t.custodiaMensalPorMoeda).toBe(0)
  })
  it('conta da Áurea vendendo: sem comissão de venda; cliente comum vê a tabela cheia', () => {
    ligar()
    expect(taxasDeQuemVende(AUREA, TAXAS_PADRAO).comissaoVendedorBp).toBe(0)
    expect(taxasDeQuemVende('cliente@x.com', TAXAS_PADRAO)).toBe(TAXAS_PADRAO)
    expect(taxasDeQuemCompra('cliente@x.com', TAXAS_PADRAO)).toBe(TAXAS_PADRAO)
  })
})

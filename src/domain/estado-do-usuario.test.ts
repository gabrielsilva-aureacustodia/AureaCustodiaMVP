/**
 * B01 (relatório de QA do Davi, 22/11/2026): o payload que vai ao navegador de um cliente não pode conter
 * e-mail, CPF, Pix, banco, endereço, telefone nem movimentação financeira de OUTRO cliente.
 *
 * O teste serializa a visão inteira (é o que `self.__next_f` e o `/api/state` levam) e procura os valores
 * de B dentro do texto. Valores sentinela únicos: se aparecerem, é vazamento.
 */

import { describe, expect, it } from 'vitest'

import { estadoDoUsuario } from '@/domain/estado-do-usuario'
import { seedState } from '@/domain/seed'
import type { AppState, Cadastro, UserEmail } from '@/domain/types'

const A: UserEmail = 'rogeriopena@testeaurea.com.br'
const B: UserEmail = 'gabrielsilva@testeaurea.com.br'
const C: UserEmail = 'alex@testeaurea.com.br'

const pseudo = (e: string): string => `anon-${e.length}-${e.charCodeAt(0)}`

function cadastro(sufixo: string): Cadastro {
  return {
    cpf: `CPF-SENTINELA-${sufixo}`,
    nomeCompleto: `Nome Sentinela ${sufixo}`,
    dataNascimento: `NASC-${sufixo}`,
    telefone: `TEL-SENTINELA-${sufixo}`,
    endereco: {
      logradouro: `Rua-Sentinela-${sufixo}`,
      numero: '1',
      bairro: 'B',
      cidade: 'C',
      uf: 'SP',
      cep: `CEP-${sufixo}`,
    },
    dadosBancarios: {
      chavePix: `PIX-SENTINELA-${sufixo}`,
      banco: `BANCO-${sufixo}`,
      agencia: `AG-${sufixo}`,
      conta: `CONTA-${sufixo}`,
    },
    completadoEm: 1,
  }
}

function estadoComDoisUsuarios(): AppState {
  const s = seedState()
  s.users[A].cadastro = cadastro('A')
  s.users[B].cadastro = cadastro('B')
  s.users[B].pass = 'SENHA-SENTINELA-B'
  s.users[A].pass = 'SENHA-SENTINELA-A'
  const coinB = s.users[B].coins[0]
  s.sellOffers.push({
    id: 'OF-B',
    coinId: coinB.id,
    seller: B,
    price: 28000,
    obs: '',
    lotId: 'LOT-B',
    createdAt: 1,
    tipoMoeda: coinB.tipoMoeda,
  })
  s.buyOrders.push({ id: 'BID-B', buyer: B, price: 20000, qty: 1, createdAt: 1, tipoMoeda: coinB.tipoMoeda, pagoAntecipadoCents: 777001 })
  s.trades.push({ price: 25000, qty: 1, date: 5, buyer: B, seller: C, fee: 5000, feeComprador: 2500, feeVendedor: 2500, tipoMoeda: coinB.tipoMoeda, coinIds: [coinB.id] })
  s.envios.push({
    protocolo: 'RO-ENV-9999',
    userEmail: B,
    tipoMoeda: coinB.tipoMoeda,
    ano: 2024,
    quantidade: 1,
    codigoRastreio: 'RASTREIO-SENTINELA-B',
    dataPostagem: null,
    dataRecebimento: null,
    etapaAtual: 'Protocolo gerado',
    createdAt: 1,
    codigosAtivosGerados: [],
  })
  s.deposits.push({ userEmail: B, valor: 123456, date: 3, refExterna: 'REF-SENTINELA-B' })
  s.saques = [
    {
      id: 'SAQ-B',
      userEmail: B,
      valorTotal: 1,
      taxa: 0,
      valorLiquido: 1,
      dadosBancarios: { chavePix: 'PIX-SAQUE-SENTINELA-B' },
      status: 'solicitado',
      criadoEm: 1,
      previsaoPagamentoEm: 1,
      atualizadoEm: 1,
    },
  ]
  return s
}

describe('estadoDoUsuario — o payload de um cliente não contém dado de outro (B01)', () => {
  const visaoA = estadoDoUsuario(estadoComDoisUsuarios(), A, pseudo)
  const texto = JSON.stringify(visaoA)

  it('não contém e-mail, CPF, Pix, banco, endereço, telefone nem senha do outro cliente', () => {
    for (const proibido of [
      B,
      'CPF-SENTINELA-B',
      'Nome Sentinela B',
      'NASC-B',
      'TEL-SENTINELA-B',
      'Rua-Sentinela-B',
      'CEP-B',
      'PIX-SENTINELA-B',
      'PIX-SAQUE-SENTINELA-B',
      'BANCO-B',
      'AG-B',
      'CONTA-B',
      'SENHA-SENTINELA-B',
      'RASTREIO-SENTINELA-B',
      'REF-SENTINELA-B',
      'RO-ENV-9999',
    ]) {
      expect(texto, `vazou: ${proibido}`).not.toContain(proibido)
    }
  })

  it('não contém o e-mail de terceiro em nenhuma lista (ofertas, lances, negociações, reservas)', () => {
    expect(texto).not.toContain(C)
    expect(Object.keys(visaoA.users)).toEqual([A])
  })

  it('não contém movimentação financeira alheia: comissão, valor pré-pago, depósito, saque', () => {
    expect(texto).not.toContain('777001')
    expect(texto).not.toContain('123456')
    const tradeAlheio = visaoA.trades.find((t) => t.price === 25000)
    expect(tradeAlheio?.fee).toBeUndefined()
    expect(tradeAlheio?.coinIds).toBeUndefined()
    expect(visaoA.deposits.every((d) => d.userEmail === A)).toBe(true)
    expect((visaoA.saques ?? []).length).toBe(0)
  })

  it('a própria conta continua inteira — exceto a senha, que o navegador nunca usa', () => {
    expect(visaoA.users[A].cadastro?.cpf).toBe('CPF-SENTINELA-A')
    expect(visaoA.users[A].cadastro?.dadosBancarios.chavePix).toBe('PIX-SENTINELA-A')
    expect(texto).not.toContain('SENHA-SENTINELA-A')
  })

  it('o mercado segue público e utilizável: ofertas e preços aparecem, o vendedor é um pseudônimo estável', () => {
    const oferta = visaoA.sellOffers.find((o) => o.id === 'OF-B')
    expect(oferta?.price).toBe(28000)
    expect(oferta?.seller).toBe(pseudo(B))
    expect(oferta?.seller).not.toBe(B)
  })

  it('oferta e negociação do próprio cliente mantêm o e-mail dele (para "é minha?")', () => {
    const s = estadoComDoisUsuarios()
    s.sellOffers.push({ id: 'OF-A', coinId: s.users[A].coins[0].id, seller: A, price: 1, obs: '', lotId: 'L', createdAt: 1, tipoMoeda: s.users[A].coins[0].tipoMoeda })
    const v = estadoDoUsuario(s, A, pseudo)
    expect(v.sellOffers.find((o) => o.id === 'OF-A')?.seller).toBe(A)
  })

  it('o resumo público traz totais e estoque sem dono', () => {
    const total = Object.values(seedState().users).reduce((n, u) => n + u.coins.length, 0)
    expect(visaoA.publico?.totalMoedas).toBe(total)
    expect(visaoA.publico?.estoque.length).toBe(total)
    expect(Object.keys(visaoA.publico?.estoque[0] ?? {})).not.toContain('owner')
  })

  it('visão do outro lado também é limpa (simetria): A não aparece para B', () => {
    const s = estadoComDoisUsuarios()
    const t = JSON.stringify(estadoDoUsuario(s, B, pseudo))
    for (const proibido of [A, 'CPF-SENTINELA-A', 'PIX-SENTINELA-A', 'SENHA-SENTINELA-A', 'SENHA-SENTINELA-B']) {
      expect(t, `vazou para B: ${proibido}`).not.toContain(proibido)
    }
  })

  it('reservas: só as minhas, com a outra ponta e a oferta guardada em pseudônimo', () => {
    const s = estadoComDoisUsuarios()
    const coin = s.users[B].coins[0]
    const oferta = { id: 'OF-R', coinId: coin.id, seller: B, price: 1, obs: '', lotId: 'L', createdAt: 1, tipoMoeda: coin.tipoMoeda }
    const base = { bidId: 'BID', coinId: coin.id, tipoMoeda: coin.tipoMoeda, precoCents: 1, comissaoCompradorCents: 0, totalCents: 1, oferta, criadaEm: 1, expiraEm: 2, status: 'aguardando_pagamento' } as unknown as NonNullable<AppState['reservas']>[number]
    s.reservas = [
      { ...base, id: 'RES-AB', comprador: A, vendedor: B },
      { ...base, id: 'RES-BC', comprador: B, vendedor: C },
    ]
    const v = estadoDoUsuario(s, A, pseudo)
    expect((v.reservas ?? []).map((r) => r.id)).toEqual(['RES-AB'])
    const t = JSON.stringify(v.reservas)
    expect(t).not.toContain(B)
    expect(v.reservas?.[0].comprador).toBe(A)
    expect(v.reservas?.[0].vendedor).toBe(pseudo(B))
    expect(v.reservas?.[0].oferta.seller).toBe(pseudo(B))
  })

  it('negociação minha: a outra ponta é pseudônimo, nunca o e-mail', () => {
    const s = estadoComDoisUsuarios()
    s.trades.push({ price: 1, qty: 1, date: 9, buyer: A, seller: C, fee: 5, tipoMoeda: 'x' })
    const v = estadoDoUsuario(s, A, pseudo)
    const meu = v.trades.find((t) => t.date === 9)
    expect(meu?.buyer).toBe(A)
    expect(meu?.seller).toBe(pseudo(C))
    expect(meu?.fee).toBe(5)
  })

  it('quem não existe no estado não recebe conta nenhuma', () => {
    const v = estadoDoUsuario(estadoComDoisUsuarios(), 'fantasma@x.com', pseudo)
    expect(v.users).toEqual({})
    expect(v.envios).toEqual([])
  })
})

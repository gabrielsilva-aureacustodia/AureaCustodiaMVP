/**
 * Testes dos indicadores da Central de Resultados.
 *
 * Um cenário só, montado à mão e conferido na ponta do lápis: setembro de 2026, três
 * contas, duas negociações no mês (uma com a comissão dos dois lados da A1, uma antiga
 * sem comissão gravada), um envio concluído com uma moeda recusada, faturas pagas,
 * atrasadas e canceladas, livro de ofertas aberto e o histórico da fila.
 */

import { describe, expect, it } from 'vitest'

import { periodoMensal } from '@/domain/dre'
import { tradeFee } from '@/domain/fees'
import { BAN, DH, compra, estado, moeda, usuario, venda } from '@/domain/testing/fixtures'
import type { Analise, AppState, Envio, FaturaCustodia, Retirada, Trade } from '@/domain/types'

import { SEM_CAIXA, bp, ladosDaComissao, montarKpis, type EventoDaFilaKpi, type FontesKpi } from './kpis'

const SET = (dia: number, hora = 12): number => new Date(2026, 8, dia, hora, 0, 0).getTime()
const AGO = (dia: number, hora = 12): number => new Date(2026, 7, dia, hora, 0, 0).getTime()
const AGORA = SET(14, 10)
const HORA = 60 * 60 * 1000
const DIA = 24 * HORA

function analise(parcial: Partial<Analise> & Pick<Analise, 'protocolo' | 'veredito' | 'validadoEm' | 'protocoloEnvio'>): Analise {
  return {
    codigoMoeda: null,
    codigoRecibo: null,
    tipoMoeda: DH,
    ano: 1998,
    pesoMg: 7840,
    motivoRecusa: null,
    operador: 'op@x.com',
    aprovador: 'op@x.com',
    caixa: null,
    posicao: null,
    caminhoVideo: null,
    hashAnterior: '0',
    hash: '1',
    ...parcial,
  }
}

function envio(parcial: Partial<Envio> & Pick<Envio, 'protocolo' | 'createdAt' | 'etapaAtual' | 'quantidade'>): Envio {
  return { userEmail: 'a@x.com', tipoMoeda: DH, ano: 1998, codigoRastreio: null, dataPostagem: null, dataRecebimento: null, codigosAtivosGerados: [], ...parcial }
}

function fatura(parcial: Partial<FaturaCustodia> & Pick<FaturaCustodia, 'id' | 'userEmail' | 'status' | 'dataEmissao' | 'valorCents'>): FaturaCustodia {
  return { competencia: '2026-09', quantidadeMoedas: 1, moedaIds: [], dataVencimento: parcial.dataEmissao + 10 * DIA, ...parcial }
}

function retirada(id: string, status: Retirada['status']): Retirada {
  return {
    id,
    coinId: 'RO-000009',
    reciboCodigo: 'REC-000009',
    userEmail: 'a@x.com',
    modalidade: 'comum',
    status,
    valorTaxaCents: 5000,
    endereco: { nome: 'A', cpfOuCnpj: '0', logradouro: 'R', numero: '1', bairro: 'B', cidade: 'C', uf: 'SP', cep: '0', telefone: '0' },
    solicitadoEm: SET(1),
    dataLimiteD30: SET(30),
    historico: [],
  }
}

function cenario(): FontesKpi {
  const extinta = moeda('RO-000003', BAN)
  extinta.recibo.status = 'Extinto'
  const recebida = moeda('RO-000002', DH)
  recebida.statusFisico = 'Recebido'

  const a = { ...usuario('A', 10000, [moeda('RO-000001', BAN), recebida]), lastAccess: AGORA - 2 * DIA, cadastro: {} as NonNullable<AppState['users'][string]['cadastro']> }
  const b = { ...usuario('B', 0, [extinta]), lastAccess: AGORA - 40 * DIA }
  const c = usuario('C', 500, [])
  const s = estado({ 'a@x.com': a, 'b@x.com': b, 'c@x.com': c })

  const doisLados = { price: 20000, qty: 1, date: SET(2), buyer: 'b@x.com', seller: 'a@x.com', fee: 400, feeComprador: 200, feeVendedor: 200, tipoMoeda: BAN } as Trade
  const semComissaoGravada: Trade = { price: 30000, qty: 2, date: SET(3), buyer: 'a@x.com', seller: 'c@x.com', tipoMoeda: DH }
  const deAgosto: Trade = { price: 99999, qty: 1, date: AGO(20), buyer: 'a@x.com', seller: 'b@x.com', fee: 600, tipoMoeda: BAN }
  s.trades = [deAgosto, doisLados, semComissaoGravada]

  s.envios = [
    envio({ protocolo: 'RO-ENV-0002', createdAt: SET(2), etapaAtual: 'Recibo emitido', quantidade: 2, dataPostagem: SET(3), dataRecebimento: SET(5), codigosAtivosGerados: ['RO-000002'] }),
    envio({ protocolo: 'RO-ENV-0003', createdAt: SET(10), etapaAtual: 'Envio postado', quantidade: 3, dataPostagem: SET(11) }),
    envio({ protocolo: 'RO-ENV-0004', createdAt: AGO(5), etapaAtual: 'Recibo emitido', quantidade: 1, dataPostagem: AGO(6), dataRecebimento: AGO(8), codigosAtivosGerados: ['RO-000001'] }),
  ]
  s.analises = [
    analise({ protocolo: 'RO-ANL-0001', protocoloEnvio: 'RO-ENV-0002', veredito: 'aprovada', codigoMoeda: 'RO-000002', caixa: 'DH-001', validadoEm: SET(6) }),
    analise({ protocolo: 'RO-ANL-0002', protocoloEnvio: 'RO-ENV-0002', veredito: 'recusada', motivoRecusa: ' Peso fora da tolerância ', validadoEm: SET(6) }),
  ]
  s.faturasCustodia = [
    fatura({ id: 'F1', userEmail: 'a@x.com', status: 'pendente', dataEmissao: SET(1), valorCents: 400 }),
    fatura({ id: 'F2', userEmail: 'c@x.com', status: 'paga', dataEmissao: SET(1), valorCents: 200 }),
    fatura({ id: 'F3', userEmail: 'b@x.com', status: 'cancelada', dataEmissao: SET(1), valorCents: 999 }),
    fatura({ id: 'F4', userEmail: 'a@x.com', status: 'pendente', dataEmissao: AGO(1), valorCents: 400, competencia: '2026-08' }),
  ]
  s.sellOffers = [venda('V1', 'RO-000001', 'a@x.com', 21000, BAN, SET(1)), venda('V2', 'RO-000010', 'b@x.com', 20500, BAN, SET(1)), venda('V3', 'RO-000011', 'c@x.com', 40000, DH, SET(1))]
  s.buyOrders = [compra('C1', 'b@x.com', 19000, 3, BAN, SET(1)), compra('C2', 'c@x.com', 19500, 1, BAN, SET(1))]

  const historico: EventoDaFilaKpi[] = [
    { ofertaId: 'X', lado: 'venda', tipoMoeda: BAN, evento: 'publicada', createdAt: SET(1, 10) },
    { ofertaId: 'X', lado: 'venda', tipoMoeda: BAN, evento: 'executada', createdAt: SET(1, 12) },
    { ofertaId: 'Y', lado: 'compra', tipoMoeda: BAN, evento: 'publicada', createdAt: AGO(30, 12) },
    { ofertaId: 'Y', lado: 'compra', tipoMoeda: BAN, evento: 'executada', createdAt: SET(2, 12) },
    { ofertaId: 'Z', lado: 'venda', tipoMoeda: BAN, evento: 'executada', createdAt: SET(2, 12) },
  ]

  return {
    state: s,
    retiradas: [retirada('RET-1', 'separacao'), retirada('RET-2', 'entregue')],
    periodo: periodoMensal(2026, 9),
    agora: AGORA,
    historicoDaFila: historico,
    planos: [
      { modalidade: 'anual', status: 'vigente', quantidadeContratada: 2, moedaIds: ['m1', 'm2', 'm3'] },
      { modalidade: 'anual', status: 'vigente', quantidadeContratada: 3 },
      { modalidade: 'anual', status: 'aguardando_pagamento', quantidadeContratada: 1 },
      { modalidade: 'anual', status: 'cancelado', quantidadeContratada: 1 },
    ],
  }
}

describe('ladosDaComissao — a regra de leitura da A1', () => {
  it('lê os dois lados congelados; negociação antiga é toda do vendedor; sem gravação, recalcula', () => {
    expect(ladosDaComissao({ price: 20000, qty: 1, date: 0, buyer: 'b', seller: 's', fee: 400, feeComprador: 200, feeVendedor: 200, tipoMoeda: BAN } as Trade)).toEqual({ comprador: 200, vendedor: 200 })
    expect(ladosDaComissao({ price: 20000, qty: 1, date: 0, buyer: 'b', seller: 's', fee: 250, tipoMoeda: BAN })).toEqual({ comprador: 0, vendedor: 250 })
    expect(ladosDaComissao({ price: 30000, qty: 2, date: 0, buyer: 'b', seller: 's', tipoMoeda: DH })).toEqual({ comprador: 0, vendedor: tradeFee(30000) * 2 })
  })
})

describe('montarKpis', () => {
  const k = montarKpis(cenario())

  it('mercado: só o período, comissão média por lado e receita por tipo', () => {
    expect(k.mercado).toMatchObject({ negociacoes: 2, moedasNegociadas: 3, volume: 80000, ticketMedio: 40000, comissaoTotal: 900, doisLados: true })
    expect(k.mercado.comissaoMedia).toEqual({ total: 450, comprador: 100, vendedor: 350 })
    expect(k.mercado.receitaPorTipo).toEqual([
      { tipoMoeda: DH, negociacoes: 1, moedas: 2, volume: 60000, comissoes: 500 },
      { tipoMoeda: BAN, negociacoes: 1, moedas: 1, volume: 20000, comissoes: 400 },
    ])
  })

  it('acervo: recibo extinto sai da custódia; caixa vem do laudo; retiradas em andamento', () => {
    expect(k.acervo.moedasEmCustodia).toBe(2)
    expect(k.acervo.porTipo).toEqual([
      { tipoMoeda: DH, moedas: 1 },
      { tipoMoeda: BAN, moedas: 1 },
    ])
    expect(k.acervo.porCaixa).toEqual([
      { caixa: 'DH-001', moedas: 1 },
      { caixa: SEM_CAIXA, moedas: 1 },
    ])
    expect(k.acervo.porStatusFisico).toEqual({ recebido: 1, armazenado: 1 })
    expect(k.acervo.emRetirada).toBe(1)
    expect(k.acervo.retiradasPorStatus.entregue).toBe(1)
  })

  it('contas: com saldo, com moeda sob guarda, ativas em 30 dias e com cadastro', () => {
    expect(k.contas).toEqual({ total: 3, comSaldo: 2, comMoeda: 1, ativas30d: 1, comCadastro: 1, saldoTotal: 10500 })
  })

  it('envios: funil da coorte do mês, aprovação e recusa por motivo', () => {
    expect(k.envios).toMatchObject({ criados: 2, concluidos: 1, moedasDeclaradas: 2, moedasAprovadas: 1, moedasRecusadas: 1, taxaAprovacaoBp: 5000 })
    expect(k.envios.funil.map((f) => f.envios)).toEqual([2, 2, 1, 1, 1])
    expect(k.envios.recusasPorMotivo).toEqual([{ motivo: 'Peso fora da tolerância', moedas: 1, bp: 10000 }])
  })

  it('tempos entre postagem, recebimento e laudo', () => {
    expect(k.tempos.postagemAteRecebimento).toEqual({ mediaMs: 2 * DIA, amostras: 1 })
    expect(k.tempos.recebimentoAteLaudo).toEqual({ mediaMs: 1 * DIA, amostras: 1 })
    expect(k.tempos.postagemAteLaudo).toEqual({ mediaMs: 3 * DIA, amostras: 1 })
  })

  it('faturas: emitido e pago no mês, abertas e atrasadas hoje, inadimplência', () => {
    expect(k.faturas).toEqual({
      emitidasNoPeriodo: 2,
      valorEmitido: 600,
      valorPago: 200,
      emAberto: { quantidade: 2, valor: 800 },
      atrasadas: { quantidade: 2, valor: 800 },
      taxaInadimplenciaBp: 6667,
      contasInadimplentes: 1,
    })
  })

  it('fila: livro aberto por tipo e tempo até a execução pelo histórico', () => {
    expect(k.fila.porTipo).toEqual([
      { tipoMoeda: BAN, ofertasVenda: 2, ordensCompra: 2, moedasCompra: 4, melhorVenda: 20500, melhorCompra: 19500 },
      { tipoMoeda: DH, ofertasVenda: 1, ordensCompra: 0, moedasCompra: 0, melhorVenda: 40000, melhorCompra: null },
    ])
    expect(k.fila.tempoAteExecucao).toEqual({ venda: { mediaMs: 2 * HORA, amostras: 1 }, compra: { mediaMs: 3 * DIA, amostras: 1 } })
  })

  it('planos: vigentes com as moedas cobertas', () => {
    expect(k.planos).toEqual({ anual: { vigentes: 2, moedas: 6 }, aguardandoPagamento: 1, cancelados: 1 })
  })

  it('sem histórico da fila (A2) e sem planos (B2): null, não zero', () => {
    const vazio = montarKpis({ ...cenario(), historicoDaFila: null, planos: null })
    expect(vazio.fila.tempoAteExecucao).toBeNull()
    expect(vazio.planos).toBeNull()
  })

  it('período sem negociação: médias nulas, não divisão por zero', () => {
    const outubro = montarKpis({ ...cenario(), periodo: periodoMensal(2026, 10) })
    expect(outubro.mercado).toMatchObject({ negociacoes: 0, volume: 0, ticketMedio: null, doisLados: false })
    expect(outubro.mercado.comissaoMedia).toEqual({ total: null, comprador: null, vendedor: null })
    expect(outubro.envios.taxaAprovacaoBp).toBeNull()
    expect(outubro.faturas.taxaInadimplenciaBp).toBeNull()
  })

  it('bp arredonda e não divide por zero', () => {
    expect(bp(1, 3)).toBe(3333)
    expect(bp(5, 0)).toBeNull()
  })
})

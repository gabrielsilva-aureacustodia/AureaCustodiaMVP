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

import {
  SEM_CAIXA,
  bp,
  janelaDoPeriodo,
  janelasDeReferencia,
  ladosDaComissao,
  montarKpis,
  montarKpisDeAquisicao,
  primeiraTransacaoPorConta,
  somarDias,
  validarGastoDeMarketing,
  type CasoParaKpi,
  type EntradaDeGasto,
  type EventoDaFilaKpi,
  type FontesAquisicao,
  type FontesKpi,
  type GastoDeMarketing,
} from './kpis'

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

  // `usuario()` passou a dar cadastro COMPLETO por padrão (28/09/2026, para
  // que os testes do motor de mercado não percam ofertas pela nova trava de
  // cadastro). Este teste testa `comCadastro`, que conta a PRESENÇA do objeto
  // (Boolean(u.cadastro)), não a completude — então os três cenários de
  // cadastro (nenhum, iniciado e incompleto, completo) precisam ser
  // explicitados aqui, em vez de herdados do padrão da fixture.
  const a = { ...usuario('A', 10000, [moeda('RO-000001', BAN), recebida]), lastAccess: AGORA - 2 * DIA, cadastro: {} as NonNullable<AppState['users'][string]['cadastro']> }
  const b = { ...usuario('B', 0, [extinta]), lastAccess: AGORA - 40 * DIA, cadastro: undefined }
  const c = { ...usuario('C', 500, []), cadastro: undefined }
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

/* ====================================================================================
 * Aquisição e atendimento — os KPIs do conselho (frente J, 18/11/2026)
 *
 * Cenário de 18/11/2026, conferido à mão. Hoje = 18/11 às 15h de Brasília. Contas:
 *   c1 — nasceu 17/11, 1ª transação 17/11 (depósito) → ativada em 17/11
 *   c2 — nasceu 18/11 de madrugada; só tem a `custodia_recebida_fora` (não conta) e depois uma compra em 18/11
 *   c3 — nasceu 10/11, depósito em 10/11
 *   c4 — nasceu 18/11, nunca transacionou
 *   equipe — conta da equipe: nunca entra
 * As datas são sempre o dia de BRASÍLIA (UTC−3), não o do servidor que roda o teste.
 * ==================================================================================*/

describe('KPIs de aquisição e atendimento', () => {
  const BR = (mes: number, dia: number, hora = 12): number => Date.UTC(2026, mes - 1, dia, hora + 3, 0, 0)
  const HOJE = BR(11, 18, 15)
  const DIAS = 24 * 60 * 60 * 1000
  const NOV = janelaDoPeriodo({ ano: 2026, mes: 11, trimestre: null }, 'novembro de 2026')

  function fontes(parcial: Partial<FontesAquisicao> = {}): FontesAquisicao {
    const s = estado({
      'c1@x.com': usuario('C1', 0, []),
      'c2@x.com': usuario('C2', 0, []),
      'c3@x.com': usuario('C3', 0, []),
      'c4@x.com': usuario('C4', 0, []),
      'equipe@x.com': usuario('Equipe', 0, []),
    })
    s.deposits = [
      { userEmail: 'c1@x.com', valor: 5000, date: BR(11, 17, 15), origem: 'deposito', metodo: 'pix' },
      { userEmail: 'c2@x.com', valor: 200, date: BR(11, 18, 8), origem: 'custodia_recebida_fora' },
      { userEmail: 'c3@x.com', valor: 3000, date: BR(11, 10, 9), origem: 'frete_envio', metodo: 'cartao' },
      { userEmail: 'equipe@x.com', valor: 9000, date: BR(11, 18, 9), origem: 'deposito' },
    ]
    s.trades = [{ price: 10000, qty: 1, date: BR(11, 18, 10), buyer: 'c2@x.com', seller: 'c1@x.com', fee: 400, tipoMoeda: BAN }]
    return {
      state: s,
      criadasEm: { 'c1@x.com': BR(11, 17, 9), 'c2@x.com': BR(11, 18, 2), 'c3@x.com': BR(11, 10, 8), 'c4@x.com': BR(11, 18, 7), 'equipe@x.com': BR(11, 18, 1) },
      gastos: [],
      casos: null,
      janelas: janelasDeReferencia(HOJE),
      periodo: NOV,
      agora: HOJE,
      ignorar: new Set(['equipe@x.com']),
      ...parcial,
    }
  }

  const mensal = (id: number, canal: GastoDeMarketing['canal'], valor: number, visitas: number | null = null): GastoDeMarketing => ({ id, canal, de: '2026-11-01', ate: '2026-11-30', valor, visitas })

  describe('datas de Brasília', () => {
    it('as três janelas de referência saem do dia de Brasília, mesmo de madrugada ou perto da meia-noite', () => {
      expect(janelasDeReferencia(HOJE)).toEqual([
        { rotulo: 'Hoje', de: '2026-11-18', ate: '2026-11-18' },
        { rotulo: 'Últimos 7 dias', de: '2026-11-12', ate: '2026-11-18' },
        { rotulo: 'Mês até hoje', de: '2026-11-01', ate: '2026-11-18' },
      ])
      // 23h de 30/11 em Brasília já é 01/12 em UTC — o dia continua sendo 30/11.
      expect(janelasDeReferencia(BR(11, 30, 23))[0]).toMatchObject({ de: '2026-11-30', ate: '2026-11-30' })
      // 01h de 01/11 em Brasília: o mês até hoje começa e termina no próprio dia 01/11.
      expect(janelasDeReferencia(BR(11, 1, 1))[2]).toMatchObject({ de: '2026-11-01', ate: '2026-11-01' })
    })

    it('o período da tela vira dias de Brasília: mês, trimestre e ano, com fevereiro certo', () => {
      expect(janelaDoPeriodo({ ano: 2026, mes: 2, trimestre: null }, 'fev')).toMatchObject({ de: '2026-02-01', ate: '2026-02-28' })
      expect(janelaDoPeriodo({ ano: 2028, mes: 2, trimestre: null }, 'fev')).toMatchObject({ ate: '2028-02-29' })
      expect(janelaDoPeriodo({ ano: 2026, mes: null, trimestre: 4 }, 'T4')).toMatchObject({ de: '2026-10-01', ate: '2026-12-31' })
      expect(janelaDoPeriodo({ ano: 2026, mes: null, trimestre: null }, 'ano')).toMatchObject({ de: '2026-01-01', ate: '2026-12-31' })
    })

    it('somarDias atravessa o mês e o ano', () => {
      expect(somarDias('2026-11-02', -6)).toBe('2026-10-27')
      expect(somarDias('2026-12-30', 3)).toBe('2027-01-02')
    })
  })

  describe('ativação — a 1ª transação', () => {
    it('conta a 1ª entrada de dinheiro ou a 1ª compra/venda; a custódia recebida fora e a equipe não contam', () => {
      const primeira = primeiraTransacaoPorConta(fontes().state, new Set(['equipe@x.com']))
      expect(primeira.get('c1@x.com')).toBe(BR(11, 17, 15)) // o depósito de 17/11 vem antes da venda de 18/11
      expect(primeira.get('c2@x.com')).toBe(BR(11, 18, 10)) // o depósito de 08h é `custodia_recebida_fora`: não vale
      expect(primeira.get('c3@x.com')).toBe(BR(11, 10, 9)) // o frete pago por cartão é dinheiro que entrou
      expect(primeira.has('c4@x.com')).toBe(false)
      expect(primeira.has('equipe@x.com')).toBe(false)
    })
  })

  describe('CAC por janela', () => {
    it('divide o gasto informado pelos ativados e reparte o intervalo mensal pelos dias da janela', () => {
      const k = montarKpisDeAquisicao(fontes({ gastos: [mensal(1, 'meta', 300_000), mensal(2, 'servico', 360_000)] }))
      const [hoje, semana, mes] = k.porJanela

      // Hoje: 1/30 de R$ 6.600,00 = R$ 220,00; 1 ativado (c2). Só mídia: 1/30 de R$ 3.000,00 = R$ 100,00.
      expect(hoje).toMatchObject({ cadastros: 2, ativados: 1, gasto: 22_000, gastoMidia: 10_000, cac: 22_000, cacMidia: 10_000, custoPorCadastro: 11_000, aproximado: true })
      // 7 dias: 7/30 = R$ 1.540,00; ativados c1 e c2.
      expect(semana).toMatchObject({ cadastros: 3, ativados: 2, gasto: 154_000, gastoMidia: 70_000, cac: 77_000, cacMidia: 35_000 })
      // Mês até hoje: 18/30 = R$ 3.960,00; ativados c1, c2 e c3.
      expect(mes).toMatchObject({ cadastros: 4, ativados: 3, gasto: 396_000, gastoMidia: 180_000, cac: 132_000, cacMidia: 60_000, custoPorCadastro: 99_000 })
    })

    it('entrada de um dia só, na janela de um dia, é exata — não aproximada', () => {
      const diaria: GastoDeMarketing = { id: 3, canal: 'meta', de: '2026-11-18', ate: '2026-11-18', valor: 5_000, visitas: null }
      const [hoje] = montarKpisDeAquisicao(fontes({ gastos: [diaria] })).porJanela
      expect(hoje).toMatchObject({ gasto: 5_000, aproximado: false, cac: 5_000 })
    })

    it('sem gasto informado o CAC é null, nunca zero; sem ativado também é null', () => {
      const semGasto = montarKpisDeAquisicao(fontes({ gastos: [] })).porJanela[0]!
      expect(semGasto).toMatchObject({ gasto: null, gastoMidia: null, cac: null, cacMidia: null, custoPorCadastro: null, aproximado: false })

      const semTabela = montarKpisDeAquisicao(fontes({ gastos: null })).porJanela[0]!
      expect(semTabela.cac).toBeNull()

      // Gasto em 05/11, dia em que ninguém transacionou: o gasto existe, o CAC daquele dia não.
      const gastoSemAtivado = fontes({ gastos: [{ id: 4, canal: 'meta', de: '2026-11-05', ate: '2026-11-05', valor: 1_000, visitas: null }], janelas: [{ rotulo: 'Dia 5', de: '2026-11-05', ate: '2026-11-05' }] })
      expect(montarKpisDeAquisicao(gastoSemAtivado).porJanela[0]).toMatchObject({ gasto: 1_000, ativados: 0, cac: null })
    })

    it('gasto de fora da janela não entra', () => {
      const deOutubro: GastoDeMarketing = { id: 5, canal: 'meta', de: '2026-10-01', ate: '2026-10-31', valor: 999_999, visitas: null }
      expect(montarKpisDeAquisicao(fontes({ gastos: [deOutubro] })).porJanela[2]).toMatchObject({ gasto: null, cac: null })
    })

    it('sem banco (sem data de cadastro) os cadastros ficam null, mas os ativados continuam', () => {
      const k = montarKpisDeAquisicao(fontes({ criadasEm: null, gastos: [mensal(1, 'meta', 300_000)] }))
      expect(k.porJanela[2]).toMatchObject({ cadastros: null, ativados: 3, custoPorCadastro: null })
      expect(k.funil).toMatchObject({ cadastros: null, ativadosDosCadastrados: null, visitaParaCadastroBp: null, cadastroParaAtivacaoBp: null })
    })
  })

  describe('funil e gasto por canal no período', () => {
    it('visitas → cadastros → ativados; digital, analógico e serviço separados', () => {
      const k = montarKpisDeAquisicao(
        fontes({
          gastos: [
            mensal(1, 'meta', 300_000, 1_000),
            mensal(2, 'servico', 360_000),
            { id: 3, canal: 'evento', de: '2026-11-08', ate: '2026-11-08', valor: 40_000, visitas: null },
          ],
        }),
      )
      expect(k.funil).toEqual({
        visitas: 1_000,
        visitasEstimadas: false,
        cadastros: 4, // c1, c2, c3, c4 — a equipe não conta
        ativadosDosCadastrados: 3, // c1, c2, c3; c4 nunca transacionou
        visitaParaCadastroBp: 40, // 4 de 1.000 = 0,4%
        cadastroParaAtivacaoBp: 7500, // 3 de 4 = 75%
      })
      expect(k.gastoPorCanal).toEqual([
        { canal: 'meta', natureza: 'digital', valor: 300_000 },
        { canal: 'evento', natureza: 'analogico', valor: 40_000 },
        { canal: 'servico', natureza: 'geral', valor: 360_000 },
      ])
      expect(k.gastoPorNatureza).toEqual({ digital: 300_000, analogico: 40_000, geral: 360_000 })
      expect(k.gastoAproximado).toBe(false)
    })

    it('sem visitas informadas, o topo do funil é null e não há taxa visita → cadastro', () => {
      const k = montarKpisDeAquisicao(fontes({ gastos: [mensal(1, 'meta', 300_000)] }))
      expect(k.funil.visitas).toBeNull()
      expect(k.funil.visitaParaCadastroBp).toBeNull()
      expect(k.funil.cadastroParaAtivacaoBp).toBe(7500)
    })

    it('período menor que o intervalo informado marca o gasto como estimado', () => {
      const semana = { rotulo: 'semana', de: '2026-11-08', ate: '2026-11-14' }
      const k = montarKpisDeAquisicao(fontes({ gastos: [mensal(1, 'meta', 300_000)], periodo: semana }))
      expect(k.gastoAproximado).toBe(true)
      expect(k.gastoPorNatureza.digital).toBe(70_000) // 7 dias de 30
    })

    it('canal sem entrada fica fora da lista e natureza sem entrada é null, não zero', () => {
      const k = montarKpisDeAquisicao(fontes({ gastos: [mensal(1, 'meta', 300_000)] }))
      expect(k.gastoPorNatureza).toEqual({ digital: 300_000, analogico: null, geral: null })
      expect(montarKpisDeAquisicao(fontes({ gastos: [] })).gastoPorNatureza).toEqual({ digital: null, analogico: null, geral: null })
    })

    it('a origem do cadastro é null: o cadastro não tem o campo e nada é inventado', () => {
      expect(montarKpisDeAquisicao(fontes()).origemDoCadastro).toBeNull()
    })
  })

  describe('atendimento', () => {
    const casos: CasoParaKpi[] = [
      { estado: 'aberto', criadoEm: BR(11, 17, 10), fechadoEm: null, primeiraRespostaDaEquipeEm: null },
      { estado: 'em_andamento', criadoEm: BR(11, 16, 10), fechadoEm: null, primeiraRespostaDaEquipeEm: BR(11, 16, 12) },
      { estado: 'resolvido', criadoEm: BR(11, 10, 9), fechadoEm: BR(11, 11, 9), primeiraRespostaDaEquipeEm: BR(11, 10, 10) },
      // Criado em outubro e resolvido em novembro: fora de "criados", dentro de "resolvidos".
      { estado: 'resolvido', criadoEm: BR(10, 20, 9), fechadoEm: BR(11, 2, 9), primeiraRespostaDaEquipeEm: BR(10, 20, 11) },
    ]

    it('casos abertos agora, criados e resolvidos no período e o tempo até a 1ª resposta', () => {
      const a = montarKpisDeAquisicao(fontes({ casos })).atendimento!
      expect(a.abertosAgora).toBe(1)
      expect(a.emAndamentoAgora).toBe(1)
      expect(a.criadosNoPeriodo).toBe(3)
      expect(a.semRespostaDaEquipe).toBe(1)
      expect(a.resolvidosNoPeriodo).toBe(2)
      // (2h + 1h) / 2 = 1h30, sobre os dois criados no período que já têm resposta.
      expect(a.tempoAtePrimeiraResposta).toEqual({ mediaMs: 90 * 60 * 1000, amostras: 2 })
    })

    it('sem fonte (sem banco ou sem a permissão cs.ver) o atendimento é null, e sem resposta a média é null', () => {
      expect(montarKpisDeAquisicao(fontes({ casos: null })).atendimento).toBeNull()
      const soAberto = montarKpisDeAquisicao(fontes({ casos: [casos[0]!] })).atendimento!
      expect(soAberto.tempoAtePrimeiraResposta).toEqual({ mediaMs: null, amostras: 0 })
    })

    it('resposta registrada antes da criação (relógio fora do ponto) não entra na média', () => {
      const torto: CasoParaKpi = { estado: 'em_andamento', criadoEm: BR(11, 16, 10), fechadoEm: null, primeiraRespostaDaEquipeEm: BR(11, 16, 10) - DIAS }
      expect(montarKpisDeAquisicao(fontes({ casos: [torto] })).atendimento!.tempoAtePrimeiraResposta.amostras).toBe(0)
    })
  })

  describe('a entrada manual do gasto', () => {
    const boa: EntradaDeGasto = { canal: 'meta', de: '2026-11-01', ate: '2026-11-30', valorCents: 250_000, visitas: 1_200, observacao: ' Campanha de tráfego ' }

    it('aceita a entrada completa e limpa o texto', () => {
      expect(validarGastoDeMarketing(boa)).toEqual({ ok: true, valor: { canal: 'meta', de: '2026-11-01', ate: '2026-11-30', valor: 250_000, visitas: 1_200, observacao: 'Campanha de tráfego' } })
    })

    it('visitas é opcional: vazio vira null', () => {
      for (const v of [null, undefined, '']) {
        const r = validarGastoDeMarketing({ ...boa, visitas: v })
        expect(r.ok && r.valor.visitas).toBeNull()
      }
    })

    it.each([
      ['canal desconhecido', { canal: 'tiktok' }],
      ['dia inventado', { de: '2026-02-30' }],
      ['dia em formato errado', { ate: '30/11/2026' }],
      ['fim antes do começo', { de: '2026-11-10', ate: '2026-11-09' }],
      ['antes do início das campanhas', { de: '2023-12-31', ate: '2024-01-05' }],
      ['mais de um ano', { de: '2026-01-01', ate: '2027-01-02' }],
      ['valor zero', { valorCents: 0 }],
      ['valor negativo', { valorCents: -100 }],
      ['valor com centavo quebrado', { valorCents: 10.5 }],
      ['valor em texto', { valorCents: '2500' }],
      ['valor acima do teto', { valorCents: 100_000_001 }],
      ['visitas negativas', { visitas: -1 }],
      ['visitas quebradas', { visitas: 1.5 }],
      ['observação enorme', { observacao: 'x'.repeat(201) }],
    ])('recusa: %s', (_nome, troca) => {
      const r = validarGastoDeMarketing({ ...boa, ...troca })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.erro.length).toBeGreaterThan(5)
    })
  })
})

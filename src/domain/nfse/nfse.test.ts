/**
 * NFS-e: que operação gera nota, e se a DPS montada reproduz as três notas que o contador emitiu
 * em 22/10/2026 (docs/fiscal-contabil/NFSE_MODELOS_DO_CONTADOR.md). Se um destes testes quebrar,
 * a nota automática deixou de ser igual à do contador — e é a dele que vale.
 */

import { describe, expect, it } from 'vitest'

import { estadoVazio } from '@/domain/estado-vazio'
import type { AppState, FaturaCustodia, Trade } from '@/domain/types'

import { idDaDps, leiauteNaData, montarDps, pisCofins, problemasDoPedido, textoFiscal, type TomadorNfse } from './dps'
import { competenciaDe, pedidosDeNfse, type PedidoNfse } from './pedidos'

/** Instante em Brasília (UTC-3). */
const brasilia = (ano: number, mes: number, dia: number, hora = 0, min = 0): number => Date.UTC(ano, mes - 1, dia, hora + 3, min)

const ROGERIO: TomadorNfse = {
  cpf: '461.651.346-53',
  nome: 'Rogério Pena Siqueira',
  endereco: { cMun: '3106200', cep: '30210-530', logradouro: 'R Muzambinho', numero: '488', complemento: 'Apto 402', bairro: 'Serra' },
}

function negociacao(over: Partial<Trade> = {}): Trade {
  return {
    price: 20_000,
    qty: 1,
    date: brasilia(2026, 10, 12, 15, 20),
    buyer: 'comprador@exemplo.com.br',
    seller: 'vendedor@exemplo.com.br',
    feeComprador: 200,
    feeVendedor: 200,
    fee: 400,
    tipoMoeda: 'Direitos Humanos',
    ...over,
  }
}

function fatura(over: Partial<FaturaCustodia> = {}): FaturaCustodia {
  return {
    id: 'FAT-2026-10-ROGERIO',
    userEmail: 'rogerio@exemplo.com.br',
    competencia: '2026-10',
    quantidadeMoedas: 1,
    moedaIds: ['RO-000001'],
    valorCents: 200,
    status: 'pendente',
    dataEmissao: brasilia(2026, 10, 25, 14, 0),
    dataVencimento: brasilia(2026, 11, 25),
    coberturaAte: brasilia(2026, 11, 25) - 60_000,
    ...over,
  }
}

function comTrades(...trades: Trade[]): AppState {
  const s = estadoVazio()
  s.trades = trades
  return s
}

describe('pedidosDeNfse — que operação gera nota', () => {
  it('negociação nova gera duas notas: uma do comprador e uma do vendedor', () => {
    const antes = estadoVazio()
    const depois = comTrades(negociacao())
    const pedidos = pedidosDeNfse(antes, depois, Date.now())

    expect(pedidos.map((p) => [p.servico, p.tomadorEmail, p.valorCents, p.refFato])).toEqual([
      ['intermediacao_compra', 'comprador@exemplo.com.br', 200, 'TRADE-1'],
      ['intermediacao_venda', 'vendedor@exemplo.com.br', 200, 'TRADE-1'],
    ])
    expect(pedidos[0].competencia).toBe('2026-10-12')
    expect(pedidos[0].chave).toBe('intermediacao_compra:TRADE-1')
  })

  it('a referência da negociação segue a posição no histórico, igual ao ledger', () => {
    const antes = comTrades(negociacao(), negociacao())
    const depois = comTrades(negociacao(), negociacao(), negociacao({ qty: 3, feeComprador: 450, feeVendedor: 450 }))
    const pedidos = pedidosDeNfse(antes, depois, Date.now())
    expect(pedidos.map((p) => p.refFato)).toEqual(['TRADE-3', 'TRADE-3'])
    expect(pedidos[0].descricao).toBe('INTERMEDIACAO NA COMPRA DE MOEDA - 3 MOEDAS - REF TRADE-3')
  })

  it('lado com comissão zero não gera nota', () => {
    const pedidos = pedidosDeNfse(estadoVazio(), comTrades(negociacao({ feeComprador: 0 })), Date.now())
    expect(pedidos.map((p) => p.servico)).toEqual(['intermediacao_venda'])
  })

  it('custódia: fatura que passa a PAGA gera nota, com a data do pagamento', () => {
    const antes = estadoVazio()
    antes.faturasCustodia = [fatura()]
    const depois = estadoVazio()
    const pagaEm = brasilia(2026, 11, 5, 10, 30)
    depois.faturasCustodia = [fatura({ status: 'paga', dataPagamento: pagaEm })]

    const [p] = pedidosDeNfse(antes, depois, Date.now())
    expect(p.servico).toBe('custodia')
    expect(p.ocorridoEm).toBe(pagaEm)
    expect(p.competencia).toBe('2026-11-05')
    // O exemplo do Gabriel: aceita em 25/10, paga em 05/11 → custódia de 25/10 a 25/11.
    expect(p.descricao).toBe('CUSTODIA MENSAL - 25/10/2026 A 25/11/2026 - 1 MOEDA - REF FAT-2026-10-ROGERIO')
  })

  it('custódia: fatura em aberto NÃO gera nota — sem pagamento não há nota nem imposto', () => {
    const depois = estadoVazio()
    depois.faturasCustodia = [fatura()]
    expect(pedidosDeNfse(estadoVazio(), depois, Date.now())).toEqual([])
  })

  it('custódia: fatura que já era paga não gera nota de novo', () => {
    const antes = estadoVazio()
    antes.faturasCustodia = [fatura({ status: 'paga', dataPagamento: brasilia(2026, 11, 5) })]
    const depois = structuredClone(antes)
    expect(pedidosDeNfse(antes, depois, Date.now())).toEqual([])
  })

  it('custódia da compra (nasce paga) gera nota no momento da compra', () => {
    const compraEm = brasilia(2026, 10, 21, 16, 0)
    const depois = estadoVazio()
    depois.faturasCustodia = [fatura({ id: 'FAT-CMP', status: 'paga', origem: 'compra', dataEmissao: compraEm, dataPagamento: compraEm })]
    const [p] = pedidosDeNfse(estadoVazio(), depois, Date.now())
    expect(p.competencia).toBe('2026-10-21')
    expect(p.ocorridoEm).toBe(compraEm)
  })

  it('fatura antiga, sem cobertura por ciclo, descreve o mês — como a nota nº 1 do contador', () => {
    const depois = estadoVazio()
    depois.faturasCustodia = [fatura({ status: 'paga', dataPagamento: brasilia(2026, 10, 7), coberturaAte: null })]
    const [p] = pedidosDeNfse(estadoVazio(), depois, Date.now())
    expect(p.descricao.startsWith('CUSTODIA MENSAL - 10/2026 - 1 MOEDA')).toBe(true)
  })
})

describe('montarDps — as três notas do contador', () => {
  const pedido = (servico: PedidoNfse['servico'], competencia: string, descricao: string): PedidoNfse => ({
    chave: `${servico}:X`,
    servico,
    refFato: 'X',
    tomadorEmail: 'rogerio@exemplo.com.br',
    valorCents: 200,
    ocorridoEm: Date.UTC(2026, 9, 7, 12),
    competencia,
    descricao,
    quantidadeMoedas: 1,
  })
  const emitidoEm = brasilia(2026, 10, 23, 9, 5)
  const montar = (p: PedidoNfse) => montarDps({ pedido: p, tomador: ROGERIO, tpAmb: 2, serie: 1, numero: 7, emitidoEm, verAplic: 'RealOlimpico-1.0' })

  it('nota nº 1 — custódia: 11.04.01 / 001, NBS 1.0602.90.00, PIS 0,01, COFINS 0,06, ISS 5% nos aproximados', () => {
    const { xml } = montar(pedido('custodia', '2026-10-07', 'CUSTODIA MENSAL - 10/2026 - 1 MOEDA'))
    expect(xml).toContain('<dCompet>2026-10-07</dCompet>')
    expect(xml).toContain('<cTribNac>110401</cTribNac><cTribMun>001</cTribMun>')
    expect(xml).toContain('<cNBS>106029000</cNBS>')
    expect(xml).toContain('<vServ>2.00</vServ>')
    expect(xml).toContain('<vPis>0.01</vPis><vCofins>0.06</vCofins>')
    expect(xml).toContain('<pTotTribFed>11.33</pTotTribFed><pTotTribEst>0.00</pTotTribEst><pTotTribMun>5.00</pTotTribMun>')
    expect(xml).toContain('<cIndOp>050101</cIndOp>')
    expect(xml).toContain('<CST>000</CST><cClassTrib>000001</cClassTrib>')
    // tpOper é proibido fora do 10.05 (E0904) e a alíquota do ISS não vai na DPS (E0617).
    expect(xml).not.toContain('tpOper')
    expect(xml).not.toContain('pAliq>')
  })

  it('notas nº 2 e 3 — intermediação: 10.05.01 / 003, NBS 1.0201.00.00, ISS 3%, tpOper 5, endereço do tomador', () => {
    const compra = montar(pedido('intermediacao_compra', '2026-10-12', 'INTERMEDIACAO NA COMPRA DE MOEDA')).xml
    const venda = montar(pedido('intermediacao_venda', '2026-10-14', 'INTERMEDIACAO NA VENDA DE MOEDA')).xml
    for (const xml of [compra, venda]) {
      expect(xml).toContain('<cTribNac>100501</cTribNac><cTribMun>003</cTribMun>')
      expect(xml).toContain('<cNBS>102010000</cNBS>')
      expect(xml).toContain('<pTotTribMun>3.00</pTotTribMun>')
      expect(xml).toContain('<cIndOp>100301</cIndOp><tpOper>5</tpOper>')
      expect(xml).toContain(
        '<end><endNac><cMun>3106200</cMun><CEP>30210530</CEP></endNac><xLgr>R MUZAMBINHO</xLgr><nro>488</nro><xCpl>APTO 402</xCpl><xBairro>SERRA</xBairro></end>',
      )
    }
    expect(compra).toContain('<xDescServ>INTERMEDIACAO NA COMPRA DE MOEDA</xDescServ>')
    expect(venda).toContain('<xDescServ>INTERMEDIACAO NA VENDA DE MOEDA</xDescServ>')
  })

  it('o tomador sai como no DANFSe: CPF só com dígitos e nome em maiúsculas sem acento', () => {
    const { xml } = montar(pedido('custodia', '2026-10-07', 'X'))
    expect(xml).toContain('<toma><CPF>46165134653</CPF><xNome>ROGERIO PENA SIQUEIRA</xNome>')
  })

  it('XML numa linha só, com o Id de 45 posições e a série da API (fora da faixa 70000 do emissor web)', () => {
    const { id, xml } = montar(pedido('custodia', '2026-10-07', 'X'))
    expect(id).toBe('DPS310620026807145200010600001000000000000007')
    expect(id).toHaveLength(45)
    expect(xml).not.toMatch(/>\s+</)
    expect(xml.startsWith('<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS Id="DPS3106200')).toBe(true)
    expect(xml).toContain('<serie>1</serie><nDPS>7</nDPS>')
    expect(xml).toContain('<dhEmi>2026-10-23T09:05:00-03:00</dhEmi>')
  })

  it('leiaute: v1.01 até 30/11/2026; NT 009 a partir de 01/12/2026 (finNFSe na raiz, indDest depois do tomador, descrição depois do NBS, CST fora do gIBSCBS)', () => {
    expect(leiauteNaData(brasilia(2026, 11, 30, 23, 59))).toBe('v1.01')
    expect(leiauteNaData(brasilia(2026, 12, 1))).toBe('nt009')
    const nt009 = montarDps({
      pedido: pedido('intermediacao_venda', '2026-12-01', 'X'),
      tomador: ROGERIO,
      tpAmb: 2,
      serie: 1,
      numero: 8,
      emitidoEm: brasilia(2026, 12, 1, 10),
      verAplic: 'RealOlimpico-1.0',
    }).xml
    expect(nt009).toContain('<tpEmit>1</tpEmit><finNFSe>0</finNFSe><cLocEmi>')
    expect(nt009).toContain('</toma><indDest>0</indDest><serv>')
    expect(nt009).toContain('<cNBS>102010000</cNBS><xDescServ>X</xDescServ></cServ>')
    expect(nt009).toContain('<valores><trib><CST>000</CST><cClassTrib>000001</cClassTrib></trib></valores></IBSCBS>')
    expect(nt009).not.toContain('gIBSCBS')
    expect(nt009.match(/finNFSe/g)).toHaveLength(2) // abre e fecha uma vez só: saiu do grupo IBSCBS
  })

  it('formato da produção restrita em 23/10/2026 (aceito pela Sefin): NT 009 com indDest ainda no grupo IBSCBS', () => {
    const { xml } = montarDps({
      pedido: pedido('custodia', '2026-10-23', 'X'),
      tomador: ROGERIO,
      tpAmb: 2,
      serie: 1,
      numero: 1,
      emitidoEm,
      verAplic: 'RealOlimpico-1.0',
      formato: { finNFSeNaRaiz: true, indDestNaRaiz: false, cstForaDoGrupo: true, descricaoNoFim: true },
    })
    expect(xml).toContain('<tpEmit>1</tpEmit><finNFSe>0</finNFSe>')
    expect(xml).toContain('<indFinal>0</indFinal><cIndOp>050101</cIndOp><indDest>0</indDest><valores><trib><CST>000</CST>')
  })
})

describe('regras auxiliares', () => {
  it('PIS e COFINS arredondam ao centavo como na nota do contador', () => {
    expect(pisCofins(200)).toEqual({ pis: 1, cofins: 6 })
    expect(pisCofins(150)).toEqual({ pis: 1, cofins: 5 })
  })

  it('texto fiscal: maiúsculas, sem acento, sem caractere fora do Latin-1', () => {
    expect(textoFiscal('  Ação — “Olímpica”  ', 100)).toBe('ACAO OLIMPICA')
  })

  it('competência é o dia de Brasília, não o do servidor', () => {
    // 01:30 UTC de 06/11 ainda é 05/11 em Brasília.
    expect(competenciaDe(Date.UTC(2026, 10, 6, 1, 30))).toBe('2026-11-05')
  })

  it('intermediação sem endereço é barrada antes de ir à Sefin; custódia sem endereço passa', () => {
    const semEndereco: TomadorNfse = { cpf: '46165134653', nome: 'Rogério' }
    const base = { chave: 'x', refFato: 'x', tomadorEmail: 'x', valorCents: 200, ocorridoEm: 0, competencia: '2026-10-07', descricao: 'x', quantidadeMoedas: 1 }
    expect(problemasDoPedido({ ...base, servico: 'intermediacao_compra' }, semEndereco)).toHaveLength(1)
    expect(problemasDoPedido({ ...base, servico: 'custodia' }, semEndereco)).toEqual([])
    expect(problemasDoPedido({ ...base, servico: 'custodia' }, null)).toHaveLength(1)
  })

  it('idDaDps completa série e número com zeros', () => {
    expect(idDaDps(1, 123)).toBe('DPS310620026807145200010600001000000000000123')
  })
})

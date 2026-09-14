import { describe, expect, it } from 'vitest'

import { periodoMensal, periodoTrimestral } from '@/domain/dre'
import type { LedgerEntry, LedgerTipo, Sinal } from '@/domain/ledger'
import type { FaturaCustodia, Saque } from '@/domain/types'

import { resumirFinanceiro, somarColunasDeDinheiro } from './financeiro'

const EM = (mes: number, dia: number): number => new Date(2026, mes - 1, dia, 12).getTime()

function l(tipo: LedgerTipo, valor: number, createdAt: number, sinal: Sinal, refExterna: string | null = null): LedgerEntry {
  return {
    createdAt,
    userEmail: 'a@x.com',
    tipo,
    valor,
    sinal,
    tipoMoeda: null,
    quantidade: null,
    refInterna: null,
    refExterna,
    descricao: '',
    saldoApos: 0,
    hashAnterior: '0',
    hash: '1',
  }
}

function saque(id: string, status: Saque['status'], valorLiquido: number, taxa: number, pagoEm: number | null): Saque {
  return {
    id,
    userEmail: 'a@x.com',
    valorTotal: valorLiquido + taxa,
    taxa,
    valorLiquido,
    dadosBancarios: {},
    status,
    criadoEm: EM(8, 1),
    previsaoPagamentoEm: EM(8, 4),
    pagoEm,
    atualizadoEm: EM(8, 4),
  }
}

function fatura(id: string, status: FaturaCustodia['status'], valorCents: number, dataEmissao: number): FaturaCustodia {
  return { id, userEmail: 'a@x.com', competencia: '2026-08', quantidadeMoedas: 1, moedaIds: [], valorCents, status, dataEmissao, dataVencimento: dataEmissao + 1 }
}

describe('resumirFinanceiro', () => {
  const ledger = [
    l('deposito', 10000, EM(7, 30), 1),
    l('deposito', 5000, EM(8, 2), 1),
    l('deposito', 7000, EM(8, 3), 1, 'mp-123'),
    l('saque', 4500, EM(8, 4), -1),
    l('taxa_saque', 500, EM(8, 4), -1),
    l('comissao', 250, EM(8, 10), -1),
    l('custodia', 400, EM(8, 1), 0),
    l('custodia', 400, EM(8, 12), -1),
    l('taxa_retirada', 5000, EM(9, 1), -1),
    l('compra', 20000, EM(8, 10), -1),
  ]

  it('cartões do mês: depósitos (e quanto veio pelo gateway), saques pagos e pendentes, custódia faturada', () => {
    const r = resumirFinanceiro({
      ledger,
      saques: [saque('S1', 'pago', 4500, 500, EM(8, 4)), saque('S2', 'pago', 900, 500, EM(7, 4)), saque('S3', 'solicitado', 1500, 500, null)],
      faturas: [fatura('F1', 'paga', 400, EM(8, 1)), fatura('F2', 'pendente', 600, EM(8, 1)), fatura('F3', 'cancelada', 999, EM(8, 1)), fatura('F4', 'paga', 400, EM(7, 1))],
      periodo: periodoMensal(2026, 8),
    })
    expect(r.depositos).toEqual({ quantidade: 2, valor: 12000, peloGateway: { quantidade: 1, valor: 7000 } })
    expect(r.saquesPagos).toEqual({ quantidade: 1, valorLiquido: 4500, tarifas: 500 })
    expect(r.saquesPendentes).toEqual({ quantidade: 1, valorLiquido: 1500 })
    expect(r.custodiaFaturada).toEqual({ faturas: 2, valor: 1000, pago: 400 })
  })

  it('fluxo mês a mês: custódia só conta quando saiu dinheiro; compra e venda não são receita', () => {
    const r = resumirFinanceiro({ ledger, saques: [], faturas: [], periodo: periodoTrimestral(2026, 3) })
    expect(r.fluxoMensal).toEqual([
      { mes: '2026-07', depositos: 10000, saques: 0, comissoes: 0, custodiaPaga: 0, tarifas: 0, receita: 0 },
      { mes: '2026-08', depositos: 12000, saques: 4500, comissoes: 250, custodiaPaga: 400, tarifas: 500, receita: 1150 },
      { mes: '2026-09', depositos: 0, saques: 0, comissoes: 0, custodiaPaga: 0, tarifas: 5000, receita: 5000 },
    ])
  })
})

describe('somarColunasDeDinheiro', () => {
  it('acha a coluna pelo nome, soma em reais e devolve centavos; coluna ausente é null', () => {
    const soma = somarColunasDeDinheiro(
      ['Data', 'Valor_Bruto', 'Tarifa_Gateway', 'Valor_Liquido'],
      [
        { Data: 'x', Valor_Bruto: 50, Tarifa_Gateway: 0.99, Valor_Liquido: 49.01 },
        { Data: 'y', Valor_Bruto: 202.1, Tarifa_Gateway: 2.02, Valor_Liquido: '' },
      ],
      { bruto: /bruto/i, tarifa: /tarifa/i, liquido: /liquido/i, parcelas: /parcela/i },
    )
    expect(soma).toEqual({ bruto: 25210, tarifa: 301, liquido: 4901, parcelas: null })
  })
})

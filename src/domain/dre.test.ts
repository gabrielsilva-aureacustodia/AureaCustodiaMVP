/**
 * A DRE precisa (1) ler a receita do ledger, não recalcular; (2) zerar e
 * DECLARAR toda linha de imposto sem alíquota; (3) fechar em aritmética
 * inteira. Os três estão aqui.
 */

import { describe, expect, it } from 'vitest'

import { PARAMETROS_VAZIOS, aplicarBp, fmtBp, montarDre, periodoMensal, periodoTrimestral } from '@/domain/dre'
import { GENESIS } from '@/domain/hash'
import { encadear, lancamentoDeCustodia, lancamentoDeSaldoInicial, lancamentosDeTrade } from '@/domain/ledger'
import type { Trade } from '@/domain/types'

const BAN = 'Entrega da Bandeira Olímpica'

function ledgerDeExemplo() {
  const t1: Trade = { price: 28_500, qty: 2, date: new Date(2026, 7, 10).getTime(), buyer: 'a', seller: 'b', tipoMoeda: BAN }
  const t2: Trade = { price: 45_000, qty: 1, date: new Date(2026, 7, 20).getTime(), buyer: 'b', seller: 'a', tipoMoeda: 'Direitos Humanos' }
  const fora: Trade = { price: 30_000, qty: 1, date: new Date(2026, 8, 2).getTime(), buyer: 'a', seller: 'b', tipoMoeda: BAN }
  const pendentes = [
    lancamentoDeSaldoInicial('a', 100_000, new Date(2026, 6, 1).getTime(), 'abertura'),
    lancamentoDeSaldoInicial('b', 100_000, new Date(2026, 6, 1).getTime(), 'abertura'),
    // comissão "congelada" diferente da fórmula atual, de propósito: a DRE tem de ler o valor gravado
    ...lancamentosDeTrade(t1, 1_000, 'T1'),
    ...lancamentosDeTrade(t2, 500, 'T2'),
    // duas cobranças de custódia para 'a' no mês: só a última conta
    lancamentoDeCustodia('a', { totalMoedas: 5, valorCobrado: 1_500, dataCobranca: '05/08/2026', statusPagamento: 'Pendente' }, new Date(2026, 7, 5).getTime(), null),
    lancamentoDeCustodia('a', { totalMoedas: 12, valorCobrado: 2_500, dataCobranca: '25/08/2026', statusPagamento: 'Pendente' }, new Date(2026, 7, 25).getTime(), null),
    ...lancamentosDeTrade(fora, 999, 'T3'),
  ]
  return encadear(pendentes, {}, GENESIS).lancamentos
}

describe('montarDre', () => {
  it('lê a receita do ledger (valor congelado) e recorta pelo período', () => {
    const dre = montarDre({ ledger: ledgerDeExemplo(), manuais: [], parametros: PARAMETROS_VAZIOS, periodo: periodoMensal(2026, 8) })
    expect(dre.totais.receitaComissoes).toBe(1_500) // 1000 + 500, e não tradeFee recalculada; T3 é de setembro
    expect(dre.totais.receitaCustodia).toBe(2_500) // a vigente, não 1500 + 2500
    expect(dre.totais.receitaBruta).toBe(4_000)
    expect(dre.analise.numNegociacoes).toBe(2)
    expect(dre.analise.volumeNegociado).toBe(57_000 + 45_000)
    expect(dre.analise.receitaPorTipo[0]).toEqual({ tipoMoeda: BAN, receita: 1_000, negociacoes: 1 })
  })

  it('sem alíquota configurada, impostos ficam zerados e a pendência é declarada', () => {
    const dre = montarDre({ ledger: ledgerDeExemplo(), manuais: [], parametros: PARAMETROS_VAZIOS, periodo: periodoMensal(2026, 8) })
    expect(dre.totais.deducoes).toBe(0)
    expect(dre.totais.irpj).toBe(0)
    expect(dre.totais.csll).toBe(0)
    expect(dre.totais.resultadoLiquido).toBe(4_000)
    expect(dre.pendencias.some((p) => p.startsWith('ISS'))).toBe(true)
    expect(dre.pendencias.some((p) => p.startsWith('Presunção'))).toBe(true)
    expect(dre.linhas.find((l) => l.codigo === '5.1.01')?.observacao).toBe('não configurado')
  })

  it('com alíquotas e despesas manuais, a DRE fecha em inteiros', () => {
    const dre = montarDre({
      ledger: ledgerDeExemplo(),
      manuais: [
        { data: new Date(2026, 7, 15).getTime(), contaCodigo: '4.1.03', descricao: 'Aluguel', valor: 1_000, criadoPor: 'x' },
        { data: new Date(2026, 7, 15).getTime(), contaCodigo: '3.1.99', descricao: 'Consultoria', valor: 2_000, criadoPor: 'x' },
        { data: new Date(2026, 8, 15).getTime(), contaCodigo: '4.1.03', descricao: 'fora do período', valor: 9_999, criadoPor: 'x' },
      ],
      parametros: {
        presuncaoLucroBp: 3200,
        irpjBp: 1500,
        irpjAdicionalBp: 1000,
        irpjAdicionalLimiteMensal: 2_000_000,
        csllBp: 900,
        pisBp: 65,
        cofinsBp: 300,
        issBp: 500,
      },
      periodo: periodoMensal(2026, 8),
    })
    const t = dre.totais
    expect(t.receitaBruta).toBe(6_000) // 4000 + 2000 manuais
    expect(t.iss).toBe(aplicarBp(6_000, 500)) // 300
    expect(t.pis).toBe(aplicarBp(6_000, 65)) // 39
    expect(t.cofins).toBe(aplicarBp(6_000, 300)) // 180
    expect(t.receitaLiquida).toBe(6_000 - 519)
    expect(t.despesasOperacionais).toBe(1_000)
    expect(t.resultadoOperacional).toBe(4_481)
    expect(t.basePresumida).toBe(1_920)
    expect(t.irpj).toBe(288)
    expect(t.irpjAdicional).toBe(0) // base abaixo do limite mensal
    expect(t.csll).toBe(173) // round(1920 × 0,09)
    expect(t.resultadoLiquido).toBe(4_481 - 288 - 173)
    expect(dre.pendencias).toEqual([])
    for (const k of Object.values(t)) expect(Number.isInteger(k)).toBe(true)
    expect(dre.analise.margemLiquidaBp).toBe(Math.round((t.resultadoLiquido * 10000) / 6_000))
  })

  it('o adicional de IRPJ incide só sobre o excedente do limite × meses', () => {
    const grande: Trade = { price: 1, qty: 1, date: new Date(2026, 7, 1).getTime(), buyer: 'a', seller: 'b', tipoMoeda: BAN }
    const ledger = encadear(
      [lancamentoDeSaldoInicial('b', 100_000_000_00, 1, 'x'), ...lancamentosDeTrade(grande, 100_000_000_00, 'T')],
      {},
      GENESIS,
    ).lancamentos
    const dre = montarDre({
      ledger,
      manuais: [],
      parametros: { ...PARAMETROS_VAZIOS, presuncaoLucroBp: 3200, irpjBp: 1500, irpjAdicionalBp: 1000, irpjAdicionalLimiteMensal: 2_000_000 },
      periodo: periodoTrimestral(2026, 3),
    })
    // receita 100 milhões → base 32 milhões → excedente sobre 3 × R$ 20.000
    const base = aplicarBp(100_000_000_00, 3200)
    expect(dre.totais.basePresumida).toBe(base)
    expect(dre.totais.irpjAdicional).toBe(aplicarBp(base - 3 * 2_000_000, 1000))
  })

  it('fmtBp formata pontos-base como percentual legível', () => {
    expect(fmtBp(3200)).toBe('32%')
    expect(fmtBp(65)).toBe('0,65%')
    expect(fmtBp(150)).toBe('1,5%')
  })
})

import { describe, expect, it } from 'vitest'

import type { Dre } from '@/domain/dre'

import { cascata, custosPorSetor, despesasPorConta, pesoSobreReceitaBp, receitasPorTipo, resumirRecorrentes } from './analise'
import type { Recorrente } from './controle'

const totais = {
  receitaComissoes: 80_000,
  receitaCustodia: 20_000,
  receitaTaxaSaque: 0,
  receitaTaxaRetirada: 0,
  freteRepassado: 0,
  outrasReceitas: 0,
  receitaBruta: 100_000,
  iss: 5_000,
  pis: 650,
  cofins: 3_000,
  deducoes: 8_650,
  receitaLiquida: 91_350,
  despesasOperacionais: 31_000,
  resultadoOperacional: 60_350,
  basePresumida: 32_000,
  irpj: 4_800,
  irpjAdicional: 0,
  csll: 2_880,
  resultadoLiquido: 52_670,
}
const dre = {
  totais,
  linhas: [
    { codigo: '3.1.01', descricao: 'Comissões', valor: 80_000, nivel: 2, observacao: null },
    { codigo: '3.1.02', descricao: 'Custódia', valor: 20_000, nivel: 2, observacao: null },
    { codigo: '3.1.03', descricao: 'Tarifas de saque', valor: 0, nivel: 2, observacao: null },
    // Como a DRE grava: linha de despesa negativa, total positivo.
    { codigo: '4.1.04', descricao: 'Software', valor: -30_000, nivel: 2, observacao: null },
    { codigo: '4.1.07', descricao: 'Gateway', valor: -1_000, nivel: 2, observacao: null },
  ],
} as unknown as Dre

describe('cascata do faturamento ao resultado', () => {
  it('separa a tarifa do Mercado Pago dos outros custos e fecha no resultado da DRE', () => {
    const c = cascata(dre)
    expect(c.map((p) => [p.chave, p.valor])).toEqual([
      ['receita', 100_000],
      ['deducoes', 8_650],
      ['gateway', 1_000],
      ['custos', 30_000],
      ['ir', 7_680],
      ['resultado', 52_670],
    ])
    const saidas = c.filter((p) => p.natureza === 'saida').reduce((t, p) => t + p.valor, 0)
    expect(100_000 - saidas).toBe(52_670)
  })
  it('receitas e despesas por linha, só as com valor', () => {
    expect(receitasPorTipo(dre).map((f) => f.chave)).toEqual(['3.1.01', '3.1.02'])
    expect(despesasPorConta(dre)).toEqual([
      { chave: '4.1.04', rotulo: 'Software', valor: 30_000 },
      { chave: '4.1.07', rotulo: 'Gateway', valor: 1_000 },
    ])
    expect(pesoSobreReceitaBp(8_650, 100_000)).toBe(865)
    expect(pesoSobreReceitaBp(1, 0)).toBeNull()
  })
})

describe('custos por setor', () => {
  it('soma só despesa, com "Sem setor" para lançamento antigo', () => {
    const r = custosPorSetor(
      [
        { contaCodigo: '4.1.04', valor: 100, setorId: 1 },
        { contaCodigo: '4.1.04', valor: 50, setorId: 1 },
        { contaCodigo: '4.1.08', valor: 300, setorId: 2 },
        { contaCodigo: '4.1.99', valor: 20, setorId: null },
        { contaCodigo: '3.1.99', valor: 999, setorId: 1 },
      ],
      [
        { id: 1, nome: 'Tecnologia' },
        { id: 2, nome: 'Marketing' },
      ],
    )
    expect(r).toEqual([
      { chave: '2', rotulo: 'Marketing', valor: 300 },
      { chave: '1', rotulo: 'Tecnologia', valor: 150 },
      { chave: 'sem', rotulo: 'Sem setor', valor: 20 },
    ])
  })
})

describe('resumo dos recorrentes', () => {
  const r = (p: Partial<Recorrente>): Recorrente => ({
    id: 1,
    tipo: 'custo',
    descricao: 'x',
    fornecedor: null,
    contaCodigo: '4.1.04',
    setorId: null,
    valor: 10_000,
    periodicidade: 'mensal',
    inicio: '2026-01-10',
    fim: null,
    ativo: true,
    observacao: null,
    ...p,
  })
  it('custo fixo mensal mensaliza o anual, ignora desativado e encerrado, e lista os próximos 30 dias', () => {
    const s = resumirRecorrentes(
      [
        r({ id: 1 }),
        r({ id: 2, periodicidade: 'anual', valor: 120_000, inicio: '2026-03-01' }),
        r({ id: 3, ativo: false }),
        r({ id: 4, fim: '2026-09-30' }),
        r({ id: 5, tipo: 'receita', valor: 50_000 }),
      ],
      '2026-10-25',
    )
    expect(s.custoFixoMensal).toBe(20_000)
    expect(s.custoFixoAnual).toBe(240_000)
    expect(s.receitaRecorrenteMensal).toBe(50_000)
    expect(s.proximos30.itens.map((i) => [i.id, i.dia])).toEqual([
      [1, '2026-11-10'],
      [5, '2026-11-10'],
    ])
    expect(s.proximos30.custos).toBe(10_000)
  })
})

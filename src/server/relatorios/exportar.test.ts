/**
 * A serialização precisa produzir o que o Excel em português abre e o que o
 * Google Sheets importa: ponto e vírgula, vírgula decimal, BOM, e uma pasta
 * XLSX com uma aba por relatório que se lê de volta igual.
 */

import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'

import type { Relatorio } from './dados'
import { nomeDeAba, relatorioParaCsv, relatorioParaMatriz, relatoriosParaXlsx } from './exportar'

const exemplo: Relatorio = {
  nome: 'negociacoes',
  titulo: 'Negociações',
  geradoEm: 0,
  periodo: 'exercício de 2026',
  colunas: ['Ref', 'Quantidade', 'Valor_Bruto', 'Descricao', 'Ok'],
  linhas: [
    { Ref: 'TRADE-1', Quantidade: 2, Valor_Bruto: 570, Descricao: 'Venda; com "aspas"', Ok: true },
    { Ref: 'TRADE-2', Quantidade: 1, Valor_Bruto: 285.5, Descricao: '', Ok: false },
  ],
  observacoes: ['nota'],
}

describe('exportar', () => {
  it('CSV: BOM, ponto e vírgula, vírgula decimal, inteiro sem casas e escape de aspas', () => {
    const csv = relatorioParaCsv(exemplo)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const linhas = csv.slice(1).split('\r\n')
    expect(linhas[0]).toBe('Ref;Quantidade;Valor_Bruto;Descricao;Ok')
    expect(linhas[1]).toBe('TRADE-1;2;570,00;"Venda; com ""aspas""";sim')
    expect(linhas[2]).toBe('TRADE-2;1;285,50;;não')
  })

  it('XLSX: uma aba de resumo mais uma por relatório, e os dados voltam iguais', () => {
    const bytes = relatoriosParaXlsx([exemplo])
    const wb = XLSX.read(bytes, { type: 'array' })
    expect(wb.SheetNames).toEqual(['Resumo', 'negociacoes'])
    const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.negociacoes)
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toMatchObject({ Ref: 'TRADE-1', Quantidade: 2, Valor_Bruto: 570 })
  })

  it('a matriz para o Sheets tem o cabeçalho na primeira linha', () => {
    expect(relatorioParaMatriz(exemplo)[0]).toEqual(exemplo.colunas)
    expect(relatorioParaMatriz(exemplo)).toHaveLength(3)
    expect(nomeDeAba('lancamentos-manuais/2026?')).toBe('lancamentos-manuais-2026-')
  })
})

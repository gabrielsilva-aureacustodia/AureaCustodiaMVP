/**
 * Serializa um relatório em CSV ou XLSX — no SERVIDOR.
 *
 * Os exportadores de src/lib/ rodam no navegador e baixam o arquivo pelo
 * `<a download>`. Aqui o destino é outro: uma rota de API que o Google Sheets
 * (`IMPORTDATA`), o Excel (Power Query) ou um script consomem por URL. Por
 * isso as funções devolvem bytes, e não disparam download nenhum.
 *
 * As regras do CSV são as MESMAS de src/lib/export/statement-export.ts, de
 * propósito: ponto e vírgula, vírgula decimal, BOM e CRLF — o que o Excel em
 * português abre em colunas com um duplo clique. Divergir daqui faria um
 * arquivo "não funcionar" dependendo de onde foi gerado.
 *
 * Sem `server-only`: não há segredo aqui, e o teste exercita a serialização.
 * Quem chama (as rotas) é que tem a barreira.
 */

import * as XLSX from 'xlsx'

import type { Celula, Relatorio } from './dados'

function csvCampo(v: Celula): string {
  if (v === null) return ''
  if (typeof v === 'number') return v.toFixed(2).replace('.', ',')
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}

/**
 * Números inteiros (ids, quantidades) saem sem casas decimais; os demais com
 * duas. A regra é por valor, não por coluna, porque um mesmo relatório mistura
 * os dois — e `Id 1,00` numa planilha é o tipo de coisa que parece erro.
 */
function csvValor(coluna: string, v: Celula): string {
  if (typeof v === 'number' && Number.isInteger(v) && !/valor|saldo|preco|comissao|taxa|impacto|variacao|volume|receita|bruto|anual|mercado|estimado/i.test(coluna)) {
    return String(v)
  }
  return csvCampo(v)
}

export function relatorioParaCsv(r: Relatorio): string {
  const cabecalho = r.colunas.join(';')
  const corpo = r.linhas.map((l) => r.colunas.map((c) => csvValor(c, l[c] ?? null)).join(';'))
  return '﻿' + [cabecalho, ...corpo].join('\r\n')
}

/** Largura de coluna proporcional ao conteúdo, com teto — só estética. */
function larguras(r: Relatorio): Array<{ wch: number }> {
  return r.colunas.map((c) => {
    const maior = r.linhas.reduce((m, l) => Math.max(m, String(l[c] ?? '').length), c.length)
    return { wch: Math.min(Math.max(maior + 2, 8), 60) }
  })
}

/** Nome de aba do Excel: até 31 caracteres, sem os caracteres proibidos. */
export function nomeDeAba(nome: string): string {
  return nome.replace(/[\\/?*[\]:]/g, '-').slice(0, 31)
}

function abaDe(r: Relatorio): XLSX.WorkSheet {
  const linhas = r.linhas.map((l) => {
    const o: Record<string, Celula> = {}
    for (const c of r.colunas) o[c] = l[c] ?? null
    return o
  })
  const ws = XLSX.utils.json_to_sheet(linhas, { header: r.colunas })
  ws['!cols'] = larguras(r)
  return ws
}

/** Uma aba de metadados: título, período, data e observações — o contador precisa saber o que está lendo. */
function abaResumo(relatorios: readonly Relatorio[]): XLSX.WorkSheet {
  const linhas: Array<Record<string, Celula>> = []
  for (const r of relatorios) {
    linhas.push({ Relatorio: r.nome, Titulo: r.titulo, Periodo: r.periodo ?? '', Gerado_Em: new Date(r.geradoEm).toISOString(), Linhas: r.linhas.length, Observacoes: r.observacoes.join(' | ') })
  }
  const ws = XLSX.utils.json_to_sheet(linhas, { header: ['Relatorio', 'Titulo', 'Periodo', 'Gerado_Em', 'Linhas', 'Observacoes'] })
  ws['!cols'] = [{ wch: 20 }, { wch: 36 }, { wch: 22 }, { wch: 24 }, { wch: 8 }, { wch: 80 }]
  return ws
}

export function relatoriosParaXlsx(relatorios: readonly Relatorio[]): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, abaResumo(relatorios), 'Resumo')
  for (const r of relatorios) XLSX.utils.book_append_sheet(wb, abaDe(r), nomeDeAba(r.nome))
  // `type: 'buffer'` devolve um Buffer no Node; o tipo declarado é `any`.
  const saida = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new Uint8Array(saida)
}

/** As linhas em forma de matriz, com o cabeçalho na primeira — é o que o Google Sheets recebe. */
export function relatorioParaMatriz(r: Relatorio): Celula[][] {
  return [r.colunas, ...r.linhas.map((l) => r.colunas.map((c) => l[c] ?? null))]
}

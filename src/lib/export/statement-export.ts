/**
 * Exportação do extrato da conta em CSV e XLSX.
 *
 * NÃO É PORT — o monolito só exportava a auditoria de estoque. O irmão mais
 * velho deste arquivo é @/lib/xlsx/audit-export.ts, e o padrão dele é seguido
 * aqui: roda no CLIENTE, o import de 'xlsx' é dinâmico e o download é disparado
 * pelo navegador.
 *
 * POR QUE CSV E XLSX, E NÃO PDF OU XML
 * ------------------------------------
 * Foram os dois formatos escolhidos por serem os mais leves de gerar e os que
 * qualquer pessoa abre: o CSV não precisa de biblioteca nenhuma (é texto, sai
 * na hora, pesa nada) e o XLSX reaproveita o SheetJS que o projeto já carrega
 * para a auditoria. PDF exigiria uma segunda dependência pesada por um
 * documento que ninguém vai reimprimir, e XML não tem leitor natural para quem
 * usa a plataforma. Se o contador pedir um dos dois depois, o caminho está
 * aberto: as linhas já vêm prontas de @/domain/statement.
 *
 * DIFERENÇA DELIBERADA EM RELAÇÃO À AUDITORIA: este arquivo LEVA dados do
 * proprietário — é o extrato dele, entregue a ele. A regra de "sem dados de
 * proprietário" vale para a planilha de auditoria pública, que é outro
 * documento com outro propósito.
 */

import type { StatementRow, StatementTotals } from '@/domain/statement'

/**
 * Uma linha do arquivo. As chaves viram o cabeçalho da planilha, então os nomes
 * (sem acento, com underline) seguem o mesmo contrato do audit-export: um dia
 * alguém vai ler isto por script.
 *
 * Os valores monetários saem em REAIS com duas casas decimais, e não em
 * centavos: o arquivo é para leitura humana e para o contador. Quem precisa do
 * inteiro exato tem o estado.
 */
export interface StatementFileRow {
  Data: string
  Tipo: string
  Moeda: string
  Descricao: string
  Quantidade: number | ''
  Valor_Unitario: number | ''
  Taxa: number | ''
  Impacto_Saldo: number
}

const SHEET_NAME = 'Extrato'
const BASE_NAME = 'extrato-real-olimpico'

/** Centavos -> número em reais com duas casas. 28500 -> 285.00 */
function reais(c: number): number {
  return Math.round(c) / 100
}

/**
 * Converte as linhas do domínio para as linhas do arquivo. Fica separada da
 * escrita porque CSV e XLSX consomem exatamente a mesma tabela — duplicar a
 * conversão deixaria os dois arquivos divergirem com o tempo.
 */
export function toFileRows(rows: readonly StatementRow[]): StatementFileRow[] {
  return rows.map((r) => ({
    Data: r.dateBR,
    Tipo: r.kind,
    Moeda: r.tipoMoeda,
    Descricao: r.descricao,
    Quantidade: r.quantidade ?? '',
    Valor_Unitario: r.valorUnitario === null ? '' : reais(r.valorUnitario),
    Taxa: r.taxa === null ? '' : reais(r.taxa),
    Impacto_Saldo: reais(r.impacto),
  }))
}

/**
 * Dispara o download de um Blob já montado.
 *
 * O <a> é criado, clicado e removido na mesma volta, e a URL do objeto é
 * revogada em seguida: sem o revoke, cada exportação deixa o Blob inteiro preso
 * na memória da aba até o recarregamento.
 */
function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Escapa um campo para CSV: aspas duplicadas e o valor entre aspas quando
 * contém separador, aspas ou quebra de linha.
 *
 * A observação de um anúncio e o nome de uma conta são texto livre — sem isto,
 * um ponto e vírgula digitado por alguém partiria a linha em duas colunas e o
 * arquivo abriria torto.
 */
function csvCampo(v: string | number): string {
  const s = String(v)
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/**
 * Gera e baixa o extrato em CSV.
 *
 * Separador PONTO E VÍRGULA e decimal com VÍRGULA: é o que o Excel em português
 * abre em colunas com um duplo clique. Com vírgula de separador ele joga a
 * linha inteira numa célula só, e o arquivo "não funciona" para quem o recebeu.
 *
 * O BOM (﻿) no começo existe pelo mesmo motivo: sem ele o Excel lê o UTF-8
 * como Latin-1 e "Custódia" vira "CustÃ³dia".
 */
export function exportStatementCsv(rows: readonly StatementRow[], sufixo: string): void {
  const linhas = toFileRows(rows)
  const cabecalho: Array<keyof StatementFileRow> = [
    'Data',
    'Tipo',
    'Moeda',
    'Descricao',
    'Quantidade',
    'Valor_Unitario',
    'Taxa',
    'Impacto_Saldo',
  ]

  const corpo = linhas.map((l) =>
    cabecalho
      .map((k) => {
        const v = l[k]
        // Número com vírgula decimal, como o Excel pt-BR espera.
        return csvCampo(typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v)
      })
      .join(';'),
  )

  const texto = '﻿' + [cabecalho.join(';'), ...corpo].join('\r\n')
  baixarBlob(new Blob([texto], { type: 'text/csv;charset=utf-8' }), `${BASE_NAME}-${sufixo}.csv`)
}

/** Larguras das oito colunas, na ordem. */
const COL_WIDTHS = [
  { wch: 12 },
  { wch: 20 },
  { wch: 28 },
  { wch: 38 },
  { wch: 11 },
  { wch: 14 },
  { wch: 11 },
  { wch: 14 },
]

/**
 * Gera e baixa o extrato em XLSX, com uma segunda aba de totais.
 *
 * A aba de resumo existe para o extrato ser conferível sem fórmula: quem abrir
 * o arquivo vê quanto entrou, quanto saiu e quanto foi de comissão sem precisar
 * somar coluna.
 *
 * A única exceção que escapa daqui é a falha de carregamento da biblioteca, com
 * o mesmo texto que o exportador de auditoria usa.
 */
export async function exportStatementXlsx(
  rows: readonly StatementRow[],
  totais: StatementTotals,
  sufixo: string,
): Promise<void> {
  const XLSX = await import('xlsx').catch((): never => {
    throw new Error(
      'Não foi possível carregar o gerador de planilhas — verifique a conexão e recarregue a página.',
    )
  })

  const ws = XLSX.utils.json_to_sheet(toFileRows(rows))
  ws['!cols'] = COL_WIDTHS

  const resumo = [
    { Indicador: 'Total depositado', Valor: reais(totais.depositado) },
    { Indicador: 'Moedas compradas', Valor: totais.compradoQtd },
    { Indicador: 'Valor gasto em compras', Valor: reais(totais.compradoValor) },
    { Indicador: 'Moedas vendidas', Valor: totais.vendidoQtd },
    { Indicador: 'Valor bruto das vendas', Valor: reais(totais.vendidoValor) },
    { Indicador: 'Comissões pagas', Valor: reais(totais.taxasPagas) },
    { Indicador: 'Variação líquida de saldo', Valor: reais(totais.variacaoSaldo) },
  ]
  const wsResumo = XLSX.utils.json_to_sheet(resumo)
  wsResumo['!cols'] = [{ wch: 30 }, { wch: 16 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME)
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')
  XLSX.writeFile(wb, `${BASE_NAME}-${sufixo}.xlsx`)
}

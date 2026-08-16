/**
 * Exportação da planilha de auditoria do estoque — porte de `exportAuditXlsx`
 * (MVP, linhas 2511-2525).
 *
 * Roda no CLIENTE: `XLSX.writeFile` monta o arquivo e dispara o download pelo
 * navegador. O import de 'xlsx' é dinâmico pelo mesmo motivo do jsPDF — é uma
 * biblioteca grande, usada só quando alguém clica em "Exportar auditoria
 * completa", e não pode pesar no carregamento inicial.
 *
 * REGRA DE NEGÓCIO PRESERVADA: a planilha NÃO leva dado de proprietário. A tela
 * de auditoria promete isso em texto ("sem dados de proprietário") — quem
 * montar as linhas não deve acrescentar coluna de dono aqui.
 */

import type { DateBR } from '@/domain/types'

/**
 * Uma linha da planilha. As chaves viram o cabeçalho da aba, então os nomes
 * (sem acento, com underline) são os do original e fazem parte do contrato do
 * arquivo exportado — sistemas de conferência podem estar lendo por eles.
 */
export interface AuditRow {
  Codigo_Ativo: string
  Tipo_Moeda: string
  /** Data de postagem do envio; cai para a data de entrada quando não houver. */
  Data_Envio: DateBR
  /** Data de emissão do recibo NFT. */
  Data_Avaliacao: DateBR
}

/** Larguras das quatro colunas, na ordem, como no MVP. */
const COL_WIDTHS = [{ wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 14 }]

const SHEET_NAME = 'Auditoria_Estoque'
const FILE_NAME = 'auditoria-estoque-real-olimpico.xlsx'

/**
 * Gera e baixa a planilha. Não exibe toast: quem chama já tem `rows.length` e
 * monta a mensagem original ('Planilha de auditoria exportada (N moedas).').
 *
 * A única exceção que escapa daqui é a falha de carregamento da biblioteca, com
 * o texto exato que o MVP mostrava.
 */
export async function exportAuditXlsx(rows: AuditRow[]): Promise<void> {
  const XLSX = await import('xlsx').catch((): never => {
    throw new Error('Não foi possível carregar o gerador de planilhas — verifique a conexão e recarregue a página.')
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = COL_WIDTHS
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME)
  XLSX.writeFile(wb, FILE_NAME)
}

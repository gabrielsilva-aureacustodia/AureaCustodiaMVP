import { describe, expect, it } from 'vitest'

import { DOCUMENTOS_VIGENTES, hashDoDocumento, PARAMETROS_LEGAIS, TABELA_DE_TAXAS_V1, textoCanonico } from '@/domain/documentos-legais'
import { TAXAS_PADRAO } from '@/domain/fees'

import { documentoTabelaDeTaxas, documentoTermosDeUso, percentualNoTexto, reaisNoTexto } from './documentos'

const TERMOS_PADRAO = {
  vigencia: PARAMETROS_LEGAIS.vigencia,
  prazoValidacaoCustodia: PARAMETROS_LEGAIS.prazoValidacaoCustodia,
  prazoRecebimentoVenda: PARAMETROS_LEGAIS.prazoRecebimentoVenda,
  prazoDisponibilizacaoDeposito: PARAMETROS_LEGAIS.prazoDisponibilizacaoDeposito,
}

describe('números no texto dos documentos', () => {
  it('reais com espaço comum, milhar com ponto — o formato do texto do advogado', () => {
    expect(reaisNoTexto(200)).toBe('R$ 2,00')
    expect(reaisNoTexto(18000)).toBe('R$ 180,00')
    expect(reaisNoTexto(123456)).toBe('R$ 1.234,56')
    expect(reaisNoTexto(0)).toBe('R$ 0,00')
    // Nada de espaço não separável (U+00A0), que é o que o Intl põe depois do "R$".
    expect(reaisNoTexto(200)).not.toContain(String.fromCharCode(160))
  })

  it('percentual sem zeros sobrando', () => {
    expect(percentualNoTexto(50)).toBe('0,5%')
    expect(percentualNoTexto(100)).toBe('1%')
    expect(percentualNoTexto(125)).toBe('1,25%')
    expect(percentualNoTexto(1050)).toBe('10,5%')
    expect(percentualNoTexto(0)).toBe('0%')
  })
})

describe('Tabela de Taxas gerada pela configuração', () => {
  it('com TAXAS_PADRAO, o texto canônico é idêntico ao da versão 2.0', () => {
    const doc = documentoTabelaDeTaxas(TAXAS_PADRAO, PARAMETROS_LEGAIS.vigencia)
    expect(textoCanonico(doc)).toBe(textoCanonico(TABELA_DE_TAXAS_V1))
    expect(hashDoDocumento(doc)).toBe(DOCUMENTOS_VIGENTES.tabela_de_taxas.hash)
  })

  it('com outra tabela, só os números mudam — e o exemplo de R$ 200 é recalculado', () => {
    const taxas = { ...TAXAS_PADRAO, comissaoCompradorBp: 100, comissaoVendedorFixa: 250, taxaSaqueFixa: 750, retiradaSeguraParcelasMax: 3 }
    const texto = textoCanonico(documentoTabelaDeTaxas(taxas, '01/10/2026'))
    expect(texto).toContain('Data de entrada em vigor: 01/10/2026')
    expect(texto).toContain('2.1. Comissão de Compra. 1% sobre o valor da negociação + R$ 1,00 fixo por moeda comprada.')
    expect(texto).toContain('2.2. Comissão de Venda. 0,5% sobre o valor da negociação + R$ 2,50 fixo por moeda vendida.')
    // Comprador: 1% de 200 + 1 = R$ 3,00. Vendedor: 0,5% de 200 + 2,50 = R$ 3,50.
    expect(texto).toContain('o comprador paga R$ 203,00 (preço de R$ 200,00 acrescido de comissão de R$ 3,00) e o vendedor recebe R$ 196,50 líquidos')
    expect(texto).toContain('R$ 180,00 por envio, em até 3x no cartão de crédito.')
    expect(texto).toContain('Tarifa fixa de transferência de R$ 7,50 por solicitação de saque bancário.')
    const linhasV1 = textoCanonico(TABELA_DE_TAXAS_V1).split('\n')
    const linhas = texto.split('\n')
    expect(linhas).toHaveLength(linhasV1.length)
  })

  it('gerar não altera o documento da versão 2.0', () => {
    const antes = textoCanonico(TABELA_DE_TAXAS_V1)
    documentoTabelaDeTaxas({ ...TAXAS_PADRAO, taxaSaqueFixa: 1 }, '01/01/2030')
    expect(textoCanonico(TABELA_DE_TAXAS_V1)).toBe(antes)
  })
})

describe('Termos de Uso gerados pelos parâmetros', () => {
  it('com os parâmetros de parametros.ts, o hash é o vetor congelado da versão 2.0', () => {
    expect(hashDoDocumento(documentoTermosDeUso(TERMOS_PADRAO))).toBe('97521d13fc2052d531df8de3c10edd4d4df61d86fb1effcee5806ee626bd11b2')
  })

  it('troca o prazo dentro da cláusula certa, mesmo com dois prazos de texto igual', () => {
    const doc = documentoTermosDeUso({ ...TERMOS_PADRAO, prazoDisponibilizacaoDeposito: 'até 1 (um) dia útil', vigencia: '01/11/2026' })
    const texto = textoCanonico(doc)
    const cap7 = doc.capitulos.find((c) => c.numero === 7)
    const p725 = cap7?.paragrafos.find((p) => p.numero === '7.2.5')
    const p762 = cap7?.paragrafos.find((p) => p.numero === '7.6.2')
    // 7.2.5 continua com "até 2 (dois) dias úteis"; só a 7.6.2 mudou.
    expect(p725?.texto).toContain('até 2 (dois) dias úteis')
    expect(p762?.texto).toContain('até 1 (um) dia útil')
    expect(p762?.texto).not.toContain('até 2 (dois) dias úteis')
    expect(texto).toContain('Data de entrada em vigor: 01/11/2026')
    expect(hashDoDocumento(doc)).not.toBe(DOCUMENTOS_VIGENTES.termos_de_uso.hash)
  })
})

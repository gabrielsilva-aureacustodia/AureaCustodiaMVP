/**
 * Os documentos contratuais montados a partir da configuração vigente (frente C, C3).
 *
 * A TABELA DE TAXAS É PARTE DO CONTRATO. Mudar uma taxa pelo painel publica uma versão nova dela
 * (`publicarVersaoDocumento('tabela_de_taxas', …)`, de src/server/documentos/publicar.ts, da A3), e
 * mudar um prazo dos Termos publica uma versão nova dos Termos. Para isso o painel precisa do texto
 * da versão nova — é o que este arquivo produz.
 *
 * O TEXTO NÃO É REESCRITO. A estrutura, a ordem, a pontuação e cada frase são as de
 * `TABELA_DE_TAXAS_V1` e `TERMOS_DE_USO_V1` (src/domain/documentos-legais/). Só os números e os
 * prazos trocam de lugar. A prova está no teste: com os valores padrão, o texto canônico gerado aqui
 * é idêntico ao da versão 1.0, byte a byte — e o hash congelado dos Termos continua o mesmo.
 *
 * DINHEIRO NO TEXTO COM ESPAÇO COMUM. `brl()` usa o `Intl`, que separa "R$" do número com espaço
 * não separável (U+00A0). O texto do advogado usa espaço comum, e um caractere invisível diferente é
 * hash diferente.
 *
 * Regra pura: sem I/O.
 */

import { TABELA_DE_TAXAS_V1 } from '@/domain/documentos-legais/tabela-de-taxas-v1'
import { TERMOS_DE_USO_V1 } from '@/domain/documentos-legais/termos-de-uso-v1'
import { PARAMETROS_LEGAIS } from '@/domain/documentos-legais/parametros'
import type { DocumentoLegalEstruturado, Paragrafo } from '@/domain/documentos-legais/types'
import { comissaoPorMoeda, type TabelaDeTaxas } from '@/domain/fees'
import type { Cents } from '@/domain/types'

import type { ParametrosDosTermos } from './configuracao'

/** 123456 → "R$ 1.234,56", com espaço comum — o formato do texto dos documentos. */
export function reaisNoTexto(c: Cents): string {
  const negativo = c < 0
  const abs = Math.abs(Math.round(c))
  const inteiro = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const centavos = String(abs % 100).padStart(2, '0')
  return `${negativo ? '-' : ''}R$ ${inteiro},${centavos}`
}

/** 50 → "0,5%"; 125 → "1,25%"; 100 → "1%". */
export function percentualNoTexto(bp: number): string {
  const pct = (bp / 100).toFixed(2).replace(/\.?0+$/, '')
  return `${pct.replace('.', ',')}%`
}

/** O preço do exemplo prático da cláusula 2.3. */
export const PRECO_DO_EXEMPLO: Cents = 20_000

function clonar<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

function paragrafo(doc: DocumentoLegalEstruturado, numero: string): Paragrafo {
  for (const cap of doc.capitulos) {
    const p = cap.paragrafos.find((x) => x.numero === numero)
    if (p) return p
  }
  throw new Error(`O documento ${doc.chave} não tem a cláusula ${numero} — a estrutura da versão 1.0 mudou.`)
}

/**
 * A Tabela de Taxas com os valores de `taxas`. `vigencia` é a data que o texto declara (dd/mm/aaaa);
 * `versao` não entra no texto canônico e serve só para exibição.
 */
export function documentoTabelaDeTaxas(taxas: TabelaDeTaxas, vigencia: string, versao = TABELA_DE_TAXAS_V1.versao): DocumentoLegalEstruturado {
  const doc = clonar(TABELA_DE_TAXAS_V1)
  doc.versao = versao
  doc.vigenteDesde = vigencia

  paragrafo(doc, '1.1').texto = `${reaisNoTexto(taxas.custodiaAnualPorMoeda)} por moeda pelos 12 meses, em até ${taxas.custodiaAnualParcelasMax}x no cartão de crédito.`
  // A cláusula 1.2 era o plano de 24 meses, aposentado em 20/09/2026: existe um
  // prazo só, e a Tabela de Taxas publicada não pode oferecer o que não se vende.
  paragrafo(doc, '2.1').texto = `${percentualNoTexto(taxas.comissaoCompradorBp)} sobre o valor da negociação + ${reaisNoTexto(taxas.comissaoCompradorFixa)} fixo por moeda comprada.`
  paragrafo(doc, '2.2').texto = `${percentualNoTexto(taxas.comissaoVendedorBp)} sobre o valor da negociação + ${reaisNoTexto(taxas.comissaoVendedorFixa)} fixo por moeda vendida.`

  const { comprador, vendedor } = comissaoPorMoeda(PRECO_DO_EXEMPLO, taxas)
  const p = reaisNoTexto(PRECO_DO_EXEMPLO)
  paragrafo(doc, '2.3').texto =
    `Em uma negociação de ${p}: o comprador paga ${reaisNoTexto(PRECO_DO_EXEMPLO + comprador)} (preço de ${p} acrescido de comissão de ${reaisNoTexto(comprador)}) ` +
    `e o vendedor recebe ${reaisNoTexto(PRECO_DO_EXEMPLO - vendedor)} líquidos (preço de ${p} deduzido de comissão de ${reaisNoTexto(vendedor)}).`

  paragrafo(doc, '3.1').texto = `${reaisNoTexto(taxas.taxaRetiradaComum)} por envio.`
  paragrafo(doc, '3.2').texto = `${reaisNoTexto(taxas.taxaRetiradaSegura)} por envio, em até ${taxas.retiradaSeguraParcelasMax}x no cartão de crédito.`
  paragrafo(doc, '4.2').texto = `Tarifa fixa de transferência de ${reaisNoTexto(taxas.taxaSaqueFixa)} por solicitação de saque bancário.`
  return doc
}

/** As três cláusulas dos Termos que carregam prazo, e o parâmetro de cada uma (parametros.ts). */
const CLAUSULAS_COM_PRAZO: ReadonlyArray<{ numero: string; campo: keyof Omit<ParametrosDosTermos, 'vigencia'> }> = [
  { numero: '7.2.5', campo: 'prazoValidacaoCustodia' },
  { numero: '7.3.3', campo: 'prazoRecebimentoVenda' },
  { numero: '7.6.2', campo: 'prazoDisponibilizacaoDeposito' },
]

/**
 * Os Termos de Uso com os prazos e a vigência de `p`.
 *
 * A troca é feita dentro da cláusula certa, e só uma vez nela: dois prazos da versão 1.0 têm o
 * mesmo texto ("até 2 (dois) dias úteis"), e uma substituição no documento inteiro trocaria o
 * prazo errado.
 */
export function documentoTermosDeUso(p: ParametrosDosTermos, versao = TERMOS_DE_USO_V1.versao): DocumentoLegalEstruturado {
  const doc = clonar(TERMOS_DE_USO_V1)
  doc.versao = versao
  doc.vigenteDesde = p.vigencia
  for (const { numero, campo } of CLAUSULAS_COM_PRAZO) {
    const par = paragrafo(doc, numero)
    const antigo = PARAMETROS_LEGAIS[campo]
    const texto = par.texto ?? ''
    const onde = texto.indexOf(antigo)
    if (onde < 0) throw new Error(`A cláusula ${numero} dos Termos não traz mais o prazo "${antigo}" — a estrutura da versão 1.0 mudou.`)
    par.texto = texto.slice(0, onde) + p[campo] + texto.slice(onde + antigo.length)
  }
  return doc
}

/**
 * DOMÍNIO — Tabela de Taxas Oficial v1.0.
 *
 * Incorporada por referência aos Termos de Uso (Cláusula 1.2 e Cláusula 5).
 */

import { PARAMETROS_LEGAIS } from './parametros'
import type { DocumentoLegalEstruturado } from './types'

export const TABELA_DE_TAXAS_V1: DocumentoLegalEstruturado = {
  chave: 'tabela_de_taxas',
  // 2.0 (20/09/2026): a marca do site passou a ser Real Olímpico e o plano de 24
  // meses foi aposentado. Texto diferente é hash diferente, e o aceite gravado
  // aponta para a versão — reciclar o número faria o registro de consentimento
  // deixar de dizer o que a pessoa leu. O arquivo mantém o sufixo `-v1` de
  // propósito: ele guarda o documento VIGENTE, qualquer que seja o número.
  versao: '2.0',
  titulo: 'TABELA DE TAXAS',
  vigenteDesde: PARAMETROS_LEGAIS.vigencia,
  preambulo: [
    'Esta Tabela de Taxas integra o Contrato celebrado entre o Usuário e a AUREA CUSTODIA LTDA., estabelecendo todas as tarifas, comissões e encargos operacionais vigentes na plataforma.',
  ],
  capitulos: [
    {
      numero: 1,
      titulo: 'Custódia Física e Admissão de Moedas',
      paragrafos: [
        {
          numero: '1.1',
          titulo: 'Plano Anual de Custódia',
          texto: 'R$ 24,00 por moeda pelos 12 meses, em até 12x no cartão de crédito.',
        },
        {
          // Era 1.3 enquanto existia o plano de 24 meses na 1.2. O plano foi
          // aposentado em 20/09/2026 e a cláusula saiu: documento publicado não
          // pode oferecer prazo que a plataforma não vende.
          numero: '1.2',
          titulo: 'Frete de Envio para Custódia',
          texto:
            'O frete postal de envio da moeda até a central de custódia é escolhido e pago diretamente pelo cliente nos Correios.',
        },
      ],
    },
    {
      numero: 2,
      titulo: 'Negociação no Mercado (Marketplace)',
      paragrafos: [
        {
          numero: '2.1',
          titulo: 'Comissão de Compra',
          texto: '0,5% sobre o valor da negociação + R$ 1,00 fixo por moeda comprada.',
        },
        {
          numero: '2.2',
          titulo: 'Comissão de Venda',
          texto: '0,5% sobre o valor da negociação + R$ 1,00 fixo por moeda vendida.',
        },
        {
          numero: '2.3',
          titulo: 'Exemplo Prático de Negociação',
          texto:
            'Em uma negociação de R$ 200,00: o comprador paga R$ 202,00 (preço de R$ 200,00 acrescido de comissão de R$ 2,00) e o vendedor recebe R$ 198,00 líquidos (preço de R$ 200,00 deduzido de comissão de R$ 2,00).',
        },
      ],
    },
    {
      numero: 3,
      titulo: 'Retirada Física de Moedas',
      paragrafos: [
        {
          numero: '3.1',
          titulo: 'Retirada Comum',
          texto: 'R$ 50,00 por envio.',
        },
        {
          numero: '3.2',
          titulo: 'Retirada Segura com Cobertura Especial',
          texto: 'R$ 180,00 por envio, em até 2x no cartão de crédito.',
        },
      ],
    },
    {
      numero: 4,
      titulo: 'Movimentações Financeiras em Conta',
      paragrafos: [
        {
          numero: '4.1',
          titulo: 'Depósito de Recursos',
          texto: 'Sem taxa de processamento cobrada pelo Real Olímpico.',
        },
        {
          numero: '4.2',
          titulo: 'Saque de Recursos',
          texto: 'Tarifa fixa de transferência de R$ 5,00 por solicitação de saque bancário.',
        },
      ],
    },
  ],
}

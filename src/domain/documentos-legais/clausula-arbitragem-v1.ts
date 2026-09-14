/**
 * DOMÍNIO — Cláusula de Arbitragem v1.0.
 *
 * Contrato de adesão com destaque integral e assinatura específica
 * em conformidade com a Lei 9.307/1996, art. 4º, §2º.
 */

import { PARAMETROS_LEGAIS } from './parametros'
import type { DocumentoLegalEstruturado } from './types'

export const CLAUSULA_ARBITRAGEM_V1: DocumentoLegalEstruturado = {
  chave: 'clausula_arbitragem',
  versao: '1.0',
  titulo: 'CLÁUSULA DE ARBITRAGEM',
  vigenteDesde: PARAMETROS_LEGAIS.vigencia,
  preambulo: [
    'Cláusula de compromisso e convenção de arbitragem estipulada em destaque nos Termos de Uso da Plataforma Áurea Custódia.',
  ],
  capitulos: [
    {
      numero: 14,
      titulo: 'Resolução de Conflitos — Cláusula de Arbitragem',
      negrito: true,
      paragrafos: [
        {
          numero: '14.4',
          titulo: 'Arbitragem',
          texto:
            'Caso o conflito não possa ser resolvido satisfatoriamente por meio das negociações previstas na Cláusula 13.2. dentro de 90 (noventa) dias e a soma dos valores em conflito, considerando pedido e eventual reconvenção estimados no momento do requerimento da demanda, seja igual ou superior a R$ 100.000,00 (cem mil reais) qualquer das Partes deverá submeter o conflito para arbitragem.',
          negrito: true,
        },
        {
          numero: '14.5',
          titulo: 'Acordo de Arbitragem',
          texto:
            'O Usuário e a Áurea concordam que os conflitos oriundos ou relacionados a este Termos de Uso e ao uso dos Serviços Áurea, nos quais a soma dos valores em conflito, no momento do início e distribuição de demanda principal e reconvencional, seja igual ou superior a R$ 100.000,00 (cem mil reais) será exclusivamente e definitivamente resolvido por arbitragem, a ser administrada pela Câmara de Mediação e Arbitragem Empresarial - CAMARB, de acordo com o Regulamento de Arbitragem Expedita da CAMARB.',
          negrito: true,
          alineas: [
            {
              letra: '14.5.1.',
              texto:
                'A arbitragem adotará o procedimento expedito, conforme o Regulamento de Arbitragem Expedita da CAMARB',
              negrito: true,
            },
            {
              letra: '14.5.2.',
              texto:
                'A disputa será resolvida por árbitro único, nomeado conforme as Regras da CAMARB.',
              negrito: true,
            },
            {
              letra: '14.5.3.',
              texto: 'A arbitragem terá sede em Belo Horizonte/MG.',
              negrito: true,
            },
            {
              letra: '14.5.4.',
              texto: 'A observará o Direito brasileiro.',
              negrito: true,
            },
            {
              letra: '14.5.5.',
              texto: 'O procedimento arbitral será conduzido em português.',
              negrito: true,
            },
            {
              letra: '14.5.6.',
              texto: 'A sentença arbitral será final e vinculativa para as Partes.',
              negrito: true,
            },
          ],
        },
      ],
    },
  ],
}

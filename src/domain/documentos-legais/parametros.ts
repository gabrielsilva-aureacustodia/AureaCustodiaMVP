/**
 * DOMÍNIO — Parâmetros vigentes dos documentos legais e operacionais.
 *
 * Fonte única de verdade para prazos operacionais, canais de contato e vigência.
 * Alterações de valores geram nova versão dos documentos e novo hash canônico.
 *
 * Valores provisórios alinhados em 13/09/2026 (seção A de minuta_pontos_para_os_socios.md):
 *  - RA-25: Prazos das cláusulas 7.2.5, 7.3.3 e 7.6.2 e data de vigência.
 *  - RA-26: SAC registrado provisoriamente com e-mail enquanto telefone/WhatsApp aguardam definição.
 */

export const PARAMETROS_LEGAIS = {
  /** Data oficial de entrada em vigor da versão 1.0 (publicação da branch A3). */
  vigencia: '14/09/2026',

  /** Cláusula 7.2.5: Prazo para validação da custódia e emissão do Recibo de Unicidade. */
  prazoValidacaoCustodia: 'até 2 (dois) dias úteis',

  /** Cláusula 7.3.3: Prazo para o recebimento dos valores provenientes da venda de moeda custodiada. */
  prazoRecebimentoVenda: 'até 1 (uma) hora',

  /** Cláusula 7.6.2: Prazo para conversão do valor depositado em saldo disponível. */
  prazoDisponibilizacaoDeposito: 'até 2 (dois) dias úteis',

  /** Canais oficiais de atendimento ao cliente (SAC - Cláusula 3). */
  sac: {
    email: 'suporte@aureacustodia.com.br',
    url: '/suporte',
  },

  /** Rota oficial da Tabela de Taxas incorporada ao contrato. */
  tabelaDeTaxasUrl: '/taxas',
} as const


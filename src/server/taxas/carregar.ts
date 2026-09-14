/* ============================================================================
 * CARREGADOR DA TABELA DE TAXAS — exclusivo de servidor.
 *
 * Retorna a tabela unificada de taxas vigente da Áurea Custódia.
 * ==========================================================================*/

import 'server-only'

import { TAXAS_PADRAO, type TabelaDeTaxas } from '@/domain/fees'

/**
 * Carrega a tabela de taxas vigente.
 * Atualmente baseada nas constantes de domínio (Decisão F-1).
 */
export async function carregarTabelaDeTaxas(): Promise<TabelaDeTaxas> {
  return TAXAS_PADRAO
}

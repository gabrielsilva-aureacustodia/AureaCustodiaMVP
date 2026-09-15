/* ============================================================================
 * CARREGADOR DA TABELA DE TAXAS — exclusivo de servidor.
 *
 * Retorna a tabela unificada de taxas vigente da Áurea Custódia.
 * ==========================================================================*/

import 'server-only'

import type { TabelaDeTaxas } from '@/domain/fees'
import { carregarTabelaDeTaxasVigente } from '@/server/config/carregar'

/**
 * Carrega a tabela de taxas vigente.
 *
 * Desde a C3 (14/09/2026) lê `aurea.config_plataforma`, onde o painel grava cada campo de
 * `TabelaDeTaxas`; o que nunca foi mudado vale `TAXAS_PADRAO` (Decisão F-1). Sem banco, a tabela
 * inteira é o padrão — o mesmo que esta função devolvia antes.
 */
export async function carregarTabelaDeTaxas(): Promise<TabelaDeTaxas> {
  return carregarTabelaDeTaxasVigente()
}

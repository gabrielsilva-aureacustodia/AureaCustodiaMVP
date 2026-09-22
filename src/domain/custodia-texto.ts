/**
 * Textos e valores da custódia como funções puras de domínio.
 *
 * Evita dois erros históricos mapeados na pendência A-4:
 * 1. `descricaoDaFaturaDeCustodia`: evita que contratações de plano ou renovações
 *    apareçam rotuladas como "Custódia mensal" no extrato enquanto cobram o valor
 *    cheio do período (ex: R$ 72,00 por 3 moedas).
 * 2. `custodiaDoEnvio`: evita que o passo 5 do fluxo de envios calcule a
 *    taxa com base no campo do formulário do passo 1 (que volta a '1' ao recarregar
 *    a página), congelando a quantidade real pelo protocolo do envio e
 *    respeitando o prazo do plano contratado (12 meses).
 */

import type { Cents, Envio, FaturaCustodia, PlanoCustodia } from '@/domain/types'
import { custodiaMensalPorMoeda, type TabelaDeTaxas } from '@/domain/fees'

/**
 * Monta a descrição amigável de uma fatura de custódia para o extrato.
 */
export function descricaoDaFaturaDeCustodia(
  fatura: FaturaCustodia,
  _plano: PlanoCustodia | undefined,
): string {
  const { competencia, quantidadeMoedas, status, origem } = fatura

  if (origem === 'contratacao') {
    return `Plano mensal de custódia a partir de ${competencia} · ${quantidadeMoedas} moeda(s) — ${status}`
  }

  if (origem === 'renovacao_anual') {
    return `Renovação do plano de custódia a partir de ${competencia} · ${quantidadeMoedas} moeda(s) — ${status}`
  }

  // Origem ausente ou 'ciclo_mensal' mantém o formato exato histórico do extrato
  return `Custódia mensal ${competencia} · ${quantidadeMoedas} moeda(s) — ${status}`
}

/**
 * Calcula a taxa e o rótulo da custódia a exibir no resumo do envio.
 */
export function custodiaDoEnvio(
  envio: Envio,
  plano: PlanoCustodia | undefined,
  taxas: TabelaDeTaxas,
): { rotulo: string; valorCents: Cents; periodo: 'mês' } {
  const quantidade = envio.quantidade

  return {
    rotulo: 'Plano mensal destas moedas',
    valorCents: plano ? plano.valorTotalCents : custodiaMensalPorMoeda(quantidade, taxas),
    periodo: 'mês',
  }
}

/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Pergunta ao ambiente quais variáveis EXISTEM. Nenhum valor sai daqui, a não
 * ser os dois que não são segredo (modo do Mercado Pago e nome do balde).
 * ==========================================================================*/

import 'server-only'

import { estadoDasIntegracoes, NOMES_DE_VARIAVEIS, VARIAVEIS_NAO_SECRETAS, type EstadoIntegracao } from '@/domain/admin/integracoes'

export function integracoesDoAmbiente(env: NodeJS.ProcessEnv = process.env): EstadoIntegracao[] {
  const presenca: Record<string, boolean> = {}
  for (const nome of NOMES_DE_VARIAVEIS) presenca[nome] = Boolean(env[nome]?.trim())
  const naoSecretas: Record<string, string | undefined> = {}
  for (const nome of VARIAVEIS_NAO_SECRETAS) naoSecretas[nome] = env[nome]
  return estadoDasIntegracoes(presenca, naoSecretas)
}

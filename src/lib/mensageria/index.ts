/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE e
 * WHATSAPP_WEBHOOK_SECRET. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { criarProvedorEvolution } from './evolution'
import { criarRegistroLocal } from './registro-local'
import type { ProvedorMensageria } from './tipos'

export * from './tipos'
export { NOME_REGISTRO_LOCAL } from './registro-local'

/**
 * Qual provedor de WhatsApp atende — escolhido pelo ambiente, no mesmo desenho de
 * src/server/store/index.ts: com as três variáveis da Evolution, a Evolution; sem elas,
 * o registro local, e a tela continua funcionando.
 *
 * Sem trava, sem interruptor: não existe "ligar o CS". O que decide é a presença das
 * variáveis, e o quadro de canal da tela diz exatamente quais faltam.
 */
export function provedorDoAmbiente(env: Readonly<Record<string, string | undefined>> = process.env): ProvedorMensageria {
  const url = env.EVOLUTION_API_URL?.trim()
  const chave = env.EVOLUTION_API_KEY?.trim()
  const instancia = env.EVOLUTION_INSTANCE?.trim()
  const segredo = env.WHATSAPP_WEBHOOK_SECRET?.trim() || null

  if (url && chave && instancia) {
    return criarProvedorEvolution({ url, chave, instancia, segredoDoWebhook: segredo })
  }

  const faltando = [
    ...(url ? [] : ['EVOLUTION_API_URL']),
    ...(chave ? [] : ['EVOLUTION_API_KEY']),
    ...(instancia ? [] : ['EVOLUTION_INSTANCE']),
    ...(segredo ? [] : ['WHATSAPP_WEBHOOK_SECRET']),
  ]
  return criarRegistroLocal(faltando)
}

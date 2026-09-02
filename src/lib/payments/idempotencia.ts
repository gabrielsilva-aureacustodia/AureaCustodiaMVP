import 'server-only'

/**
 * Controle de Idempotência para Webhooks e Pagamentos (RA-07).
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Todo gateway reenvia webhook por timeout, falha transitória ou retry policy.
 *  - Sem chave de idempotência, o mesmo depósito poderia creditar duas vezes.
 *  - O mesmo evento processado 3 vezes DEVE creditar EXATAMENTE 1 vez.
 *  - Respostas a eventos já processados devem ser 200 imediatas, descartando o efeito.
 */

import type { RegistroIdempotencia } from './types'

/** Armazenamento em memória para idempotência (com TTL de 24h). */
const idempotenciaMap = new Map<string, RegistroIdempotencia>()

const TTL_IDEMPOTENCIA_MS = 24 * 60 * 60 * 1000 // 24 horas

/**
 * Limpa registros expirados periodicamente da memória.
 */
function limparExpirados(): void {
  const agora = Date.now()
  for (const [key, reg] of idempotenciaMap.entries()) {
    if (agora - reg.processadoEm > TTL_IDEMPOTENCIA_MS) {
      idempotenciaMap.delete(key)
    }
  }
}

/**
 * Verifica se um evento já foi registrado ou concluído.
 */
export async function verificarEventoJaProcessado(eventoId: string): Promise<boolean> {
  const chave = `mp:evt:${eventoId}`
  const reg = idempotenciaMap.get(chave)
  if (!reg) return false
  return reg.status === 'processado' || reg.status === 'em_processamento'
}

/**
 * Tenta adquirir a trava / registrar o início do processamento de um evento.
 * Devolve `true` se puder processar (novo evento), ou `false` se for duplicata.
 */
export async function tentarRegistrarEvento(
  eventoId: string,
  tipo: string = 'payment',
): Promise<{ podeProcessar: boolean; registro?: RegistroIdempotencia }> {
  limparExpirados()

  const chave = `mp:evt:${eventoId}`
  const existente = idempotenciaMap.get(chave)

  if (existente) {
    if (existente.status === 'processado' || existente.status === 'em_processamento') {
      return { podeProcessar: false, registro: existente }
    }
  }

  const novo: RegistroIdempotencia = {
    id: chave,
    eventoId,
    gateway: 'mercadopago',
    tipo,
    processadoEm: Date.now(),
    status: 'em_processamento',
  }

  idempotenciaMap.set(chave, novo)
  return { podeProcessar: true, registro: novo }
}

/**
 * Marca o processamento como concluído com sucesso.
 */
export async function concluirEvento(
  eventoId: string,
  resultado?: unknown,
): Promise<void> {
  const chave = `mp:evt:${eventoId}`
  const reg = idempotenciaMap.get(chave)
  if (reg) {
    reg.status = 'processado'
    reg.resultado = resultado
  } else {
    idempotenciaMap.set(chave, {
      id: chave,
      eventoId,
      gateway: 'mercadopago',
      tipo: 'payment',
      processadoEm: Date.now(),
      status: 'processado',
      resultado,
    })
  }
}

/**
 * Marca o processamento como falho (permitindo retentativa futura se for erro de infra).
 */
export async function falharEvento(eventoId: string): Promise<void> {
  const chave = `mp:evt:${eventoId}`
  const reg = idempotenciaMap.get(chave)
  if (reg) {
    reg.status = 'falha'
  }
}

/**
 * Wrapper de alto nível para executar uma operação com garantia de idempotência.
 */
export async function executarComIdempotencia<T>(
  eventoId: string,
  tipo: string,
  fn: () => Promise<T>,
): Promise<{ processado: boolean; jaExecutado: boolean; resultado?: T }> {
  const { podeProcessar } = await tentarRegistrarEvento(eventoId, tipo)

  if (!podeProcessar) {
    const reg = idempotenciaMap.get(`mp:evt:${eventoId}`)
    return {
      processado: false,
      jaExecutado: true,
      resultado: reg?.resultado as T | undefined,
    }
  }

  try {
    const resultado = await fn()
    await concluirEvento(eventoId, resultado)
    return {
      processado: true,
      jaExecutado: false,
      resultado,
    }
  } catch (error) {
    await falharEvento(eventoId)
    throw error
  }
}

/**
 * Reseta o mapa em memória (utilizado em testes unitários).
 */
export function _resetIdempotenciaParaTestes(): void {
  idempotenciaMap.clear()
}

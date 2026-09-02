import 'server-only'

/**
 * Controle de Idempotência para Webhooks e Pagamentos (RA-07 / RA-14.a).
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Todo gateway reenvia webhook por timeout, falha transitória ou retry policy.
 *  - Sem chave de idempotência, o mesmo depósito poderia creditar duas vezes.
 *  - O mesmo evento processado 3 vezes DEVE creditar EXATAMENTE 1 vez.
 *  - O contrato é desacoplado via interface `RepositorioIdempotencia`, com adaptador
 *    em memória (para dev/testes) e adaptador Postgres (tabela `aurea.payment_events` na C-3).
 */

import type { RegistroIdempotencia } from './types'

/**
 * Contrato que desacopla o armazenamento de idempotência.
 */
export interface RepositorioIdempotencia {
  /** Devolve `podeProcessar: true` se este chamador ganhou o direito de processar o evento. */
  reivindicar(
    eventoId: string,
    tipo?: string,
  ): Promise<{ podeProcessar: boolean; registro?: RegistroIdempotencia }>
  concluir(eventoId: string, resultado?: unknown): Promise<void>
  falhar(eventoId: string): Promise<void>
  verificar(eventoId: string): Promise<boolean>
  resetParaTestes?(): void
}

const TTL_IDEMPOTENCIA_MS = 24 * 60 * 60 * 1000 // 24 horas

/**
 * Implementação em memória (para testes e desenvolvimento local sem banco).
 */
export class RepositorioIdempotenciaMemoria implements RepositorioIdempotencia {
  private mapa = new Map<string, RegistroIdempotencia>()

  private limparExpirados(): void {
    const agora = Date.now()
    for (const [key, reg] of this.mapa.entries()) {
      if (agora - reg.processadoEm > TTL_IDEMPOTENCIA_MS) {
        this.mapa.delete(key)
      }
    }
  }

  async reivindicar(
    eventoId: string,
    tipo: string = 'payment',
  ): Promise<{ podeProcessar: boolean; registro?: RegistroIdempotencia }> {
    this.limparExpirados()

    const chave = `mp:evt:${eventoId}`
    const existente = this.mapa.get(chave)

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

    this.mapa.set(chave, novo)
    return { podeProcessar: true, registro: novo }
  }

  async concluir(eventoId: string, resultado?: unknown): Promise<void> {
    const chave = `mp:evt:${eventoId}`
    const reg = this.mapa.get(chave)
    if (reg) {
      reg.status = 'processado'
      reg.resultado = resultado
    } else {
      this.mapa.set(chave, {
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

  async falhar(eventoId: string): Promise<void> {
    const chave = `mp:evt:${eventoId}`
    const reg = this.mapa.get(chave)
    if (reg) {
      reg.status = 'falha'
    }
  }

  async verificar(eventoId: string): Promise<boolean> {
    const chave = `mp:evt:${eventoId}`
    const reg = this.mapa.get(chave)
    if (!reg) return false
    return reg.status === 'processado' || reg.status === 'em_processamento'
  }

  resetParaTestes(): void {
    this.mapa.clear()
  }
}

/** Instância singleton do adaptador em memória */
const repoMemoria = new RepositorioIdempotenciaMemoria()

/**
 * Obtém o repositório de idempotência ativo.
 * Hoje devolve o repositório em memória; na C-3 seleciona o Postgres quando o banco estiver configurado.
 */
export function repositorioIdempotencia(): RepositorioIdempotencia {
  return repoMemoria
}

/**
 * Funções utilitárias de conveniência que delegam para o repositório ativo
 */

export async function verificarEventoJaProcessado(eventoId: string): Promise<boolean> {
  return repositorioIdempotencia().verificar(eventoId)
}

export async function tentarRegistrarEvento(
  eventoId: string,
  tipo: string = 'payment',
): Promise<{ podeProcessar: boolean; registro?: RegistroIdempotencia }> {
  return repositorioIdempotencia().reivindicar(eventoId, tipo)
}

export async function concluirEvento(
  eventoId: string,
  resultado?: unknown,
): Promise<void> {
  return repositorioIdempotencia().concluir(eventoId, resultado)
}

export async function falharEvento(eventoId: string): Promise<void> {
  return repositorioIdempotencia().falhar(eventoId)
}

export async function executarComIdempotencia<T>(
  eventoId: string,
  tipo: string,
  fn: () => Promise<T>,
): Promise<{ processado: boolean; jaExecutado: boolean; resultado?: T }> {
  const repo = repositorioIdempotencia()
  const { podeProcessar, registro } = await repo.reivindicar(eventoId, tipo)

  if (!podeProcessar) {
    return {
      processado: false,
      jaExecutado: true,
      resultado: registro?.resultado as T | undefined,
    }
  }

  try {
    const resultado = await fn()
    await repo.concluir(eventoId, resultado)
    return {
      processado: true,
      jaExecutado: false,
      resultado,
    }
  } catch (error) {
    await repo.falhar(eventoId)
    throw error
  }
}

export function _resetIdempotenciaParaTestes(): void {
  repoMemoria.resetParaTestes()
}

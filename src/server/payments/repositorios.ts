/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Escolhe onde a idempotência e as intenções de depósito vivem: no banco,
 * quando há `POSTGRES_URL`, ou em memória, quando não há. Importa o cliente do
 * banco, e por isso carrega a barreira.
 * ==========================================================================*/

import 'server-only'

import type { RegistroIdempotencia } from '@/lib/payments'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  anotarPagamentoNaIntencao,
  buscarEvento,
  buscarIntencao,
  concluirEventoNoBanco,
  concluirIntencao,
  devolverIntencaoParaPendente,
  falharEventoNoBanco,
  inserirIntencao,
  recusarIntencao,
  reivindicarEvento,
  reivindicarIntencao,
  type IntencaoDeposito,
} from '@/server/db/repositories/payments'

const GATEWAY = 'mercadopago'

/* ------------------------------------------------------------------ *
 * Idempotência                                                        *
 * ------------------------------------------------------------------ */

/**
 * O contrato é o mesmo que `src/lib/payments/idempotencia.ts` definiu na sessão
 * C-2 — de propósito: a rota do webhook não sabe (nem precisa saber) se está
 * falando com memória ou com Postgres.
 */
export interface RepositorioIdempotenciaServidor {
  reivindicar(
    eventoId: string,
    tipo?: string,
    paymentId?: string | null,
  ): Promise<{ podeProcessar: boolean; registro?: RegistroIdempotencia }>
  concluir(eventoId: string, resultado?: unknown): Promise<void>
  falhar(eventoId: string): Promise<void>
  verificar(eventoId: string): Promise<boolean>
}

/**
 * Adaptador Postgres — **é ele que paga o RA-07 de verdade**.
 *
 * A memória só protege dentro de um processo. Em serverless cada instância
 * nasce com o mapa vazio, e duas entregas do mesmo webhook em instâncias
 * diferentes creditariam duas vezes. Aqui quem arbitra é a chave primária
 * `(gateway, event_id)`, que é única para o banco inteiro.
 */
const postgresIdempotencia: RepositorioIdempotenciaServidor = {
  async reivindicar(eventoId, tipo = 'payment', paymentId = null) {
    const agora = Date.now()
    const ganhou = await executarNoBanco((tx) =>
      reivindicarEvento(tx, GATEWAY, eventoId, tipo, paymentId ?? null, agora),
    )
    if (ganhou) {
      return {
        podeProcessar: true,
        registro: {
          id: `${GATEWAY}:${eventoId}`,
          eventoId,
          gateway: GATEWAY,
          tipo,
          processadoEm: agora,
          status: 'em_processamento',
        },
      }
    }
    const existente = await executarNoBanco((tx) => buscarEvento(tx, GATEWAY, eventoId))
    return {
      podeProcessar: false,
      registro: existente
        ? {
            id: `${GATEWAY}:${existente.eventoId}`,
            eventoId: existente.eventoId,
            gateway: GATEWAY,
            tipo: existente.tipo,
            processadoEm: existente.recebidoEm,
            status: existente.status,
            resultado: existente.resultado,
          }
        : undefined,
    }
  },

  async concluir(eventoId, resultado) {
    await executarNoBanco((tx) =>
      concluirEventoNoBanco(tx, GATEWAY, eventoId, resultado, Date.now()),
    )
  },

  /**
   * Falhar APAGA a linha, e isso é deliberado: o motivo mais comum de falha é
   * transitório (o gateway fora do ar na hora da consulta). Mantendo a linha, o
   * reenvio do Mercado Pago bateria no `ON CONFLICT` e seria descartado para
   * sempre — o depósito ficaria pago e não creditado, que é o pior desfecho
   * possível. Apagando, a retentativa do gateway tem chance de acertar.
   */
  async falhar(eventoId) {
    await executarNoBanco((tx) =>
      falharEventoNoBanco(tx, GATEWAY, eventoId, true, Date.now()),
    )
  },

  async verificar(eventoId) {
    const r = await executarNoBanco((tx) => buscarEvento(tx, GATEWAY, eventoId))
    return r !== null && (r.status === 'processado' || r.status === 'em_processamento')
  },
}

/** Adaptador em memória — para `npm run dev` sem banco e para a suíte. */
class MemoriaIdempotencia implements RepositorioIdempotenciaServidor {
  private mapa = new Map<string, RegistroIdempotencia>()

  async reivindicar(eventoId: string, tipo = 'payment') {
    const existente = this.mapa.get(eventoId)
    if (existente && existente.status !== 'falha') {
      return { podeProcessar: false, registro: existente }
    }
    const novo: RegistroIdempotencia = {
      id: `${GATEWAY}:${eventoId}`,
      eventoId,
      gateway: GATEWAY,
      tipo,
      processadoEm: Date.now(),
      status: 'em_processamento',
    }
    this.mapa.set(eventoId, novo)
    return { podeProcessar: true, registro: novo }
  }

  async concluir(eventoId: string, resultado?: unknown): Promise<void> {
    const reg = this.mapa.get(eventoId)
    if (reg) {
      reg.status = 'processado'
      reg.resultado = resultado
    }
  }

  async falhar(eventoId: string): Promise<void> {
    this.mapa.delete(eventoId)
  }

  async verificar(eventoId: string): Promise<boolean> {
    const reg = this.mapa.get(eventoId)
    return reg !== undefined && reg.status !== 'falha'
  }

  limpar(): void {
    this.mapa.clear()
  }
}

const memoriaIdempotencia = new MemoriaIdempotencia()

export function repositorioIdempotencia(): RepositorioIdempotenciaServidor {
  return bancoConfigurado() ? postgresIdempotencia : memoriaIdempotencia
}

/* ------------------------------------------------------------------ *
 * Intenções de depósito                                               *
 * ------------------------------------------------------------------ */

export interface RepositorioIntencoes {
  criar(intencao: IntencaoDeposito): Promise<void>
  buscar(externalReference: string): Promise<IntencaoDeposito | null>
  anotarPagamento(externalReference: string, paymentId: string): Promise<void>
  /** Devolve a intenção SÓ para o primeiro que a reivindicar. */
  reivindicar(externalReference: string): Promise<IntencaoDeposito | null>
  concluir(externalReference: string, paymentId: string | null): Promise<void>
  recusar(externalReference: string, motivo: string): Promise<void>
  devolverParaPendente(externalReference: string): Promise<void>
}

const postgresIntencoes: RepositorioIntencoes = {
  criar: (i) => executarNoBanco((tx) => inserirIntencao(tx, i)),
  buscar: (ref) => executarNoBanco((tx) => buscarIntencao(tx, ref)),
  anotarPagamento: (ref, paymentId) =>
    executarNoBanco((tx) => anotarPagamentoNaIntencao(tx, ref, paymentId, Date.now())),
  reivindicar: (ref) => executarNoBanco((tx) => reivindicarIntencao(tx, ref, Date.now())),
  concluir: (ref, paymentId) =>
    executarNoBanco((tx) => concluirIntencao(tx, ref, paymentId, Date.now())),
  recusar: (ref, motivo) => executarNoBanco((tx) => recusarIntencao(tx, ref, motivo, Date.now())),
  devolverParaPendente: (ref) =>
    executarNoBanco((tx) => devolverIntencaoParaPendente(tx, ref, Date.now())),
}

class MemoriaIntencoes implements RepositorioIntencoes {
  private mapa = new Map<string, IntencaoDeposito>()

  async criar(i: IntencaoDeposito): Promise<void> {
    this.mapa.set(i.externalReference, { ...i })
  }

  async buscar(ref: string): Promise<IntencaoDeposito | null> {
    const i = this.mapa.get(ref)
    return i ? { ...i } : null
  }

  async anotarPagamento(ref: string, paymentId: string): Promise<void> {
    const i = this.mapa.get(ref)
    if (i) {
      i.paymentId = paymentId
      i.updatedAt = Date.now()
    }
  }

  async reivindicar(ref: string): Promise<IntencaoDeposito | null> {
    const i = this.mapa.get(ref)
    if (!i || i.status !== 'pendente') return null
    i.status = 'creditando'
    i.updatedAt = Date.now()
    return { ...i }
  }

  async concluir(ref: string, paymentId: string | null): Promise<void> {
    const i = this.mapa.get(ref)
    if (i) {
      i.status = 'creditado'
      i.paymentId = paymentId ?? i.paymentId
      i.updatedAt = Date.now()
    }
  }

  async recusar(ref: string, motivo: string): Promise<void> {
    const i = this.mapa.get(ref)
    if (i) {
      i.status = 'recusado'
      i.motivoRecusa = motivo
      i.updatedAt = Date.now()
    }
  }

  async devolverParaPendente(ref: string): Promise<void> {
    const i = this.mapa.get(ref)
    if (i && i.status === 'creditando') {
      i.status = 'pendente'
      i.updatedAt = Date.now()
    }
  }

  limpar(): void {
    this.mapa.clear()
  }
}

const memoriaIntencoes = new MemoriaIntencoes()

export function repositorioIntencoes(): RepositorioIntencoes {
  return bancoConfigurado() ? postgresIntencoes : memoriaIntencoes
}

/** Usado só pela suíte, para que um teste não enxergue o estado do anterior. */
export function _limparRepositoriosEmMemoria(): void {
  memoriaIdempotencia.limpar()
  memoriaIntencoes.limpar()
}

export type { IntencaoDeposito }

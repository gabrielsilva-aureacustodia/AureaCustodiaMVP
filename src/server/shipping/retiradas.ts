/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Persistência e consulta de retiradas físicas de moedas (frente C).
 * Escolhe onde as retiradas vivem: no Postgres (quando há bancoConfigurado()),
 * ou em memória (para desenvolvimento local sem banco ou testes).
 * ==========================================================================*/

import 'server-only'

import type { Retirada } from '@/domain/types'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  atualizarRetirada as atualizarRetiradaDb,
  buscarRetiradaPorCoinId as buscarRetiradaPorCoinIdDb,
  buscarRetiradaPorId as buscarRetiradaPorIdDb,
  buscarRetiradasPorUsuario as buscarRetiradasPorUsuarioDb,
  inserirRetirada as inserirRetiradaDb,
  listarTodasRetiradas as listarTodasRetiradasDb,
} from '@/server/db/repositories/retiradas'

export interface RepositorioRetiradasServidor {
  criar(retirada: Retirada): Promise<void>
  atualizar(retirada: Retirada): Promise<void>
  buscarPorId(id: string): Promise<Retirada | null>
  buscarPorUsuario(email: string): Promise<Retirada[]>
  buscarPorCoinId(coinId: string): Promise<Retirada | null>
  listarTodas(): Promise<Retirada[]>
}

/**
 * Adaptador Postgres — grava e consulta na tabela `aurea.retiradas`.
 */
const postgresRetiradas: RepositorioRetiradasServidor = {
  async criar(r: Retirada): Promise<void> {
    await executarNoBanco((tx) => inserirRetiradaDb(tx, r))
  },

  async atualizar(r: Retirada): Promise<void> {
    await executarNoBanco((tx) => atualizarRetiradaDb(tx, r))
  },

  async buscarPorId(id: string): Promise<Retirada | null> {
    return executarNoBanco((tx) => buscarRetiradaPorIdDb(tx, id))
  },

  async buscarPorUsuario(email: string): Promise<Retirada[]> {
    return executarNoBanco((tx) => buscarRetiradasPorUsuarioDb(tx, email))
  },

  async buscarPorCoinId(coinId: string): Promise<Retirada | null> {
    return executarNoBanco((tx) => buscarRetiradaPorCoinIdDb(tx, coinId))
  },

  async listarTodas(): Promise<Retirada[]> {
    return executarNoBanco((tx) => listarTodasRetiradasDb(tx))
  },
}

/**
 * Adaptador em memória — para dev e testes sem banco.
 */
class RepositorioRetiradasMemoria implements RepositorioRetiradasServidor {
  private itens = new Map<string, Retirada>()

  async criar(r: Retirada): Promise<void> {
    this.itens.set(r.id, structuredClone(r))
  }

  async atualizar(r: Retirada): Promise<void> {
    this.itens.set(r.id, structuredClone(r))
  }

  async buscarPorId(id: string): Promise<Retirada | null> {
    const item = this.itens.get(id)
    return item ? structuredClone(item) : null
  }

  async buscarPorUsuario(email: string): Promise<Retirada[]> {
    return Array.from(this.itens.values())
      .filter((r) => r.userEmail === email)
      .sort((a, b) => (b.createdAt ?? b.solicitadoEm) - (a.createdAt ?? a.solicitadoEm))
      .map((r) => structuredClone(r))
  }

  async buscarPorCoinId(coinId: string): Promise<Retirada | null> {
    const todos = Array.from(this.itens.values())
      .filter((r) => r.coinId === coinId)
      .sort((a, b) => (b.createdAt ?? b.solicitadoEm) - (a.createdAt ?? a.solicitadoEm))
    return todos.length ? structuredClone(todos[0]) : null
  }

  async listarTodas(): Promise<Retirada[]> {
    return Array.from(this.itens.values())
      .sort((a, b) => (b.createdAt ?? b.solicitadoEm) - (a.createdAt ?? a.solicitadoEm))
      .map((r) => structuredClone(r))
  }

  limpar(): void {
    this.itens.clear()
  }
}

const memoriaRetiradas = new RepositorioRetiradasMemoria()

export function repositorioRetiradas(): RepositorioRetiradasServidor {
  return bancoConfigurado() ? postgresRetiradas : memoriaRetiradas
}

/** Exportado para testes unitários resetarem a memória se necessário. */
export function _limparRetiradasMemoriaParaTestes(): void {
  memoriaRetiradas.limpar()
}

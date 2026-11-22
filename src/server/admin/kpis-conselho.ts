/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Carrega os 5 KPIs prioritários do conselho (T5, 22/11/2026). Fica num arquivo à parte de
 * `resultados.ts` de propósito: aquele estava com edições em andamento de outra frente, e
 * esta leitura não depende de nada dele. As páginas chamam DEPOIS de conferir `resultados.ver`.
 *
 * Cada leitura do banco falha sozinha (vira `null` naquele número) — a tela diz por quê em
 * vez de cair, como em `carregarAquisicao`.
 * ==========================================================================*/

import 'server-only'

import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import { ehEmailProtegido, emailsDaLista, normalizarEmail } from '@/domain/admin/permissoes'
import { diaDeBrasilia } from '@/domain/financeiro/controle'
import { janelaDoPeriodo, montarKpisDoConselho, type EventoDaFilaKpi, type KpisConselho } from '@/domain/kpis'
import type { AppState } from '@/domain/types'
import { carregarConfiguracaoDoSite } from '@/server/config/carregar'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { datasDeCriacao } from '@/server/db/repositories/admin-usuarios'
import { listarGastos } from '@/server/db/repositories/marketing'
import { lerHistoricoDaFila } from '@/server/db/repositories/painel-leituras'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

const DIA_MS = 24 * 60 * 60 * 1000

export interface DadosConselho {
  kpis: KpisConselho
  semBanco: boolean
  /** O período em dias de Brasília, para a tela escrever. */
  de: string
  ate: string
  hoje: string
}

/** Mesma regra de `carregarAquisicao`: equipe e contas de teste não são cliente captado. */
function contasQueNaoSaoCliente(state: AppState): Set<string> {
  const doAmbiente = new Set(emailsDaLista(process.env.AUREA_ADMIN_EMAILS) ?? [])
  return new Set(Object.keys(state.users).filter((email) => ehEmailProtegido(email) || doAmbiente.has(normalizarEmail(email))))
}

export async function carregarKpisDoConselho(p: PeriodoEscolhido, agora: number = Date.now()): Promise<DadosConselho> {
  const [state, retiradas, config] = await Promise.all([getState(), repositorioRetiradas().listarTodas(), carregarConfiguracaoDoSite()])
  const periodo = janelaDoPeriodo(p, p.periodo.rotulo)
  const base = {
    state,
    retiradas,
    periodo,
    agora,
    ignorar: contasQueNaoSaoCliente(state),
    custodiaMensalPorMoedaCents: config.taxas.custodiaMensalPorMoeda,
  }
  const hoje = diaDeBrasilia(agora)

  if (!bancoConfigurado()) {
    return { kpis: montarKpisDoConselho({ ...base, criadasEm: null, gastos: null, historicoDaFila: null }), semBanco: true, de: periodo.de, ate: periodo.ate, hoje }
  }

  const [criadasEm, gastos, historico] = await Promise.all([
    executarNoBanco((tx) => datasDeCriacao(tx), { somenteLeitura: true }).catch((err: unknown) => {
      console.error('[admin] conselho: falha ao ler as datas de cadastro:', err)
      return null
    }),
    executarNoBanco((tx) => listarGastos(tx, 1000), { somenteLeitura: true }).catch((err: unknown) => {
      // 42P01 = a tabela do gasto (migration 057) ainda não existe: o CAC fica "—".
      if ((err as { code?: string } | null)?.code !== '42P01') console.error('[admin] conselho: falha ao ler o gasto de marketing:', err)
      return null
    }),
    // A publicação pode ter sido antes do período: lê mais de um ano para trás.
    executarNoBanco((tx) => lerHistoricoDaFila(tx, Date.now() - 400 * DIA_MS, agora + DIA_MS, 100_000), { somenteLeitura: true }).catch((err: unknown) => {
      console.error('[admin] conselho: falha ao ler o histórico da fila:', err)
      return null
    }),
  ])

  return {
    kpis: montarKpisDoConselho({
      ...base,
      criadasEm,
      gastos: gastos ? gastos.filter((g) => g.canceladoEm === null) : null,
      historicoDaFila: (historico as EventoDaFilaKpi[] | null) ?? null,
    }),
    semBanco: false,
    de: periodo.de,
    ate: periodo.ate,
    hoje,
  }
}

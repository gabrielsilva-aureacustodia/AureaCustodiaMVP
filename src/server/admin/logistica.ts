/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Lê envios, retiradas e o último retrato do rastreio dos Correios para a tela
 * de logística. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import {
  filtrarEnvios,
  filtrarRetiradas,
  linhaDeEnvio,
  linhaDeRetirada,
  type FiltroLogistica,
  type LinhaEnvio,
  type LinhaRetirada,
  type PrazosLogistica,
} from '@/domain/admin/logistica'
import type { Retirada } from '@/domain/types'
import type { RastreioGravado } from '@/server/db/repositories/rastreios'
import { rastreiosPorProtocolo } from '@/server/shipping/rastreios'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

/**
 * A logística de todas as contas (plano do Admin, 3.6).
 *
 * A TELA NUNCA CONSULTA OS CORREIOS. O rastreio é o último retrato gravado em `aurea.rastreios`
 * pelo job agendado — os mesmos eventos que o cliente vê. Consultar por visita esbarra no limite
 * da API e deixa a tela lenta (regra do M6).
 *
 * Retirada e rastreio podem faltar sem derrubar a tela: cada um vira um aviso.
 */

export const LIMITE_LINHAS = 300

export interface ContagemLogistica {
  enviosAbertos: number
  enviosAtrasados: number
  retiradasAbertas: number
  retiradasAtrasadas: number
}

export interface DadosDaLogistica {
  envios: LinhaEnvio[]
  retiradas: LinhaRetirada[]
  rastreios: Record<string, RastreioGravado>
  contagem: ContagemLogistica
  retiradasIndisponiveis: boolean
  rastreiosIndisponiveis: boolean
  agora: number
}

export async function carregarLogistica(filtro: FiltroLogistica, prazos: PrazosLogistica, agora: number = Date.now()): Promise<DadosDaLogistica> {
  const [state, retiradas, rastreios] = await Promise.all([
    getState(),
    repositorioRetiradas()
      .listarTodas()
      .then((r) => ({ r, falhou: false }))
      .catch((err: unknown) => {
        console.error('[admin] retiradas indisponíveis na logística:', err)
        return { r: [] as Retirada[], falhou: true }
      }),
    rastreiosPorProtocolo()
      .then((r) => ({ r, falhou: false }))
      .catch((err: unknown) => {
        console.error('[admin] rastreios indisponíveis na logística:', err)
        return { r: {} as Record<string, RastreioGravado>, falhou: true }
      }),
  ])

  const nome = (email: string): string => state.users[email]?.name ?? email
  const envios = state.envios.map((e) => linhaDeEnvio(e, nome(e.userEmail), agora, prazos))
  const linhasRetirada = retiradas.r.map((r) => linhaDeRetirada(r, nome(r.userEmail), agora))

  const enviosFiltrados = filtrarEnvios(envios, filtro).slice(0, LIMITE_LINHAS)
  const retiradasFiltradas = filtrarRetiradas(linhasRetirada, filtro).slice(0, LIMITE_LINHAS)
  const visiveis = new Set([...enviosFiltrados.map((e) => e.protocolo), ...retiradasFiltradas.map((r) => r.id)])

  return {
    envios: enviosFiltrados,
    retiradas: retiradasFiltradas,
    rastreios: Object.fromEntries(Object.entries(rastreios.r).filter(([protocolo]) => visiveis.has(protocolo))),
    contagem: {
      enviosAbertos: envios.filter((e) => e.aberto).length,
      enviosAtrasados: envios.filter((e) => e.atrasado).length,
      retiradasAbertas: linhasRetirada.filter((r) => r.aberta).length,
      retiradasAtrasadas: linhasRetirada.filter((r) => r.atrasada).length,
    },
    retiradasIndisponiveis: retiradas.falhou,
    rastreiosIndisponiveis: rastreios.falhou,
    agora,
  }
}

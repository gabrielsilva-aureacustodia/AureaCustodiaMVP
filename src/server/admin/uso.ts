/**
 * O registro de uso no banco: gravar o lote que o navegador mandou e carregar o que a
 * tela de Uso mostra (plano do Admin, seções 1.5 e 1.6).
 *
 * Parametrizado pelo `Executor`, sem `server-only` — o mesmo desenho de `rbac.ts`, e
 * pelo mesmo motivo: a suíte roda este código contra o Postgres embutido.
 *
 * LIMITES DE LEITURA. A tela agrega em memória, e o registro cresce a cada troca de
 * página. Os tetos abaixo mantêm a tela de pé com meses de dado; quando um deles é
 * atingido, a tela diz isso em vez de mostrar um número incompleto como se fosse o
 * total (RA-41).
 */

import { resumirUso, type LoteValidado, type ResumoUso } from '@/domain/admin/uso'
import type { EntradaAuditoriaGravada } from '@/server/db/repositories/auditoria'
import { inserirEventos, listarEventos } from '@/server/db/repositories/eventos-uso'
import { listarAcoesDaTrilha, listarTrilhaDoPainel, type FiltroTrilha } from '@/server/db/repositories/painel-leituras'
import type { Executor } from '@/server/db/sql'

export const LIMITE_EVENTOS = 50_000
export const LIMITE_ACOES_TRILHA = 20_000
export const LIMITE_TRILHA_NA_TELA = 300

export async function gravarEventosDeUso(
  executar: Executor,
  userEmail: string,
  lote: LoteValidado,
  plataforma: string,
): Promise<number> {
  if (!lote.eventos.length) return 0
  await executar((tx) => inserirEventos(tx, { userEmail: userEmail.trim().toLowerCase(), sessao: lote.sessao, plataforma }, lote.eventos))
  return lote.eventos.length
}

export interface DadosDeUso {
  resumo: ResumoUso
  /** A trilha filtrada da tela; `null` quando o membro não tem `admin.auditoria`. */
  trilha: EntradaAuditoriaGravada[] | null
  eventosNoLimite: boolean
  trilhaNoLimite: boolean
}

export async function carregarUsoNoBanco(
  executar: Executor,
  entrada: {
    de: number
    ate: number
    primeirasVendas: Readonly<Record<string, number>>
    /** `null` = não carregar a trilha (o membro não tem permissão para vê-la). */
    filtroTrilha: Omit<FiltroTrilha, 'limite'> | null
  },
): Promise<DadosDeUso> {
  const { eventos, acoes, trilha } = await executar(
    async (tx) => ({
      eventos: await listarEventos(tx, { de: entrada.de, ate: entrada.ate, limite: LIMITE_EVENTOS }),
      acoes: await listarAcoesDaTrilha(tx, entrada.de, entrada.ate, LIMITE_ACOES_TRILHA),
      trilha: entrada.filtroTrilha ? await listarTrilhaDoPainel(tx, { ...entrada.filtroTrilha, limite: LIMITE_TRILHA_NA_TELA }) : null,
    }),
    { somenteLeitura: true },
  )
  return {
    resumo: resumirUso({ eventos, trilha: acoes, primeirasVendas: entrada.primeirasVendas }),
    trilha,
    eventosNoLimite: eventos.length >= LIMITE_EVENTOS || acoes.length >= LIMITE_ACOES_TRILHA,
    trilhaNoLimite: trilha !== null && trilha.length >= LIMITE_TRILHA_NA_TELA,
  }
}

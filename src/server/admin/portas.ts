/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Liga os serviços testáveis do painel (cs.ts, usuarios.ts) ao mundo real: o
 * banco de verdade, o estado da aplicação, o Supabase Auth e o provedor de
 * WhatsApp. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { getState, mutateState } from '@/server/state'

import { portaDeEstadoNoBanco, type PortaDeEstado } from './usuarios'

export { portaDeIdentidadeDoAmbiente } from './identidade'
export { provedorDoAmbiente } from '@/lib/mensageria'

/**
 * O AppState como os serviços do painel o enxergam. Com banco, a mutação e a linha
 * `admin.<area>.<verbo>` vão na mesma transação (`portaDeEstadoNoBanco`). Sem banco, é o
 * `mutateState` de sempre, sobre a memória — e não existe trilha para gravar.
 */
export function portaDeEstadoDoServidor(ator: string): PortaDeEstado {
  if (bancoConfigurado()) return portaDeEstadoNoBanco(executarNoBanco, ator)
  return {
    ler: getState,
    mutarComTrilha: async (fn) => (await mutateState(fn)).result,
  }
}

/** O executor das tabelas próprias do painel, ou `null` num ambiente sem banco. */
export function executorOuNulo(): typeof executarNoBanco | null {
  return bancoConfigurado() ? executarNoBanco : null
}

/**
 * Tabela ainda não migrada: o Postgres responde 42P01 ("relation does not exist"). É o que
 * acontece entre o deploy da C2 e o `npm run db:migrate` — e merece uma frase que diga o
 * que fazer, não a mensagem genérica de falha.
 */
export function ehTabelaAusente(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: unknown }).code === '42P01')
}

export const TABELA_AUSENTE = 'O banco ainda não tem as tabelas do atendimento e das notas (migrations 022 e 023). Rode npm run db:migrate.'

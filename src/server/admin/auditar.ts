/**
 * A trilha das ações do painel — `admin.<area>.<verbo>` em `aurea.audit_log`.
 *
 * POR QUE UM HELPER NOVO. A auditoria que existe desde a migration 003 só sabe gravar
 * DENTRO de `mutateState()`: ela é derivada do diff do `AppState` (derivar.ts). A
 * maioria das ações do painel não toca o `AppState` — dar acesso a um membro, trocar
 * uma alíquota, lançar uma despesa —, então sem este arquivo elas não deixariam rastro.
 *
 * A REGRA: toda Server Action de src/server/actions/admin/ grava uma linha com
 * `ator` = e-mail do membro e `acao` = `admin.<area>.<verbo>`, NA MESMA TRANSAÇÃO da
 * escrita que ela descreve. Ou as duas commitam, ou nenhuma — uma trilha que registra
 * o que não aconteceu é tão ruim quanto uma que esquece o que aconteceu.
 *
 * Append-only, como toda a trilha: este arquivo só chama `registrarAuditoria`.
 *
 * Sem `server-only`: recebe a `Consulta` pronta, não abre conexão nem lê ambiente — e
 * por isso roda na suíte contra o Postgres embutido.
 */

import { registrarAuditoria } from '@/server/db/repositories/auditoria'
import type { Consulta } from '@/server/db/sql'

export interface AcaoAdmin {
  /** E-mail do membro que agiu. */
  ator: string
  /** A área do painel: 'membros', 'papeis', 'contabil', 'resultados', 'acesso'… */
  area: string
  /** O gesto: 'adicionar', 'alterar', 'lancar', 'estornar'… */
  verbo: string
  entidade?: string | null
  entidadeId?: string | null
  usuariosAfetados?: readonly string[]
  detalhes?: Record<string, unknown>
  agora?: number
}

const PEDACO = /^[a-z][a-z0-9_]*$/

/**
 * Monta o nome da ação e recusa um formato fora do padrão. É erro de programação,
 * não de usuário — por isso lança: a trilha inteira é filtrada por prefixo
 * (`admin.`), e uma ação com espaço ou maiúscula sumiria do filtro.
 */
export function nomeDaAcaoAdmin(area: string, verbo: string): string {
  if (!PEDACO.test(area) || !PEDACO.test(verbo)) {
    throw new Error(`Ação de auditoria fora do padrão admin.<area>.<verbo>: "${area}.${verbo}"`)
  }
  return `admin.${area}.${verbo}`
}

export async function registrarAcaoAdmin(tx: Consulta, a: AcaoAdmin): Promise<void> {
  await registrarAuditoria(tx, {
    createdAt: a.agora ?? Date.now(),
    ator: a.ator,
    acao: nomeDaAcaoAdmin(a.area, a.verbo),
    entidade: a.entidade ?? null,
    entidadeId: a.entidadeId ?? null,
    usuariosAfetados: [...(a.usuariosAfetados ?? [])],
    detalhes: a.detalhes ?? {},
  })
}

/**
 * /admin/resultados/kpis — os indicadores do negócio (src/domain/kpis.ts).
 *
 * Server Component: confere `resultados.ver` antes de carregar o estado.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { Indicadores } from '@/components/admin/resultados/Indicadores'
import { lerPeriodo, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarKpis } from '@/server/admin/resultados'

export const dynamic = 'force-dynamic'

export default async function KpisPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'resultados.ver')) return <SemPermissao permissoes={['resultados.ver']} />

  const periodo = lerPeriodo(await searchParams, Date.now())
  const { kpis, semBanco } = await carregarKpis(periodo)
  return <Indicadores kpis={kpis} periodo={periodo} semBanco={semBanco} />
}

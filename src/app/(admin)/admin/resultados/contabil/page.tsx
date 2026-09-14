/**
 * /admin/resultados/contabil — plano de contas, lançamentos manuais, alíquotas e o
 * registro de exportações.
 *
 * Server Component: confere `resultados.ver` antes de carregar; os gestos de escrita
 * pedem cada um a sua permissão nas Server Actions (src/server/actions/admin/contabil.ts).
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { Contabil, type AbaContabil } from '@/components/admin/resultados/Contabil'
import { lerPeriodo, primeiroValor, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarContabil } from '@/server/admin/resultados'

export const dynamic = 'force-dynamic'

const ABAS: readonly AbaContabil[] = ['lancamentos', 'aliquotas', 'contas', 'exportacoes']

export default async function ContabilPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'resultados.ver')) return <SemPermissao permissoes={['resultados.ver']} />

  const params = await searchParams
  const pedida = primeiroValor(params.aba)
  const aba = (ABAS as readonly string[]).includes(pedida ?? '') ? (pedida as AbaContabil) : 'lancamentos'
  const dados = await carregarContabil()
  return <Contabil aba={aba} periodo={lerPeriodo(params, Date.now())} {...dados} />
}

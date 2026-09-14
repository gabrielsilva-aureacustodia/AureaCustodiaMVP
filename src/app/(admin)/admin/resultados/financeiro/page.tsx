/**
 * /admin/resultados/financeiro — DRE do período, receita por linha, comissões,
 * custódia faturada, saques pagos, depósitos e o fluxo mês a mês.
 *
 * Server Component: confere `resultados.ver` no servidor ANTES de carregar qualquer
 * número (layout e página renderizam em paralelo; não dá para contar com o layout). O
 * período vem da URL (`?ano=&mes=&trimestre=`), com a mesma regra das rotas de
 * exportação. `/relatorios` redireciona para cá desde a C1.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { Financeiro } from '@/components/admin/resultados/Financeiro'
import { lerPeriodo, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarFinanceiro } from '@/server/admin/resultados'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'resultados.ver')) return <SemPermissao permissoes={['resultados.ver']} />

  const periodo = lerPeriodo(await searchParams, Date.now())
  const dados = await carregarFinanceiro(periodo)
  return <Financeiro dados={dados} periodo={periodo} podeExportar={temPermissao(membro, 'resultados.exportar')} />
}

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
import { SecaoDeSaques } from '@/components/admin/saques/SecaoDeSaques'
import { Financeiro } from '@/components/admin/resultados/Financeiro'
import { lerPeriodo, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarFinanceiro } from '@/server/admin/resultados'
import { carregarFilaDeSaques } from '@/server/admin/saques'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'resultados.ver')) return <SemPermissao permissoes={['resultados.ver']} />

  const periodo = lerPeriodo(await searchParams, Date.now())
  const dados = await carregarFinanceiro(periodo)
  // Os saques esperando ficam no topo do Financeiro: dinheiro de cliente parado é a primeira coisa a ver.
  const saques = temPermissao(membro, 'saques.ver') ? await carregarFilaDeSaques({ historico: 5 }) : null
  return (
    <>
      {/* Rodada 2: a fila aparece aqui só quando há pedido esperando, na versão compacta (a fila
          inteira, com os resolvidos, mora em /admin/saques). */}
      {saques && saques.resumo.quantidade > 0 ? <SecaoDeSaques dados={saques} podePagar={temPermissao(membro, 'saques.pagar')} compacto /> : null}
      <Financeiro dados={dados} periodo={periodo} podeExportar={temPermissao(membro, 'resultados.exportar')} />
    </>
  )
}

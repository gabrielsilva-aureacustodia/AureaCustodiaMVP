/**
 * 4.0 RELATÓRIOS E CONTABILIDADE — tela NOVA (módulos M4 e M7). Não há
 * equivalente no monolito: lá não existia ledger, DRE nem trilha.
 *
 * SERVER COMPONENT DE PROPÓSITO, ao contrário de quase toda tela de (app):
 * a decisão "esta pessoa pode ver a DRE da empresa?" é tomada aqui, no
 * servidor, ANTES de qualquer HTML sair. Quem não é administrador volta para
 * o painel — sem piscar a tela restrita. A regra é `ehAdmin`, a mesma que as
 * rotas de API e as Server Actions aplicam de novo por conta própria.
 *
 * O conteúdo em si é o Client Component `RelatoriosPainel`: ele busca os
 * relatórios por `/api/relatorios/<nome>` (JSON) conforme o período e a aba,
 * e escreve pelas Server Actions de `@/server/actions/contabil`. O estado
 * financeiro NÃO vem do AppProvider — o ledger não está no AppState.
 *
 * O título ('Relatórios e contabilidade') é montado pela Topbar a partir da
 * rota, como em todas as telas deste port.
 */

import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { RelatoriosPainel } from '@/components/relatorios/RelatoriosPainel'
import { bancoConfigurado } from '@/server/db/client'
import { ehAdmin } from '@/server/relatorios/acesso'
import { configuracaoSheets } from '@/server/relatorios/sheets'
import { getSessionEmail } from '@/server/session'

export const dynamic = 'force-dynamic'

export default async function RelatoriosPage(): Promise<ReactNode> {
  const session = await getSessionEmail()
  if (!session || !ehAdmin(session)) redirect('/inicio')

  const { faltando } = configuracaoSheets()
  const tokenConfigurado = (process.env.AUREA_RELATORIOS_TOKEN?.length ?? 0) >= 16

  return (
    <RelatoriosPainel
      semBanco={!bancoConfigurado()}
      sheetsFaltando={faltando}
      tokenConfigurado={tokenConfigurado}
    />
  )
}

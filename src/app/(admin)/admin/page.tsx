/**
 * /admin — o painel inicial, composto pela variante do papel (gestão, operacional ou
 * desenvolvimento) e filtrado pelas permissões do membro.
 *
 * Server Component: decide no servidor o que carregar. Um membro só com `bancada.*` não
 * dispara leitura da DRE; um sócio sem `admin.auditoria` não lê a trilha.
 */

import type { ReactNode } from 'react'

import { PainelInicial } from '@/components/admin/inicio/PainelInicial'
import { TODOS_ITENS, permiteItem } from '@/components/admin/navegacao'
import { temAlguma, temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarPainelInicial } from '@/server/admin/resultados'

export const dynamic = 'force-dynamic'

export default async function AdminInicioPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  const dados = await carregarPainelInicial(
    {
      resultados: temPermissao(membro, 'resultados.ver'),
      operacao: temAlguma(membro, ['bancada.ver', 'logistica.ver']),
      sistema: membro.papel.variantePainel === 'desenvolvimento',
      auditoria: temPermissao(membro, 'admin.auditoria'),
    },
    Date.now(),
  )
  const atalhos = TODOS_ITENS.filter((i) => i.href !== '/admin' && permiteItem(i, membro.permissoes))
  return <PainelInicial membro={membro} dados={dados} atalhos={atalhos} />
}

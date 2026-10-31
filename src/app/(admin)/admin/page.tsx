/**
 * /admin — o painel inicial, composto pela variante do papel (gestão, operacional ou
 * desenvolvimento) e filtrado pelas permissões do membro.
 *
 * Server Component: decide no servidor o que carregar. Um membro só com `bancada.*` não
 * dispara leitura da DRE; um sócio sem `admin.auditoria` não lê a trilha.
 */

import type { ReactNode } from 'react'

import { PainelInicial } from '@/components/admin/inicio/PainelInicial'
import { TODOS_ITENS, permiteItem, tituloDaPagina } from '@/components/admin/navegacao'
import { temAlguma, temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarPainelInicial } from '@/server/admin/resultados'
import { carregarFilaDeSaques } from '@/server/admin/saques'
import type { Metadata } from 'next'

// A raiz do painel é irmã do layout, e o `title.template` só vale para as páginas filhas: o sufixo vai à mão.
export const metadata: Metadata = { title: { absolute: `${tituloDaPagina('/admin')} — Painel Real Olímpico` } }

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
  // Saque esperando é dinheiro de cliente parado: sobe como alerta no topo, em qualquer variante do painel.
  const saques = temPermissao(membro, 'saques.ver') ? await carregarFilaDeSaques().catch(() => null) : null
  const atalhos = TODOS_ITENS.filter((i) => i.href !== '/admin' && permiteItem(i, membro.permissoes))
  return <PainelInicial membro={membro} dados={dados} atalhos={atalhos} saques={saques} podePagarSaques={temPermissao(membro, 'saques.pagar')} />
}

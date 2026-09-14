/**
 * /admin/cs — atendimento com mensageria de WhatsApp. ENTRA NA C2.
 *
 * A página existe desde a C1 porque o menu do painel nasceu completo (plano do Admin,
 * seção 1.4): a C2 substitui este arquivo pela tela de verdade, sem tocar no menu.
 * Mesmo provisória, confere a permissão no servidor.
 */

import type { ReactNode } from 'react'

import { AreaEmConstrucao, SemPermissao } from '@/components/admin/Blocos'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'

export const dynamic = 'force-dynamic'

export default async function CsPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'cs.ver')) return <SemPermissao permissoes={['cs.ver']} />
  return (
    <AreaEmConstrucao
      etapa="C2"
      oQueVem={[
        'Caixa de conversas do WhatsApp, com filtro por situação, responsável e etiqueta.',
        'Cada conversa com estado de entrega das mensagens, notas internas e etiquetas.',
        'A ficha do cliente ao lado: saldo, moedas, envios, faturas e retiradas.',
      ]}
    />
  )
}

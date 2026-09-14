/**
 * /admin/logistica — Correios, envios, retiradas e recibos. ENTRA NA C3.
 *
 * Provisória desde a C1, para o menu nascer completo; a C3 substitui este arquivo.
 * Mesmo provisória, confere a permissão no servidor.
 */

import type { ReactNode } from 'react'

import { AreaEmConstrucao, SemPermissao } from '@/components/admin/Blocos'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'

export const dynamic = 'force-dynamic'

export default async function LogisticaPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'logistica.ver')) return <SemPermissao permissoes={['logistica.ver']} />
  return (
    <AreaEmConstrucao
      etapa="C3"
      oQueVem={[
        'Envios e retiradas de todas as contas, com a etapa atual e os eventos de rastreio.',
        'Prazo estourado em destaque.',
        'Reimpressão de etiquetas e o recibo de qualquer conta.',
      ]}
    />
  )
}

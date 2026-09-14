/**
 * /admin/bancada — bancada de análise no navegador. ENTRA NA C3.
 *
 * Provisória desde a C1, para o menu nascer completo; a C3 substitui este arquivo.
 * Mesmo provisória, confere a permissão no servidor.
 */

import type { ReactNode } from 'react'

import { AreaEmConstrucao, SemPermissao } from '@/components/admin/Blocos'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'

export const dynamic = 'force-dynamic'

export default async function BancadaPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'bancada.ver')) return <SemPermissao permissoes={['bancada.ver']} />
  return (
    <AreaEmConstrucao
      etapa="C3"
      oQueVem={[
        'A fila de envios recebidos e em análise física.',
        'Câmera e gravação do procedimento direto no navegador.',
        'Peso, veredito, motivo de recusa, caixa e posição — gravados na mesma corrente de hashes da estação.',
      ]}
    />
  )
}

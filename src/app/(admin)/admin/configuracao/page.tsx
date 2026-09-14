/**
 * /admin/configuracao — taxas, catálogo e parâmetros do site. ENTRA NA C3.
 *
 * Provisória desde a C1, para o menu nascer completo; a C3 substitui este arquivo.
 * Mesmo provisória, confere a permissão no servidor.
 */

import type { ReactNode } from 'react'

import { AreaEmConstrucao, SemPermissao } from '@/components/admin/Blocos'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'

export const dynamic = 'force-dynamic'

export default async function ConfiguracaoPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'config.ver')) return <SemPermissao permissoes={['config.ver']} />
  return (
    <AreaEmConstrucao
      etapa="C3"
      oQueVem={[
        'Taxas e comissões com quem mudou, quando, e a simulação do efeito antes de salvar.',
        'O catálogo de moedas, com o interruptor de negociável.',
        'Parâmetros operacionais e o estado de cada integração externa.',
      ]}
    />
  )
}

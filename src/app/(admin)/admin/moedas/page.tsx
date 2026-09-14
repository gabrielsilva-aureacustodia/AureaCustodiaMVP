/**
 * /admin/moedas — auditoria do acervo. ENTRA NA C3.
 *
 * Provisória desde a C1, para o menu nascer completo; a C3 substitui este arquivo.
 * Mesmo provisória, confere a permissão no servidor.
 */

import type { ReactNode } from 'react'

import { AreaEmConstrucao, SemPermissao } from '@/components/admin/Blocos'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'

export const dynamic = 'force-dynamic'

export default async function MoedasPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'bancada.auditoria')) return <SemPermissao permissoes={['bancada.auditoria']} />
  return (
    <AreaEmConstrucao
      etapa="C3"
      oQueVem={[
        'Todas as moedas da plataforma, com código, tipo, dono, recibo, hash, caixa e posição.',
        'O laudo de origem de cada moeda, com peso, operador e vídeo da análise.',
        'O botão de verificar a corrente de hashes, com o ponto exato de qualquer divergência.',
      ]}
    />
  )
}

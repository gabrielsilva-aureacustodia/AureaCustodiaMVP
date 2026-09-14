/**
 * /admin/usuarios — administração de usuários. ENTRA NA C2.
 *
 * Provisória desde a C1, para o menu nascer completo; a C2 substitui este arquivo.
 * Mesmo provisória, confere a permissão no servidor.
 */

import type { ReactNode } from 'react'

import { AreaEmConstrucao, SemPermissao } from '@/components/admin/Blocos'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'usuarios.ver')) return <SemPermissao permissoes={['usuarios.ver']} />
  return (
    <AreaEmConstrucao
      etapa="C2"
      oQueVem={[
        'Lista de contas com busca por nome, e-mail ou CPF, e filtros por cadastro, inadimplência, saldo e moeda.',
        'A ficha completa de cada conta: cadastro, financeiro, acervo, logística, mercado, atividade e notas.',
        'Criar conta, editar cadastro, ajustar saldo, marcar inadimplência, redefinir senha, ativar e desativar.',
      ]}
    />
  )
}

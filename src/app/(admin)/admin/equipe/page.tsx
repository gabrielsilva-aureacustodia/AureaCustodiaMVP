/**
 * /admin/equipe — membros do painel e papéis com as permissões de cada um.
 *
 * Entra quem tem `admin.membros` OU `admin.papeis`; cada parte da tela liga os
 * controles pela sua permissão, e cada Server Action confere de novo.
 *
 * Sem banco, não há tabela: a tela mostra só quem entra pela lista do ambiente.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { PainelEquipe } from '@/components/admin/equipe/PainelEquipe'
import { PAPEIS_DE_SISTEMA, emailsDeBootstrap, temAlguma } from '@/domain/admin/permissoes'
import { ambienteAtual, membroDaPagina } from '@/server/admin/acesso'
import { carregarEquipe, type VisaoEquipe } from '@/server/admin/rbac'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

export const dynamic = 'force-dynamic'

/** Sem banco: os papéis de sistema do código, sem membro, e a lista do ambiente. */
function equipeSemBanco(): VisaoEquipe {
  const amb = ambienteAtual()
  return {
    papeis: PAPEIS_DE_SISTEMA.map((p, i) => ({
      id: i + 1,
      slug: p.slug,
      nome: p.nome,
      rank: p.rank,
      variantePainel: p.variantePainel,
      sistema: true,
      permissoes: [...p.permissoesIniciais],
      membros: 0,
    })),
    membros: [],
    bootstrap: emailsDeBootstrap(amb.listaDoAmbiente, amb.contasDoSeed).map((email) => ({ email, nome: amb.contasDoSeed[email]?.name ?? '', naTabela: false })),
  }
}

export default async function EquipePage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temAlguma(membro, ['admin.membros', 'admin.papeis'])) {
    return <SemPermissao permissoes={['admin.membros', 'admin.papeis']} />
  }

  if (!bancoConfigurado()) return <PainelEquipe equipe={equipeSemBanco()} semBanco />
  const equipe = await carregarEquipe(executarNoBanco, ambienteAtual())
  return <PainelEquipe equipe={equipe} semBanco={false} />
}

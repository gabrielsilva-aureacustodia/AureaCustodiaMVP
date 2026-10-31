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
import { ultimosConvites } from '@/server/admin/emails'
import { carregarEquipe, type VisaoEquipe } from '@/server/admin/rbac'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import type { ParametrosDaUrl } from '@/domain/admin/periodo'
import type { Metadata } from 'next'
import { tituloDaPagina } from '@/components/admin/navegacao'

export const metadata: Metadata = { title: tituloDaPagina('/admin/equipe') }

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

export default async function EquipePage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temAlguma(membro, ['admin.membros', 'admin.papeis'])) {
    return <SemPermissao permissoes={['admin.membros', 'admin.papeis']} />
  }

  const bruta = (await searchParams).aba
  const pedida = Array.isArray(bruta) ? bruta[0] : bruta
  // Sem aba na URL, quem só administra papéis cai direto na aba dele; as duas abas continuam abertas a quem entra aqui.
  const aba = pedida === 'papeis' || pedida === 'membros' ? pedida : temAlguma(membro, ['admin.membros']) ? 'membros' : 'papeis'

  if (!bancoConfigurado()) return <PainelEquipe equipe={equipeSemBanco()} semBanco aba={aba} />
  const equipe = await carregarEquipe(executarNoBanco, ambienteAtual())
  // Leitura opcional: o histórico de convites é só enfeite da lista, e não pode derrubar a tela.
  const convites = await executarNoBanco((tx) => ultimosConvites(tx), { somenteLeitura: true }).catch(() => ({}))
  return <PainelEquipe equipe={equipe} semBanco={false} convites={convites} aba={aba} />
}

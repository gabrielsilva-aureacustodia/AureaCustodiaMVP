/**
 * /admin/usuarios — a lista de contas, com busca e filtros, e a criação de conta pelo painel
 * (plano do Admin, seção 2.6).
 *
 * O filtro mora na URL e é um formulário GET: o link filtrado ("inadimplentes com saldo")
 * se manda para alguém, e a página refaz a consulta no servidor. Ver a lista pede
 * `usuarios.ver`; o formulário de criação só aparece com `usuarios.criar` — e a Server
 * Action confere de novo.
 */

import type { ReactNode } from 'react'

import { AvisoSemBanco, SemPermissao } from '@/components/admin/Blocos'
import { CriarUsuario } from '@/components/admin/usuarios/CriarUsuario'
import { FiltroDeUsuarios } from '@/components/admin/usuarios/FiltroDeUsuarios'
import { TabelaDeUsuarios } from '@/components/admin/usuarios/TabelaDeUsuarios'
import type { ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { lerFiltroUsuarios } from '@/domain/admin/usuarios'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarListaDeUsuarios } from '@/server/admin/ficha'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'usuarios.ver')) return <SemPermissao permissoes={['usuarios.ver']} />

  const filtro = lerFiltroUsuarios(await searchParams)
  const dados = await carregarListaDeUsuarios(filtro)

  return (
    <>
      {dados.semBanco ? (
        <AvisoSemBanco>A data de criação das contas vem do ledger: sem banco, o filtro de período não esconde ninguém.</AvisoSemBanco>
      ) : null}
      {temPermissao(membro, 'usuarios.criar') ? <CriarUsuario /> : null}
      <div className="panel">
        <h3>Contas</h3>
        <FiltroDeUsuarios filtro={filtro} />
        <TabelaDeUsuarios linhas={dados.linhas} total={dados.total} />
      </div>
    </>
  )
}

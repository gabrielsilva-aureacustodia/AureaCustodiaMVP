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
import { dinheiro, numero } from '@/components/admin/formatos'
import { Indicador, Secao } from '@/components/admin/Pecas'
import type { ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { lerFiltroUsuarios } from '@/domain/admin/usuarios'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarListaDeUsuarios } from '@/server/admin/ficha'
import type { Metadata } from 'next'
import { tituloDaPagina } from '@/components/admin/navegacao'

export const metadata: Metadata = { title: tituloDaPagina('/admin/usuarios') }

export const dynamic = 'force-dynamic'

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'usuarios.ver')) return <SemPermissao permissoes={['usuarios.ver']} />

  const filtro = lerFiltroUsuarios(await searchParams)
  const dados = await carregarListaDeUsuarios(filtro)
  const inadimplentes = dados.linhas.filter((l) => l.inadimplente).length
  const semCadastro = dados.linhas.filter((l) => !l.comCadastro).length
  const saldo = dados.linhas.reduce((t, l) => t + l.saldo, 0)

  return (
    <>
      {dados.semBanco ? (
        <AvisoSemBanco>A data de criação das contas vem do ledger: sem banco, o filtro de período não esconde ninguém.</AvisoSemBanco>
      ) : null}
      {/* Rodada 2 (25/10/2026): números da lista no topo, cada um abrindo o filtro que o explica;
          criar conta como bloco recolhível logo acima da lista. Mesmo filtro, mesma tabela. */}
      <div className="adm-inds">
        <Indicador rotulo="Contas" valor={numero(dados.total)} detalhe={dados.linhas.length === dados.total ? 'todas na lista' : `${numero(dados.linhas.length)} com o filtro atual`} />
        <Indicador
          rotulo="Inadimplentes"
          valor={numero(inadimplentes)}
          tom={inadimplentes ? 'alerta' : 'ok'}
          detalhe="na lista abaixo"
          href={inadimplentes && !filtro.inadimplente ? '/admin/usuarios?inadimplente=1' : undefined}
        />
        <Indicador rotulo="Cadastro incompleto" valor={numero(semCadastro)} tom={semCadastro ? 'atencao' : 'ok'} detalhe="na lista abaixo" href={semCadastro && filtro.cadastro !== 'sem' ? '/admin/usuarios?cadastro=sem' : undefined} />
        <Indicador rotulo="Saldo somado" valor={dinheiro(saldo)} tom="ouro" detalhe="das contas na lista" />
      </div>

      <Secao id="usuarios-lista" titulo="Contas" descricao="Clique no nome para abrir a ficha completa: cadastro, financeiro, acervo, mercado, logística, atividade e notas.">
        {temPermissao(membro, 'usuarios.criar') ? <CriarUsuario /> : null}
        <FiltroDeUsuarios filtro={filtro} />
        <TabelaDeUsuarios linhas={dados.linhas} total={dados.total} />
      </Secao>
    </>
  )
}

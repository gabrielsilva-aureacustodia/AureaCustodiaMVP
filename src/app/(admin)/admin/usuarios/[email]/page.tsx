/**
 * /admin/usuarios/[email] — a ficha completa de uma conta, em abas (plano do Admin, seção 2.6):
 * Cadastro, Financeiro, Acervo, Logística, Mercado, Atividade e Notas.
 *
 * A aba mora na URL (`?aba=`), e a página carrega SÓ a aba escolhida: a ficha lê de muitos
 * lugares (estado, ledger, trilha, Supabase Auth, tabelas de outras frentes), e abrir o
 * Cadastro não pode esperar o extrato inteiro.
 *
 * Ver pede `usuarios.ver`. As ações da conta aparecem com `usuarios.editar`, e os dados
 * bancários só saem do servidor com `usuarios.dados_bancarios` — quem decide é
 * src/server/admin/ficha.ts, antes de montar a resposta.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { AbaAcervo } from '@/components/admin/usuarios/AbaAcervo'
import { AbaAtividade } from '@/components/admin/usuarios/AbaAtividade'
import { AbaCadastro } from '@/components/admin/usuarios/AbaCadastro'
import { AbaFinanceiro } from '@/components/admin/usuarios/AbaFinanceiro'
import { AbaLogistica } from '@/components/admin/usuarios/AbaLogistica'
import { AbaMercado } from '@/components/admin/usuarios/AbaMercado'
import { AbaNotas } from '@/components/admin/usuarios/AbaNotas'
import { AcoesDaConta } from '@/components/admin/usuarios/AcoesDaConta'
import { CabecalhoDaFicha } from '@/components/admin/usuarios/CabecalhoDaFicha'
import { primeiroValor, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { normalizarEmail, temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { ABAS_FICHA, carregarFicha, lerAba } from '@/server/admin/ficha'

export const dynamic = 'force-dynamic'

/** O e-mail chega codificado na URL ('%40'); decodificar duas vezes não estraga um e-mail sem '%'. */
function emailDaRota(bruto: string): string {
  try {
    return normalizarEmail(decodeURIComponent(bruto))
  } catch {
    return normalizarEmail(bruto)
  }
}

export default async function FichaDoUsuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ email: string }>
  searchParams: Promise<ParametrosDaUrl>
}): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'usuarios.ver')) return <SemPermissao permissoes={['usuarios.ver']} />

  const email = emailDaRota((await params).email)
  const aba = lerAba(primeiroValor((await searchParams).aba))
  const ficha = await carregarFicha(email, aba, membro)

  if (!ficha) {
    return (
      <div className="panel adm-aviso" role="alert">
        <h3>Conta não encontrada</h3>
        <p>
          Não existe conta com o e-mail <b>{email}</b>.
        </p>
        <div className="adm-acoes">
          <Link href="/admin/usuarios" className="btn btn-outline">
            Voltar à lista
          </Link>
        </div>
      </div>
    )
  }

  const { cabecalho, conteudo } = ficha
  const base = `/admin/usuarios/${encodeURIComponent(email)}`

  return (
    <>
      <CabecalhoDaFicha cabecalho={cabecalho} />
      {temPermissao(membro, 'usuarios.editar') ? <AcoesDaConta cabecalho={cabecalho} /> : null}

      <nav className="adm-abas" aria-label="Abas da ficha">
        {ABAS_FICHA.map((a) => (
          <Link key={a.chave} href={`${base}?aba=${a.chave}`} className={a.chave === aba ? 'chart-tab on' : 'chart-tab'} aria-current={a.chave === aba ? 'page' : undefined}>
            {a.rotulo}
          </Link>
        ))}
      </nav>

      <div className="panel">
        {conteudo.aba === 'cadastro' ? <AbaCadastro email={email} nome={cabecalho.resumo.nome} dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
        {conteudo.aba === 'financeiro' ? <AbaFinanceiro dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
        {conteudo.aba === 'acervo' ? <AbaAcervo dados={conteudo} /> : null}
        {conteudo.aba === 'logistica' ? <AbaLogistica dados={conteudo} /> : null}
        {conteudo.aba === 'mercado' ? <AbaMercado dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
        {conteudo.aba === 'atividade' ? <AbaAtividade dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
        {conteudo.aba === 'notas' ? <AbaNotas email={email} dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
      </div>
    </>
  )
}

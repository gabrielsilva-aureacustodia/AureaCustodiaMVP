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
import { CadastroDiretoDeMoeda } from '@/components/admin/acervo/CadastroDiretoDeMoeda'
import { carregarCatalogo } from '@/server/config/carregar'
import { COIN_TYPES } from '@/domain/constants'
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
import { carregarFilaDeSaques } from '@/server/admin/saques'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

/** O e-mail chega codificado na URL ('%40'); decodificar duas vezes não estraga um e-mail sem '%'. */
function emailDaRota(bruto: string): string {
  try {
    return normalizarEmail(decodeURIComponent(bruto))
  } catch {
    return normalizarEmail(bruto)
  }
}

// O título leva o e-mail da rota (o mesmo que já está na URL): sem dado lido aqui, só o parâmetro.
export async function generateMetadata({ params }: { params: Promise<{ email: string }> }): Promise<Metadata> {
  const email = emailDaRota((await params).email)
  return { title: email ? `Ficha do cliente · ${email}` : 'Ficha do cliente' }
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
  // O catálogo editado no painel manda; falha de leitura cai no do código (RA-47)
  // em vez de deixar a tela sem a lista de tipos.
  const catalogoVigente = await carregarCatalogo().catch(() => COIN_TYPES)

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
  const saquesDaConta =
    conteudo.aba === 'financeiro' && temPermissao(membro, 'saques.ver') ? await carregarFilaDeSaques({ userEmail: email, historico: 10 }) : null
  const base = `/admin/usuarios/${encodeURIComponent(email)}`

  const podeEditar = temPermissao(membro, 'usuarios.editar')

  // Disposição de 25/10/2026: as abas vêm logo depois do resumo (antes ficavam abaixo de cinco
  // blocos de ação), e as "Ações da conta" vão para a coluna da direita no computador e para o
  // fim da ficha no celular, com um atalho no topo. Mesmas abas, mesmas ações, mesmas permissões.
  return (
    <>
      <CabecalhoDaFicha cabecalho={cabecalho} />
      {podeEditar ? (
        <p className="adm-atalho-acoes">
          <a href="#ficha-acoes">Ir para as ações da conta</a>
        </p>
      ) : null}

      <div className={podeEditar ? 'adm-ficha' : undefined}>
        <div className="adm-ficha-principal">
          <nav className="adm-abas" aria-label="Abas da ficha">
            {ABAS_FICHA.map((a) => (
              <Link key={a.chave} href={`${base}?aba=${a.chave}`} className={a.chave === aba ? 'chart-tab on' : 'chart-tab'} aria-current={a.chave === aba ? 'page' : undefined}>
                {a.rotulo}
              </Link>
            ))}
          </nav>

          <div className="panel">
            {conteudo.aba === 'cadastro' ? <AbaCadastro email={email} nome={cabecalho.resumo.nome} dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
            {conteudo.aba === 'financeiro' ? <AbaFinanceiro dados={conteudo} semBanco={cabecalho.semBanco} email={email} podeEditar={podeEditar} saques={saquesDaConta} podePagarSaques={temPermissao(membro, 'saques.pagar')} /> : null}
            {conteudo.aba === 'acervo' ? (
              <>
                {/* Cadastro direto: moeda que já está no armazém entra por aqui, sem
                    envio postal nem fila de bancada. Só sócio e desenvolvimento veem. */}
                {temPermissao(membro, 'acervo.cadastro_direto') ? (
                  <CadastroDiretoDeMoeda catalogo={catalogoVigente} emailFixo={email} modo="direto" />
                ) : null}
                {temPermissao(membro, 'acervo.cadastro_sem_envio') ? (
                  <CadastroDiretoDeMoeda catalogo={catalogoVigente} emailFixo={email} modo="sem_envio" />
                ) : null}
                <AbaAcervo dados={conteudo} />
              </>
            ) : null}
            {conteudo.aba === 'logistica' ? <AbaLogistica dados={conteudo} /> : null}
            {conteudo.aba === 'mercado' ? <AbaMercado dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
            {conteudo.aba === 'atividade' ? <AbaAtividade dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
            {conteudo.aba === 'notas' ? <AbaNotas email={email} dados={conteudo} semBanco={cabecalho.semBanco} /> : null}
          </div>
        </div>
        {podeEditar ? (
          <aside className="adm-ficha-lateral" aria-label="Ações da conta">
            <AcoesDaConta cabecalho={cabecalho} />
          </aside>
        ) : null}
      </div>
    </>
  )
}

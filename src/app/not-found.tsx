import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { PublicFooter } from '@/components/landing/PublicFooter'
import { PublicHeader } from '@/components/landing/PublicHeader'
import { getSessionEmail } from '@/server/session'

/**
 * Página 404 do site (B10, QA do Davi, 22/11/2026). Antes era a página padrão do Next, em inglês e sem saída.
 *
 * O status HTTP é 404 de verdade (o Next o define para not-found). Quem tem sessão vê os atalhos da área
 * logada; quem não tem vê os da vitrine — e, para o visitante deslogado, o middleware já não manda mais
 * para o login um endereço que não existe: ele cai aqui (ver `ehSegmentoProtegido`).
 * Sem dado pessoal: a página só olha se existe sessão, nunca quem é.
 */

export const metadata: Metadata = {
  title: 'Página não encontrada | Real Olímpico',
  robots: { index: false },
}

// Lê o cookie de sessão: não pode ser estática.
export const dynamic = 'force-dynamic'

const LINKS_LOGADO = [
  { href: '/inicio', rotulo: 'Início' },
  { href: '/mercado', rotulo: 'Mercado' },
  { href: '/recibos', rotulo: 'Minhas moedas' },
  { href: '/envios', rotulo: 'Enviar moeda' },
  { href: '/compras', rotulo: 'Comprar' },
  { href: '/vender', rotulo: 'Vender' },
  { href: '/conta/extrato', rotulo: 'Extrato' },
  { href: '/atendimento', rotulo: 'Atendimento' },
] as const

const LINKS_DESLOGADO = [
  { href: '/#como-funciona', rotulo: 'Como funciona' },
  { href: '/taxas', rotulo: 'Tabela de taxas' },
  { href: '/academy', rotulo: 'Academy' },
  { href: '/suporte', rotulo: 'Atendimento (SAC)' },
  { href: '/entrar', rotulo: 'Entrar' },
  { href: '/cadastrar', rotulo: 'Criar conta' },
] as const

export default async function NaoEncontrada(): Promise<ReactNode> {
  const logado = (await getSessionEmail()) !== null
  const links = logado ? LINKS_LOGADO : LINKS_DESLOGADO

  return (
    <main className="pub-page nf-pagina">
      <PublicHeader variante="documento" />

      <section className="nf-conteudo" aria-labelledby="nf-titulo">
        <p className="pub-eyebrow">Erro 404</p>
        <h1 id="nf-titulo">Ops… esta página não existe.</h1>
        <p className="nf-texto">
          O endereço pode ter mudado ou foi digitado errado.
          {logado ? ' Sua coleção continua guardada no cofre.' : ''}
        </p>

        <div className="nf-botoes">
          {logado ? (
            <>
              <Link href="/inicio" className="pub-btn pub-btn-primary">
                Voltar para o Início
              </Link>
              <Link href="/mercado" className="pub-btn pub-btn-ghost">
                Ir para o Mercado
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="pub-btn pub-btn-primary">
                Voltar para a página inicial
              </Link>
              <Link href="/entrar" className="pub-btn pub-btn-ghost">
                Entrar na minha conta
              </Link>
            </>
          )}
        </div>

        <h2 className="nf-subtitulo">Links que você pode estar procurando</h2>
        <ul className="nf-links">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.rotulo}</Link>
            </li>
          ))}
        </ul>
      </section>

      <PublicFooter />
    </main>
  )
}

/**
 * Cabeçalho único das páginas públicas (landing, documentos, Academy, SAC).
 *
 * Antes a landing e o LegalDocument tinham cada um o seu cabeçalho, com marcas e links diferentes; quem
 * saía da landing para /taxas parecia ter mudado de site. Agora as duas superfícies usam este componente.
 *
 * Sem 'use client': é só marcação, não hidrata nada (doc 35 §4 do aprendizado_frontend). No celular os links
 * de seção somem por CSS e ficam só Entrar e Criar conta — sem menu com JavaScript.
 *
 * Nome acessível único por destino (doc 35 §6): na landing "Taxas" leva à seção #taxas; o documento completo
 * se chama "Tabela de taxas" no rodapé, para que o mesmo nome nunca aponte para dois lugares.
 */

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_REAL_EMBLEMA } from '@/domain/constants'

const LINKS_DA_LANDING = [
  { href: '#reserva', rotulo: 'Por que guardar' },
  { href: '#como-funciona', rotulo: 'Como funciona' },
  { href: '#mercado', rotulo: 'Marketplace' },
  { href: '#seguranca', rotulo: 'Segurança' },
  { href: '#taxas', rotulo: 'Taxas' },
  { href: '#duvidas', rotulo: 'Dúvidas' },
] as const

const LINKS_DOS_DOCUMENTOS = [
  { href: '/academy', rotulo: 'Academy' },
  { href: '/taxas', rotulo: 'Tabela de taxas' },
  { href: '/termos', rotulo: 'Termos de Uso' },
  { href: '/privacidade', rotulo: 'Privacidade' },
  { href: '/suporte', rotulo: 'Atendimento' },
] as const

export function PublicHeader({ variante }: { variante: 'landing' | 'documento' }): ReactNode {
  const links = variante === 'landing' ? LINKS_DA_LANDING : LINKS_DOS_DOCUMENTOS
  return (
    <div className="pub-header-wrap">
      <header className="pub-header">
        <Link className="pub-brand" href="/" aria-label="Real Olímpico — página inicial">
          {/* O herói da landing é o LCP; o emblema do cabeçalho não disputa prioridade com ele. */}
          <Image src={LOGO_REAL_EMBLEMA} alt="" width={44} height={44} />
          <span>
            <strong>Real Olímpico</strong>
            <small>Guarda e marketplace de colecionáveis</small>
          </span>
        </Link>
        <nav className="pub-nav" aria-label={variante === 'landing' ? 'Seções da página' : 'Documentos'}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="pub-nav-link">
              {l.rotulo}
            </Link>
          ))}
        </nav>
        <div className="pub-header-actions">
          <Link className="pub-btn pub-btn-ghost" href="/entrar">
            Entrar
          </Link>
          <Link className="pub-btn pub-btn-primary" href="/cadastrar">
            Criar conta
          </Link>
        </div>
      </header>
    </div>
  )
}

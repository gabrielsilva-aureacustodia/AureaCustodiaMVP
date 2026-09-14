'use client'

/**
 * Menu lateral do painel administrativo.
 *
 * MESMAS CLASSES DO MENU DO APP (.sidebar, .nav-item, .sb-backdrop, .sb-only), de
 * propósito: a transformação em gaveta abaixo de 1080px mora em responsive.css, que é
 * o único arquivo com media query do projeto. Reaproveitando as classes, o painel
 * ganha a gaveta mobile sem uma linha de CSS nova — e sem um segundo breakpoint para
 * divergir do primeiro. O estado da gaveta também é o do app (`SidebarProvider`).
 *
 * O item aparece quando o membro tem UMA das permissões do item. Ativo é o item cuja
 * rota é a mais longa que casa com a atual — `/admin` não fica aceso dentro de
 * `/admin/resultados/kpis`.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useLogout, useSidebar } from '@/components/shell/Sidebar'

import { useAdmin } from './AdminProvider'
import { GRUPOS_NAV, itemDaRota, permiteItem } from './navegacao'

export function AdminSidebar(): ReactNode {
  const { open, setOpen } = useSidebar()
  const { dark, toggle } = useTheme()
  const { membro } = useAdmin()
  const pathname = usePathname()
  const sair = useLogout()
  const ativo = itemDaRota(pathname).href

  const grupos = GRUPOS_NAV.map((g) => ({ ...g, itens: g.itens.filter((i) => permiteItem(i, membro.permissoes)) })).filter(
    (g) => g.itens.length > 0,
  )

  return (
    <>
      <div className={open ? 'sb-backdrop show' : 'sb-backdrop'} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={open ? 'sidebar open adm-sidebar' : 'sidebar adm-sidebar'} id="sidebar" aria-label="Menu do painel administrativo">
        <div className="sb-brand adm-marca">
          <div className="logo-box logo-sidebar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_AUREA} alt="Áurea Custódia" />
          </div>
          <div className="adm-marca-tag">Painel administrativo</div>
        </div>

        <nav>
          {grupos.map((g, i) => (
            <div key={g.rotulo ?? `grupo-${i}`} className="adm-nav-grupo">
              {g.rotulo ? <div className="adm-nav-titulo">{g.rotulo}</div> : null}
              {g.itens.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={ativo === item.href ? 'nav-item active' : 'nav-item'}
                  aria-current={ativo === item.href ? 'page' : undefined}
                  data-uso={`menu-admin:${item.href}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {item.icone}
                  </svg>
                  {item.rotulo}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-nav-grupo">
          <Link href="/inicio" className="nav-item" data-uso="menu-admin:voltar-ao-app">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 17l-5-5 5-5M5 12h14" />
            </svg>
            Voltar ao app
          </Link>
        </div>

        {/* Tema e Sair só no celular, como no menu do app: no desktop estão na topbar. */}
        <div className="nav-item sb-only" onClick={toggle} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' ? toggle() : undefined)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
          </svg>
          Modo escuro
          <div className={dark ? 'switch on' : 'switch'} />
        </div>

        <div className="sb-bottom sb-only">
          <div className="nav-item" onClick={() => void sair()} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' ? void sair() : undefined)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h5" />
            </svg>
            Sair
          </div>
        </div>
      </aside>
    </>
  )
}

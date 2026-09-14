'use client'

/**
 * Barra superior do painel administrativo.
 *
 * O título vem da rota, pela mesma lista do menu (`navegacao.tsx`) — como a Topbar do
 * app faz com as telas do cliente, e pelo mesmo motivo: chega pronto no HTML do
 * servidor e nenhuma página precisa saber que a barra existe.
 *
 * No lugar do saldo, que é do cliente, o cartão mostra o PAPEL do membro: é a
 * informação que explica por que um item não aparece no menu.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { initials } from '@/domain/codes'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useLogout, useSidebar } from '@/components/shell/Sidebar'

import { useAdmin } from './AdminProvider'
import { itemDaRota } from './navegacao'

export function AdminTopbar(): ReactNode {
  const { membro } = useAdmin()
  const { dark, toggle } = useTheme()
  const { open, toggle: alternarGaveta } = useSidebar()
  const pathname = usePathname()
  const sair = useLogout()
  const item = itemDaRota(pathname)

  return (
    <div className="topbar">
      <div className="tb-left">
        <button
          className="menu-btn"
          type="button"
          onClick={alternarGaveta}
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="sidebar"
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>

        <div className="page-title">
          <h1 className="serif">{item.titulo}</h1>
          <p>{item.subtitulo}</p>
        </div>
      </div>

      <div className="top-right">
        <div className="user-chip">
          <div className="avatar">{initials(membro.nome)}</div>
          <div>
            <div className="uname">{membro.nome}</div>
            <div className="ubal adm-papel-chip" title={membro.origem === 'ambiente' ? 'Acesso pela lista do ambiente (AUREA_ADMIN_EMAILS ou contas de demonstração)' : undefined}>
              {membro.papel.nome}
              {membro.origem === 'ambiente' ? ' · ambiente' : ''}
            </div>
          </div>
        </div>

        <div className="theme-box">
          <span>Modo escuro</span>
          <div className={dark ? 'switch on' : 'switch'} onClick={toggle} />
        </div>

        <Link href="/inicio" className="logout" data-uso="topbar-admin:voltar-ao-app">
          Voltar ao app
        </Link>
        <span className="logout" onClick={() => void sair()}>
          Sair
        </span>
      </div>
    </div>
  )
}

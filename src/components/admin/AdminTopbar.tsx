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
 *
 * MIGALHAS NAS FICHAS (25/10/2026). Em `/admin/usuarios/[email]` e `/admin/moedas/[codigo]` o
 * título herdado da lista ("Usuários") não dizia de quem era a ficha nem como voltar. A
 * migalha "Usuários › ana@…" sai da própria URL — nenhuma página precisa mandar nada.
 * A busca (Ctrl+K) mora aqui porque é a peça que precisa estar em toda tela; tema, "Voltar ao
 * app" e "Sair" foram para o menu da conta, ao lado dela.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { initials } from '@/domain/codes'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useLogout, useSidebar } from '@/components/shell/Sidebar'

import { useAdmin } from './AdminProvider'
import { BuscaDoPainel } from './BuscaDoPainel'
import { itemDaRota } from './navegacao'

/** O pedaço da URL depois da lista, legível: `/admin/usuarios/ana%40x.com` → "ana@x.com". */
function registroDaRota(pathname: string, base: string): string | null {
  if (pathname === base || !pathname.startsWith(`${base}/`)) return null
  const resto = pathname.slice(base.length + 1).split('/')[0] ?? ''
  try {
    return decodeURIComponent(resto)
  } catch {
    return resto
  }
}

export function AdminTopbar(): ReactNode {
  const { membro } = useAdmin()
  const { dark, toggle } = useTheme()
  const { open, toggle: alternarGaveta } = useSidebar()
  const pathname = usePathname()
  const sair = useLogout()
  const item = itemDaRota(pathname)
  const registro = item.href === '/admin' ? null : registroDaRota(pathname, item.href)
  const conta = useRef<HTMLDetailsElement>(null)

  // O <details> não fecha sozinho com Esc, com clique fora nem ao trocar de tela; menu que fica
  // aberto por cima do conteúdo da tela seguinte parece defeito.
  useEffect(() => {
    if (conta.current) conta.current.open = false
  }, [pathname])
  useEffect(() => {
    function fechar(e: Event): void {
      const d = conta.current
      if (!d?.open) return
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !d.contains(e.target as Node)) {
        d.open = false
        if (e instanceof KeyboardEvent) d.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('keydown', fechar)
    document.addEventListener('pointerdown', fechar)
    return () => {
      document.removeEventListener('keydown', fechar)
      document.removeEventListener('pointerdown', fechar)
    }
  }, [])

  return (
    <div className="topbar adm-topbar">
      <div className="tb-left">
        <button
          className="menu-btn"
          type="button"
          onClick={alternarGaveta}
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="sidebar"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>

        <div className="page-title">
          {registro ? (
            <nav aria-label="Você está em" className="adm-migalhas">
              <Link href={item.href}>{item.rotulo}</Link>
              <span aria-hidden="true"> › </span>
              <span aria-current="page" translate="no">
                {registro}
              </span>
            </nav>
          ) : null}
          <h1 className="serif">{registro ? (item.tituloDoRegistro ?? registro) : item.titulo}</h1>
          {registro ? null : <p>{item.subtitulo}</p>}
        </div>
      </div>

      <div className="top-right adm-top-direita">
        <BuscaDoPainel />

        {/* Conta, tema, voltar e sair num menu só: na mesma linha da busca, eles empurravam o
            "Sair" para uma segunda linha em qualquer tela abaixo de 1600 px. <details> nativo:
            abre com Enter/Espaço, sem script de menu. */}
        <details className="adm-conta" ref={conta}>
          <summary className="user-chip" aria-label={`Conta: ${membro.nome}, papel ${membro.papel.nome}`}>
            <span className="avatar" aria-hidden="true">
              {initials(membro.nome)}
            </span>
            <span className="adm-conta-texto">
              <span className="uname">{membro.nome}</span>
              <span className="ubal adm-papel-chip" title={membro.origem === 'ambiente' ? 'Acesso pela lista do ambiente (AUREA_ADMIN_EMAILS ou contas de demonstração)' : undefined}>
                {membro.papel.nome}
                {membro.origem === 'ambiente' ? ' · ambiente' : ''}
              </span>
            </span>
            <svg className="adm-conta-seta" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="adm-conta-menu">
            <div className="adm-conta-quem">
              <b>{membro.nome}</b>
              <span>
                {membro.papel.nome}
                {membro.origem === 'ambiente' ? ' · ambiente' : ''}
              </span>
            </div>
            <div className="theme-box adm-conta-tema">
              <span id="adm-tema-rotulo">Modo escuro</span>
              <button
                type="button"
                className={dark ? 'switch on adm-switch' : 'switch adm-switch'}
                onClick={toggle}
                role="switch"
                aria-checked={dark}
                aria-labelledby="adm-tema-rotulo"
              />
            </div>
            <Link href="/inicio" className="adm-conta-item" data-uso="topbar-admin:voltar-ao-app">
              Voltar ao app
            </Link>
            <button type="button" className="adm-conta-item adm-botao-texto" onClick={() => void sair()}>
              Sair do painel
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}

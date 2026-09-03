'use client'

/**
 * Menu lateral — port de aurea-mvp-teste.html, linhas 658-696, mais as funções
 * toggleSidebar (1126-1138), o trecho de marcação do item ativo dentro de go()
 * (1120-1122) e doLogout (1065-1071).
 *
 * O QUE MUDOU DE ESTRUTURA
 * ------------------------
 * No monolito, `go(view)` percorria os .nav-item[data-nav] e ligava a classe
 * .active na mão. Aqui quem responde essa pergunta é usePathname(): o item
 * ativo é o que tem href igual à rota atual. Comparação EXATA, e isso é fiel —
 * o original também deixava a barra inteira sem item ativo nas telas de segundo
 * nível (openNftDetail, linha 1182, removia .active de todos), e as views
 * 'audit', 'compare' e 'config' nunca tiveram data-nav para casar.
 *
 * A GAVETA MOBILE
 * ---------------
 * Abaixo de 1080px a sidebar vira gaveta (position:fixed + translateX, em
 * responsive.css) e o fundo escuro .sb-backdrop entra para capturar o toque
 * fora dela. O estado de aberta/fechada é compartilhado com a topbar — é ela
 * que tem o botão de menu — por isso o contexto mora neste arquivo, junto de
 * quem desenha a gaveta.
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'
import { logout } from '@/server/actions/auth'
import { useApp } from '@/components/providers/AppProvider'
import { useTheme } from '@/components/providers/ThemeProvider'

/* ------------------------------------------------------------------------- */
/* Estado da gaveta, compartilhado com a Topbar                              */
/* ------------------------------------------------------------------------- */

interface SidebarCtx {
  open: boolean
  setOpen(v: boolean): void
  toggle(): void
}

const Ctx = createContext<SidebarCtx | null>(null)

export function useSidebar(): SidebarCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSidebar() precisa estar dentro de <SidebarProvider>.')
  return ctx
}

/** Ponto em que a sidebar deixa de ser gaveta e volta a ser coluna fixa. */
const DESKTOP_MIN_PX = 1080

export function SidebarProvider({ children }: { children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Fecha ao navegar. No original era a chamada `toggleSidebar(false)` dentro de
  // go() (linha 1123); aqui a navegação não passa por função nossa, então quem
  // avisa é a troca de rota.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    // Girar o aparelho para paisagem pode cruzar os 1080px com a gaveta aberta;
    // sem isto ela ficaria sobreposta à sidebar fixa (linha 1143 do original).
    const aoRedimensionar = (): void => {
      if (window.innerWidth > DESKTOP_MIN_PX) setOpen(false)
    }
    document.addEventListener('keydown', aoTeclar)
    window.addEventListener('resize', aoRedimensionar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('resize', aoRedimensionar)
    }
  }, [])

  // Trava a rolagem do fundo enquanto a gaveta está aberta (linha 1136).
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const value = useMemo<SidebarCtx>(
    () => ({ open, setOpen, toggle: () => setOpen((v) => !v) }),
    [open],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/* ------------------------------------------------------------------------- */
/* Sair                                                                       */
/* ------------------------------------------------------------------------- */

/**
 * O doLogout do original (linhas 1065-1071) fazia quatro coisas: zerava a
 * sessão, parava o ciclo de sync, fechava a gaveta e voltava para a tela de
 * login com o campo de senha limpo e oculto.
 *
 * Aqui as três primeiras somem sozinhas: a sessão é um cookie que o servidor
 * apaga, e o ciclo de sync morre junto com o AppProvider quando o casco é
 * desmontado. Fechar a gaveta continua explícito — sem isso ela reapareceria
 * por um instante sobre a tela de login. O campo de senha também não precisa de
 * limpeza: a página de login é montada do zero.
 *
 * Exportado daqui, e não de um arquivo próprio, porque a topbar e a gaveta têm
 * dois botões "Sair" que precisam se comportar igual.
 */
export function useLogout(): () => Promise<void> {
  const router = useRouter()
  const { setOpen } = useSidebar()

  return useCallback(async () => {
    setOpen(false)
    await logout()
    router.replace('/')
    // Invalida o cache de rotas do App Router. Sem isto, um "voltar" do
    // navegador poderia remontar o casco a partir da árvore antiga, já sem
    // cookie, e a tela apareceria por um piscar antes do redirecionamento.
    router.refresh()
  }, [router, setOpen])
}

/* ------------------------------------------------------------------------- */
/* Menu                                                                       */
/* ------------------------------------------------------------------------- */

interface NavLink {
  href: string
  label: string
  icon: ReactNode
}

/**
 * Os 7 itens navegáveis, na ordem exata do monolito. O rótulo é o texto
 * original — 'Vender ativo' e não 'Vender', 'Meus recibos NFT' e não 'Recibos'.
 */
const NAV: NavLink[] = [
  {
    href: '/inicio',
    label: 'Início',
    icon: <path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" />,
  },
  {
    href: '/mercado',
    label: 'Mercado',
    icon: (
      <>
        <path d="M3 3h2l2 13h11l2-9H6" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </>
    ),
  },
  {
    href: '/vender',
    label: 'Vender ativo',
    icon: (
      <>
        <path d="M20 12l-8 8-9-9V4h7z" />
        <circle cx="7.5" cy="7.5" r="1.3" />
      </>
    ),
  },
  {
    href: '/envios',
    label: 'Envios',
    icon: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  },
  {
    href: '/recibos',
    label: 'Meus recibos NFT',
    icon: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 10h7M9 13.5h7M9 17h4" />
      </>
    ),
  },
  {
    href: '/graficos',
    label: 'Gráficos',
    icon: <path d="M3 17l5-6 4 4 6-8 3 4" />,
  },
  {
    href: '/conta',
    label: 'Minha conta',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
      </>
    ),
  },
]

/**
 * O oitavo item, só para administradores (M4/M7). Fora do array NAV porque a
 * lista dos sete é o port fiel do monolito, e este é acréscimo: ledger, DRE,
 * auditoria e exportação da EMPRESA, não da conta.
 */
const NAV_ADMIN: NavLink = {
  href: '/relatorios',
  label: 'Relatórios',
  icon: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
}

export function Sidebar(): ReactNode {
  const { open, setOpen } = useSidebar()
  const { dark, toggle } = useTheme()
  const { admin } = useApp()
  const pathname = usePathname()
  const sair = useLogout()
  const itens = admin ? [...NAV, NAV_ADMIN] : NAV

  return (
    <>
      {/* Fundo escuro da gaveta. Precisa ser irmão da <aside> e vir antes dela,
          como no original: os dois são posicionados e o z-index (69 x 70) só
          resolve o empilhamento porque a ordem de documento é esta. */}
      <div
        className={open ? 'sb-backdrop show' : 'sb-backdrop'}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside className={open ? 'sidebar open' : 'sidebar'} id="sidebar">
        <div className="sb-brand">
          <div className="logo-box logo-sidebar">
            {/* <img> puro, e não next/image: o arquivo é um webp de marca já
                otimizado, servido de /public, e as dimensões vêm do CSS
                (.logo-box img{width:100%;height:100%}). Passar pelo otimizador
                só acrescentaria uma função serverless no caminho. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_AUREA} alt="Áurea Custódia" />
          </div>
        </div>

        {itens.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            // Comparação exata: telas de segundo nível (/recibos/RO-000001,
            // /graficos/auditoria, /conta/configuracoes) deixam a barra sem
            // item aceso, igual ao original.
            className={pathname === item.href ? 'nav-item active' : 'nav-item'}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24">{item.icon}</svg>
            {item.label}
          </Link>
        ))}

        {/* Academy: item de vitrine, sem rota. .soon já o deixa apagado e sem
            cursor de clique. */}
        <div className="nav-item soon">
          <svg viewBox="0 0 24 24">
            <path d="M12 3L2 8l10 5 10-5zM5 10v6c0 1.5 3.1 3 7 3s7-1.5 7-3v-6" />
          </svg>
          Academy
          <span className="tag-soon">EM BREVE</span>
        </div>

        {/* Tema e Sair aparecem aqui só no celular (<=560px, .sb-only). No
            desktop os mesmos comandos vivem na topbar — e ficam sincronizados
            sem esforço porque leem o mesmo useTheme(). */}
        <div className="nav-item sb-only" onClick={toggle}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
          </svg>
          Modo escuro
          <div className={dark ? 'switch on' : 'switch'} />
        </div>

        <div className="sb-bottom sb-only">
          <div className="nav-item" onClick={() => void sair()}>
            <svg viewBox="0 0 24 24">
              <path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h5" />
            </svg>
            Sair
          </div>
        </div>
      </aside>
    </>
  )
}

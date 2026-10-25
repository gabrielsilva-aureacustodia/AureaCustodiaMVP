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

import { LogoEmblema } from '@/brand/componentes/Logo'
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

/**
 * Ponto em que a sidebar deixa de ser gaveta e volta a ser coluna fixa. O padrão (1080px) é o do
 * monolito e continua valendo para o painel administrativo, que usa este mesmo provider. A área do
 * cliente passa 1024 (o `lg` do doc 35 §5 do aprendizado_frontend, 25/10/2026): em tablet de 768px a
 * coluna fixa deixava ~500px para o conteúdo, e a largura inteira vai para a tela.
 */
const DESKTOP_MIN_PX = 1080

export function SidebarProvider({
  children,
  desktopMinPx = DESKTOP_MIN_PX,
}: {
  children: ReactNode
  desktopMinPx?: number
}): ReactNode {
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
      if (window.innerWidth >= desktopMinPx) setOpen(false)
    }
    document.addEventListener('keydown', aoTeclar)
    window.addEventListener('resize', aoRedimensionar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('resize', aoRedimensionar)
    }
  }, [desktopMinPx])

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
  /**
   * Seção do menu (25/10/2026). Os sete itens continuam na ordem do monolito; o que mudou é o
   * rótulo de grupo acima deles — "Negociar", "Meu acervo", "Conta" —, que diz para que serve cada
   * bloco antes de a pessoa ler item por item (proximidade, conceito 11 de design/).
   */
  grupo: string
}

/**
 * Os 7 itens navegáveis, na ordem exata do monolito.
 *
 * O rótulo DEIXOU de ser o texto original em 10/09/2026. O monolito dizia
 * 'Vender ativo' e 'Meus recibos NFT'; as duas palavras foram proibidas pelo
 * jurídico em 09/09/2026 porque puxam a operação para regulação que não é a
 * dela — 'ativo' para o mercado de capitais, 'NFT' para ativos virtuais. A
 * ordem e a quantidade de itens continuam fiéis; só o texto mudou.
 */
const NAV: NavLink[] = [
  {
    href: '/inicio',
    grupo: 'Visão geral',
    label: 'Início',
    icon: <path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z" />,
  },
  {
    href: '/mercado',
    grupo: 'Negociar',
    label: 'Mercado',
    icon: <path d="M3 17l5-6 4 4 6-8 3 4" />,
  },
  {
    href: '/compras',
    grupo: 'Negociar',
    label: 'Compras',
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
    grupo: 'Negociar',
    label: 'Vendas',
    icon: (
      <>
        <path d="M20 12l-8 8-9-9V4h7z" />
        <circle cx="7.5" cy="7.5" r="1.3" />
      </>
    ),
  },
  {
    href: '/envios',
    grupo: 'Meu acervo',
    label: 'Envios',
    icon: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />,
  },
  {
    href: '/recibos',
    grupo: 'Meu acervo',
    label: 'Recibos',
    icon: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 10h7M9 13.5h7M9 17h4" />
      </>
    ),
  },
  {
    href: '/conta',
    grupo: 'Conta',
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
 * O oitavo item, só para a equipe. Fora do array NAV porque a lista dos sete é o
 * port fiel do monolito, e este é acréscimo: o que é da EMPRESA, não da conta.
 *
 * Até a C1 (frente C, 14/09/2026) apontava para `/relatorios`; agora abre o painel
 * administrativo, onde a Central de Resultados é uma das áreas — e `/relatorios`
 * redireciona para ela. Quem liga o item é o (app)/layout, pelos papéis do painel.
 */
const NAV_ADMIN: NavLink = {
  href: '/admin',
  grupo: 'Conta',
  label: 'Administração',
  icon: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
}

/**
 * Item aceso: a rota exata ou qualquer subpágina dela (25/10/2026). Até aqui a comparação era
 * exata, fiel ao monolito, e /conta/extrato, /recibos/RO-000001 e /mercado/comparacoes deixavam o
 * menu sem nenhum item aceso — a pessoa perdia o "onde estou". '/inicio' não tem subpáginas.
 */
function itemAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export function Sidebar(): ReactNode {
  const { open, setOpen } = useSidebar()
  const { dark, toggle } = useTheme()
  const { admin } = useApp()
  const pathname = usePathname()
  const sair = useLogout()
  const itens = admin ? [...NAV, NAV_ADMIN] : NAV

  // Os grupos saem da própria lista, na ordem em que aparecem: nada de segunda lista para manter.
  const grupos: { nome: string; itens: NavLink[] }[] = []
  for (const item of itens) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.nome === item.grupo) ultimo.itens.push(item)
    else grupos.push({ nome: item.grupo, itens: [item] })
  }

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

      <aside className={open ? 'sidebar open' : 'sidebar'} id="sidebar" aria-label="Menu principal">
        {/* Marca do casco (Brandbook da Frente 1, §Frente 4): emblema de 40px com o nome escrito ao
            lado, em vez do logo de 92px que ocupava o topo da barra. É também o atalho para o Início. */}
        <Link href="/inicio" className="sb-marca">
          <LogoEmblema largura={40} alt="" />
          <span className="sb-marca-nome">Real Olímpico</span>
        </Link>

        <nav className="sb-nav" aria-label="Seções da plataforma">
          {grupos.map((g) => (
            <div className="sb-grupo" key={g.nome}>
              <div className="sb-grupo-nome" aria-hidden="true">
                {g.nome}
              </div>
              {g.itens.map((item) => {
                const ativo = itemAtivo(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={ativo ? 'nav-item active' : 'nav-item'}
                    aria-current={pathname === item.href ? 'page' : ativo ? 'location' : undefined}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {item.icon}
                    </svg>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}

          {/* Academy: item de vitrine, sem rota. .soon já o deixa apagado e sem
              cursor de clique. */}
          <div className="nav-item soon" aria-disabled="true">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3L2 8l10 5 10-5zM5 10v6c0 1.5 3.1 3 7 3s7-1.5 7-3v-6" />
            </svg>
            Academy
            <span className="tag-soon">EM BREVE</span>
          </div>
        </nav>

        {/* Tema e Sair aparecem aqui só na gaveta do celular (.sb-only). No
            desktop os mesmos comandos vivem na topbar — e ficam sincronizados
            sem esforço porque leem o mesmo useTheme(). Botões de verdade desde
            25/10/2026: eram <div> com onClick, fora do Tab e mudos no leitor de tela. */}
        <button
          type="button"
          className="nav-item sb-only"
          role="switch"
          aria-checked={dark}
          onClick={toggle}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
          </svg>
          Modo escuro
          <span className={dark ? 'switch on' : 'switch'} aria-hidden="true" />
        </button>

        <div className="sb-bottom sb-only">
          <button type="button" className="nav-item" onClick={() => void sair()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h5" />
            </svg>
            Sair da conta
          </button>
        </div>
      </aside>
    </>
  )
}

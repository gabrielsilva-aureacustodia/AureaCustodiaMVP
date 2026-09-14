/**
 * A navegação do painel administrativo — declarada UMA vez, completa, com a
 * permissão de cada item (plano do Admin, seção 1.4).
 *
 * POR QUE A LISTA NASCE COM OS ITENS DAS TRÊS SUB-BRANCHES. CS e Usuários chegam na
 * C2; Bancada, Moedas, Logística e Configuração, na C3. Se cada etapa acrescentasse o
 * próprio item aqui, as duas editariam o mesmo array — o conflito de merge mais
 * provável da frente. Declarado de uma vez, C2 e C3 só criam as páginas.
 *
 * MENU É CONVENIÊNCIA. Um item escondido não protege nada: a página confere a
 * permissão no servidor e a Server Action confere de novo. Esta lista decide só o que
 * aparece.
 *
 * Sem 'use client' de propósito: não há hook aqui, só dados. O menu (cliente) e o
 * painel inicial (servidor) leem a mesma lista, e o título da topbar sai dela também.
 */

import type { ReactNode } from 'react'

import type { ChavePermissao } from '@/domain/admin/permissoes'

export interface ItemNav {
  href: string
  /** Texto do menu. */
  rotulo: string
  /** Título grande da topbar. */
  titulo: string
  /** Subtítulo da topbar, e a descrição do atalho no painel inicial. */
  subtitulo: string
  /** Basta UMA destas. Lista vazia = qualquer membro do painel. */
  permissoes: readonly ChavePermissao[]
  icone: ReactNode
}

export interface GrupoNav {
  rotulo: string | null
  itens: readonly ItemNav[]
}

export const INICIO_ADMIN: ItemNav = {
  href: '/admin',
  rotulo: 'Painel',
  titulo: 'Painel administrativo',
  subtitulo: 'Resultados, operação e equipe da Áurea Custódia.',
  permissoes: [],
  icone: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
}

export const GRUPOS_NAV: readonly GrupoNav[] = [
  { rotulo: null, itens: [INICIO_ADMIN] },
  {
    rotulo: 'Central de Resultados',
    itens: [
      {
        href: '/admin/resultados/financeiro',
        rotulo: 'Financeiro',
        titulo: 'Financeiro',
        subtitulo: 'DRE do período, receita por linha e o fluxo mês a mês.',
        permissoes: ['resultados.ver'],
        icone: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
      },
      {
        href: '/admin/resultados/contabil',
        rotulo: 'Contábil',
        titulo: 'Contábil',
        subtitulo: 'Plano de contas, lançamentos manuais, alíquotas e exportações.',
        permissoes: ['resultados.ver'],
        icone: <path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11" />,
      },
      {
        href: '/admin/resultados/kpis',
        rotulo: 'Indicadores',
        titulo: 'Indicadores do negócio',
        subtitulo: 'Mercado, acervo, envios, faturas e fila de ofertas, em números.',
        permissoes: ['resultados.ver'],
        icone: <path d="M3 17l5-6 4 4 6-8 3 4" />,
      },
      {
        href: '/admin/resultados/uso',
        rotulo: 'Uso',
        titulo: 'Uso da plataforma',
        subtitulo: 'Páginas mais abertas, jornadas, horário de pico e a trilha de auditoria.',
        permissoes: ['resultados.ver', 'admin.auditoria'],
        icone: <path d="M3 12h4l3 8 4-16 3 8h4" />,
      },
    ],
  },
  {
    rotulo: 'Atendimento',
    itens: [
      {
        href: '/admin/cs',
        rotulo: 'CS',
        titulo: 'Atendimento',
        subtitulo: 'Conversas de WhatsApp com a ficha do cliente ao lado.',
        permissoes: ['cs.ver'],
        icone: <path d="M4 5h16v11H9l-5 4z" />,
      },
      {
        href: '/admin/usuarios',
        rotulo: 'Usuários',
        titulo: 'Usuários',
        subtitulo: 'Lista e ficha completa de cada conta.',
        permissoes: ['usuarios.ver'],
        icone: (
          <>
            <circle cx="9" cy="8" r="4" />
            <path d="M2 21c1-4 4-6 7-6s6 2 7 6M17 4a3.5 3.5 0 010 7M22 20c-.5-2.6-2-4.2-4-4.8" />
          </>
        ),
      },
    ],
  },
  {
    rotulo: 'Operação',
    itens: [
      {
        href: '/admin/bancada',
        rotulo: 'Bancada',
        titulo: 'Bancada de análise',
        subtitulo: 'Análise física no navegador, na mesma corrente de hashes da estação.',
        permissoes: ['bancada.ver'],
        icone: (
          <>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-5-5" />
          </>
        ),
      },
      {
        href: '/admin/moedas',
        rotulo: 'Moedas',
        titulo: 'Auditoria de moedas',
        subtitulo: 'Todo o acervo, com recibo, hash, caixa e verificação da corrente.',
        permissoes: ['bancada.auditoria'],
        icone: (
          <path d="M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
        ),
      },
      {
        href: '/admin/logistica',
        rotulo: 'Logística',
        titulo: 'Logística',
        subtitulo: 'Envios e retiradas de todas as contas, com rastreio e etiquetas.',
        permissoes: ['logistica.ver'],
        icone: (
          <>
            <path d="M3 6h11v9H3zM14 9h4l3 3v3h-7" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
          </>
        ),
      },
    ],
  },
  {
    rotulo: 'Sistema',
    itens: [
      {
        href: '/admin/configuracao',
        rotulo: 'Configuração',
        titulo: 'Configuração do site',
        subtitulo: 'Taxas, catálogo de moedas, parâmetros operacionais e integrações.',
        permissoes: ['config.ver'],
        icone: <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4" />,
      },
      {
        href: '/admin/equipe',
        rotulo: 'Equipe e papéis',
        titulo: 'Equipe e papéis',
        subtitulo: 'Quem acessa o painel e o que cada papel pode fazer.',
        permissoes: ['admin.membros', 'admin.papeis'],
        icone: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" />,
      },
    ],
  },
]

export const TODOS_ITENS: readonly ItemNav[] = GRUPOS_NAV.flatMap((g) => g.itens)

/**
 * O item que responde por uma rota: o de `href` mais longo que é prefixo dela.
 * `/admin/resultados/kpis` casa com o próprio item, não com `/admin`; uma ficha futura
 * (`/admin/usuarios/[email]`) herda o título da lista.
 */
export function itemDaRota(pathname: string): ItemNav {
  let melhor = INICIO_ADMIN
  for (const item of TODOS_ITENS) {
    const casa = pathname === item.href || pathname.startsWith(`${item.href}/`)
    if (casa && item.href.length > melhor.href.length) melhor = item
  }
  return melhor
}

export function permiteItem(item: ItemNav, permissoes: readonly string[]): boolean {
  return item.permissoes.length === 0 || item.permissoes.some((p) => permissoes.includes(p))
}

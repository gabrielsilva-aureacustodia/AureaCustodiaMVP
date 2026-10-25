'use client'

/**
 * A faixa "Financeiro · Contábil · Notas fiscais · Indicadores · Uso e auditoria" no topo de cada
 * tela da Gestão (25/10/2026).
 *
 * Quem fecha o mês pula entre DRE, lançamentos e notas comparando o MESMO período; voltar ao menu a
 * cada troca perdia o `?ano=&mes=&trimestre=` escolhido. Aqui o link leva o período junto (as
 * telas que não usam período ignoram o parâmetro). Os itens são os do grupo "Gestão" de
 * `navegacao.tsx`, filtrados pela mesma regra do menu — esconder não protege nada: cada página
 * confere a própria permissão no servidor.
 */

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

import { useAdmin } from '../AdminProvider'
import { GRUPOS_NAV, itemDaRota, permiteItem } from '../navegacao'

const DO_PERIODO = ['ano', 'mes', 'trimestre'] as const

export function SubnavGestao(): ReactNode {
  const { membro } = useAdmin()
  const pathname = usePathname()
  const busca = useSearchParams()
  const itens = (GRUPOS_NAV.find((g) => g.rotulo === 'Gestão')?.itens ?? []).filter((i) => permiteItem(i, membro.permissoes))
  if (itens.length < 2) return null

  const periodo = new URLSearchParams()
  for (const k of DO_PERIODO) {
    const v = busca.get(k)
    if (v) periodo.set(k, v)
  }
  const sufixo = periodo.size ? `?${periodo.toString()}` : ''
  const ativo = itemDaRota(pathname).href

  return (
    <nav aria-label="Áreas da Gestão">
      <ul className="adm-subnav">
        {itens.map((i) => (
          <li key={i.href}>
            <Link href={`${i.href}${sufixo}`} aria-current={i.href === ativo ? 'page' : undefined} data-uso={`subnav-gestao:${i.href}`}>
              {i.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

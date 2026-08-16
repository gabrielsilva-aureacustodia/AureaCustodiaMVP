'use client'

/**
 * Lista de escolha das moedas a anunciar — port de buildCoinListHtml
 * (aurea-mvp-teste.html, linhas 1483-1501).
 *
 * COMPONENTE PURAMENTE APRESENTACIONAL, de propósito: quem decide o que é
 * "disponível", o que já está anunciado e o que está selecionado é a tela 1.2,
 * que já tem o estado em mãos. Se este componente lesse o contexto sozinho,
 * haveria duas fontes para a mesma resposta e a lista poderia discordar do
 * contador de quantidade que fica ao lado dela.
 *
 * A lista mostra TODAS as moedas do tipo negociável, inclusive as já anunciadas
 * — elas aparecem apagadas (.listed) e sem clique, exatamente como no original.
 * Some-las esconderia do dono o motivo de a moeda não estar disponível.
 */

import type { KeyboardEvent, ReactNode } from 'react'

import { COIN } from '@/domain/constants'
import type { Coin } from '@/domain/types'
import { CoinSvg } from '@/components/svg/CoinArt'

export interface CoinPickerProps {
  /** Moedas do tipo negociável (COIN.name) do usuário, na ordem do inventário. */
  moedas: Coin[]
  /** Ids que já possuem oferta de venda aberta — vindos de state.sellOffers. */
  anunciadas: ReadonlySet<string>
  /** Ids marcados agora. Array e não Set: é o mesmo `selectedCoins` do original. */
  selecionadas: string[]
  onToggle(coinId: string): void
}

export function CoinPicker({
  moedas,
  anunciadas,
  selecionadas,
  onToggle,
}: CoinPickerProps): ReactNode {
  // Texto exato da linha 1486 — inclusive as aspas em volta do nome da moeda e
  // de "Envios", que são parte da mensagem e não formatação nossa.
  if (!moedas.length) {
    return (
      <div className="empty">
        Você ainda não possui &quot;{COIN.name}&quot; em custódia nesta conta de teste. Envie uma
        moeda em &quot;Envios&quot; para poder anunciá-la aqui.
      </div>
    )
  }

  return (
    <>
      {moedas.map((c) => {
        const listed = anunciadas.has(c.id)
        const sel = selecionadas.includes(c.id)

        return (
          <div
            key={c.id}
            className={`sell-coin ${sel ? 'selected' : ''} ${listed ? 'listed' : ''}`}
            // Moeda já anunciada não recebe onclick no original; aqui o mesmo,
            // mais os avisos que o leitor de tela precisa para não anunciar um
            // item inerte como se fosse clicável.
            onClick={listed ? undefined : () => onToggle(c.id)}
            onKeyDown={
              listed
                ? undefined
                : (e: KeyboardEvent<HTMLDivElement>) => {
                    // O original só respondia a clique. Enter e espaço são o
                    // mínimo para a lista ser operável sem mouse, e não mudam
                    // nada do que se vê.
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onToggle(c.id)
                    }
                  }
            }
            role="checkbox"
            aria-checked={sel}
            aria-disabled={listed || undefined}
            tabIndex={listed ? undefined : 0}
          >
            {/* O ✓ vem do texto, não de pseudo-elemento: .check é só a caixinha,
                e é a classe .sell-coin.selected que a pinta de dourado. */}
            <div className="check">{listed ? '' : sel ? '✓' : ''}</div>
            <CoinSvg />
            <div>
              <div className="c-name">{COIN.name}</div>
              <div className="c-meta">
                Código {c.id} · Entrada {c.entrada}
              </div>
              {listed ? (
                <span className="badge-gold">JÁ ANUNCIADA</span>
              ) : (
                <span className="badge-green">✓ Em custódia verificada</span>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

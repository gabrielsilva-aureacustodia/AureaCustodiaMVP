'use client'

/**
 * Painel informativo sobre o funcionamento das negociações no marketplace.
 *
 * Explica o comportamento do motor de casamento (src/domain/market.ts, matchOrders)
 * em linguagem clara e acessível, sem jargão financeiro ou termos vedados pelo
 * jurídico (token, NFT, cripto, ativo digital, ativo, investimento, corretora).
 *
 * Compartilhado entre Compras (/mercado) e Vendas (/vender).
 */

import type { CSSProperties, ReactNode } from 'react'

export interface ComoNegociacaoAconteceProps {
  style?: CSSProperties
}

export function ComoNegociacaoAcontece({ style }: ComoNegociacaoAconteceProps): ReactNode {
  return (
    <div className="panel" style={style}>
      <h3>
        <svg viewBox="0 0 24 24">
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
        Como a negociação acontece
      </h3>

      <div className="how-row">
        <div className="hi">
          <svg viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div>
          <b>Negociação imediata:</b> você pode aceitar uma oferta na hora clicando nela — compra ou venda imediata pelo preço anunciado.
        </div>
      </div>

      <div className="how-row">
        <div className="hi">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        </div>
        <div>
          <b>Negociação automática:</b> você também pode publicar sua própria oferta e deixar o sistema negociar por você. O marketplace combina ordens priorizando o melhor preço e, no empate, a ordem de chegada — a primeira oferta da fila é a primeira a negociar.
        </div>
      </div>

      <div className="note" style={{ marginTop: 14 }}>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.5" />
        </svg>
        Cada tipo de moeda tem sua própria fila de ofertas. Uma oferta de uma moeda nunca é combinada com moeda de outro tipo.
      </div>
    </div>
  )
}

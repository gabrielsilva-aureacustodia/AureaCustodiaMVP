'use client'

/**
 * Painel informativo sobre formação de preço no marketplace.
 *
 * Compartilhado entre as telas de Compras (/mercado) e Vendas (/vender) para
 * evitar divergência de texto ou regras de apresentação.
 */

import type { CSSProperties, ReactNode } from 'react'

import { brl } from '@/domain/money'
import type { Cents } from '@/domain/types'

export interface ComoPrecoEFormadoProps {
  tipoAtivo: string
  media7: Cents | null
  style?: CSSProperties
}

export function ComoPrecoEFormado({ tipoAtivo, media7, style }: ComoPrecoEFormadoProps): ReactNode {
  return (
    <div className="panel" style={style}>
      <h3>
        <svg viewBox="0 0 24 24">
          <path d="M12 3v18M8 7h6a3 3 0 010 6H9a3 3 0 000 6h7" />
        </svg>
        Como o preço é formado
      </h3>

      <div className="how-row">
        <div className="hi">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
          </svg>
        </div>
        Você define o valor.
      </div>

      <div className="how-row">
        <div className="hi">
          <svg viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3.2" />
            <circle cx="16.5" cy="9.5" r="2.6" />
            <path d="M3 20c.8-3.4 3.2-5 6-5s5.2 1.6 6 5M14 15.5c2.4.2 4.3 1.6 5 4.5" />
          </svg>
        </div>
        Compradores fazem ofertas — ou você pode vender direto para uma oferta já publicada.
      </div>

      <div className="how-row">
        <div className="hi">
          <svg viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        A plataforma não recomenda preço.
      </div>

      <div className="avg-box" style={{ marginTop: 14 }}>
        <div className="l">Média de mercado — 7 dias</div>
        {/* avg7 devolve null sem negociação nos últimos 7 dias: traço, não zero. */}
        <div className="v">{media7 ? brl(media7) : '—'}</div>
        <div className="s">{tipoAtivo} · referência informativa, não recomendação</div>
      </div>
    </div>
  )
}

'use client'

/**
 * Linha de uma oferta de COMPRA vista pelo lado de quem vende — port de
 * buildSellerBidRow (aurea-mvp-teste.html, linhas 1502-1517).
 *
 * É a mesma classe `.offer` da vitrine do mercado, com duas diferenças que
 * vieram do original e são intencionais: o ícone é uma seta para CIMA em verde
 * (é dinheiro entrando, não saindo) e o preço também é verde em vez de dourado.
 * As duas cores estão em style inline no monolito porque `.offer .o-price .p` já
 * define dourado — mantê-las inline é o que preserva a precedência.
 */

import type { ReactNode } from 'react'

import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { BuyOrder } from '@/domain/types'

export interface SellerBidRowProps {
  bid: BuyOrder
  /** Nome do comprador. O original cai em '—' quando a conta não está no estado. */
  buyerName: string
  /**
   * Moedas do tipo do bid que o vendedor tem livres agora. Zero desabilita o
   * botão — no monolito ele estava sempre ativo porque havia um ativo só e a
   * recusa vinha depois, dentro da modal.
   */
  livres: number
  onSellDirect(): void
}

export function SellerBidRow({
  bid,
  buyerName,
  livres,
  onSellDirect,
}: SellerBidRowProps): ReactNode {
  return (
    <div className="offer">
      <div className="block-ico" style={{ width: 52, height: 52 }}>
        <svg
          viewBox="0 0 24 24"
          style={{ width: 22, height: 22, stroke: 'var(--green)', fill: 'none', strokeWidth: 1.7 }}
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>

      <div className="o-info">
        <div className="o-name">
          {bid.qty} moeda(s) · {bid.tipoMoeda}
        </div>
        <div className="o-meta">
          Comprador: {buyerName} · Publicada em {fdate(bid.createdAt)}
          <br />
          Você tem {livres} desta moeda disponível(is) para vender
        </div>
      </div>

      <div className="o-price">
        <div className="p" style={{ color: 'var(--green)' }}>
          {brl(bid.price)}
        </div>
        <div className="lt">por unidade</div>
        <button
          className="btn btn-gold"
          type="button"
          style={{ marginTop: 8, padding: '8px 16px', fontSize: 13 }}
          disabled={livres <= 0}
          onClick={onSellDirect}
        >
          {livres > 0 ? 'Vender direto' : 'Sem estoque'}
        </button>
      </div>
    </div>
  )
}

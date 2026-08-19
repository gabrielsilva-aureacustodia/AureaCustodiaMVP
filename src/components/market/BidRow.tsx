'use client'

/**
 * Linha de uma oferta de compra (bid) no livro de ordens da tela 1.1.
 *
 * Port de buildBidRow (aurea-mvp-teste.html, 1273-1293). Reaproveita a mesma
 * .offer dos lotes à venda, trocando a arte da moeda por um ícone de seta para
 * cima em verde — é o sinal visual que separa demanda de oferta na vitrine.
 *
 * "Editar" e "Cancelar" só aparecem no bid da própria sessão, como no original.
 * Isso é conveniência, não controle de acesso: cancelBid() e editBid() conferem
 * o dono de novo no servidor, porque esconder botão não impede chamada.
 *
 * A ação de VENDER para um bid (openSellToBidModal) mora na tela 1.2 e não passa
 * por aqui — na tela de compra o monolito não a oferecia.
 */

import type { ReactNode } from 'react'

import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { BuyOrder } from '@/domain/types'

export interface BidRowProps {
  bid: BuyOrder
  /** Nome do comprador já resolvido pela página; '—' quando a conta sumiu do estado. */
  buyerName: string
  /** true quando a oferta é da própria sessão — só então aparecem as ações. */
  mine: boolean
  onEdit(bid: BuyOrder): void
  onCancel(bid: BuyOrder): void
}

export function BidRow({ bid, buyerName, mine, onEdit, onCancel }: BidRowProps): ReactNode {
  return (
    <div className="offer">
      {/* .block-ico com medidas reduzidas no próprio elemento, como na linha
          1278: o tamanho padrão da classe é grande demais para uma linha de
          livro de ordens. */}
      <div className="block-ico" style={{ width: '52px', height: '52px' }}>
        <svg
          viewBox="0 0 24 24"
          style={{
            width: '22px',
            height: '22px',
            stroke: 'var(--green)',
            fill: 'none',
            strokeWidth: '1.7',
          }}
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>

      <div className="o-info">
        <div className="o-name">
          {bid.qty} moeda(s) · {bid.tipoMoeda}
          {mine ? <span className="mine-badge">SUA OFERTA</span> : null}
        </div>
        <div className="o-meta">
          Comprador: {mine ? 'você' : buyerName} · Publicada em {fdate(bid.createdAt)}
        </div>
      </div>

      <div className="o-price">
        <div className="p" style={{ color: 'var(--green)' }}>
          {brl(bid.price)}
        </div>
        <div className="lt">preço máx. por unidade</div>

        {mine ? (
          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {/* .edit-link já nasce com margin-left:12px para o uso dela em outras
                telas; aqui o espaçamento é do flex, então o original zera. */}
            <span className="edit-link" style={{ marginLeft: 0 }} onClick={() => onEdit(bid)}>
              Editar
            </span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '6px 14px', fontSize: '12.5px' }}
              onClick={() => onCancel(bid)}
            >
              Cancelar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

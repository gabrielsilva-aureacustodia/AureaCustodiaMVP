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

import { apelidoComprador } from '@/domain/contraparte'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { BuyOrder } from '@/domain/types'

export interface BidRowProps {
  bid: BuyOrder
  /** true quando a oferta é da própria sessão — só então aparecem as ações. */
  mine: boolean
  onEdit(bid: BuyOrder): void
  onCancel(bid: BuyOrder): void
}

export function BidRow({ bid, mine, onEdit, onCancel }: BidRowProps): ReactNode {
  // Objeto dos botões repetidos, só para leitor de tela (doc 35 §6): "Editar" e "Cancelar" de qual oferta.
  const objeto = `a oferta de compra de ${bid.qty} ${bid.tipoMoeda} a ${brl(bid.price)}`
  return (
    <div className="offer offer-bid">
      {/* O ícone de seta verde separa demanda (compra) de oferta (venda) na vitrine. */}
      <div className="block-ico bid-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </div>

      <div className="o-info">
        <div className="o-name">
          {bid.qty} moeda(s) · {bid.tipoMoeda}
          {mine ? <span className="mine-badge">SUA OFERTA</span> : null}
        </div>
        <div className="o-meta">
          {/* Anonimato da vitrine (D-5, 10/09/2026): ver a nota em LotCard. */}
          {mine ? 'Comprador: você' : apelidoComprador(bid.id)} · Publicada em{' '}
          {fdate(bid.createdAt)}
        </div>
      </div>

      <div className="o-price">
        <div className="p p-compra">{brl(bid.price)}</div>
        <div className="lt">preço máx. por unidade</div>

        {mine ? (
          <div className="o-acoes">
            <button type="button" className="btn btn-outline" onClick={() => onEdit(bid)}>
              Editar<span className="sr-only"> {objeto}</span>
            </button>
            <button type="button" className="btn btn-outline" onClick={() => onCancel(bid)}>
              Cancelar<span className="sr-only"> {objeto}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

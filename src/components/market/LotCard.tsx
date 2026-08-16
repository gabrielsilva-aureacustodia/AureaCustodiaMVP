'use client'

/**
 * Cartão de um lote à venda na vitrine (tela 1.1).
 *
 * Port de buildLotCard (aurea-mvp-teste.html, 1236-1272). O HTML de lá virou
 * JSX linha a linha — mesmos nomes de classe, mesmos estilos inline, mesmos
 * textos, incluindo o "disponível(is)" e o "Saldo insuf." abreviado do botão.
 *
 * QUEM DECIDE A QUANTIDADE
 * ------------------------
 * No monolito, buildLotCard ESCREVIA no mapa global `buyQty` durante a
 * montagem do HTML (linha 1245), reancorando a escolha do usuário dentro do
 * que o saldo e o estoque permitiam naquele instante. Em React não se muta
 * estado durante a renderização, então a mesma expressão passou a ser
 * calculada aqui e usada direto:
 *
 *     chosen = min(max(guardado, 1), max(maxQty, 1))
 *
 * O valor guardado na página continua sendo o que o usuário escolheu; este é o
 * valor EFETIVO, já limitado. É ele que sobe no clique de Comprar — por isso
 * `onBuy` recebe a quantidade, em vez de a página reler o mapa. O resultado é
 * idêntico ao do original, que confirmava a compra logo depois de a renderização
 * ter reancorado o mapa.
 *
 * O limite calculado aqui é conveniência de interface, não segurança: quem
 * decide de verdade quantas moedas saem é buyLot(), no servidor.
 */

import type { ReactNode } from 'react'

import { CoinSvg } from '@/components/svg/CoinArt'
import { COIN } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { Cents, Lot } from '@/domain/types'

export interface LotCardProps {
  lot: Lot
  /** Nome do vendedor já resolvido pela página; '—' quando a conta sumiu do estado. */
  sellerName: string
  /** true quando o anúncio é da própria sessão — esconde seletor e botão. */
  mine: boolean
  /** Saldo do comprador, para o teto de quantidade. */
  balance: Cents
  /** Quantidade guardada no seletor da página. undefined = nunca mexeram neste lote. */
  qtyEscolhida: number | undefined
  onAdjust(lotId: string, delta: number, max: number): void
  onBuy(lot: Lot, qty: number): void
}

export function LotCard({
  lot,
  sellerName,
  mine,
  balance,
  qtyEscolhida,
  onAdjust,
  onBuy,
}: LotCardProps): ReactNode {
  const qtyAvail = lot.coinIds.length

  // Divisão inteira: quantas unidades o caixa aguenta a este preço.
  const maxAfford = Math.floor(balance / lot.price)
  // Anúncio próprio tem teto 0 — o original zerava para não desenhar controle
  // nenhum, e é isso que também desliga o botão.
  const maxQty = mine ? 0 : Math.max(0, Math.min(qtyAvail, maxAfford))

  // `max(maxQty,1)` e não `maxQty`: com teto 0 (saldo curto) o seletor precisa
  // continuar mostrando 1, e não 0, porque o que informa a recusa é o botão
  // desabilitado com "Saldo insuf." — igual ao original.
  const chosen = Math.min(Math.max(qtyEscolhida ?? 1, 1), Math.max(maxQty, 1))
  const total = lot.price * chosen

  return (
    <div className="offer">
      <CoinSvg />

      <div className="o-info">
        <div className="o-name">
          {COIN.name}
          {mine ? <span className="mine-badge">SEU ANÚNCIO</span> : null}
        </div>

        <div className="o-meta">
          {COIN.detail}
          <br />
          {qtyAvail} disponível(is) · Vendedor: {mine ? 'você' : sellerName} · Publicado em{' '}
          {fdate(lot.createdAt)}
        </div>

        {/* A observação do vendedor entre aspas e em itálico, como na linha 1255. */}
        {lot.obs ? (
          <div className="o-meta" style={{ fontStyle: 'italic' }}>
            &quot;{lot.obs}&quot;
          </div>
        ) : null}

        {mine ? null : (
          <div className="stepper" style={{ marginTop: '10px' }}>
            {/* O sinal é o menos matemático (U+2212), não o hífen: é o que
                alinha com o "+" no mesmo peso visual. */}
            <button
              type="button"
              disabled={chosen <= 1}
              onClick={() => onAdjust(lot.lotId, -1, maxQty)}
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="n">{chosen}</span>
            <button
              type="button"
              disabled={chosen >= maxQty}
              onClick={() => onAdjust(lot.lotId, 1, maxQty)}
              aria-label="Aumentar quantidade"
            >
              +
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>de {qtyAvail}</span>
          </div>
        )}
      </div>

      <div className="o-price">
        <div className="p">{brl(lot.price)}</div>
        <div className="lt">preço unitário</div>

        {mine ? null : (
          <>
            {/* Total da quantidade escolhida — muda junto com o seletor. */}
            <div style={{ marginTop: '8px', fontWeight: 700, color: 'var(--text-strong)' }}>
              {brl(total)}
            </div>
            <button
              type="button"
              className="btn btn-gold"
              style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
              disabled={maxQty <= 0}
              onClick={() => onBuy(lot, chosen)}
            >
              {maxQty <= 0 ? 'Saldo insuf.' : 'Comprar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

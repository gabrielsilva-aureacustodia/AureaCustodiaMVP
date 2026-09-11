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

import { CoinArt } from '@/components/svg/CoinArt'
import { coinTypeInfo } from '@/domain/constants'
import { apelidoVendedor } from '@/domain/contraparte'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { Lot } from '@/domain/types'

export interface LotCardProps {
  lot: Lot
  /** true quando o anúncio é da própria sessão — esconde seletor e botão. */
  mine: boolean
  /** Quantidade guardada no seletor da página. undefined = nunca mexeram neste lote. */
  qtyEscolhida: number | undefined
  onAdjust(lotId: string, delta: number, max: number): void
  onBuy(lot: Lot, qty: number): void
}

export function LotCard({
  lot,
  mine,
  qtyEscolhida,
  onAdjust,
  onBuy,
}: LotCardProps): ReactNode {
  const qtyAvail = lot.coinIds.length

  /**
   * O TETO É O ESTOQUE, NÃO O SALDO — mudou em 11/09/2026.
   *
   * Até essa data o teto era `min(estoque, saldo / preço)`, e quem não tinha
   * depósito via o botão apagado com "Saldo insuf.". Isso trancava a compra
   * antes da modal, que é justamente onde existem as outras formas de pagar:
   * Pix e cartão, sem passar pelo saldo. Gabriel, em 11/09/2026: o usuário
   * deve poder escolher entre o dinheiro em depósito e o pagamento direto.
   *
   * Quem confere saldo de verdade continua sendo `buyLot()`, no servidor, e só
   * no caminho que usa saldo.
   */
  const maxQty = mine ? 0 : qtyAvail

  const chosen = Math.min(Math.max(qtyEscolhida ?? 1, 1), Math.max(maxQty, 1))
  const total = lot.price * chosen

  return (
    <div className="offer">
      {/* Antes era a <CoinSvg /> fixa da Bandeira: com um ativo só, a arte podia
          ser constante. Agora o disco desenha o motivo do tipo anunciado. */}
      <CoinArt type={lot.tipoMoeda} />

      <div className="o-info">
        <div className="o-name">
          {lot.tipoMoeda}
          {mine ? <span className="mine-badge">SEU ANÚNCIO</span> : null}
        </div>

        <div className="o-meta">
          {coinTypeInfo(lot.tipoMoeda).detail}
          <br />
          {/* O nome do vendedor saiu daqui em 10/09/2026 (D-5): mostrar quem é
              o dono de cada lote expunha dado pessoal de um cliente para todos
              os outros. O código anônimo deriva do id da oferta — ver
              domain/contraparte.ts. Na oferta da própria sessão continua
              'você', que é informação dele sobre ele. */}
          {qtyAvail} disponível(is) · {mine ? 'Vendedor: você' : apelidoVendedor(lot.lotId)} ·
          Publicado em {fdate(lot.createdAt)}
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
            {/* Sempre habilitado: a escolha da forma de pagamento é da modal. */}
            <button
              type="button"
              className="btn btn-gold"
              style={{ marginTop: '8px', padding: '8px 16px', fontSize: '13px' }}
              onClick={() => onBuy(lot, chosen)}
            >
              Comprar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

'use client'

import type { ReactNode } from 'react'

import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { fdatetime } from '@/domain/dates'
import { lotsFromOffers, posicaoNaFila } from '@/domain/market'
import { brl } from '@/domain/money'
import type { BuyOrder, Lot, Trade } from '@/domain/types'
import { cancelBid } from '@/server/actions/market'
import { cancelLot } from '@/server/actions/sell'
import { ModalEditarBid } from './ModalEditarBid'
import { ModalEditarLote } from './ModalEditarLote'

export function MinhasOfertas(): ReactNode {
  const { state, session, run } = useApp()
  const modal = useModal()

  const meusLotes = lotsFromOffers(state).filter((l) => l.seller === session)
  const meusBids = state.buyOrders.filter((b) => b.buyer === session)
  const temOfertas = meusLotes.length > 0 || meusBids.length > 0

  const minhasNegociacoes: Trade[] = state.trades
    .filter((t) => t.buyer === session || t.seller === session)
    .slice(-10)
    .reverse()

  function abrirEdicaoLote(lote: Lot): void {
    modal.open(<ModalEditarLote lote={lote} />)
  }

  function abrirEdicaoBid(bid: BuyOrder): void {
    modal.open(<ModalEditarBid bid={bid} />)
  }

  async function cancelarLote(lote: Lot): Promise<void> {
    await run(() => cancelLot(lote.lotId))
  }

  async function cancelarBid(bid: BuyOrder): Promise<void> {
    await run(() => cancelBid(bid.id))
  }

  return (
    <div className="panel" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg
            viewBox="0 0 24 24"
            style={{ width: 20, height: 20, stroke: 'var(--gold)', fill: 'none', strokeWidth: 2 }}
          >
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Minhas ofertas no mercado
        </h3>
        {(meusLotes.length > 0 || meusBids.length > 0) ? (
          <span className="badge" style={{ fontSize: 12, padding: '4px 10px' }}>
            {meusLotes.length + meusBids.length} ativa(s)
          </span>
        ) : null}
      </div>

      {!temOfertas ? (
        <div className="empty" style={{ padding: '16px', fontSize: 13 }}>
          Você não possui ofertas ativas no mercado no momento.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Lotes de Venda */}
          {meusLotes.map((lote) => {
            const coinIdPrimeira = lote.coinIds[0]
            const pos = coinIdPrimeira ? posicaoNaFila(state, 'venda', coinIdPrimeira) : null
            return (
              <div
                key={lote.lotId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'var(--card-bg, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'rgba(212, 175, 55, 0.15)',
                        color: 'var(--gold)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                      }}
                    >
                      VENDA
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{lote.tipoMoeda}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
                    <b>{lote.coinIds.length} moeda(s)</b> a <b>{brl(lote.price)}</b> cada
                    {lote.obs ? <span> · &ldquo;{lote.obs}&rdquo;</span> : null}
                    <br />
                    <span>Cadastrada em {fdatetime(lote.createdAt)}</span>
                  </div>
                  {pos ? (
                    <div style={{ fontSize: 12.5, color: 'var(--gold)', marginTop: 4, fontWeight: 500 }}>
                      {pos.posicao}ª na fila a {brl(lote.price)}
                      {pos.aFrente > 0
                        ? ` · ${pos.aFrente} oferta(s) à frente`
                        : ' · melhor preço no topo da fila'}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ minHeight: 44, minWidth: 44, padding: '8px 16px', fontSize: 13 }}
                    onClick={() => abrirEdicaoLote(lote)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ minHeight: 44, minWidth: 44, padding: '8px 16px', fontSize: 13 }}
                    onClick={() => void cancelarLote(lote)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )
          })}

          {/* Ordens de Compra (Bids) */}
          {meusBids.map((bid) => {
            const pos = posicaoNaFila(state, 'compra', bid.id)
            return (
              <div
                key={bid.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'var(--card-bg, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'rgba(76, 175, 80, 0.15)',
                        color: 'var(--green, #4caf50)',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                      }}
                    >
                      COMPRA
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{bid.tipoMoeda}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
                    <b>{bid.qty} moeda(s)</b> até <b>{brl(bid.price)}</b> cada
                    <br />
                    <span>Cadastrada em {fdatetime(bid.createdAt)}</span>
                  </div>
                  {pos ? (
                    <div style={{ fontSize: 12.5, color: 'var(--green, #4caf50)', marginTop: 4, fontWeight: 500 }}>
                      {pos.posicao}ª na fila a {brl(bid.price)}
                      {pos.aFrente > 0
                        ? ` · ${pos.aFrente} oferta(s) à frente`
                        : ' · maior lance no topo da fila'}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ minHeight: 44, minWidth: 44, padding: '8px 16px', fontSize: 13 }}
                    onClick={() => abrirEdicaoBid(bid)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ minHeight: 44, minWidth: 44, padding: '8px 16px', fontSize: 13 }}
                    onClick={() => void cancelarBid(bid)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Subseção: Executadas recentemente */}
      <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <h4
          style={{
            margin: '0 0 10px 0',
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--muted)',
          }}
        >
          Executadas recentemente
        </h4>

        {minhasNegociacoes.length === 0 ? (
          <div className="empty" style={{ padding: '10px 0', fontSize: 12.5 }}>
            Nenhuma negociação recente nesta conta.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {minhasNegociacoes.map((t, idx) => {
              const souVendedor = t.seller === session
              const dataFormatada = t.date ? fdatetime(t.date) : '—'
              const valorLiquido = (t.price * t.qty) - (t.feeVendedor ?? t.fee ?? 0)
              const valorTotalPago = (t.price * t.qty) + (t.feeComprador ?? 0)

              return (
                <div
                  key={`${t.date}-${t.buyer}-${t.seller}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--bg-subtle, rgba(255,255,255,0.02))',
                    border: '1px solid var(--border)',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: souVendedor ? 'var(--gold)' : 'var(--green, #4caf50)' }}>
                      {souVendedor ? 'Venda realizada: ' : 'Compra realizada: '}
                    </span>
                    <span>
                      {t.qty} {t.tipoMoeda} a {brl(t.price)} cada
                    </span>
                    <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
                      · {dataFormatada}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {souVendedor ? (
                      <span>Você recebeu: {brl(valorLiquido)}</span>
                    ) : (
                      <span>Total pago: {brl(valorTotalPago)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

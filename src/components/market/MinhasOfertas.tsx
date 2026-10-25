'use client'

import { useEffect, type ReactNode } from 'react'

import { useBloqueioPorPendencia } from '@/components/custody/useBloqueioPorPendencia'
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
import { Selo } from '@/components/ui/Selo'

export function MinhasOfertas(): ReactNode {
  const { state, session, run } = useApp()
  const { minhaContaBloqueada, consultar } = useBloqueioPorPendencia()
  const modal = useModal()

  useEffect(() => {
    void consultar()
  }, [consultar])

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
    <section className="panel minhas-ofertas" aria-labelledby="minhas-ofertas-titulo">
      <div className="panel-cab">
        <h3 id="minhas-ofertas-titulo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Minhas ofertas no mercado
        </h3>
        {temOfertas ? <Selo tom="ouro">{meusLotes.length + meusBids.length} ativa(s)</Selo> : null}
      </div>

      {minhaContaBloqueada ? (
        <div className="note" role="status">
          Seus anúncios estão pausados enquanto houver fatura de custódia vencida.
        </div>
      ) : null}

      {!temOfertas ? (
        <p className="minhas-vazio">Você não possui ofertas ativas no mercado no momento.</p>
      ) : (
        <ul className="minhas-lista">
          {/* Lotes de Venda */}
          {meusLotes.map((lote) => {
            const coinIdPrimeira = lote.coinIds[0]
            const pos = coinIdPrimeira ? posicaoNaFila(state, 'venda', coinIdPrimeira) : null
            const objeto = `o anúncio de ${lote.coinIds.length} ${lote.tipoMoeda} a ${brl(lote.price)}`
            return (
              <li key={lote.lotId} className="minha-oferta">
                <div className="mo-info">
                  <div className="mo-cab">
                    <span className="mo-lado venda">VENDA</span>
                    <span className="mo-tipo">{lote.tipoMoeda}</span>
                  </div>
                  <div className="mo-meta">
                    <b>{lote.coinIds.length} moeda(s)</b> a <b>{brl(lote.price)}</b> cada
                    {lote.obs ? <span> · &ldquo;{lote.obs}&rdquo;</span> : null}
                    <br />
                    <span>Cadastrada em {fdatetime(lote.createdAt)}</span>
                  </div>
                  {pos ? (
                    <div className="mo-fila venda">
                      {/* A FILA É ÚNICA, POR PREÇO-TEMPO, DENTRO DO TIPO DE MOEDA — não
                          uma fila por preço (regra protegida, ver CLAUDE.md). Um anúncio
                          pode ser o único no SEU preço e ainda assim ter ofertas mais
                          baratas de outros vendedores vendendo primeiro — elas são mais
                          baratas de verdade, então é assim que tem de ser. As duas
                          perguntas ("sou o 1º no meu preço?" e "quantos vendem antes de
                          mim, de qualquer preço?") aparecem separadas de propósito. */}
                      {pos.posicao}ª no seu preço de {brl(lote.price)}
                      {pos.aFrente > 0
                        ? ` · ${pos.aFrente} oferta(s) com preço melhor vendem primeiro`
                        : ' · nenhuma oferta com preço melhor'}
                    </div>
                  ) : null}
                </div>

                <div className="mo-acoes">
                  <button type="button" className="btn btn-outline" onClick={() => abrirEdicaoLote(lote)}>
                    Editar<span className="sr-only"> {objeto}</span>
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => void cancelarLote(lote)}>
                    Cancelar<span className="sr-only"> {objeto}</span>
                  </button>
                </div>
              </li>
            )
          })}

          {/* Ordens de Compra (Bids) */}
          {meusBids.map((bid) => {
            const pos = posicaoNaFila(state, 'compra', bid.id)
            const objeto = `a oferta de compra de ${bid.qty} ${bid.tipoMoeda} a ${brl(bid.price)}`
            return (
              <li key={bid.id} className="minha-oferta">
                <div className="mo-info">
                  <div className="mo-cab">
                    <span className="mo-lado compra">COMPRA</span>
                    <span className="mo-tipo">{bid.tipoMoeda}</span>
                  </div>
                  <div className="mo-meta">
                    <b>{bid.qty} moeda(s)</b> até <b>{brl(bid.price)}</b> cada
                    <br />
                    <span>Cadastrada em {fdatetime(bid.createdAt)}</span>
                  </div>
                  {pos ? (
                    <div className="mo-fila compra">
                      {pos.posicao}ª no seu preço de {brl(bid.price)}
                      {pos.aFrente > 0
                        ? ` · ${pos.aFrente} oferta(s) com lance maior compram primeiro`
                        : ' · nenhuma oferta com lance maior'}
                    </div>
                  ) : null}
                </div>

                <div className="mo-acoes">
                  <button type="button" className="btn btn-outline" onClick={() => abrirEdicaoBid(bid)}>
                    Editar<span className="sr-only"> {objeto}</span>
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => void cancelarBid(bid)}>
                    Cancelar<span className="sr-only"> {objeto}</span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Subseção: Executadas recentemente. Recolhida num <details> desde 25/10/2026: as dez
          linhas empurravam o livro de ofertas para baixo da dobra em /mercado, e o histórico é
          consulta, não o primeiro passo. O resumo diz quantas são; nada sumiu. */}
      <details className="mo-executadas">
        <summary>
          <h4>Executadas recentemente</h4>
          <span className="n">({minhasNegociacoes.length})</span>
        </summary>

        {minhasNegociacoes.length === 0 ? (
          <p className="minhas-vazio">Nenhuma negociação recente nesta conta.</p>
        ) : (
          <ul className="mo-exec-lista">
            {minhasNegociacoes.map((t, idx) => {
              const souVendedor = t.seller === session
              const dataFormatada = t.date ? fdatetime(t.date) : '—'
              const valorLiquido = (t.price * t.qty) - (t.feeVendedor ?? t.fee ?? 0)
              const valorTotalPago = (t.price * t.qty) + (t.feeComprador ?? 0)

              return (
                <li key={`${t.date}-${t.buyer}-${t.seller}-${idx}`} className="mo-exec">
                  <div>
                    <span className={souVendedor ? 'mo-exec-lado venda' : 'mo-exec-lado compra'}>
                      {souVendedor ? 'Venda realizada: ' : 'Compra realizada: '}
                    </span>
                    <span>
                      {t.qty} {t.tipoMoeda} a {brl(t.price)} cada
                    </span>
                    <span className="mo-exec-data">· {dataFormatada}</span>
                  </div>
                  <div className="mo-exec-valor">
                    {souVendedor ? (
                      <span>Você recebeu: {brl(valorLiquido)}</span>
                    ) : (
                      <span>Pago pelas moedas e taxa de compra: {brl(valorTotalPago)} (+ 1º mês de custódia)</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </details>
    </section>
  )
}

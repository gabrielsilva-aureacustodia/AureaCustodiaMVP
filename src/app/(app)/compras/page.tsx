'use client'

/**
 * TELA 1.1 — Compras.
 *
 * Movida para /compras na AG3.
 * Fazer oferta de compra, indicadores de mercado e regras de negociação.
 * As listas de ofertas de venda e compra ativas foram migradas para /mercado.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { ComoPrecoEFormado } from '@/components/market/ComoPrecoEFormado'
import { ComoNegociacaoAcontece } from '@/components/market/ComoNegociacaoAcontece'
import { MinhasOfertas } from '@/components/market/MinhasOfertas'
import { TipoSelector } from '@/components/market/TipoSelector'
import { useApp } from '@/components/providers/AppProvider'
import { useToast } from '@/components/ui/Toast'
import { tiposNegociaveis } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { comissaoPorMoeda, custoDeCompraPorMoeda } from '@/domain/fees'
import { avg7, fmtTrade, lastTrade, lotsFromOffers } from '@/domain/market'
import { brl, parsePrice } from '@/domain/money'
import { publishBid } from '@/server/actions/market'

const BID_INVALIDO_PUBLICAR = 'Informe quantidade e preço unitário válidos.'

export default function ComprasPage(): ReactNode {
  const { state, me, run, taxas, catalogo } = useApp()
  const toast = useToast()

  /** Tipos que a plataforma aceita negociar hoje — do catálogo vigente. */
  const NEGOCIAVEIS = tiposNegociaveis(catalogo)
  const primeiroTipo = NEGOCIAVEIS[0]?.key ?? ''

  /* ---------- estado de tela ---------- */
  const [tipoAtivo, setTipoAtivo] = useState<string>(primeiroTipo)
  const [bidQty, setBidQty] = useState('1')
  const [bidPrice, setBidPrice] = useState('')

  /* ---------- recortes do estado ---------- */
  const media7 = avg7(state, tipoAtivo)
  const ultima = lastTrade(state, tipoAtivo)

  const allLots = lotsFromOffers(state)
  const lotesPorTipo: Record<string, string> = {}
  NEGOCIAVEIS.forEach((t) => {
    const n = allLots.filter((l) => l.tipoMoeda === t.key).length
    lotesPorTipo[t.key] = `${n} anúncio(s) à venda`
  })

  const historico = state.trades
    .map((trade, idx) => ({ trade, idx }))
    .filter((h) => h.trade.tipoMoeda === tipoAtivo)
    .slice(-6)
    .reverse()

  const bidQtyNum = parseInt(bidQty, 10) || 0
  const bidPriceCents = parsePrice(bidPrice)
  const bidCustoUnit = bidPriceCents > 0 ? custoDeCompraPorMoeda(bidPriceCents, taxas) : 0
  const bidComissaoUnit = bidPriceCents > 0 ? comissaoPorMoeda(bidPriceCents, 'comprador', taxas) : 0
  const bidSubtotal = bidPriceCents > 0 && bidQtyNum > 0 ? bidPriceCents * bidQtyNum : 0
  const bidComissaoTotal = bidComissaoUnit * bidQtyNum
  const bidTotalComComissao = bidCustoUnit * bidQtyNum
  const bidMaxMoedasSaldo = bidCustoUnit > 0 ? Math.floor(me.balance / bidCustoUnit) : 0

  function trocarTipo(tipo: string): void {
    setTipoAtivo(tipo)
  }

  async function publicarBid(): Promise<void> {
    const qtyRaw = parseInt(bidQty, 10)
    if (!qtyRaw || qtyRaw <= 0 || bidPriceCents <= 0) {
      toast(BID_INVALIDO_PUBLICAR)
      return
    }
    const res = await run(() => publishBid(qtyRaw, bidPriceCents, tipoAtivo))
    if (res.ok) {
      setBidQty('1')
      setBidPrice('')
    }
  }

  return (
    <>
      <div className="cols">
        <div>
          <div className="panel" style={{ marginBottom: 18 }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M3 5h18l-7 8v6l-4 2v-8z" />
              </svg>
              Mercado
            </h3>

            <TipoSelector
              name="tipo-foco"
              titulo="Moeda em foco"
              tipos={NEGOCIAVEIS}
              valor={tipoAtivo}
              onChange={trocarTipo}
              detalhePorTipo={lotesPorTipo}
            />

            <div className="avg-box" style={{ marginTop: 14 }}>
              <div className="l">Média de mercado — 7 dias</div>
              <div className="v">{media7 ? brl(media7) : '—'}</div>
              <div className="s">{tipoAtivo} · negociações concluídas na plataforma</div>
            </div>

            <div className="avg-box">
              <div className="l">
                Última negociação{' '}
                <span className="sync-dot">
                  <i />
                  10s
                </span>
              </div>
              <div className="v" style={{ fontSize: '19px' }}>
                {ultima ? fmtTrade(ultima) : '—'}
              </div>
              <div className="s">
                {ultima ? fdate(ultima.date) : ''} · {tipoAtivo}
              </div>
            </div>

            <div className="hist">
              <div className="hist-head">Últimas negociações</div>
              {!historico.length ? (
                <div className="empty" style={{ marginTop: 8 }}>
                  Nenhuma negociação de {tipoAtivo} ainda.
                </div>
              ) : null}
              {historico.map(({ trade, idx }) => (
                <div className="hist-row" key={idx}>
                  <span className="d">{fdate(trade.date)}</span>
                  <span className="p">{fmtTrade(trade)}</span>
                </div>
              ))}
            </div>
          </div>

          <ComoPrecoEFormado tipoAtivo={tipoAtivo} media7={media7} style={{ marginBottom: 18 }} />
          <ComoNegociacaoAcontece />
        </div>

        <div>
          <div className="panel" style={{ marginBottom: '18px' }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M6 7h12l1.5 13h-15zM9 7a3 3 0 016 0" />
              </svg>
              Fazer oferta de compra
            </h3>

            <TipoSelector
              name="tipo-bid"
              titulo="Moeda que deseja comprar"
              tipos={NEGOCIAVEIS}
              valor={tipoAtivo}
              onChange={trocarTipo}
            />

            <div className="field-lbl">Quantidade desejada</div>
            <input
              id="bidQty"
              type="number"
              min="1"
              className="tinput"
              value={bidQty}
              onChange={(e) => setBidQty(e.target.value)}
            />

            <div className="field-lbl">Preço unitário máximo</div>
            <div className="price-input">
              <span>R$</span>
              <input
                id="bidPrice"
                inputMode="decimal"
                placeholder="0,00"
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
              />
            </div>

            <div className="summary-row">
              <span className="k">Subtotal das moedas</span>
              <span className="v">{bidSubtotal > 0 ? brl(bidSubtotal) : '—'}</span>
            </div>
            <div className="summary-row">
              <span className="k">Comissão de compra (estimada no seu preço máximo)</span>
              <span className="v">{bidComissaoTotal > 0 ? `+ ${brl(bidComissaoTotal)}` : '—'}</span>
            </div>
            <div className="summary-row total">
              <span className="k">Total com comissão</span>
              <span className="v" style={{ fontSize: '19px' }}>
                {bidTotalComComissao > 0 ? brl(bidTotalComComissao) : '—'}
              </span>
            </div>
            {bidPriceCents > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 12px' }}>
                Seu saldo permite até {bidMaxMoedasSaldo} moeda(s) neste preço.
              </div>
            )}

            <button type="button" className="btn btn-gold" onClick={() => void publicarBid()}>
              Publicar oferta de compra
            </button>

            <div className="note">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Se já existir uma oferta de venda de {tipoAtivo} igual ou abaixo desse preço, a compra
              acontece automaticamente ao publicar. Ofertas de outros tipos de moeda não são
              consideradas — cada tipo de moeda tem seu próprio livro.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <MinhasOfertas />
      </div>

      <div className="note" style={{ justifyContent: 'center', marginTop: '14px' }}>
        <svg viewBox="0 0 24 24">
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        </svg>
        Todas as moedas são armazenadas com segurança no Real Olímpico. A plataforma não recomenda
        preço; valores são definidos por oferta e demanda.
      </div>
    </>
  )
}

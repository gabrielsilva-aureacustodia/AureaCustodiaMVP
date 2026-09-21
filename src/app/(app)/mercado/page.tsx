'use client'

/**
 * TELA — Mercado.
 *
 * Criada na AG3, unindo as ofertas ativas (venda e compra) e os gráficos de
 * mercado (histórico de preços e comparativo simples com BTC/ETH/USDT).
 *
 * Estrutura da página:
 *  1. Topo: Minhas ofertas no mercado.
 *  2. Meio (lado a lado):
 *     - Ofertas de venda (com dropdown, paginação de 10 em 10, filtro de valor e filtro por tipo).
 *     - Ofertas de compra (com dropdown, paginação de 10 em 10, filtro de valor e filtro por tipo).
 *  3. Abaixo:
 *     - Gráfico histórico do Real Olímpico + 3 indicadores de mercado.
 *     - Bloco de Comparação simples (levando a /mercado/comparacoes).
 */

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { BidRow } from '@/components/market/BidRow'
import { LotCard } from '@/components/market/LotCard'
import { MinhasOfertas } from '@/components/market/MinhasOfertas'
import { ModalEditarBid } from '@/components/market/ModalEditarBid'
import { useBloqueioPorPendencia } from '@/components/custody/useBloqueioPorPendencia'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { ModalCadastro } from '@/components/account/ModalCadastro'
import { temCadastroCompleto } from '@/domain/cadastro'
import { COIN, LOGO_REAL_EMBLEMA, tiposNegociaveis } from '@/domain/constants'
import { comissaoPorMoeda } from '@/domain/fees'
import { fmtTrade, lastTrade, lotsFromOffers } from '@/domain/market'
import { brl, parsePrice } from '@/domain/money'
import { pctChange, roDailySeries } from '@/domain/selectors'
import type { Cents, CryptoData, Lot } from '@/domain/types'
import { buyLot, cancelBid } from '@/server/actions/market'
import { iniciarCompraDireta } from '@/server/actions/payments'
import type { CompraDiretaIniciada, MetodoDeposito } from '@/server/payments/tipos'
import { CHART_MOBILE_MAX_PX, marketChartSize } from '@/lib/charts'
import type { ChartPoint } from '@/lib/charts'
import { LineChart } from '@/components/charts/LineChart'
import { Sparkline } from '@/components/charts/Sparkline'
import { PERIOD_DAYS, PeriodTabs } from '@/components/reports/PeriodTabs'
import type { Period } from '@/components/reports/PeriodTabs'

/* ------------------------------------------------------------------------- */
/* Ganchos e auxiliares dos gráficos                                         */
/* ------------------------------------------------------------------------- */

function useGraficoMovel(): boolean {
  const [movel, setMovel] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${CHART_MOBILE_MAX_PX}px)`)
    const aplicar = (): void => setMovel(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  return movel
}

function useCotacoes(): CryptoData | null {
  const [dados, setDados] = useState<CryptoData | null>(null)

  useEffect(() => {
    let vivo = true
    void (async () => {
      try {
        const r = await fetch('/api/crypto')
        if (!r.ok) return
        const corpo = (await r.json()) as CryptoData
        if (vivo) setDados(corpo)
      } catch {
        // Cotação é acessória
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  return dados
}

function CompChip({ pct }: { pct: number | null }): ReactNode {
  if (pct === null) return <span className="comp-chip flat">—</span>

  const cls = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  return (
    <span className={`comp-chip ${cls}`}>
      {sign}
      {pct.toFixed(1).replace('.', ',')}%
    </span>
  )
}

interface LinhaComparacao {
  name: string
  color: string
  points: ChartPoint[]
  logo?: string
}

/* ------------------------------------------------------------------------- */
/* Página principal Mercado                                                  */
/* ------------------------------------------------------------------------- */

export default function MercadoPage(): ReactNode {
  const { state, session, run, catalogo } = useApp()
  const { vendedoresPausados, consultar } = useBloqueioPorPendencia()
  const modal = useModal()
  const router = useRouter()

  useEffect(() => {
    void consultar()
  }, [consultar])

  const NEGOCIAVEIS = tiposNegociaveis(catalogo)

  /* ---------- estado: ofertas de venda ---------- */
  const [abertoVenda, setAbertoVenda] = useState(true)
  const [tipoMoedaVenda, setTipoMoedaVenda] = useState<string>('todas')
  const [filMinVenda, setFilMinVenda] = useState('')
  const [filMaxVenda, setFilMaxVenda] = useState('')
  const [limiteVenda, setLimiteVenda] = useState(10)
  const [buyQty, setBuyQty] = useState<Record<string, number>>({})

  /* ---------- estado: ofertas de compra ---------- */
  const [abertoCompra, setAbertoCompra] = useState(true)
  const [tipoMoedaCompra, setTipoMoedaCompra] = useState<string>('todas')
  const [filMinCompra, setFilMinCompra] = useState('')
  const [filMaxCompra, setFilMaxCompra] = useState('')
  const [limiteCompra, setLimiteCompra] = useState(10)

  /* ---------- estado: gráficos ---------- */
  const [periodo, setPeriodo] = useState<Period>('M')
  const movel = useGraficoMovel()
  const cotacoes = useCotacoes()

  /* ---------- filtros e recortes: venda ---------- */
  const minVenda = parsePrice(filMinVenda)
  const maxVenda = parsePrice(filMaxVenda)
  const passaVenda = (p: Cents): boolean => (!minVenda || p >= minVenda) && (!maxVenda || p <= maxVenda)

  const lotsFiltrados = lotsFromOffers(state).filter((l) => {
    if (!passaVenda(l.price)) return false
    if (vendedoresPausados.includes(l.seller)) return false
    if (tipoMoedaVenda !== 'todas' && l.tipoMoeda !== tipoMoedaVenda) return false
    return true
  })
  const lotsVisiveis = lotsFiltrados.slice(0, limiteVenda)

  /* ---------- filtros e recortes: compra ---------- */
  const minCompra = parsePrice(filMinCompra)
  const maxCompra = parsePrice(filMaxCompra)
  const passaCompra = (p: Cents): boolean => (!minCompra || p >= minCompra) && (!maxCompra || p <= maxCompra)

  const bidsFiltrados = state.buyOrders
    .slice()
    .sort((a, b) => b.price - a.price || a.createdAt - b.createdAt)
    .filter((b) => {
      if (!passaCompra(b.price)) return false
      if (tipoMoedaCompra !== 'todas' && b.tipoMoeda !== tipoMoedaCompra) return false
      return true
    })
  const bidsVisiveis = bidsFiltrados.slice(0, limiteCompra)

  /* ---------- ações de compra de lotes ---------- */
  function ajustarQtd(lotId: string, delta: number, teto: number): void {
    setBuyQty((atual) => {
      let proximo = (atual[lotId] || 1) + delta
      if (proximo < 1) proximo = 1
      if (proximo > teto) proximo = teto
      return { ...atual, [lotId]: proximo }
    })
  }

  function esquecerQtd(lotId: string): void {
    setBuyQty((atual) => {
      const copia = { ...atual }
      delete copia[lotId]
      return copia
    })
  }

  function confirmarCompra(lot: Lot, qty: number): void {
    modal.open(
      <ConfirmarCompraModal lot={lot} qty={qty} aoConcluir={() => esquecerQtd(lot.lotId)} />,
    )
  }

  /* ---------- dados dos gráficos ---------- */
  const dias = PERIOD_DAYS[periodo]
  const roPts: ChartPoint[] = roDailySeries(state, dias, COIN.name).map((p) => ({
    t: p.t,
    v: p.v / 100,
  }))
  const tamanho = marketChartSize(movel)

  const cs = cotacoes ? cotacoes.series : []
  const ro30 = roDailySeries(state, 30, COIN.name)
  const linhas: LinhaComparacao[] = [
    { name: 'Real Olímpico', color: 'var(--gold)', points: ro30, logo: LOGO_REAL_EMBLEMA },
    { name: 'BTC', color: '#f7931a', points: cs.map((x) => ({ t: x.t, v: x.btc })) },
    { name: 'ETH', color: '#627eea', points: cs.map((x) => ({ t: x.t, v: x.eth })) },
    { name: 'USDT', color: '#26a17b', points: cs.map((x) => ({ t: x.t, v: x.usdt })) },
  ]

  const totalCoins = Object.values(state.users).reduce((s, x) => s + x.coins.length, 0)
  const vol = state.trades.reduce((s, t) => s + t.price * (t.qty || 1), 0)
  const lt = lastTrade(state)

  return (
    <>
      {/* 1. Minhas ofertas no mercado — no topo */}
      <div style={{ marginBottom: 24 }}>
        <MinhasOfertas />
      </div>

      {/* 2. Ofertas de venda e Ofertas de compra — lado a lado */}
      <div className="cols">
        {/* Bloco 1: Ofertas de venda */}
        <div>
          <div className="panel" style={{ marginBottom: 18 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAbertoVenda((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setAbertoVenda((v) => !v)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: abertoVenda ? 14 : 0,
              }}
              aria-expanded={abertoVenda}
            >
              <h3 style={{ margin: 0 }}>
                <svg viewBox="0 0 24 24">
                  <ellipse cx="12" cy="6.5" rx="7" ry="3" />
                  <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
                </svg>
                Ofertas de venda ({lotsFiltrados.length})
              </h3>
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: 18,
                  height: 18,
                  stroke: 'currentColor',
                  fill: 'none',
                  strokeWidth: 2,
                  transform: abertoVenda ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {abertoVenda ? (
              <>
                {/* Botões simples de filtro por tipo de moeda */}
                <div style={{ marginBottom: 12 }}>
                  <div className="field-lbl" style={{ marginBottom: 6 }}>
                    Filtrar por tipo
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={tipoMoedaVenda === 'todas' ? 'btn btn-gold' : 'btn btn-outline'}
                      style={{ padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                      onClick={() => setTipoMoedaVenda('todas')}
                    >
                      Todas
                    </button>
                    {NEGOCIAVEIS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        className={tipoMoedaVenda === t.key ? 'btn btn-gold' : 'btn btn-outline'}
                        style={{ padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                        onClick={() => setTipoMoedaVenda(t.key)}
                      >
                        {t.key}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtrar por valor dentro do bloco */}
                <div
                  style={{
                    marginBottom: 16,
                    padding: '10px 12px',
                    background: 'var(--input-bg)',
                    borderRadius: 8,
                    border: '1px solid var(--line-soft)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: 8,
                    }}
                  >
                    Filtrar por valor
                  </div>
                  <div className="filter-row" style={{ gap: 8 }}>
                    <div className="ffield">
                      <label htmlFor="filMinVenda" style={{ fontSize: 11 }}>
                        Mínimo
                      </label>
                      <input
                        id="filMinVenda"
                        className="tinput"
                        placeholder="R$ 0,00"
                        value={filMinVenda}
                        onChange={(e) => setFilMinVenda(e.target.value)}
                      />
                    </div>
                    <div className="ffield">
                      <label htmlFor="filMaxVenda" style={{ fontSize: 11 }}>
                        Máximo
                      </label>
                      <input
                        id="filMaxVenda"
                        className="tinput"
                        placeholder="Sem limite"
                        value={filMaxVenda}
                        onChange={(e) => setFilMaxVenda(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ alignSelf: 'flex-end', minHeight: 36, padding: '0 12px' }}
                      onClick={() => {
                        setFilMinVenda('')
                        setFilMaxVenda('')
                      }}
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Lista de lotes com paginação de 10 em 10 */}
                {lotsVisiveis.length ? (
                  <>
                    {lotsVisiveis.map((lot) => (
                      <LotCard
                        key={lot.lotId}
                        lot={lot}
                        mine={lot.seller === session}
                        qtyEscolhida={buyQty[lot.lotId]}
                        onAdjust={ajustarQtd}
                        onBuy={confirmarCompra}
                      />
                    ))}
                    {lotsFiltrados.length > limiteVenda ? (
                      <div style={{ textAlign: 'center', marginTop: 14 }}>
                        <div
                          style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}
                        >
                          Exibindo {lotsVisiveis.length} de {lotsFiltrados.length} oferta(s)
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ width: '100%' }}
                          onClick={() => setLimiteVenda((prev) => prev + 10)}
                        >
                          Ver mais (+10)
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="empty">Nenhuma oferta de venda encontrada para este filtro.</div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Bloco 2: Ofertas de compra */}
        <div>
          <div className="panel" style={{ marginBottom: 18 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setAbertoCompra((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setAbertoCompra((v) => !v)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: abertoCompra ? 14 : 0,
              }}
              aria-expanded={abertoCompra}
            >
              <h3 style={{ margin: 0 }}>
                <svg viewBox="0 0 24 24">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                Ofertas de compra ({bidsFiltrados.length})
              </h3>
              <svg
                viewBox="0 0 24 24"
                style={{
                  width: 18,
                  height: 18,
                  stroke: 'currentColor',
                  fill: 'none',
                  strokeWidth: 2,
                  transform: abertoCompra ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {abertoCompra ? (
              <>
                {/* Botões simples de filtro por tipo de moeda */}
                <div style={{ marginBottom: 12 }}>
                  <div className="field-lbl" style={{ marginBottom: 6 }}>
                    Filtrar por tipo
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={tipoMoedaCompra === 'todas' ? 'btn btn-gold' : 'btn btn-outline'}
                      style={{ padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                      onClick={() => setTipoMoedaCompra('todas')}
                    >
                      Todas
                    </button>
                    {NEGOCIAVEIS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        className={tipoMoedaCompra === t.key ? 'btn btn-gold' : 'btn btn-outline'}
                        style={{ padding: '4px 10px', fontSize: 12, minHeight: 32 }}
                        onClick={() => setTipoMoedaCompra(t.key)}
                      >
                        {t.key}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtrar por valor dentro do bloco */}
                <div
                  style={{
                    marginBottom: 16,
                    padding: '10px 12px',
                    background: 'var(--input-bg)',
                    borderRadius: 8,
                    border: '1px solid var(--line-soft)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      marginBottom: 8,
                    }}
                  >
                    Filtrar por valor
                  </div>
                  <div className="filter-row" style={{ gap: 8 }}>
                    <div className="ffield">
                      <label htmlFor="filMinCompra" style={{ fontSize: 11 }}>
                        Mínimo
                      </label>
                      <input
                        id="filMinCompra"
                        className="tinput"
                        placeholder="R$ 0,00"
                        value={filMinCompra}
                        onChange={(e) => setFilMinCompra(e.target.value)}
                      />
                    </div>
                    <div className="ffield">
                      <label htmlFor="filMaxCompra" style={{ fontSize: 11 }}>
                        Máximo
                      </label>
                      <input
                        id="filMaxCompra"
                        className="tinput"
                        placeholder="Sem limite"
                        value={filMaxCompra}
                        onChange={(e) => setFilMaxCompra(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ alignSelf: 'flex-end', minHeight: 36, padding: '0 12px' }}
                      onClick={() => {
                        setFilMinCompra('')
                        setFilMaxCompra('')
                      }}
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Lista de ofertas de compra com paginação de 10 em 10 */}
                {bidsVisiveis.length ? (
                  <>
                    {bidsVisiveis.map((bid) => (
                      <BidRow
                        key={bid.id}
                        bid={bid}
                        mine={bid.buyer === session}
                        onEdit={(b) => modal.open(<ModalEditarBid bid={b} />)}
                        onCancel={(b) => void run(() => cancelBid(b.id))}
                      />
                    ))}
                    {bidsFiltrados.length > limiteCompra ? (
                      <div style={{ textAlign: 'center', marginTop: 14 }}>
                        <div
                          style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}
                        >
                          Exibindo {bidsVisiveis.length} de {bidsFiltrados.length} oferta(s)
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ width: '100%' }}
                          onClick={() => setLimiteCompra((prev) => prev + 10)}
                        >
                          Ver mais (+10)
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="empty">Nenhuma oferta de compra encontrada para este filtro.</div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* 3. Os gráficos — logo abaixo */}
      <div className="cols-rev" style={{ marginTop: 24 }}>
        <div>
          {/* Preço médio histórico */}
          <div className="panel" style={{ marginBottom: 18 }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M3 17l5-6 4 4 6-8 3 4" />
              </svg>
              Real Olímpico — Preço médio histórico
            </h3>

            <PeriodTabs value={periodo} onChange={setPeriodo} />

            <LineChart
              series={[{ points: roPts, color: 'var(--gold)', width: 2.4 }]}
              width={tamanho.width}
              height={tamanho.height}
              fontSize={tamanho.fontSize}
              formatY={(v) => 'R$ ' + v.toFixed(0)}
            />
          </div>

          {/* Três indicadores */}
          <div className="stats">
            <div className="stat">
              <div className="stat-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <div className="lbl">Moedas em custódia</div>
                <div className="val">{totalCoins}</div>
              </div>
            </div>

            <div className="stat">
              <div className="stat-ico">
                <svg viewBox="0 0 24 24">
                  <ellipse cx="12" cy="6.5" rx="7" ry="3" />
                  <path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
                </svg>
              </div>
              <div>
                <div className="lbl">Volume negociado</div>
                <div className="val">{brl(vol)}</div>
              </div>
            </div>

            <div className="stat">
              <div className="stat-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M5 21V4M5 4h13l-3 4 3 4H5" />
                </svg>
              </div>
              <div>
                <div className="lbl">
                  Última negociação{' '}
                  <span className="sync-dot">
                    <i />
                    10s
                  </span>
                </div>
                <div className="val small">{lt ? fmtTrade(lt) : '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparação simples (coluna estreita) */}
        <div>
          <div className="panel">
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M12 3v18M8 7h6a3 3 0 010 6H9a3 3 0 000 6h7" />
              </svg>
              Comparação simples
            </h3>

            {cs.length ? (
              linhas.map((linha) => (
                <div
                  key={linha.name}
                  className="comp-row"
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push('/mercado/comparacoes')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') router.push('/mercado/comparacoes')
                  }}
                >
                  <span className="cname">
                    {linha.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={linha.logo}
                        alt=""
                        width={20}
                        height={20}
                        style={{ borderRadius: '50%', marginRight: 6, verticalAlign: 'middle' }}
                      />
                    ) : null}
                    {linha.name}
                  </span>
                  <Sparkline points={linha.points} color={linha.color} width={140} height={26} />
                  <CompChip pct={pctChange(linha.points.map((p) => p.v))} />
                </div>
              ))
            ) : (
              <div className="empty">Carregando cotações…</div>
            )}
            <div className="note">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Clique para abrir a comparação completa. Dados atualizados a cada login.
            </div>
          </div>
        </div>
      </div>

      <div className="note" style={{ justifyContent: 'center', marginTop: '24px' }}>
        <svg viewBox="0 0 24 24">
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        </svg>
        Todas as moedas são armazenadas com segurança no Real Olímpico. A plataforma não recomenda
        preço; valores são definidos por oferta e demanda.
      </div>
    </>
  )
}

/* ===========================================================================
 * Modais
 * =========================================================================*/

function ConfirmarCompraModal({
  lot,
  qty,
  aoConcluir,
}: {
  lot: Lot
  qty: number
  aoConcluir(): void
}): ReactNode {
  const { me, run, taxas } = useApp()
  const { close, open } = useModal()

  const [enviando, setEnviando] = useState(false)
  const [pix, setPix] = useState<CompraDiretaIniciada | null>(null)
  const [erroMp, setErroMp] = useState('')

  const subtotal = lot.price * qty
  const comissaoComprador = comissaoPorMoeda(lot.price, 'comprador', taxas) * qty
  const total = subtotal + comissaoComprador
  const temSaldo = me.balance >= total

  async function confirmarComSaldo(): Promise<void> {
    close()
    const res = await run(() => buyLot(lot.lotId, qty))
    if (res.ok) aoConcluir()
  }

  async function cobrarDireto(metodo: MetodoDeposito): Promise<void> {
    if (!temCadastroCompleto(me)) {
      open(
        <ModalCadastro
          motivo="compra"
          onSuccess={() => {
            open(<ConfirmarCompraModal lot={lot} qty={qty} aoConcluir={aoConcluir} />)
          }}
        />,
      )
      return
    }

    setEnviando(true)
    setErroMp('')
    try {
      const res = await iniciarCompraDireta(lot.lotId, qty, metodo)
      if (!res.ok || !res.data) {
        setErroMp(res.error ?? 'Não foi possível abrir a cobrança no gateway.')
        return
      }
      if (res.data.simulado) {
        setErroMp('O meio de pagamento está temporariamente indisponível. Nenhuma cobrança foi aberta.')
        return
      }
      if (metodo === 'pix') {
        setPix(res.data)
        return
      }
      if (res.data.initPoint) {
        window.open(res.data.initPoint, '_blank', 'noopener,noreferrer')
      } else {
        setErroMp('O gateway não devolveu o endereço do checkout. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <h3 className="serif">Confirmar compra</h3>
      <p style={{ marginBottom: 12 }}>
        <b style={{ color: 'var(--gold)' }}>{lot.tipoMoeda}</b> · {qty} unidade(s)
      </p>

      <div className="summary-row">
        <span className="k">Preço unitário</span>
        <span className="v">{brl(lot.price)}</span>
      </div>
      <div className="summary-row">
        <span className="k">Quantidade</span>
        <span className="v">{qty} unidade(s)</span>
      </div>
      <div className="summary-row">
        <span className="k">Subtotal das moedas</span>
        <span className="v">{brl(subtotal)}</span>
      </div>
      <div className="summary-row">
        <span className="k">Comissão de compra do Real Olímpico</span>
        <span className="v">+ {brl(comissaoComprador)}</span>
      </div>
      <div className="summary-row total">
        <span className="k">Total a pagar</span>
        <span className="v" style={{ fontWeight: 600 }}>
          {brl(total)}
        </span>
      </div>
      <div className="summary-row">
        <span className="k">Seu saldo em conta</span>
        <span className="v">{brl(me.balance)}</span>
      </div>

      {/* Opção 1: Saldo em conta */}
      <div
        style={{
          marginTop: 14,
          padding: '12px 14px',
          background: 'var(--input-bg)',
          borderRadius: 8,
          border: '1px solid var(--line-soft)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 4 }}>
          Opção 1 · Usar saldo disponível
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {temSaldo
            ? `O total de ${brl(total)} (incluindo ${brl(comissaoComprador)} de comissão de compra) será debitado do seu saldo interno.`
            : `Saldo insuficiente para comprar esta quantidade com comissão (faltam ${brl(total - me.balance)}).`}
        </div>
        <button
          type="button"
          className={temSaldo ? 'btn btn-gold' : 'btn btn-outline'}
          style={{ width: '100%' }}
          disabled={!temSaldo || enviando}
          onClick={() => void confirmarComSaldo()}
        >
          {temSaldo ? 'Pagar com saldo em conta' : 'Saldo insuficiente'}
        </button>
      </div>

      {/* Opção 2: Compra direta pelo gateway */}
      <div
        style={{
          marginTop: 12,
          padding: '12px 14px',
          background: 'var(--input-bg)',
          borderRadius: 8,
          border: '1px solid var(--line-soft)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 4 }}>
          Opção 2 · Comprar direto pelo gateway
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          Pague {brl(total)} direto por Pix ou cartão — as moedas e a comissão de compra —, sem
          usar o saldo em conta. A moeda entra no seu acervo assim que o pagamento for aprovado.
          Se, nessa hora, o anúncio já tiver sido vendido, tiver subido de preço ou estiver
          pausado, o valor pago entra inteiro no seu saldo em conta.
        </div>
        <div className="m-actions" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={enviando}
            onClick={() => void cobrarDireto('pix')}
          >
            Pagar com Pix
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={enviando}
            onClick={() => void cobrarDireto('checkout_pro')}
          >
            Cartão ou boleto
          </button>
        </div>
      </div>

      {erroMp ? (
        <div className="note" style={{ marginTop: 12 }}>
          {erroMp}
        </div>
      ) : null}

      {pix ? (
        <div style={{ marginTop: 14 }}>
          <div className="field-lbl">Pix copia e cola</div>
          <textarea
            readOnly
            rows={3}
            aria-label="Código Pix copia e cola"
            value={pix.qrCode ?? ''}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          />
          {pix.qrCodeBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code do Pix"
              style={{ display: 'block', width: 180, height: 180, margin: '12px auto' }}
            />
          ) : null}
          <div className="note">
            Referência {pix.externalReference} · {brl(pix.valorCents)}, com a comissão de compra.
            Assim que o pagamento for confirmado pelo gateway, o lote é liquidado e as moedas
            entram na sua conta.
          </div>
        </div>
      ) : null}

      <div className="m-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-outline" onClick={close}>
          Fechar
        </button>
      </div>
    </>
  )
}

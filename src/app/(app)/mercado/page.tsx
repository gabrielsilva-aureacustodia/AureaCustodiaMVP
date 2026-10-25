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

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { BidRow } from '@/components/market/BidRow'
import { LinhaCustodiaNaCompra } from '@/components/market/LinhaCustodiaNaCompra'
import { LotCard } from '@/components/market/LotCard'
import { MinhasOfertas } from '@/components/market/MinhasOfertas'
import { ModalEditarBid } from '@/components/market/ModalEditarBid'
import { useBloqueioPorPendencia } from '@/components/custody/useBloqueioPorPendencia'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { ModalCadastro } from '@/components/account/ModalCadastro'
import { temCadastroCompleto } from '@/domain/cadastro'
import { COIN, LOGO_REAL_EMBLEMA, tiposNegociaveis } from '@/domain/constants'
import { comissaoPorMoeda, custodiaDaCompraPorMoeda } from '@/domain/fees'
import { destaqueDeMercado } from '@/domain/destaques-de-mercado'
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
import { CoinArt } from '@/components/svg/CoinArt'
import { PERIOD_DAYS, PeriodTabs } from '@/components/reports/PeriodTabs'
import type { Period } from '@/components/reports/PeriodTabs'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { Esqueleto } from '@/components/ui/Esqueleto'

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
      {/* 0. COTAÇÃO POR MOEDA (25/10/2026). Um cartão por tipo negociável com o que importa antes de
          agir — a menor oferta de venda (quanto custa comprar agora), a maior oferta de compra (quanto
          pagam agora) e a última negociação —, como o "Buy now / Highest offer" do StockX (BENCHMARK.md
          §1.3). Tudo lido do estado que a tela já tem; "Ver no livro" só ajusta os filtros abaixo. */}
      <section className="cotacoes" aria-labelledby="cotacoes-t">
        <h2 id="cotacoes-t" className="secao-titulo">
          Cotação por moeda
        </h2>
        <div className="cotacoes-grade">
          {NEGOCIAVEIS.map((t) => {
            const vendas = lotsFromOffers(state).filter(
              (l) => l.tipoMoeda === t.key && !vendedoresPausados.includes(l.seller),
            )
            const menorVenda = vendas.length ? Math.min(...vendas.map((l) => l.price)) : null
            const d = destaqueDeMercado(state, t.key)
            const ultima = lastTrade(state, t.key)
            return (
              <article key={t.key} className="cotacao">
                <div className="cotacao-cab">
                  <CoinArt type={t.key} />
                  <div>
                    <h3 className="cotacao-nome">{t.key}</h3>
                    <p className="cotacao-sub">{vendas.length} anúncio(s) à venda</p>
                  </div>
                </div>
                <dl className="cotacao-numeros">
                  <div>
                    <dt>Comprar agora a partir de</dt>
                    <dd className={menorVenda === null ? 'sem-valor' : 'ouro'}>
                      {menorVenda === null ? 'Sem oferta de venda' : brl(menorVenda)}
                    </dd>
                  </div>
                  <div>
                    <dt>Maior oferta de compra</dt>
                    <dd className={d.maiorOfertaDeCompra === null ? 'sem-valor' : 'verde'}>
                      {d.maiorOfertaDeCompra === null ? 'Sem oferta de compra' : brl(d.maiorOfertaDeCompra)}
                    </dd>
                  </div>
                  <div>
                    <dt>Última negociação</dt>
                    <dd className={ultima ? undefined : 'sem-valor'}>{ultima ? fmtTrade(ultima) : '—'}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="btn btn-outline cotacao-ver"
                  onClick={() => {
                    setTipoMoedaVenda(t.key)
                    setTipoMoedaCompra(t.key)
                    setAbertoVenda(true)
                    setAbertoCompra(true)
                    // Rolagem suave só para quem não pediu menos movimento ao sistema.
                    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                    document.getElementById('livro')?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' })
                  }}
                >
                  Ver no livro<span className="sr-only"> as ofertas de {t.key}</span>
                </button>
              </article>
            )
          })}
        </div>
      </section>

      {/* 1. Minhas ofertas no mercado — no topo */}
      <MinhasOfertas />

      {/* 2. O livro: ofertas de venda e de compra lado a lado (uma coluna no celular). */}
      <div className="livro" id="livro">
        <section className="panel livro-lado" aria-labelledby="livro-venda-titulo">
          <h3 id="livro-venda-titulo">
            <button
              type="button"
              className="panel-toggle"
              aria-expanded={abertoVenda}
              aria-controls="livro-venda"
              onClick={() => setAbertoVenda((v) => !v)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <ellipse cx="12" cy="6.5" rx="7" ry="3" />
                <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
              </svg>
              Ofertas de venda <span className="n">({lotsFiltrados.length})</span>
              <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </h3>

          {abertoVenda ? (
            <div id="livro-venda">
              <FiltrosDoLivro
                lado="venda"
                tipos={NEGOCIAVEIS.map((t) => t.key)}
                tipo={tipoMoedaVenda}
                onTipo={setTipoMoedaVenda}
                min={filMinVenda}
                max={filMaxVenda}
                onMin={setFilMinVenda}
                onMax={setFilMaxVenda}
              />

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
                    <div className="livro-mais">
                      <p>
                        Exibindo {lotsVisiveis.length} de {lotsFiltrados.length} oferta(s)
                      </p>
                      <button type="button" className="btn btn-outline" onClick={() => setLimiteVenda((prev) => prev + 10)}>
                        Ver mais ofertas de venda (+10)
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <EstadoVazio
                  titulo="Nenhuma oferta de venda encontrada para este filtro."
                  ilustracao="semOrdens"
                >
                  Troque o tipo de moeda ou a faixa de valor. Para comprar mesmo assim, publique uma oferta de
                  compra em Compras: a negociação acontece quando alguém vender no seu preço.
                </EstadoVazio>
              )}
            </div>
          ) : null}
        </section>

        <section className="panel livro-lado" aria-labelledby="livro-compra-titulo">
          <h3 id="livro-compra-titulo">
            <button
              type="button"
              className="panel-toggle"
              aria-expanded={abertoCompra}
              aria-controls="livro-compra"
              onClick={() => setAbertoCompra((v) => !v)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              Ofertas de compra <span className="n">({bidsFiltrados.length})</span>
              <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </h3>

          {abertoCompra ? (
            <div id="livro-compra">
              <FiltrosDoLivro
                lado="compra"
                tipos={NEGOCIAVEIS.map((t) => t.key)}
                tipo={tipoMoedaCompra}
                onTipo={setTipoMoedaCompra}
                min={filMinCompra}
                max={filMaxCompra}
                onMin={setFilMinCompra}
                onMax={setFilMaxCompra}
              />

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
                    <div className="livro-mais">
                      <p>
                        Exibindo {bidsVisiveis.length} de {bidsFiltrados.length} oferta(s)
                      </p>
                      <button type="button" className="btn btn-outline" onClick={() => setLimiteCompra((prev) => prev + 10)}>
                        Ver mais ofertas de compra (+10)
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <EstadoVazio
                  titulo="Nenhuma oferta de compra encontrada para este filtro."
                  ilustracao="semOrdens"
                >
                  Quando alguém publicar uma oferta de compra deste tipo e nesta faixa de valor, ela aparece aqui.
                </EstadoVazio>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {/* 3. Os gráficos — logo abaixo */}
      <div className="cols-rev mercado-graficos">
        {/* Preço médio histórico */}
        <div className="panel">
          <h3>
            <svg viewBox="0 0 24 24" aria-hidden="true">
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

          {/* Os três números da plataforma, logo abaixo do gráfico (onde o desenho original os punha). */}
        <section className="kpis" aria-label="O mercado agora">
          <div className="kpi">
            <div className="lbl">Moedas em custódia</div>
            <div className="val">{totalCoins}</div>
          </div>
          <div className="kpi">
            <div className="lbl">Volume negociado</div>
            <div className="val ouro">{brl(vol)}</div>
          </div>
          <div className="kpi">
            <div className="lbl">
              Última negociação{' '}
              <span className="sync-dot">
                <i />
                10s
              </span>
            </div>
            <div className="val">{lt ? fmtTrade(lt) : '—'}</div>
            {lt ? <div className="sub">{lt.tipoMoeda}</div> : null}
          </div>
        </section>
        </div>

        {/* Comparação simples (coluna estreita). Cada linha é um link de verdade desde
            25/10/2026 — era uma <div role="link"> com router.push. */}
        <div className="panel">
          <h3>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v18M8 7h6a3 3 0 010 6H9a3 3 0 000 6h7" />
            </svg>
            Comparação simples
          </h3>

          {cs.length ? (
            linhas.map((linha) => (
              <Link key={linha.name} className="comp-row" href="/mercado/comparacoes">
                <span className="cname">
                  {linha.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={linha.logo} alt="" width={20} height={20} className="comp-logo" />
                  ) : null}
                  {linha.name}
                  <span className="sr-only"> — abrir a comparação completa</span>
                </span>
                <Sparkline points={linha.points} color={linha.color} width={140} height={26} />
                <CompChip pct={pctChange(linha.points.map((p) => p.v))} />
              </Link>
            ))
          ) : (
            <div className="carregando" role="status" aria-busy="true" aria-label="Carregando cotações">
              <Esqueleto altura="14px" largura="100%" />
              <Esqueleto altura="14px" largura="82%" />
              <Esqueleto altura="14px" largura="64%" />
            </div>
          )}
          <div className="note">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.5" />
            </svg>
            Clique para abrir a comparação completa. Dados atualizados a cada login.
          </div>
        </div>
      </div>

      <div className="note nota-rodape">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        </svg>
        Todas as moedas são armazenadas com segurança no Real Olímpico. A plataforma não recomenda
        preço; valores são definidos por oferta e demanda.
      </div>
    </>
  )
}

/* ------------------------------------------------------------------------- */
/* Filtros de um lado do livro                                               */
/* ------------------------------------------------------------------------- */

/**
 * Os filtros que se repetiam idênticos nos dois lados do livro (tipo de moeda e faixa de valor),
 * agora escritos uma vez. Mesmo estado e mesmas regras de antes — quem guarda os valores continua
 * sendo a página.
 *
 * O tipo virou chips com `aria-pressed` (eram botões dourados e contornados, e o dourado é da ação
 * primária da tela). A faixa de valor fica num <details>: é refinamento, não o primeiro passo, e
 * no celular empurrava a lista para baixo. Com valor digitado ele nasce aberto e o resumo diz isso.
 */
function FiltrosDoLivro({
  lado,
  tipos,
  tipo,
  onTipo,
  min,
  max,
  onMin,
  onMax,
}: {
  lado: 'venda' | 'compra'
  tipos: string[]
  tipo: string
  onTipo(t: string): void
  min: string
  max: string
  onMin(v: string): void
  onMax(v: string): void
}): ReactNode {
  const sufixo = lado === 'venda' ? 'Venda' : 'Compra'
  const ladoTexto = lado === 'venda' ? 'das ofertas de venda' : 'das ofertas de compra'
  const comValor = Boolean(min || max)
  return (
    <div className="livro-filtros">
      <div className="chips" role="group" aria-label={`Filtrar ${ladoTexto} por tipo de moeda`}>
        {['todas', ...tipos].map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={tipo === t} onClick={() => onTipo(t)}>
            {t === 'todas' ? 'Todas' : t}
          </button>
        ))}
      </div>

      <details className="filtro-valor" open={comValor || undefined}>
        <summary>Filtrar por valor{comValor ? ' (ativo)' : ''}</summary>
        <div className="filter-row">
          <div className="ffield">
            <label htmlFor={`filMin${sufixo}`}>Mínimo (R$)</label>
            <input
              id={`filMin${sufixo}`}
              className="tinput"
              inputMode="decimal"
              autoComplete="off"
              placeholder="R$ 0,00"
              value={min}
              onChange={(e) => onMin(e.target.value)}
            />
          </div>
          <div className="ffield">
            <label htmlFor={`filMax${sufixo}`}>Máximo (R$)</label>
            <input
              id={`filMax${sufixo}`}
              className="tinput"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Sem limite"
              value={max}
              onChange={(e) => onMax(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              onMin('')
              onMax('')
            }}
          >
            Limpar<span className="sr-only"> o filtro de valor {ladoTexto}</span>
          </button>
        </div>
      </details>
    </div>
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
  // O primeiro mês de custódia entra na compra (21/10/2026): a moeda que passa a ser sua já nasce com a guarda paga.
  const custodia = custodiaDaCompraPorMoeda(taxas) * qty
  const total = subtotal + comissaoComprador + custodia
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
        setErroMp(res.error ?? 'Não foi possível abrir a cobrança. Tente novamente.')
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
        setErroMp('Não foi possível abrir a tela de pagamento. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <h3 className="serif">Confirmar compra</h3>
      <p className="modal-sub">
        <b>{lot.tipoMoeda}</b> · {qty} unidade(s)
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
        <span className="k">Taxa de compra do Real Olímpico</span>
        <span className="v">+ {brl(comissaoComprador)}</span>
      </div>
      <LinhaCustodiaNaCompra cents={custodia} />
      <div className="summary-row total">
        <span className="k">Total a pagar</span>
        <span className="v">{brl(total)}</span>
      </div>
      <div className="summary-row">
        <span className="k">Seu saldo em conta</span>
        <span className="v">{brl(me.balance)}</span>
      </div>

      {/* O NOME DA OPÇÃO É O QUE ELA FAZ (27/09/2026). Era "Opção 1 · Usar
          saldo disponível" e "Opção 2 · Comprar direto pelo gateway" —
          "gateway" é palavra de quem escreve o código, não de quem compra, e
          numerar as opções gasta a linha mais visível do bloco sem dizer nada.
          Agora o título é a própria escolha. */}
      <div className="caixa-pag">
        <div className="t">Comprar com saldo</div>
        <div className="d" id="compra-saldo-motivo">
          {temSaldo
            ? `O total de ${brl(total)} (incluindo ${brl(comissaoComprador)} de taxa de compra e ${brl(custodia)} do primeiro mês de custódia) será debitado do seu saldo em conta.`
            : `Saldo insuficiente para comprar esta quantidade (faltam ${brl(total - me.balance)}).`}
        </div>
        <button
          type="button"
          className={temSaldo ? 'btn btn-gold' : 'btn btn-outline'}
          aria-describedby="compra-saldo-motivo"
          disabled={!temSaldo || enviando}
          onClick={() => void confirmarComSaldo()}
        >
          {temSaldo ? 'Pagar com saldo em conta' : 'Saldo insuficiente'}
        </button>
      </div>

      {/* Pix e cartão, sem passar pelo saldo. */}
      <div className="caixa-pag">
        <div className="t">Comprar com Pix ou cartão</div>
        <div className="d">
          Pague {brl(total)} direto por Pix ou cartão — as moedas, a taxa de compra e o primeiro mês de custódia —, sem
          usar o saldo em conta. A moeda entra no seu acervo assim que o pagamento for aprovado.
          Se, nessa hora, o anúncio já tiver sido vendido, tiver subido de preço ou estiver
          pausado, o valor pago entra inteiro no seu saldo em conta.
        </div>
        <div className="m-actions">
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
        <div className="note" role="alert">
          {erroMp}
        </div>
      ) : null}

      {pix ? (
        <div className="pix-bloco">
          <div className="field-lbl">Pix copia e cola</div>
          <textarea
            readOnly
            rows={3}
            aria-label="Código Pix copia e cola"
            value={pix.qrCode ?? ''}
            className="pix-codigo"
          />
          {pix.qrCodeBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code do Pix"
              className="pix-qr"
              width={180}
              height={180}
            />
          ) : null}
          <div className="note">
            Referência {pix.externalReference} · {brl(pix.valorCents)}, com a taxa de compra.
            Assim que o pagamento for confirmado, o lote é liquidado e as moedas
            entram na sua conta.
          </div>
        </div>
      ) : null}

      <div className="m-actions">
        <button type="button" className="btn btn-outline" onClick={close}>
          Fechar<span className="sr-only"> a confirmação de compra</span>
        </button>
      </div>
    </>
  )
}

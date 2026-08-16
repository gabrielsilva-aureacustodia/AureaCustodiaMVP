'use client'

/**
 * 2.3 — Comparação de referência (Real Olímpico × BTC/ETH/USDT).
 *
 * Port de aurea-mvp-teste.html, linhas 2527-2574 (`renderCompare`).
 *
 * DE ONDE VÊM AS COTAÇÕES
 * -----------------------
 * No monolito havia uma global `cryptoData`, preenchida por `ensureCryptoData()`
 * uma vez por login, direto do navegador contra a CoinGecko. Aqui a coleta é do
 * servidor e vem por GET /api/crypto (cache de 1h, compartilhado por todos os
 * usuários) — a tela busca a série no cliente porque a rota é cacheada e não
 * pode ficar dinâmica.
 *
 * TRANSPARÊNCIA NÃO É OPCIONAL: quando a série vem com `simulated: true`, o
 * gráfico está desenhando números inventados por um passeio aleatório. O aviso
 * em .warn-box é obrigatório e reproduz o texto do original ao caractere.
 *
 * BREAKPOINT NO CLIENTE: o original decidia o tamanho do gráfico com
 * `window.innerWidth <= 560` em tempo de render. Não existe window no SSR, e ler
 * largura durante o render causaria divergência de hidratação — por isso o
 * matchMedia mora num efeito e o primeiro HTML sai sempre no preset de desktop.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { fdate } from '@/domain/dates'
import { roDailySeries, toIndex } from '@/domain/selectors'
import type { CryptoData } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { LineChart } from '@/components/charts/LineChart'
import { CHART_MOBILE_MAX_PX, compareChartSize } from '@/lib/charts'
import type { ChartPoint } from '@/lib/charts'

/** Janela do comparativo, em dias — o `roDailySeries(30)` da linha 2532. */
const DIAS = 30

/**
 * Cores das três linhas de cripto, literais como no MVP (linhas 2538-2540 e
 * 2550-2552). Não são tokens de tema de propósito: são cinza-azulados neutros
 * que valem igual no claro e no escuro, e existem para NÃO competir com o
 * dourado do Real Olímpico, que é a linha que a tela quer destacar. Ficam aqui
 * em constantes para que a legenda e o gráfico nunca saiam de sincronia.
 */
const COR_BTC = '#b9c3d4'
const COR_ETH = '#8fa0bd'
const COR_USDT = '#6b7c9c'
/** A linha do RO é a única que segue o tema — e a única mais grossa (2.6). */
const COR_RO = 'var(--gold)'

/**
 * Normaliza uma série em base 100 preservando o eixo do tempo.
 *
 * `toIndex` recebe e devolve só VALORES, então o `t` é reatado por índice. A
 * conferência de comprimento não é paranoia: toIndex devolve [] quando o
 * primeiro ponto é zero, e zipar às cegas nesse caso produziria pontos com `v`
 * undefined — a linha inteira sairia torta, sem erro nenhum no console.
 */
function indexar(pontos: ReadonlyArray<ChartPoint>): ChartPoint[] {
  const idx = toIndex(pontos.map((p) => p.v))
  if (idx.length !== pontos.length) return []
  return pontos.map((p, i) => ({ t: p.t, v: idx[i] }))
}

export default function ComparacoesPage(): ReactNode {
  const { state } = useApp()

  const [crypto, setCrypto] = useState<CryptoData | null>(null)
  // Enquanto a busca não termina não se desenha nada: sem as três criptos o
  // gráfico mostraria só a linha dourada sob uma legenda de quatro ativos, e
  // depois pularia para o desenho completo.
  const [carregando, setCarregando] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // `vivo` evita setState depois que a página saiu de cena (a navegação do App
    // Router desmonta a rota sem cancelar o fetch).
    let vivo = true
    fetch('/api/crypto')
      .then((r) => (r.ok ? (r.json() as Promise<CryptoData>) : null))
      .then((d) => {
        if (vivo && d) setCrypto(d)
      })
      .catch(() => {
        // A rota nunca falha por dados (o fallback simulado é dela); se falhar é
        // rede, e aí a tela segue com o gráfico do RO sozinho, como o MVP fazia
        // quando cryptoData não existia.
      })
      .finally(() => {
        if (vivo) setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    // Mesmo limiar do original (innerWidth <= 560), agora como media query: ela
    // também reage a rotação de tela e redimensionamento, o que o render único
    // do monolito não fazia.
    const mq = window.matchMedia(`(max-width: ${CHART_MOBILE_MAX_PX}px)`)
    const aplicar = (): void => setIsMobile(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  const cs = crypto ? crypto.series : []
  const roIdx = indexar(roDailySeries(state, DIAS))
  const btcIdx = indexar(cs.map((x) => ({ t: x.t, v: x.btc })))
  const ethIdx = indexar(cs.map((x) => ({ t: x.t, v: x.eth })))
  const usdtIdx = indexar(cs.map((x) => ({ t: x.t, v: x.usdt })))

  const size = compareChartSize(isMobile)

  return (
    <>
      <Link href="/graficos" className="back-link">
        ‹ Voltar para mercado e auditoria
      </Link>

      <div className="cols-rev">
        <div className="panel">
          <h3>
            <svg viewBox="0 0 24 24">
              <path d="M3 17l5-6 4 4 6-8 3 4" />
            </svg>
            Desempenho comparativo — 30 dias
          </h3>

          <div className="legend-row">
            <span className="li">
              <span className="sw" style={{ background: COR_RO }} />
              Real Olímpico
            </span>
            <span className="li">
              <span className="sw" style={{ background: COR_BTC }} />
              BTC
            </span>
            <span className="li">
              <span className="sw" style={{ background: COR_ETH }} />
              ETH
            </span>
            <span className="li">
              <span className="sw" style={{ background: COR_USDT }} />
              USDT
            </span>
          </div>

          {carregando ? (
            // Mesma caixa e mesmo texto do estado de carregamento da tela 2.0
            // (linha 2448). O MVP não precisava dele aqui porque as cotações já
            // estavam em memória desde o login.
            <div className="empty">Carregando cotações…</div>
          ) : (
            /* A ordem das séries é a ordem de pintura: o Real Olímpico vem por
               ÚLTIMO para ficar por cima das três linhas de cripto. */
            <LineChart
              series={[
                { points: btcIdx, color: COR_BTC, width: 1.6 },
                { points: ethIdx, color: COR_ETH, width: 1.6 },
                { points: usdtIdx, color: COR_USDT, width: 1.6 },
                { points: roIdx, color: COR_RO, width: 2.6 },
              ]}
              width={size.width}
              height={size.height}
              fontSize={size.fontSize}
              // O eixo Y é índice, não dinheiro: inteiro puro, sem 'R$'.
              formatY={(v) => v.toFixed(0)}
            />
          )}

          <div className="stats" style={{ marginTop: 16 }}>
            <div className="stat">
              <div>
                <div className="lbl">Período analisado</div>
                <div className="val small">30 dias</div>
              </div>
            </div>
            <div className="stat">
              <div>
                <div className="lbl">Base de comparação</div>
                <div className="val small">Índice 100</div>
              </div>
            </div>
            <div className="stat">
              <div>
                <div className="lbl">Atualização</div>
                {/* '—' enquanto não há cotação, como no `cryptoData?...:'—'` do
                    original. Não é mismatch de hidratação: o servidor sempre
                    pinta o traço, e a data só entra depois da resposta. */}
                <div className="val small">{crypto ? fdate(crypto.lastUpdate) : '—'}</div>
              </div>
            </div>
          </div>

          {crypto && crypto.simulated ? (
            <div className="warn-box">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l9 16H3z" />
                <path d="M12 10v4M12 17v.5" />
              </svg>
              Sem conexão com a API de cotações — os dados de BTC/ETH/USDT exibidos são simulados.
              Faça login novamente com conexão para atualizar.
            </div>
          ) : null}
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="how-row">
              <div className="hi">
                <svg viewBox="0 0 24 24">
                  <path d="M4 21h16M5 21V10h3v11M10.5 21V10h3v11M16 21V10h3v11M3 9l9-6 9 6z" />
                </svg>
              </div>
              <b style={{ color: 'var(--gold)' }}>Real Olímpico:</b>&nbsp;recibo de custódia com
              lastro físico.
            </div>
            <div className="how-row">
              <div className="hi">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </div>
              <b>BTC:</b>&nbsp;ativo digital escasso.
            </div>
            <div className="how-row">
              <div className="hi">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3v18M6 9l6-6 6 6M6 15l6 6 6-6" />
                </svg>
              </div>
              <b>ETH:</b>&nbsp;rede de contratos.
            </div>
            <div className="how-row">
              <div className="hi">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3v18M8 7h6a3 3 0 010 6H9a3 3 0 000 6h7" />
                </svg>
              </div>
              <b>USDT:</b>&nbsp;referência em dólar digital.
            </div>
          </div>

          <div className="panel">
            <div className="note">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Comparação educativa. Não representa recomendação financeira.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

/**
 * 2.0 — MERCADO E AUDITORIA
 * Port de aurea-mvp-teste.html, linhas 2372-2454 (renderMarket + setMarketPeriod).
 *
 * POR QUE ESTA PÁGINA É CLIENTE E NÃO SERVIDOR
 * -------------------------------------------
 * Três coisas aqui só existem no navegador e nenhuma delas é adiável:
 *  1. as abas de período trocam a série sem ir ao servidor (era `renderMarket()`
 *     depois de mexer na global `marketPeriod`);
 *  2. o tamanho do gráfico depende da largura da viewport;
 *  3. a série de cotações vem de /api/crypto, que tem cache próprio de 1h e não
 *     pode entrar no caminho do render do casco.
 * O estado de negócio, esse, já chega pronto do (app)/layout via useApp() — a
 * página não busca nada dele.
 *
 * O TÍTULO DA TELA NÃO ESTÁ AQUI
 * ------------------------------
 * O `pageTitle.innerHTML` das linhas 2374-2375 ('Mercado e auditoria' /
 * 'Evolução de preços, estoque custodiado e comparações.') foi para a Topbar,
 * que o deriva do pathname. Ver a nota no topo de components/shell/Topbar.tsx.
 */

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { COIN } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { fmtTrade, lastTrade } from '@/domain/market'
import { brl } from '@/domain/money'
import { allCoinsFlat, pctChange, roDailySeries } from '@/domain/selectors'
import type { CryptoData } from '@/domain/types'
import { CHART_MOBILE_MAX_PX, marketChartSize } from '@/lib/charts'
import type { ChartPoint } from '@/lib/charts'
import { LineChart } from '@/components/charts/LineChart'
import { Sparkline } from '@/components/charts/Sparkline'
import { useApp } from '@/components/providers/AppProvider'
import { PERIOD_DAYS, PeriodTabs } from '@/components/reports/PeriodTabs'
import type { Period } from '@/components/reports/PeriodTabs'

/* ------------------------------------------------------------------------- */
/* Ganchos locais                                                            */
/* ------------------------------------------------------------------------- */

/**
 * Responde "o gráfico deve usar o preset móvel?".
 *
 * O monolito decidia com `window.innerWidth <= 560` DENTRO do render (linha
 * 2378). Aqui isso seria um tiro no pé: não há `window` durante o render do
 * servidor, e ler a largura no primeiro render do cliente produziria um HTML
 * diferente do que o servidor mandou — mismatch de hidratação, que o React
 * resolve jogando fora a árvore e redesenhando tudo.
 *
 * Por isso o valor NASCE `false` (o preset de desktop, que é o que o servidor
 * pinta) e só muda dentro do efeito, depois da hidratação. O matchMedia fica
 * escutando porque girar o aparelho cruza o limiar sem recarregar a página —
 * o original só reagia a isso por acidente, quando algo mais disparava render().
 */
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

/**
 * Série de BTC/ETH/USDT para o bloco "Comparação simples".
 *
 * Equivale ao par `cryptoData` + `ensureCryptoData()` do original (linhas 2234 e
 * 2251-2285), com a coleta já movida para o servidor: aqui só se lê
 * GET /api/crypto, que traz a série pronta em centavos e revalida de hora em
 * hora para todos os usuários. Não há cache no navegador (a chave CRYPTO_KEY do
 * MVP perdeu a função) — pôr um de volta só faria a tela mostrar uma cotação
 * mais velha do que a que o servidor já tem em mãos.
 *
 * `null` enquanto não chega: é o estado que pinta 'Carregando cotações…'.
 * Falha de rede também fica em `null` — a mesma tela do original, que
 * simplesmente não trocava o `cryptoData` inicial.
 */
function useCotacoes(): CryptoData | null {
  const [dados, setDados] = useState<CryptoData | null>(null)

  useEffect(() => {
    // A trava impede o setState depois que a página foi desmontada (trocar de
    // aba antes de a resposta chegar é o caso comum).
    let vivo = true
    void (async () => {
      try {
        const r = await fetch('/api/crypto')
        if (!r.ok) return
        const corpo = (await r.json()) as CryptoData
        if (vivo) setDados(corpo)
      } catch {
        // Cotação é informação acessória: falhar aqui não pode abrir toast nem
        // derrubar a tela. O bloco continua em 'Carregando cotações…'.
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  return dados
}

/* ------------------------------------------------------------------------- */
/* Peças visuais                                                             */
/* ------------------------------------------------------------------------- */

/**
 * Chip de variação percentual — a `chipFor()` do original (linhas 2311-2316),
 * que não foi portada para @/domain por ser puramente visual.
 *
 * As duas faixas mortas (±0,05%) são do MVP e ficam: variação menor que isso é
 * ruído de arredondamento e merece o chip neutro, não uma seta de alta.
 */
function CompChip({ pct }: { pct: number | null }): ReactNode {
  // `null` = não dá para calcular (menos de 2 pontos ou base zero). Ver
  // pctChange() em @/domain/selectors: distinguir isso de "variou 0%" é o
  // motivo de a função devolver null e não zero.
  if (pct === null) return <span className="comp-chip flat">—</span>

  const cls = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat'
  const sign = pct > 0 ? '+' : ''
  // toFixed(1) com vírgula decimal, como no original. O sinal negativo já vem
  // do próprio toFixed — por isso `sign` só trata o positivo.
  return (
    <span className={`comp-chip ${cls}`}>
      {sign}
      {pct.toFixed(1).replace('.', ',')}%
    </span>
  )
}

/** Uma linha do bloco "Comparação simples": nome, miniatura e variação. */
interface LinhaComparacao {
  name: string
  color: string
  points: ChartPoint[]
}

/* ------------------------------------------------------------------------- */
/* Tela                                                                      */
/* ------------------------------------------------------------------------- */

export default function GraficosPage(): ReactNode {
  const { state } = useApp()
  const router = useRouter()

  // Nasce em 'M', como a global do original (linha 902) — e volta a 'M' toda vez
  // que se entra na tela, porque `go('market')` fazia `marketPeriod='M'` (linha
  // 1118) e aqui a página é remontada a cada navegação.
  const [periodo, setPeriodo] = useState<Period>('M')

  const movel = useGraficoMovel()
  const cotacoes = useCotacoes()

  /* ---- gráfico do Real Olímpico ---- */

  const dias = PERIOD_DAYS[periodo]
  // O domínio fala centavos; o eixo do gráfico fala reais. A divisão por 100 é
  // a mesma da linha 2377 e precisa acontecer ANTES de o eixo ser escalado.
  // COIN.name explícito: o "Real Olímpico" destes gráficos É a moeda-referência.
  // Com o mercado multi-ativo, uma série sem recorte de tipo passaria a somar as
  // negociações de Direitos Humanos (mais de R$ 400) às da Bandeira (~R$ 285) e
  // desenharia uma alta que nunca aconteceu no preço do RO.
  const roPts: ChartPoint[] = roDailySeries(state, dias, COIN.name).map((p) => ({
    t: p.t,
    v: p.v / 100,
  }))
  const tamanho = marketChartSize(movel)

  /* ---- comparação simples ---- */

  const cs = cotacoes ? cotacoes.series : []
  // 30 dias fixos, independentes da aba escolhida: a comparação é um panorama,
  // não um recorte. Divergência do gráfico principal que vem do original.
  const ro30 = roDailySeries(state, 30, COIN.name)
  const linhas: LinhaComparacao[] = [
    { name: 'RO', color: 'var(--gold)', points: ro30 },
    // Cores literais, como no MVP (linhas 2386-2388). Não viraram token porque
    // não são cor de tema: identificam a série e são as mesmas nos dois modos.
    { name: 'BTC', color: '#b9c3d4', points: cs.map((x) => ({ t: x.t, v: x.btc })) },
    { name: 'ETH', color: '#8fa0bd', points: cs.map((x) => ({ t: x.t, v: x.eth })) },
    { name: 'USDT', color: '#6b7c9c', points: cs.map((x) => ({ t: x.t, v: x.usdt })) },
  ]

  /* ---- indicadores ---- */

  const totalCoins = Object.values(state.users).reduce((s, x) => s + x.coins.length, 0)
  const vol = state.trades.reduce((s, t) => s + t.price * (t.qty || 1), 0)
  const lt = lastTrade(state)

  /* ---- auditoria de estoque (resumo por tipo) ---- */

  // Map em vez de objeto literal: a ordem de inserção fica explícita, e é ela
  // que decide o desempate — allCoinsFlat() vem ordenado pelo código do ativo,
  // então dois tipos com a mesma quantidade saem na ordem da moeda mais antiga.
  // Array.sort é estável, então o `sort` abaixo preserva isso, igual ao original.
  const porTipo = new Map<string, number>()
  allCoinsFlat(state).forEach(({ coin }) => {
    porTipo.set(coin.tipoMoeda, (porTipo.get(coin.tipoMoeda) ?? 0) + 1)
  })
  const linhasAuditoria = [...porTipo.entries()].sort((a, b) => b[1] - a[1])

  // A "última auditoria" do MVP é sempre hoje — não há registro de auditoria no
  // modelo. PORTE FIEL: o número é decorativo e continua sendo.
  const hoje = fdate(Date.now())

  return (
    <div className="cols-rev">
      <div>
        {/* ---------- preço médio histórico ---------- */}
        <div className="panel" style={{ marginBottom: 18 }}>
          <h3>
            <svg viewBox="0 0 24 24">
              <path d="M3 17l5-6 4 4 6-8 3 4" />
            </svg>
            Real Olímpico — Preço médio histórico
          </h3>

          <PeriodTabs value={periodo} onChange={setPeriodo} />

          {/* Com menos de 2 pontos o LineChart devolve sozinho a caixa
              'Sem dados suficientes para este período.' — é o mesmo retorno
              antecipado que lineChartSVG tinha na linha 2322. */}
          <LineChart
            series={[{ points: roPts, color: 'var(--gold)', width: 2.4 }]}
            width={tamanho.width}
            height={tamanho.height}
            fontSize={tamanho.fontSize}
            formatY={(v) => 'R$ ' + v.toFixed(0)}
          />
        </div>

        {/* ---------- três indicadores ---------- */}
        <div className="stats" style={{ marginBottom: 18 }}>
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
                {/* O ponto verde "10s" anuncia o ciclo de sincronização entre
                    contas, que hoje roda no AppProvider (SYNC_MS). */}
                <span className="sync-dot">
                  <i />
                  10s
                </span>
              </div>
              <div className="val small">{lt ? fmtTrade(lt) : '—'}</div>
            </div>
          </div>
        </div>

        {/* ---------- auditoria de estoque ---------- */}
        <div className="panel">
          <h3>
            <svg viewBox="0 0 24 24">
              <path d="M4 21h16M5 21V10h3v11M10.5 21V10h3v11M16 21V10h3v11M3 9l9-6 9 6z" />
            </svg>
            Auditoria de estoque
          </h3>

          {/* .table-scroll (base.css) + .table-scroll .audit-table{min-width:520px}
              (reports.css) é o par que faz a tabela ROLAR no celular em vez de
              espremer as quatro colunas ou empurrar a página inteira para o lado.
              Foi a correção nº 4 do diagnóstico mobile: não remova o wrapper. */}
          <div className="table-scroll">
            <table className="audit-table">
              {/* thead/tbody explícitos: o original jogava <tr> direto dentro de
                  <table> e contava com a correção do parser HTML. O React não
                  corrige — avisa e monta a árvore torta. O CSS é o mesmo,
                  porque .audit-table th/td não dependem do agrupamento. */}
              <thead>
                <tr>
                  <th>Moeda</th>
                  <th>Quantidade custodiada</th>
                  <th>Status</th>
                  <th>Última auditoria</th>
                </tr>
              </thead>
              <tbody>
                {linhasAuditoria.map(([tipo, qtd]) => (
                  // O tipo da moeda é a chave do agrupamento: único por
                  // construção e estável entre renders.
                  <tr key={tipo}>
                    <td>{tipo}</td>
                    <td>{qtd}</td>
                    <td>
                      <span className="pill g">auditado</span>
                    </td>
                    <td>{hoje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="note">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.5" />
            </svg>
            Estoque auditado periodicamente pela Áurea Custódia.
          </div>

          {/* `go('audit')` da linha 2442. Continua <button> e não <a>: .btn e
              .btn-gold (base.css) foram desenhados para botão e um <a> herdaria
              o sublinhado do link — desligá-lo exigiria mexer numa folha que não
              é desta tela. */}
          <button
            className="btn btn-gold"
            type="button"
            style={{ marginTop: 14 }}
            onClick={() => router.push('/graficos/auditoria')}
          >
            Ver auditoria completa
          </button>
        </div>
      </div>

      {/* ---------- comparação simples (coluna estreita) ---------- */}
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
                // `onclick="go('compare')"` da linha 2391. Segue <div> com
                // clique, como no original — .comp-row não tem regra que anule o
                // sublinhado de <a>, e criá-la mudaria uma folha compartilhada
                // com as telas 2.2/2.3. O papel e o teclado são o mínimo para a
                // linha não ficar inacessível sem mouse.
                role="link"
                tabIndex={0}
                onClick={() => router.push('/graficos/comparacoes')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') router.push('/graficos/comparacoes')
                }}
              >
                <span className="cname">{linha.name}</span>
                <Sparkline points={linha.points} color={linha.color} width={140} height={26} />
                {/* pctChange() hoje recebe só os VALORES, não os pares {t,v}. */}
                <CompChip pct={pctChange(linha.points.map((p) => p.v))} />
              </div>
            ))
          ) : (
            <div className="empty">Carregando cotações…</div>
          )}

          {/* Aviso de transparência: a série simulada NUNCA pode passar por real. */}
          {cotacoes && cotacoes.simulated ? (
            <div className="note">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Sem conexão com a API de cotações — exibindo dados simulados.
            </div>
          ) : null}

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
  )
}

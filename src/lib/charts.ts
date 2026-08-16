/**
 * Matemática dos gráficos: escalas, caminhos SVG e formatação de rótulos.
 *
 * No MVP monolítico (aurea-mvp-teste.html, linhas 2317-2354 e 1819-1832) estas
 * funções montavam strings de HTML. Aqui elas devolvem apenas números e
 * caminhos — quem vira elemento é o componente React. A separação existe por
 * dois motivos: o cálculo fica testável sem DOM, e o componente fica burro o
 * bastante para renderizar igual no servidor e no cliente.
 *
 * PORT FIEL: todo arredondamento do original foi mantido, inclusive o
 * `toFixed(1)` das coordenadas. Mudar a precisão mudaria a geometria desenhada.
 */

import type { Timestamp } from '@/domain/types'
import { qrMatrix } from '@/lib/qr-seed'

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

/** Um ponto de série temporal. `v` é livre: centavos, reais ou índice base 100. */
export interface ChartPoint {
  t: Timestamp
  v: number
}

/** Uma linha do gráfico. */
export interface ChartSeries {
  points: readonly ChartPoint[]
  /** Sempre um token do tema — 'var(--gold)' —, nunca cor literal. */
  color: string
  /** stroke-width; o original assume 2 quando ausente. */
  width?: number
}

export interface LineChartOptions {
  /** `opts.fmtY` do original. Ausente = inteiro sem unidade. */
  formatY?: (v: number) => string
}

// ---------------------------------------------------------------------------
// Constantes de layout
// ---------------------------------------------------------------------------

/** padL/padR/padT/padB da linha 2320 — a área de plotagem depende disso. */
export const CHART_PADDING = { left: 48, right: 12, top: 10, bottom: 22 } as const

/**
 * Abaixo desta largura de viewport o gráfico usa o preset móvel.
 * Mesmo limiar do original (`window.innerWidth <= 560`).
 */
export const CHART_MOBILE_MAX_PX = 560

/** Dimensões do viewBox + corpo do rótulo, já no par certo. */
export interface ChartSize {
  width: number
  height: number
  fontSize: number
}

/**
 * Gráfico do preço médio histórico (tela 2.0 Mercado).
 *
 * POR QUE dois presets e não um viewBox único que se estica: o SVG escala por
 * inteiro, rótulo junto. Num viewport de ~295px úteis, o viewBox de 640
 * encolhe tudo por 0.44 e o rótulo de 9px vira 4px — ilegível. Com o viewBox
 * de 360 a escala sobe para ~0.82 e o rótulo de 11px chega na tela com ~9.1px,
 * que foi o valor validado no diagnóstico mobile. Não volte para 640 no
 * celular "para simplificar": esse era o bug.
 */
export function marketChartSize(isMobile: boolean): ChartSize {
  return isMobile
    ? { width: 360, height: 230, fontSize: 11 }
    : { width: 640, height: 240, fontSize: 9 }
}

/** Gráfico comparativo de 30 dias (tela 2.3), mesma lógica de escala. */
export function compareChartSize(isMobile: boolean): ChartSize {
  return isMobile
    ? { width: 380, height: 250, fontSize: 11 }
    : { width: 660, height: 280, fontSize: 9 }
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/**
 * Arredondamento de coordenada com uma casa, idêntico ao `toFixed(1)` do
 * original. Não trocar por `Math.round(n*10)/10`: os dois divergem no
 * meio-termo negativo e a geometria deixaria de bater.
 */
export function round1(n: number): number {
  return Number(n.toFixed(1))
}

/**
 * Rótulo do eixo X: 'dd/mm'.
 *
 * O original usava `toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})`.
 * Aqui a formatação é manual porque o gráfico pode ser renderizado no servidor:
 * a saída é caractere por caractere a mesma, mas não depende do ICU do Node
 * bater com o do navegador — e mismatch de string quebra a hidratação.
 */
export function ddmm(ts: Timestamp): string {
  const d = new Date(ts)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

// ---------------------------------------------------------------------------
// Gráfico de linhas
// ---------------------------------------------------------------------------

/** Uma das 4 linhas horizontais de grade, com seu rótulo já formatado. */
export interface ChartGridLine {
  y: number
  /** Linha de base do texto — a grade + 3.5, como no original. */
  labelY: number
  label: string
}

/** Marca do eixo X (início, meio e fim da janela). */
export interface ChartAxisTick {
  x: number
  label: string
}

export interface ChartPath {
  d: string
  color: string
  strokeWidth: number
}

/** Tudo que o componente precisa para desenhar, sem fazer conta nenhuma. */
export interface ChartLayout {
  width: number
  height: number
  /** x inicial e final das linhas de grade. */
  plotLeft: number
  plotRight: number
  /** x dos rótulos do eixo Y (alinhados à direita, encostando na grade). */
  labelX: number
  /** y dos rótulos do eixo X. */
  tickY: number
  grid: ChartGridLine[]
  ticks: ChartAxisTick[]
  paths: ChartPath[]
}

/**
 * Monta a geometria do gráfico de linhas.
 *
 * Devolve `null` quando há menos de 2 pontos somando TODAS as séries — é o
 * caso em que o original devolvia a caixa "Sem dados suficientes". A decisão
 * de o que mostrar no vazio é da camada visual, não daqui.
 */
export function buildLineChart(
  seriesList: readonly ChartSeries[],
  w: number,
  h: number,
  opts: LineChartOptions = {},
): ChartLayout | null {
  const padL = CHART_PADDING.left
  const padR = CHART_PADDING.right
  const padT = CHART_PADDING.top
  const padB = CHART_PADDING.bottom

  const all: ChartPoint[] = []
  for (const s of seriesList) for (const p of s.points) all.push(p)
  if (all.length < 2) return null

  const xs = all.map((p) => p.t)
  const ys = all.map((p) => p.v)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  let y0 = Math.min(...ys)
  let y1 = Math.max(...ys)
  // Série achatada (todo mundo no mesmo valor) viraria divisão por zero.
  if (y0 === y1) {
    y0 -= 1
    y1 += 1
  }
  // 8% de folga em cima e embaixo para a linha não encostar na borda.
  const yPad = (y1 - y0) * 0.08
  y0 -= yPad
  y1 += yPad

  const X = (t: number): number => padL + (x1 === x0 ? 0.5 : (t - x0) / (x1 - x0)) * (w - padL - padR)
  const Y = (v: number): number => padT + (1 - (v - y0) / (y1 - y0)) * (h - padT - padB)
  const fmtY = opts.formatY ?? ((v: number): string => String(Math.round(v)))

  const grid: ChartGridLine[] = []
  for (let i = 0; i <= 3; i++) {
    const gv = y0 + ((y1 - y0) * i) / 3
    const gy = Y(gv)
    grid.push({ y: round1(gy), labelY: round1(gy + 3.5), label: fmtY(gv) })
  }

  const ticks: ChartAxisTick[] = [x0, (x0 + x1) / 2, x1].map((t) => ({
    x: round1(X(t)),
    label: ddmm(t),
  }))

  // Séries vazias somem: no original elas devolviam string vazia no join.
  const paths: ChartPath[] = seriesList
    .filter((s) => s.points.length > 0)
    .map((s) => ({
      d: s.points
        .map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`)
        .join(' '),
      color: s.color,
      strokeWidth: s.width ?? 2,
    }))

  return {
    width: w,
    height: h,
    plotLeft: padL,
    plotRight: w - padR,
    labelX: padL - 7,
    tickY: h - 6,
    grid,
    ticks,
    paths,
  }
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

/**
 * Caminho da miniatura de tendência das linhas de comparação (tela 2.0).
 *
 * O X aqui é o ÍNDICE do ponto, não o timestamp: pontos faltando não abrem
 * buraco, a linha só fica mais esticada. Comportamento do original, mantido.
 * Devolve `null` quando não há o que ligar (menos de 2 pontos).
 */
export function sparkPath(points: readonly ChartPoint[], w: number, h: number): string | null {
  if (points.length < 2) return null
  const ys = points.map((p) => p.v)
  let y0 = Math.min(...ys)
  let y1 = Math.max(...ys)
  if (y0 === y1) {
    y0 -= 1
    y1 += 1
  }
  return points
    .map((p, i) => {
      const x = ((i / (points.length - 1)) * w).toFixed(1)
      // +2 de margem em cima e embaixo: sem isso a espessura do traço vaza.
      const y = ((1 - (p.v - y0) / (y1 - y0)) * (h - 4) + 2).toFixed(1)
      return `${i ? 'L' : 'M'}${x} ${y}`
    })
    .join(' ')
}

// ---------------------------------------------------------------------------
// Pseudo-QR determinístico
// ---------------------------------------------------------------------------

/** Um quadradinho do padrão. `ink` false = cor do papel (miolo dos alvos). */
export interface QrRect {
  x: number
  y: number
  size: number
  ink: boolean
}

export interface QrPattern {
  /** Lado do SVG, em px. */
  size: number
  /** Ordem de pintura: células primeiro, alvos por cima. */
  rects: QrRect[]
}

/** Lado da matriz do pseudo-QR, em células. */
const QR_CELLS = 14

/**
 * Padrão pseudo-QR do recibo — visual, NÃO escaneável.
 *
 * O PRNG NÃO mora aqui: é o `qrMatrix` de lib/qr-seed.ts, o mesmo que o
 * gerador de PDF usa. O monolito tinha duas cópias do gerador (`qrSVG` com 14
 * células, `drawPdfQR` com 12) e elas precisavam desenhar o mesmo padrão para o
 * mesmo recibo — duas cópias que precisam concordar é exatamente o arranjo que
 * um dia deixa de concordar. Aqui existe uma só.
 *
 * Nada de `Math.random()`: o certificado tem que sair idêntico no servidor e
 * no cliente, senão a hidratação quebra e o recibo "muda" a cada render.
 */
export function buildQr(seedStr: string, size: number): QrPattern {
  const cells = QR_CELLS
  const cell = size / cells
  const matrix = qrMatrix(seedStr, cells)

  const rects: QrRect[] = []
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (matrix[r][c]) {
        rects.push({
          x: round1(c * cell),
          y: round1(r * cell),
          size: round1(cell * 0.92),
          ink: true,
        })
      }
    }
  }

  // Os três alvos de canto, que dão a cara de QR ao padrão.
  const finders: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [cells - 3, 0],
    [0, cells - 3],
  ]
  for (const [cx, cy] of finders) {
    rects.push({ x: round1(cx * cell), y: round1(cy * cell), size: round1(cell * 3), ink: true })
    rects.push({
      x: round1((cx + 0.55) * cell),
      y: round1((cy + 0.55) * cell),
      size: round1(cell * 1.9),
      ink: false,
    })
    rects.push({
      x: round1((cx + 1.1) * cell),
      y: round1((cy + 1.1) * cell),
      size: round1(cell * 0.8),
      ink: true,
    })
  }

  return { size, rects }
}

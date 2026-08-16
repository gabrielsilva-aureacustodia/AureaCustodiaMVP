import { Fragment } from 'react'
import type { ReactElement } from 'react'

import { buildLineChart } from '@/lib/charts'
import type { ChartSeries } from '@/lib/charts'

/**
 * Gráfico de linhas do MVP (aurea-mvp-teste.html, linha 2317).
 *
 * Componente de apresentação puro — sem estado, sem efeito, sem 'use client'.
 * As opções que o original recebia num objeto solto (`opts.fs`, `opts.fmtY`)
 * viraram props tipadas; o resto do trabalho é do lib/charts.
 */
export interface LineChartProps {
  series: readonly ChartSeries[]
  /**
   * Largura e altura do viewBox — NÃO são pixels de tela. O SVG ocupa 100% do
   * container e escala junto; use `marketChartSize`/`compareChartSize` para
   * pegar o par certo (o desktop no celular deixa o rótulo em ~4px).
   */
  width: number
  height: number
  /** `opts.fs` do original: 9 no desktop, 11 no viewBox móvel. */
  fontSize?: number
  /** `opts.fmtY`: 'R$ 285' no mercado, índice puro na comparação. */
  formatY?: (v: number) => string
  className?: string
}

export function LineChart({
  series,
  width,
  height,
  fontSize = 9,
  formatY,
  className = 'line-chart',
}: LineChartProps): ReactElement {
  const layout = buildLineChart(series, width, height, { formatY })

  // Menos de 2 pontos somando todas as séries: não há linha para traçar.
  if (layout === null) {
    return <div className="empty">Sem dados suficientes para este período.</div>
  }

  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`}>
      {layout.grid.map((g, i) => (
        <Fragment key={`grid-${i}`}>
          <line
            x1={layout.plotLeft}
            y1={g.y}
            x2={layout.plotRight}
            y2={g.y}
            stroke="var(--line-soft)"
            strokeWidth={0.6}
          />
          <text
            x={layout.labelX}
            y={g.labelY}
            textAnchor="end"
            fontSize={fontSize}
            fill="var(--text-muted)"
          >
            {g.label}
          </text>
        </Fragment>
      ))}

      {layout.ticks.map((t, i) => (
        <text
          key={`tick-${i}`}
          x={t.x}
          y={layout.tickY}
          textAnchor="middle"
          fontSize={fontSize}
          fill="var(--text-muted)"
        >
          {t.label}
        </text>
      ))}

      {/* As linhas vêm por último para ficarem por cima da grade. */}
      {layout.paths.map((p, i) => (
        <path
          key={`serie-${i}`}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={p.strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

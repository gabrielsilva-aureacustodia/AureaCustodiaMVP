import type { ReactElement } from 'react'

import { sparkPath } from '@/lib/charts'
import type { ChartPoint } from '@/lib/charts'

/**
 * Miniatura de tendência das linhas de comparação (aurea-mvp-teste.html, 2347).
 *
 * Sem eixo, sem rótulo e sem grade de propósito: aqui interessa só o formato
 * da curva; o número vem no chip de variação ao lado.
 */
export interface SparklineProps {
  points: readonly ChartPoint[]
  /** Token do tema para a linha — 'var(--gold)' no Real Olímpico. */
  color: string
  width: number
  height: number
  className?: string
}

export function Sparkline({
  points,
  color,
  width,
  height,
  className = 'spark',
}: SparklineProps): ReactElement {
  const d = sparkPath(points, width, height)

  // Série curta demais devolve o SVG vazio, como no original: a linha some
  // mas o espaço continua reservado e a linha da tabela não pula.
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {d === null ? null : <path d={d} fill="none" stroke={color} strokeWidth={1.6} />}
    </svg>
  )
}

'use client'

/**
 * Foto real da moeda com halo dourado e brilho especular (puro CSS) e, quando
 * `interativa`, leve inclinação 3D que segue o ponteiro do mouse.
 *
 * Substitui os antigos "moeda-*-vetor.svg": eram a mesma foto codificada em
 * base64 DENTRO de um SVG decorativo, 1,6-2,2 MB cada, servidos com
 * `unoptimized` (passa direto pelo otimizador do Next) — inclusive como
 * imagem de LCP no hero da landing. Mesmo visual (aura + brilho + friso),
 * agora é a foto de `public/moedas/*.png` normal, otimizada pelo `next/image`,
 * e a decoração vira `::before`/`::after` de ~0 KB em vez de outro arquivo.
 */

import Image from 'next/image'
import { useRef, type PointerEvent, type ReactElement } from 'react'

export interface MoedaRealistaProps {
  src: string
  alt: string
  size?: number
  className?: string
  priority?: boolean
  /** Ativa a inclinação 3D ao passar o mouse — só nas vitrines, não em ícones de lista. */
  interativa?: boolean
}

export function MoedaRealista({
  src,
  alt,
  size = 220,
  className,
  priority,
  interativa = false,
}: MoedaRealistaProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  function handleMove(e: PointerEvent<HTMLDivElement>): void {
    if (!interativa || e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--moeda-tilt-x', `${(-py * 16).toFixed(2)}deg`)
    el.style.setProperty('--moeda-tilt-y', `${(px * 16).toFixed(2)}deg`)
  }

  function handleLeave(): void {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--moeda-tilt-x', '0deg')
    el.style.setProperty('--moeda-tilt-y', '0deg')
  }

  return (
    <div
      ref={ref}
      className={`moeda-realista${interativa ? ' moeda-realista-interativa' : ''}${className ? ` ${className}` : ''}`}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="moeda-realista-img"
      />
    </div>
  )
}

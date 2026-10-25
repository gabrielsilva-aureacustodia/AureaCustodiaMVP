'use client'

/**
 * Holofote: um brilho dourado que acompanha o ponteiro dentro de cada cartão (padrão "spotlight card" do
 * React Bits, doc 16 §2, refeito sem dependência). Um ouvinte só, no contêiner: ele escreve --hx/--hy no
 * cartão sob o ponteiro (`[data-holofote]`) e o CSS desenha o gradiente. Toque e "reduzir movimento" ficam
 * sem efeito — o cartão continua igual, só sem o brilho.
 */

import { useEffect, useRef, type ReactNode } from 'react'

export function Holofote({ className, children }: { className?: string; children: ReactNode }): ReactNode {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const mexe = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return
      const alvo = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-holofote]')
      if (!alvo) return
      const r = alvo.getBoundingClientRect()
      alvo.style.setProperty('--hx', `${e.clientX - r.left}px`)
      alvo.style.setProperty('--hy', `${e.clientY - r.top}px`)
    }
    el.addEventListener('pointermove', mexe, { passive: true })
    return () => el.removeEventListener('pointermove', mexe)
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

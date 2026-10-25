'use client'

/**
 * Liga `data-em-cena` quando o bloco entra na tela e desliga quando sai. O CSS usa isso para tocar uma
 * animação em laço (a demonstração do marketplace) só enquanto alguém está olhando — fora da tela ela pausa
 * e não gasta quadro (tópico 29 D: "canvas/rAF pausam fora do viewport"). Sem JavaScript o atributo não
 * existe e o CSS mostra o estado final, parado.
 */

import { useEffect, useRef, type ReactNode } from 'react'

export function EmCena({ className, children, rotulo }: { className?: string; children: ReactNode; rotulo?: string }): ReactNode {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e) el.toggleAttribute('data-em-cena', e.isIntersecting)
    }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} role={rotulo ? 'group' : undefined} aria-label={rotulo}>
      {children}
    </div>
  )
}

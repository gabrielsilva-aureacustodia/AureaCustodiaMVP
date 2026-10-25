'use client'

/**
 * Inclinação 3D em camadas: o conteúdo (moeda + recibo do herói) gira levemente seguindo o ponteiro, e cada
 * camada com `data-profundidade` se desloca na sua distância — dá volume sem WebGL (tópico 11 do
 * aprendizado_frontend, "coreografia do herói", versão leve).
 *
 * Só escreve duas variáveis CSS (--rx, --ry) num requestAnimationFrame; quem anima é o CSS, no compositor.
 * Ponteiro de toque não inclina (no celular o dedo está rolando a página), e com "reduzir movimento" o
 * componente não liga nada. Os filhos chegam prontos do servidor: aqui só existe o ouvinte.
 */

import { useEffect, useRef, type ReactNode } from 'react'

export function InclinacaoNoPonteiro({ className, children }: { className?: string; children: ReactNode }): ReactNode {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let alvo = { x: 0, y: 0 }

    const aplica = (): void => {
      raf = 0
      el.style.setProperty('--rx', `${(-alvo.y * 10).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${(alvo.x * 14).toFixed(2)}deg`)
      el.style.setProperty('--px', alvo.x.toFixed(3))
      el.style.setProperty('--py', alvo.y.toFixed(3))
    }
    const mexe = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      alvo = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 }
      raf ||= requestAnimationFrame(aplica)
    }
    const sai = (): void => {
      alvo = { x: 0, y: 0 }
      raf ||= requestAnimationFrame(aplica)
    }

    el.addEventListener('pointermove', mexe, { passive: true })
    el.addEventListener('pointerleave', sai)
    return () => {
      el.removeEventListener('pointermove', mexe)
      el.removeEventListener('pointerleave', sai)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} className={className} data-inclinacao="">
      {children}
    </div>
  )
}

'use client'

/**
 * Valor em reais que "conta" até o número real quando aparece na tela (padrão CountUp do React Bits, doc 16;
 * o doc 34 §7 o lista entre os efeitos aceitos).
 *
 * O servidor já entrega o valor FINAL no HTML: sem JavaScript, com "reduzir movimento" ou fora da tela, o
 * visitante lê o número exato. A contagem só começa ao entrar na tela, dura menos de um segundo e termina
 * exatamente no valor do livro de ofertas — nunca mostra um número que não existe ao parar. O leitor de tela
 * recebe só o valor final (`aria-hidden` na parte que conta).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { Cents } from '@/domain/types'
import { brl } from '@/domain/money'

const DURACAO_MS = 900

export function ContagemDeValor({ centavos }: { centavos: Cents }): ReactNode {
  const ref = useRef<HTMLSpanElement>(null)
  const [mostrado, setMostrado] = useState<Cents>(centavos)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      io.disconnect()
      const inicio = performance.now()
      const passo = (agora: number): void => {
        const t = Math.min(1, (agora - inicio) / DURACAO_MS)
        const suave = 1 - Math.pow(1 - t, 3)
        setMostrado(t >= 1 ? centavos : (Math.round((centavos * suave) / 100) * 100) as Cents)
        if (t < 1) raf = requestAnimationFrame(passo)
      }
      setMostrado(0 as Cents)
      raf = requestAnimationFrame(passo)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => {
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [centavos])

  return (
    <span ref={ref} className="pub-contagem">
      <span aria-hidden="true">{brl(mostrado)}</span>
      <span className="pub-sr">{brl(centavos)}</span>
    </span>
  )
}

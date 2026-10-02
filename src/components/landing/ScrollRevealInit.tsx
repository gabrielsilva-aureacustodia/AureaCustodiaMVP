'use client'

/**
 * Scroll reveal progressivo da landing page (Guia 07 do aprendizado_frontend).
 *
 * Princípios aplicados:
 * 1. Progressive enhancement: sem JS ou antes de montar, todos os elementos
 *    ficam visíveis com transform: none e opacity: 1 (classe de animação só é
 *    ativada quando o observer inicializa).
 * 2. IntersectionObserver único com unobserve ("once: true") e rootMargin: "-40px".
 * 3. Respeita prefers-reduced-motion: reduce tornando tudo visível de imediato.
 * 4. Apenas compositor (opacity e translateY).
 */

import { useEffect, type ReactNode } from 'react'

export function ScrollRevealInit(): ReactNode {
  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const root = document.querySelector('.landing-page')
    if (!root) return

    if (isReduced) {
      root.classList.add('reveal-static')
      return
    }

    const reveals = root.querySelectorAll('.reveal')
    if (reveals.length === 0) return

    root.classList.add('js-reveal-enabled')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    reveals.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      root.classList.remove('js-reveal-enabled')
    }
  }, [])

  return null
}

'use client'

/**
 * Vídeo de fundo da chamada final (porta e gavetas do cofre, 6 s em laço, sem som; Frente 2).
 *
 * Regras do tópico 18/24 e do doc 34 §7 do aprendizado_frontend, todas aqui:
 * - o HTML do servidor traz só o PÔSTER (imagem); o <video> nasce no navegador, e só quando o bloco chega
 *   perto da tela — ninguém baixa 400 KB de vídeo para ver o topo da página;
 * - com "reduzir movimento" ou "economia de dados" o vídeo não nasce: fica o pôster;
 * - toca mudo, em linha, em laço, e tem BOTÃO DE PAUSAR (WCAG 2.2.2, movimento com mais de 5 s);
 * - fora da tela, pausa sozinho (não gasta bateria tocando para ninguém).
 * Decorativo (`aria-hidden`): a mensagem do bloco está no texto ao lado.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface VideoDeFundoProps {
  webm: string
  mp4: string
  poster: string
}

export function VideoDeFundo({ webm, mp4, poster }: VideoDeFundoProps): ReactNode {
  const caixa = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [montar, setMontar] = useState(false)
  const [pausado, setPausado] = useState(false)
  const pausadoRef = useRef(false)

  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const economia = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    if (reduz || economia) return
    const io = new IntersectionObserver(([e]) => {
      if (!e) return
      if (e.isIntersecting) setMontar(true)
      const v = video.current
      if (!v) return
      if (e.isIntersecting && !pausadoRef.current) void v.play().catch(() => undefined)
      else v.pause()
    }, { rootMargin: '200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [montar])

  const alterna = (): void => {
    const v = video.current
    if (!v) return
    const pausar = !v.paused
    if (pausar) v.pause()
    else void v.play().catch(() => undefined)
    pausadoRef.current = pausar
    setPausado(pausar)
  }

  return (
    <div ref={caixa} className="pub-video" aria-hidden={!montar || undefined}>
      {montar ? (
        <>
          <video ref={video} muted playsInline loop autoPlay preload="none" poster={poster} aria-hidden="true">
            <source src={webm} type="video/webm" />
            <source src={mp4} type="video/mp4" />
          </video>
          <button type="button" className="pub-video-pausa" aria-pressed={pausado} onClick={alterna}>
            {pausado ? 'Tocar o vídeo do cofre' : 'Pausar o vídeo do cofre'}
          </button>
        </>
      ) : (
        <picture>
          <picture>
          <img src={poster} alt="" width={1280} height={720} loading="lazy" decoding="async" />
        </picture>
        </picture>
      )}
    </div>
  )
}

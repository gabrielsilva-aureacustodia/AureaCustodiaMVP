/**
 * <picture> com os derivados AVIF/WebP que a Frente 2 já entrega (640, 960, 1440, 1920).
 *
 * Por que não next/image: os arquivos já saem otimizados (o cofre do herói tem 9 KB em AVIF a 640 px e
 * 38 KB a 1920 px) e o otimizador do Next os recodificaria só para piorar. Aqui o navegador escolhe direto
 * entre AVIF e WebP, na largura certa. É o formato que o README da Frente 2 recomenda (§2.1).
 * `retrato` = outro recorte para telas estreitas (direção de arte por `media`, não só outro tamanho).
 * `prioridade` = imagem do LCP: fetchpriority="high" e nunca lazy (doc 35 e tópico 29 D).
 * Marcação pura, sem 'use client'. (A regra no-img-element do Next não está ligada neste projeto.)
 */

import type { ReactNode } from 'react'

import { fontesDo, type Visual } from './visuais'

interface PictureResponsivaProps {
  visual: Visual
  sizes: string
  className?: string
  prioridade?: boolean
  retrato?: Visual
}

const TELA_ESTREITA = '(max-width: 860px)'

export function PictureResponsiva({ visual, sizes, className, prioridade = false, retrato }: PictureResponsivaProps): ReactNode {
  const f = fontesDo(visual)
  const r = retrato ? fontesDo(retrato) : null
  return (
    <picture className={className}>
      {r ? <source media={TELA_ESTREITA} type="image/avif" srcSet={r.avif} sizes="100vw" /> : null}
      {r ? <source media={TELA_ESTREITA} type="image/webp" srcSet={r.webp} sizes="100vw" /> : null}
      <source type="image/avif" srcSet={f.avif} sizes={sizes} />
      <source type="image/webp" srcSet={f.webp} sizes={sizes} />
      <img
        src={f.src}
        alt={visual.alt}
        width={visual.largura}
        height={visual.altura}
        loading={prioridade ? 'eager' : 'lazy'}
        decoding={prioridade ? 'sync' : 'async'}
        fetchPriority={prioridade ? 'high' : 'auto'}
      />
    </picture>
  )
}

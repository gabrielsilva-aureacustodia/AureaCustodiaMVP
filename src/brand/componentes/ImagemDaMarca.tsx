/**
 * Uma imagem do catálogo (src/brand/ativos.ts) com AVIF e WebP nas larguras entregues pela Frente 2.
 *
 * <picture> e não next/image: os arquivos já chegam otimizados em quatro larguras e dois formatos;
 * passar pelo otimizador seria recomprimir o que já está comprimido. width/height vêm da proporção
 * do ativo, para o navegador reservar o espaço antes de baixar (sem salto de layout).
 *
 * Ativo PENDENTE não aparece (devolve null): quem usa decide a recaída — o <CartaoMoeda>, por
 * exemplo, cai para a foto real. Mostrar um ativo reprovado "só por enquanto" é como ele chega à
 * produção. Server Component.
 */

import type { ReactNode } from 'react'

import { ATIVOS, srcDe, srcsetDe, type IdDoAtivo } from '../ativos'

export function ImagemDaMarca({
  id,
  sizes = '100vw',
  prioridade = false,
  className,
  alt,
}: {
  id: IdDoAtivo
  /** Quanto da largura da tela a imagem ocupa — decide qual largura o navegador baixa. */
  sizes?: string
  /** Imagem do topo da página (LCP): baixa primeiro e sem preguiça. */
  prioridade?: boolean
  className?: string
  /** Sobrepõe o alt do catálogo (use "" quando o texto ao lado já descreve a imagem). */
  alt?: string
}): ReactNode {
  const ativo = ATIVOS[id]
  if (ativo.situacao !== 'aprovado') return null
  const [pw, ph] = ativo.proporcao
  const largura = 960
  return (
    <picture className={className ? `ro-imagem ${className}` : 'ro-imagem'}>
      <source type="image/avif" srcSet={srcsetDe(ativo, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcsetDe(ativo, 'webp')} sizes={sizes} />
      <img
        src={srcDe(ativo, largura)}
        alt={alt ?? ativo.alt}
        width={largura}
        height={Math.round((largura * ph) / pw)}
        loading={prioridade ? 'eager' : 'lazy'}
        fetchPriority={prioridade ? 'high' : undefined}
        decoding="async"
      />
    </picture>
  )
}

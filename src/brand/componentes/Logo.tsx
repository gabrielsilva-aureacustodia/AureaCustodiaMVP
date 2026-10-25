/**
 * A logo do Real Olímpico nos dois recortes que a interface pode usar.
 *
 * LOGO INTACTA: estes componentes só exibem os arquivos oficiais de
 * public/brand/ — nunca recolorem, giram, distorcem ou aplicam filtro além da
 * sombra discreta que o fundo escuro pede (regras no Brandbook §3). A prancha
 * inteira (logo-real-olimpico.webp) NÃO é logo de interface: dentro de um box
 * pequeno ela vira borrão.
 *
 *  - <LogoMarca>: emblema + letreiro. Quando a logo aparece sozinha e precisa
 *    dizer o nome (entrada, cadastro, rodapé, painel).
 *  - <LogoEmblema>: só o medalhão. Quando "Real Olímpico" já está escrito ao
 *    lado (barra lateral, favicon, cabeçalho compacto).
 *
 * Os caminhos repetem LOGO_REAL_MARCA e LOGO_REAL_EMBLEMA de
 * src/domain/constants.ts de propósito: o package da marca não pode depender do
 * domínio do app. Server Component (sem estado), não manda JS ao navegador.
 */

import Image from 'next/image'
import type { ReactElement } from 'react'

export const ARQUIVO_LOGO_MARCA = '/brand/logo-real-olimpico-marca.webp'
export const ARQUIVO_LOGO_EMBLEMA = '/brand/logo-real-olimpico-emblema.webp'

/** Proporção do arquivo da marca (600 × 560 px, medido no .webp). */
const PROPORCAO_MARCA = 560 / 600

/** Abaixo destas larguras o letreiro (ou o R do medalhão) deixa de ser legível. */
export const LARGURA_MINIMA_MARCA = 72
export const LARGURA_MINIMA_EMBLEMA = 24

interface PropsLogo {
  /** Largura em px. Valores menores que o mínimo são elevados ao mínimo. */
  largura?: number
  className?: string
  /** Logo de topo de página (LCP): carrega antes. */
  prioridade?: boolean
  /** Texto alternativo. Use "" quando o nome já está escrito ao lado. */
  alt?: string
}

export function LogoMarca({
  largura = 160,
  className,
  prioridade,
  alt = 'Real Olímpico',
}: PropsLogo): ReactElement {
  const w = Math.max(largura, LARGURA_MINIMA_MARCA)
  return (
    <Image
      src={ARQUIVO_LOGO_MARCA}
      alt={alt}
      width={w}
      height={Math.round(w * PROPORCAO_MARCA)}
      priority={prioridade}
      className={className ? `ro-logo ${className}` : 'ro-logo'}
    />
  )
}

export function LogoEmblema({
  largura = 40,
  className,
  prioridade,
  alt = 'Real Olímpico',
}: PropsLogo): ReactElement {
  const w = Math.max(largura, LARGURA_MINIMA_EMBLEMA)
  return (
    <Image
      src={ARQUIVO_LOGO_EMBLEMA}
      alt={alt}
      width={w}
      height={w}
      priority={prioridade}
      className={className ? `ro-logo ${className}` : 'ro-logo'}
    />
  )
}

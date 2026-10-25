/**
 * Esqueleto de carregamento (Brandbook §9.9): reserva o espaço do conteúdo
 * que ainda vem do servidor, para a página não pular quando ele chega.
 *
 * aria-hidden: o leitor de tela não precisa ouvir "caixa cinza"; quem anuncia
 * o carregamento é o `aria-busy` do contêiner, na tela que usa o esqueleto.
 * Server Component.
 */

import type { CSSProperties, ReactNode } from 'react'

export function Esqueleto({
  largura = '100%',
  altura = '1em',
  redondo = false,
}: {
  largura?: string
  altura?: string
  /** Para avatar ou moeda. */
  redondo?: boolean
}): ReactNode {
  const estilo: CSSProperties = { width: largura, height: altura, borderRadius: redondo ? '50%' : undefined }
  return <span className="ro-esqueleto" style={estilo} aria-hidden="true" />
}

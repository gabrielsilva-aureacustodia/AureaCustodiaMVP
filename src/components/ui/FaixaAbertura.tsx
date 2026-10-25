/**
 * Faixa de abertura (Brandbook §9.11): o bloco escuro no topo de uma área — sobretítulo, título,
 * um número ou frase de apoio e, no máximo, uma ação. Escura nos DOIS temas: é a "vitrine" de
 * cada área, o contraponto ao "cofre" das tabelas logo abaixo.
 *
 * Fundo: guilhoché em CSS puro (padrão, 0 KB de imagem) ou a textura de veludo da Frente 2
 * (`fundo="veludo"`). A arte opcional (uma moeda, por exemplo) fica à direita e, quando não cabe
 * (celular), desce para baixo do texto pelo flex-wrap, sem media query. Server Component.
 */

import type { ReactNode } from 'react'

export function FaixaAbertura({
  sobretitulo,
  titulo,
  children,
  acao,
  arte,
  fundo = 'guilloche',
  nivel = 'h1',
}: {
  sobretitulo?: string
  titulo: ReactNode
  /** Frase de apoio ou o número principal (use .ro-valor para saldo). */
  children?: ReactNode
  /** Um único botão ou link — a ação dourada da tela, se houver. */
  acao?: ReactNode
  /** Imagem decorativa à direita (moeda, cofre). */
  arte?: ReactNode
  fundo?: 'guilloche' | 'veludo'
  /** A faixa costuma ser o topo da página; quando não for, desça para h2. */
  nivel?: 'h1' | 'h2'
}): ReactNode {
  const Titulo = nivel
  return (
    <section className={`ro-faixa ro-faixa--${fundo}${arte ? ' ro-faixa--com-arte' : ''}`}>
      <div className="ro-faixa__texto">
        {sobretitulo ? <p className="ro-sobretitulo">{sobretitulo}</p> : null}
        <Titulo className="ro-titulo-1">{titulo}</Titulo>
        {children ? <div className="ro-faixa__apoio">{children}</div> : null}
        {acao ? <div className="ro-faixa__acao">{acao}</div> : null}
      </div>
      {arte ? (
        <div className="ro-faixa__arte" aria-hidden="true">
          {arte}
        </div>
      ) : null}
    </section>
  )
}

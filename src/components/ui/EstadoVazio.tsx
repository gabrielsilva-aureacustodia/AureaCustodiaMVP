/**
 * Estado vazio ilustrado (Brandbook §9.8): "Você ainda não tem moedas na
 * custódia", "Nenhuma oferta para este tipo". Diz o que falta e oferece o
 * próximo passo — tela vazia sem saída é onde a pessoa desiste.
 *
 * A arte é opcional e vem de public/visuais/onboarding/ (Frente 2); é
 * decorativa (alt=""), porque o título já diz tudo. <img> simples: SVG não
 * ganha nada com o otimizador do next/image. Server Component.
 */

import type { ReactNode } from 'react'

export function EstadoVazio({
  titulo,
  children,
  arte,
  acao,
}: {
  titulo: string
  children?: ReactNode
  /** Caminho de um SVG de public/visuais/onboarding/. */
  arte?: string
  /** Botão ou link do próximo passo. */
  acao?: ReactNode
}): ReactNode {
  return (
    <div className="ro-vazio">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG decorativo, sem ganho no otimizador */}
      {arte ? <img className="ro-vazio__arte" src={arte} alt="" width={160} height={120} loading="lazy" /> : null}
      <p className="ro-vazio__titulo">{titulo}</p>
      {children ? <div className="ro-vazio__texto">{children}</div> : null}
      {acao}
    </div>
  )
}

/**
 * Faixa que rola com as ideias da marca (proteger, valorizar, vender quando quiser…), receita de marquee do
 * tópico 14 do aprendizado_frontend: dois grupos iguais (o segundo `aria-hidden`), animação só de transform e
 * pausa quando o ponteiro passa por cima.
 *
 * Sem botão de pausar, por decisão do Gabriel (25/10/2026): a faixa é decorativa — as mesmas ideias estão
 * escritas, paradas, nas seções da página — e o botão competia com ela. Quem pediu "reduzir movimento" ao
 * sistema vê a faixa parada (CSS). Sem estado, sem 'use client'.
 */

import type { ReactNode } from 'react'

export function FaixaDeConceito({ itens }: { itens: readonly string[] }): ReactNode {
  const grupo = (oculto: boolean): ReactNode => (
    <ul className="pub-faixa-grupo" aria-hidden={oculto || undefined}>
      {itens.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
  return (
    <section className="pub-faixa" aria-label="O que o Real Olímpico faz por você">
      <div className="pub-faixa-janela">
        <div className="pub-faixa-trilho">
          {grupo(false)}
          {grupo(true)}
        </div>
      </div>
    </section>
  )
}

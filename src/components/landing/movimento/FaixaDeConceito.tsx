'use client'

/**
 * Faixa que rola com as ideias da marca (proteger, valorizar, vender quando quiser…), receita de marquee do
 * tópico 14 do aprendizado_frontend: dois grupos iguais (o segundo `aria-hidden`), animação só de transform,
 * pausa no hover/foco e BOTÃO DE PAUSAR (WCAG 2.2.2 — movimento que dura mais de 5 s precisa de controle).
 * O texto não é essencial: as mesmas ideias estão escritas, paradas, nas seções da página.
 */

import { useState, type ReactNode } from 'react'

export function FaixaDeConceito({ itens }: { itens: readonly string[] }): ReactNode {
  const [pausada, setPausada] = useState(false)
  const grupo = (oculto: boolean): ReactNode => (
    <ul className="pub-faixa-grupo" aria-hidden={oculto || undefined}>
      {itens.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
  return (
    <section className="pub-faixa" aria-label="O que o Real Olímpico faz por você" data-pausada={pausada || undefined}>
      <div className="pub-faixa-janela">
        <div className="pub-faixa-trilho" id="faixa-conceito">
          {grupo(false)}
          {grupo(true)}
        </div>
      </div>
      <button
        type="button"
        className="pub-faixa-pausa"
        aria-controls="faixa-conceito"
        aria-pressed={pausada}
        onClick={() => setPausada((p) => !p)}
      >
        {pausada ? 'Continuar a faixa' : 'Pausar a faixa'}
      </button>
    </section>
  )
}

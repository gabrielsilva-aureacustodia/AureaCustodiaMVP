'use client'

/**
 * O sinal de informação (i): ao passar o mouse, focar pelo teclado ou tocar, mostra a explicação do item
 * ao lado dele. Nasceu em 21/10/2026 para a linha "Custódia (1º mês)" dos pop-ups de compra, que
 * precisa dizer o que é a cobrança sem poluir o resumo.
 *
 * ACESSÍVEL DE PROPÓSITO. É um botão de verdade (foco e Enter/Espaço funcionam), a explicação é ligada a
 * ele por `aria-describedby` e Escape a fecha. No celular não existe "passar o mouse", então o toque
 * alterna a explicação, que é o que `onClick` faz. A área de toque tem 44px, o mínimo do projeto.
 *
 * A explicação é um nó React, e não só texto, porque a linha da custódia leva um link para a tabela de
 * preços e taxas. Por isso o balão continua aberto enquanto o mouse está sobre ele: dá para ir até o link.
 */

import { useId, useState } from 'react'
import type { ReactNode } from 'react'

export function InfoTip({ titulo, children }: { titulo: string; children: ReactNode }): ReactNode {
  const id = useId()
  const [aberto, setAberto] = useState(false)
  const [fixo, setFixo] = useState(false)
  const visivel = aberto || fixo

  return (
    <span
      className="infotip"
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
      // O foco pode passar do botão para o link dentro do balão sem fechá-lo.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAberto(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setAberto(false)
          setFixo(false)
        }
      }}
    >
      <button
        type="button"
        className="infotip-btn"
        aria-label={`Saiba mais: ${titulo}`}
        aria-describedby={visivel ? id : undefined}
        aria-expanded={visivel}
        onFocus={() => setAberto(true)}
        onClick={() => setFixo((v) => !v)}
      >
        <span aria-hidden="true">i</span>
      </button>
      {visivel ? (
        <span role="tooltip" id={id} className="infotip-balao">
          {children}
        </span>
      ) : null}
    </span>
  )
}

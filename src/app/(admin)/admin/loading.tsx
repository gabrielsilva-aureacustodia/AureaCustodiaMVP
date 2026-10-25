/**
 * O estado "carregando" de toda tela do painel (25/10/2026).
 *
 * Cada página do admin é um Server Component que lê banco antes de responder — DRE, ledger,
 * fila de saques, acervo —, e sem este arquivo o clique no menu não dava sinal nenhum até a
 * tela nova chegar inteira: parecia que o clique não tinha pegado, e a pessoa clicava de novo.
 * Com ele, o App Router troca o conteúdo por este esqueleto na hora; o casco (menu e topbar)
 * fica parado, porque o layout não é refeito.
 *
 * Sem 'use client' e sem dado: só marcação. `aria-busy` e o texto escondido dizem ao leitor de
 * tela o que está acontecendo; o movimento do esqueleto respeita a redução de movimento
 * (`responsive.css` zera as animações). Rodada 3: o `<Esqueleto>` da marca (luz correndo no metal).
 */

import type { ReactNode } from 'react'

import { Esqueleto } from '@/components/ui/Esqueleto'

export default function CarregandoTelaDoPainel(): ReactNode {
  return (
    <div className="adm-carregando" aria-busy="true" aria-live="polite">
      <span className="adm-sr">Carregando a tela…</span>
      <div className="adm-inds" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="adm-ind">
            <Esqueleto largura="45%" altura="12px" />
            <Esqueleto largura="70%" altura="26px" />
          </div>
        ))}
      </div>
      <div className="panel" aria-hidden="true">
        <Esqueleto largura="30%" altura="20px" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="adm-carregando-linha">
            <Esqueleto altura="14px" />
          </div>
        ))}
      </div>
    </div>
  )
}

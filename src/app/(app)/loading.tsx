/**
 * O estado "carregando" de toda tela do cliente (30/10/2026, polimento — lente "estados").
 *
 * Sem este arquivo o clique no menu não dava sinal nenhum até a tela nova chegar: parecia que o
 * clique não pegou. Com ele o App Router troca o conteúdo por este esqueleto na hora; o casco
 * (menu e topbar) fica parado porque o layout não é refeito. O `.carregando` e o `<Esqueleto>`
 * são os mesmos das telas que já carregam por conta própria, e a redução de movimento já vem
 * do `responsive.css`.
 *
 * Sem 'use client' e sem dado: só marcação.
 */

import type { ReactNode } from 'react'

import { Esqueleto } from '@/components/ui/Esqueleto'

export default function CarregandoTela(): ReactNode {
  return (
    <div className="panel carregando" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando a tela…</span>
      <Esqueleto largura="35%" altura="22px" />
      <Esqueleto altura="14px" />
      <Esqueleto largura="80%" altura="14px" />
      <Esqueleto largura="60%" altura="14px" />
    </div>
  )
}

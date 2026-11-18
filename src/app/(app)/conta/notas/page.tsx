/**
 * Página Minha conta › Notas fiscais (frente G, 18/11/2026).
 *
 * Sem 'use client': a página só posiciona o link de volta e o componente, que é quem lê as notas (Client
 * Component, porque baixa arquivo). O título e o subtítulo da tela vêm da Topbar, a partir da rota.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { NotasDoCliente } from './NotasDoCliente'

export default function NotasPage(): ReactNode {
  return (
    <>
      <Link href="/conta" className="back-link">
        ‹ Voltar para minha conta
      </Link>

      <NotasDoCliente />
    </>
  )
}

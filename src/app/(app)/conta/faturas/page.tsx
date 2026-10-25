/**
 * Página Minha Conta › Faturas de Custódia e Planos (Passo B2.7).
 *
 * Sem 'use client' desde 25/10/2026: a página só posiciona o link de volta e o componente, que é
 * quem lê o estado (FaturasCustodia já é Client Component). Marcação sem hook não vai ao bundle
 * do navegador (doc 35 §4 do aprendizado_frontend).
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { FaturasCustodia } from '@/components/custody/FaturasCustodia'

export default function FaturasPage(): ReactNode {
  return (
    <>
      <Link href="/conta" className="back-link">
        ← Voltar para Minha conta
      </Link>

      <FaturasCustodia />
    </>
  )
}

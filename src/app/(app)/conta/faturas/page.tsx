'use client'

/**
 * Página Minha Conta › Faturas de Custódia e Planos (Passo B2.7).
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { FaturasCustodia } from '@/components/custody/FaturasCustodia'

export default function FaturasPage(): ReactNode {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link href="/conta" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44 }}>
          ← Voltar para Minha conta
        </Link>
      </div>

      <FaturasCustodia />
    </>
  )
}

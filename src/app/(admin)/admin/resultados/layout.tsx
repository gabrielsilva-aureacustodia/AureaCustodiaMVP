/**
 * Moldura das telas da Gestão (`/admin/resultados/*`): só a faixa de troca entre Financeiro,
 * Contábil, Notas fiscais, Indicadores e Uso (25/10/2026). Não confere permissão nem carrega
 * dado — cada página continua fazendo isso por conta própria, antes de qualquer leitura.
 *
 * `Suspense` porque a faixa lê `useSearchParams` (para levar o período junto).
 */

import { Suspense } from 'react'
import type { ReactNode } from 'react'

import { SubnavGestao } from '@/components/admin/resultados/SubnavGestao'

export default function ResultadosLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <Suspense fallback={null}>
        <SubnavGestao />
      </Suspense>
      {children}
    </>
  )
}

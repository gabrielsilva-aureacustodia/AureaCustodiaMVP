import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { MeusCasos } from '@/components/atendimento/MeusCasos'
import { listarMeusCasosAction } from '@/server/actions/atendimento'

export const metadata: Metadata = { title: 'Atendimento — Real Olímpico' }
export const dynamic = 'force-dynamic'

/** Os casos do próprio cliente. A lista já vem na primeira pintura; o que muda depois a tela relê sozinha. */
export default async function AtendimentoPage(): Promise<ReactNode> {
  const r = await listarMeusCasosAction()
  return <MeusCasos inicial={r.ok ? (r.data?.casos ?? []) : []} falhou={!r.ok} />
}

/**
 * /admin/resultados/fiscal — as NFS-e emitidas pela plataforma (23/10/2026): uma por comissão de cada
 * lado da negociação e uma por fatura de custódia paga, com a situação de cada uma na Sefin Nacional.
 *
 * Server Component: confere `resultados.ver` no servidor ANTES de carregar qualquer dado. Mandar à
 * Sefin (enviar a fila, reprocessar) pede `resultados.nfse`, conferido de novo em cada Server Action.
 * O filtro mora na URL (`?status=&busca=`).
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { NotasFiscais } from '@/components/admin/resultados/NotasFiscais'
import { primeiroValor, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarFiscal, lerStatus } from '@/server/admin/fiscal'

export const dynamic = 'force-dynamic'

export default async function FiscalPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'resultados.ver')) return <SemPermissao permissoes={['resultados.ver']} />

  const params = await searchParams
  const status = lerStatus(primeiroValor(params.status) ?? undefined)
  const busca = (primeiroValor(params.busca) ?? '').slice(0, 120)
  const dados = await carregarFiscal({ status, busca })
  return <NotasFiscais dados={dados} status={status} busca={busca} podeEmitir={temPermissao(membro, 'resultados.nfse')} />
}

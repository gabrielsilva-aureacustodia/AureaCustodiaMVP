/**
 * /admin/resultados/uso — uso da plataforma e a trilha de auditoria.
 *
 * Duas permissões, cada uma com a sua parte: `resultados.ver` mostra o comportamento
 * de uso; `admin.auditoria` mostra a trilha completa com filtro. Com uma só, a outra
 * parte nem é carregada do banco. Sem nenhuma das duas, a página recusa.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { Uso } from '@/components/admin/resultados/Uso'
import { lerPeriodo, primeiroValor, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temAlguma, temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarUso } from '@/server/admin/resultados'

export const dynamic = 'force-dynamic'

export default async function UsoPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temAlguma(membro, ['resultados.ver', 'admin.auditoria'])) {
    return <SemPermissao permissoes={['resultados.ver', 'admin.auditoria']} />
  }

  const params = await searchParams
  const periodo = lerPeriodo(params, Date.now())
  const filtro = { ator: (primeiroValor(params.ator) ?? '').slice(0, 120), acao: (primeiroValor(params.acao) ?? '').slice(0, 80) }
  const pode = { uso: temPermissao(membro, 'resultados.ver'), trilha: temPermissao(membro, 'admin.auditoria') }
  const dados = await carregarUso(periodo, filtro, pode)
  return <Uso dados={dados} periodo={periodo} filtro={filtro} podeVerUso={pode.uso} podeVerTrilha={pode.trilha} />
}

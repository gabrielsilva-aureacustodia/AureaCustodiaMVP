/**
 * /admin/saques — a fila de saques dos clientes (14/10/2026).
 *
 * Server Component: confere `saques.ver` ANTES de ler qualquer saque (layout e página renderizam em
 * paralelo). Os botões de aprovar, pagar por fora e recusar aparecem com `saques.pagar`, e cada Server
 * Action confere a permissão de novo.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { SecaoDeSaques } from '@/components/admin/saques/SecaoDeSaques'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarFilaDeSaques } from '@/server/admin/saques'

export const dynamic = 'force-dynamic'

export default async function SaquesPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'saques.ver')) return <SemPermissao permissoes={['saques.ver']} />

  const dados = await carregarFilaDeSaques({ historico: 30 })
  return <SecaoDeSaques dados={dados} podePagar={temPermissao(membro, 'saques.pagar')} titulo="Pedidos de saque" />
}

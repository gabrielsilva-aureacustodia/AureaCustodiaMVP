/**
 * /admin/saques — a fila de saques dos clientes (14/10/2026).
 *
 * Server Component: confere `saques.ver` ANTES de ler qualquer saque (layout e página renderizam em
 * paralelo). Os botões de aprovar, pagar por fora e recusar aparecem com `saques.pagar`, e cada Server
 * Action confere a permissão de novo.
 *
 * ABAS POR SITUAÇÃO (25/10/2026, rodada 2). A fila e os 30 últimos resolvidos vinham numa tabela só,
 * misturando o que espera a equipe com o que já acabou. Agora `?ver=` separa: "Esperando a equipe"
 * (pedido que ninguém tocou), "No Mercado Pago" (Pix enviado ou falhado, esperando conferência) e
 * "Resolvidos". É a mesma lista carregada, repartida aqui na página — nenhum dado novo nem ação nova.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { Abas } from '@/components/admin/Pecas'
import { SecaoDeSaques } from '@/components/admin/saques/SecaoDeSaques'
import type { ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarFilaDeSaques } from '@/server/admin/saques'

export const dynamic = 'force-dynamic'

const VISOES = ['esperando', 'mercadopago', 'resolvidos'] as const
type Visao = (typeof VISOES)[number]

export default async function SaquesPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'saques.ver')) return <SemPermissao permissoes={['saques.ver']} />

  const pedida = (await searchParams).ver
  const ver: Visao = VISOES.find((v) => v === (Array.isArray(pedida) ? pedida[0] : pedida)) ?? 'esperando'
  const dados = await carregarFilaDeSaques({ historico: 30 })

  const esperando = dados.fila.filter((l) => l.saque.status === 'solicitado')
  const noGateway = dados.fila.filter((l) => l.saque.status !== 'solicitado')
  const visivel =
    ver === 'esperando'
      ? { ...dados, fila: esperando, historico: [] }
      : ver === 'mercadopago'
        ? { ...dados, fila: noGateway, historico: [] }
        : { ...dados, fila: [], historico: dados.historico }

  const vazio =
    ver === 'esperando' ? 'Nenhum saque esperando a equipe.' : ver === 'mercadopago' ? 'Nenhum Pix esperando confirmação do Mercado Pago.' : 'Nenhum saque resolvido ainda.'

  return (
    <SecaoDeSaques
      dados={visivel}
      podePagar={temPermissao(membro, 'saques.pagar')}
      titulo="Pedidos de saque"
      vazio={vazio}
      acimaDaFila={
        <Abas
          rotulo="Situação dos saques"
          itens={[
            { href: '/admin/saques?ver=esperando', rotulo: 'Esperando a equipe', atual: ver === 'esperando', contagem: esperando.length },
            { href: '/admin/saques?ver=mercadopago', rotulo: 'No Mercado Pago', atual: ver === 'mercadopago', contagem: noGateway.length },
            { href: '/admin/saques?ver=resolvidos', rotulo: 'Resolvidos', atual: ver === 'resolvidos', contagem: dados.historico.length },
          ]}
        />
      }
    />
  )
}

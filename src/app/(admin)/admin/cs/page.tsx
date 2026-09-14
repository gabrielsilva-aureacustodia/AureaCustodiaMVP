/**
 * /admin/cs — o atendimento com o WhatsApp da empresa (plano do Admin, seção 2.5).
 *
 * Server Component: confere a permissão, lê o filtro e a conversa da URL e entrega a primeira
 * pintura pronta — caixa, conversa aberta e cartão do cliente. Dali em diante a tela se
 * atualiza sozinha a cada 5 segundos (src/components/admin/cs/CaixaDeAtendimento.tsx).
 *
 * Sem provedor de WhatsApp configurado, a tela abre igual: o histórico, as notas, as
 * etiquetas e as respostas registradas no painel funcionam, e o aviso diz o que falta.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { CaixaDeAtendimento } from '@/components/admin/cs/CaixaDeAtendimento'
import { lerFiltroConversas } from '@/domain/admin/cs'
import { primeiroValor, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarAtendimento, equipeParaAtribuir } from '@/server/admin/atendimento'

export const dynamic = 'force-dynamic'

export default async function CsPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'cs.ver')) return <SemPermissao permissoes={['cs.ver']} />

  const params = await searchParams
  const filtro = lerFiltroConversas(params)
  const id = Number(primeiroValor(params.conversa))
  const conversaId = Number.isSafeInteger(id) && id > 0 ? id : null

  const [dados, equipe] = await Promise.all([
    carregarAtendimento(filtro, conversaId, { marcarLida: true, incluirCliente: true }),
    equipeParaAtribuir(),
  ])

  return <CaixaDeAtendimento inicial={dados} filtroInicial={filtro} conversaInicial={conversaId} equipe={equipe} />
}

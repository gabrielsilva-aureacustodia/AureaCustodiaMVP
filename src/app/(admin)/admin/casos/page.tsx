/**
 * /admin/casos — os pedidos que os clientes mandam pelo botão Atendimento (dúvida, pedido, reclamação, erro).
 *
 * Server Component: confere `cs.ver`, lê o filtro e o caso da URL e entrega a lista e a conversa prontas.
 * Responder e marcar o estado pedem `cs.responder` (as Server Actions conferem de novo). Sem as tabelas da
 * migration 048 a tela abre com o aviso do que falta, em vez de quebrar.
 */

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AvisoSemBanco, SemPermissao } from '@/components/admin/Blocos'
import { CasosDoPainel } from '@/components/admin/casos/CasosDoPainel'
import { tituloDaPagina } from '@/components/admin/navegacao'
import { Aviso } from '@/components/ui/Aviso'
import { lerFiltroDeCasos } from '@/domain/atendimento/casos'
import { primeiroValor, type ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { ehTabelaAusente } from '@/server/admin/portas'
import { listarParaEquipe, verCasoComoEquipe } from '@/server/atendimento/casos'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'

export const metadata: Metadata = { title: tituloDaPagina('/admin/casos') }
export const dynamic = 'force-dynamic'

export default async function CasosPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'cs.ver')) return <SemPermissao permissoes={['cs.ver']} />
  if (!bancoConfigurado()) return <AvisoSemBanco>Os casos de atendimento ficam no banco.</AvisoSemBanco>

  const params = await searchParams
  const filtro = lerFiltroDeCasos(params)
  const id = Number(primeiroValor(params.caso))
  try {
    const [lista, detalhe] = await Promise.all([
      listarParaEquipe(executarNoBanco, filtro),
      Number.isSafeInteger(id) && id > 0 ? verCasoComoEquipe(executarNoBanco, id) : Promise.resolve(null),
    ])
    return <CasosDoPainel casos={lista.casos} abertos={lista.abertos} filtro={filtro} detalhe={detalhe} podeResponder={temPermissao(membro, 'cs.responder')} />
  } catch (err) {
    if (!ehTabelaAusente(err)) throw err
    return (
      <Aviso tom="aviso" titulo="Os casos de atendimento ainda não foram ativados neste banco">
        Falta aplicar a migration 048 (<code>npm run db:migrate</code>).
      </Aviso>
    )
  }
}

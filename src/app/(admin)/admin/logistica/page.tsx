/**
 * /admin/logistica — envios e retiradas de todas as contas (plano do Admin, seção 3.6).
 *
 * Os mesmos eventos de rastreio que o cliente vê (de `aurea.rastreios`), a etapa atual, o prazo
 * estourado em destaque, a forma de pagamento e as parcelas da retirada (B3) e a reimpressão de
 * etiqueta pelas rotas que já existem. O visualizador de recibo de qualquer conta é a ficha da moeda
 * (`/admin/moedas/[codigo]`), ligada daqui.
 *
 * Os prazos que acendem o alerta vêm da aba Operacional da configuração.
 */

import type { ReactNode } from 'react'

import { Cartao, SemPermissao } from '@/components/admin/Blocos'
import { numero } from '@/components/admin/formatos'
import { PainelLogistica } from '@/components/admin/logistica/PainelLogistica'
import { lerFiltroLogistica } from '@/domain/admin/logistica'
import type { ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarLogistica } from '@/server/admin/logistica'
import { carregarParametrosOperacionais } from '@/server/config/carregar'

export const dynamic = 'force-dynamic'

export default async function LogisticaPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'logistica.ver')) return <SemPermissao permissoes={['logistica.ver']} />

  const filtro = lerFiltroLogistica(await searchParams)
  const operacional = await carregarParametrosOperacionais()
  const dados = await carregarLogistica(filtro, operacional.prazos)
  const c = dados.contagem

  return (
    <>
      <div className="adm-grade">
        <Cartao rotulo="Envios em andamento" valor={numero(c.enviosAbertos)} />
        <Cartao rotulo="Envios com prazo estourado" valor={numero(c.enviosAtrasados)} tom={c.enviosAtrasados > 0 ? 'alerta' : 'normal'} detalhe={`validação em ${operacional.prazos.validacaoDiasUteis} dia(s) útil(eis) · trânsito em ${operacional.prazos.transitoEnvioDias} dias`} />
        <Cartao rotulo="Retiradas em andamento" valor={numero(c.retiradasAbertas)} />
        <Cartao rotulo="Retiradas fora do prazo de postagem" valor={numero(c.retiradasAtrasadas)} tom={c.retiradasAtrasadas > 0 ? 'alerta' : 'normal'} />
      </div>
      <PainelLogistica dados={dados} filtro={filtro} podeEtiqueta={temPermissao(membro, 'logistica.etiquetas')} />
    </>
  )
}

/**
 * /admin/logistica — envios e retiradas de todas as contas (plano do Admin, seção 3.6).
 *
 * Os mesmos eventos de rastreio que o cliente vê (de `aurea.rastreios`), a etapa atual, o prazo
 * estourado em destaque, a forma de pagamento e as parcelas da retirada (B3) e a reimpressão de
 * etiqueta pelas rotas que já existem. O visualizador de recibo de qualquer conta é a ficha da moeda
 * (`/admin/moedas/[codigo]`), ligada daqui.
 *
 * Os prazos que acendem o alerta vêm da aba Operacional da configuração.
 *
 * Expedição da retirada (22/10/2026): com `logistica.expedir`, cada retirada paga ou em separação ganha
 * "Emitir etiqueta dos Correios" (ou, sem contrato no ambiente, o campo do código postado no balcão).
 * A etiqueta ativa de cada retirada é lida aqui, do repositório, porque `LinhaRetirada`
 * (src/domain/admin/logistica.ts) ainda não carrega a pré-postagem.
 */

import type { ReactNode } from 'react'

import { SemPermissao } from '@/components/admin/Blocos'
import { numero } from '@/components/admin/formatos'
import type { EtiquetaDaRetirada } from '@/components/admin/logistica/ExpedicaoDaRetirada'
import { AtualizarRastreio } from '@/components/admin/logistica/AtualizarRastreio'
import { PainelLogistica } from '@/components/admin/logistica/PainelLogistica'
import { Indicador } from '@/components/admin/Pecas'
import { lerFiltroLogistica } from '@/domain/admin/logistica'
import type { ParametrosDaUrl } from '@/domain/admin/periodo'
import { temPermissao } from '@/domain/admin/permissoes'
import { correiosConfigurado } from '@/lib/shipping/cws'
import { membroDaPagina } from '@/server/admin/acesso'
import { carregarLogistica } from '@/server/admin/logistica'
import { carregarParametrosOperacionais } from '@/server/config/carregar'
import type { Metadata } from 'next'
import { tituloDaPagina } from '@/components/admin/navegacao'

export const metadata: Metadata = { title: tituloDaPagina('/admin/logistica') }

export const dynamic = 'force-dynamic'

export default async function LogisticaPage({ searchParams }: { searchParams: Promise<ParametrosDaUrl> }): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'logistica.ver')) return <SemPermissao permissoes={['logistica.ver']} />

  const filtro = lerFiltroLogistica(await searchParams)
  const operacional = await carregarParametrosOperacionais()
  const dados = await carregarLogistica(filtro, operacional.prazos)
  const c = dados.contagem
  // A etiqueta ativa vem na própria linha (`linhaDeRetirada`), lida junto com a retirada.
  const etiquetas: Record<string, EtiquetaDaRetirada> = Object.fromEntries(
    dados.retiradas.flatMap((r) => (r.etiqueta ? [[r.id, r.etiqueta] as const] : [])),
  )

  return (
    <>
      {/* Indicadores que levam à lista que explicam (rodada 2): o prazo estourado abre já filtrado. */}
      <div className="adm-inds">
        <Indicador rotulo="Envios em andamento" valor={numero(c.enviosAbertos)} href="/admin/logistica?ver=envios" />
        <Indicador
          rotulo="Envios com prazo estourado"
          valor={numero(c.enviosAtrasados)}
          tom={c.enviosAtrasados > 0 ? 'alerta' : 'ok'}
          detalhe={`validação em ${operacional.prazos.validacaoDiasUteis} dia(s) útil(eis) · trânsito em ${operacional.prazos.transitoEnvioDias} dias`}
          href={c.enviosAtrasados > 0 ? '/admin/logistica?ver=envios&situacao=atrasados' : undefined}
        />
        <Indicador rotulo="Retiradas em andamento" valor={numero(c.retiradasAbertas)} href="/admin/logistica?ver=retiradas" />
        <Indicador
          rotulo="Retiradas fora do prazo de postagem"
          valor={numero(c.retiradasAtrasadas)}
          tom={c.retiradasAtrasadas > 0 ? 'alerta' : 'ok'}
          href={c.retiradasAtrasadas > 0 ? '/admin/logistica?ver=retiradas&situacao=atrasados' : undefined}
        />
      </div>
      {/* Roda na hora a rodada de rastreio do job diário (27/10/2026); a ação confere a permissão. */}
      {temPermissao(membro, 'logistica.expedir') ? <AtualizarRastreio /> : null}
      <PainelLogistica
        dados={dados}
        filtro={filtro}
        podeEtiqueta={temPermissao(membro, 'logistica.etiquetas')}
        podeExpedir={temPermissao(membro, 'logistica.expedir')}
        contratoCorreios={correiosConfigurado()}
        etiquetas={etiquetas}
      />
    </>
  )
}

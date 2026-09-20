/**
 * /admin/bancada — a análise física no navegador, sem Electron (plano do Admin, seção 3.4).
 *
 * Server Component: confere a permissão e entrega a primeira pintura pronta — a fila, as caixas e o
 * que falta no ambiente para o vídeo subir. A partir daí o procedimento acontece no cliente
 * (src/components/admin/bancada/BancadaWeb.tsx), e cada gravação passa pelas Server Actions de
 * src/server/actions/admin/bancada.ts, que conferem a permissão de novo.
 *
 * A estação Electron continua funcionando, sem alteração, e escreve na mesma corrente de hashes.
 * A tela web é para bancada com rede estável (RA-45).
 */

import type { ReactNode } from 'react'

import { BancadaWeb } from '@/components/admin/bancada/BancadaWeb'
import { SemPermissao } from '@/components/admin/Blocos'
import { ocupacaoDasCaixas, ocupantesDoCofre } from '@/domain/admin/caixas'
import { temPermissao } from '@/domain/admin/permissoes'
import { CadastroDiretoDeMoeda } from '@/components/admin/acervo/CadastroDiretoDeMoeda'
import { COIN_TYPES } from '@/domain/constants'
import { carregarCatalogo } from '@/server/config/carregar'
import type { Retirada } from '@/domain/types'
import { membroDaPagina } from '@/server/admin/acesso'
import { caixasCadastradas } from '@/server/admin/portas'
import { variaveisDoVideoFaltando, videoConfigurado } from '@/server/admin/video'
import { filaDeAnalise } from '@/server/estacao/analise'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

export const dynamic = 'force-dynamic'

export default async function BancadaPage(): Promise<ReactNode> {
  const membro = await membroDaPagina()
  if (!temPermissao(membro, 'bancada.ver')) return <SemPermissao permissoes={['bancada.ver']} />

  const [fila, state, retiradas, caixas] = await Promise.all([
    filaDeAnalise(),
    getState(),
    repositorioRetiradas()
      .listarTodas()
      .catch((err: unknown) => {
        console.error('[admin] retiradas indisponíveis na bancada:', err)
        return [] as Retirada[]
      }),
    caixasCadastradas().catch((err: unknown) => {
      console.error('[admin] caixas indisponíveis na bancada:', err)
      return null
    }),
  ])

  const catalogoVigente = await carregarCatalogo().catch(() => COIN_TYPES)

  return (
    <>
      {/* Moeda que já está no armazém e não tem envio para analisar entra por
          aqui. Só sócio e desenvolvimento veem — `operacao` recebe apenas
          bancada.* e logistica.*, e esta permissão é do módulo acervo. */}
      {temPermissao(membro, 'acervo.cadastro_direto') ? (
        <CadastroDiretoDeMoeda catalogo={catalogoVigente} />
      ) : null}
    <BancadaWeb
      filaInicial={fila}
      caixasIniciais={ocupacaoDasCaixas(caixas ?? [], ocupantesDoCofre({ ...state, retiradas }))}
      caixasCadastradas={caixas !== null}
      podeAnalisar={temPermissao(membro, 'bancada.analisar')}
      operador={membro.email}
      videoConfigurado={videoConfigurado()}
      videoFaltando={variaveisDoVideoFaltando()}
    />
    </>
  )
}

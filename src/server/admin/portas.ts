/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Liga os serviços testáveis do painel (cs.ts, usuarios.ts, bancada.ts,
 * configuracao.ts) ao mundo real: o banco de verdade, o estado da aplicação, o
 * Supabase Auth e o Storage, o provedor de WhatsApp, o serviço da estação e a
 * publicação de documentos da A3. Não importe de Client Component.
 * ==========================================================================*/

import 'server-only'

import type { CaixaCadastrada } from '@/domain/admin/caixas'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { listarCaixas } from '@/server/db/repositories/caixas'
import { garantirDocumentosVigentes } from '@/server/db/repositories/documentos'
import { tabelaExiste } from '@/server/db/repositories/painel-leituras'
import { publicarVersaoDocumento } from '@/server/documentos/publicar'
import { abrirAnalise, fecharAnalise } from '@/server/estacao/analise'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState, mutateState } from '@/server/state'

import { registrarAcaoAdmin } from './auditar'
import type { PortaDaBancada, PortaDeVideo } from './bancada'
import type { PortaDePublicacao } from './configuracao'
import { portaDeEstadoNoBanco, type PortaDeEstado } from './usuarios'
import { urlDeUploadDeVideo, variaveisDoVideoFaltando, videoConfigurado } from './video'

export { portaDeIdentidadeDoAmbiente } from './identidade'
export { provedorDoAmbiente } from '@/lib/mensageria'

/**
 * O AppState como os serviços do painel o enxergam. Com banco, a mutação e a linha
 * `admin.<area>.<verbo>` vão na mesma transação (`portaDeEstadoNoBanco`). Sem banco, é o
 * `mutateState` de sempre, sobre a memória — e não existe trilha para gravar.
 */
export function portaDeEstadoDoServidor(ator: string): PortaDeEstado {
  if (bancoConfigurado()) return portaDeEstadoNoBanco(executarNoBanco, ator)
  return {
    ler: getState,
    mutarComTrilha: async (fn) => (await mutateState(fn)).result,
  }
}

/** O executor das tabelas próprias do painel, ou `null` num ambiente sem banco. */
export function executorOuNulo(): typeof executarNoBanco | null {
  return bancoConfigurado() ? executarNoBanco : null
}

/**
 * Tabela ainda não migrada: o Postgres responde 42P01 ("relation does not exist"). É o que
 * acontece entre o deploy da C2 e o `npm run db:migrate` — e merece uma frase que diga o
 * que fazer, não a mensagem genérica de falha.
 */
export function ehTabelaAusente(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: unknown }).code === '42P01')
}

export const TABELA_AUSENTE = 'O banco ainda não tem as tabelas do atendimento e das notas (migrations 022 e 023). Rode npm run db:migrate.'

/** As caixas cadastradas, ou `null` sem banco ou antes da migration 025. */
export async function caixasCadastradas(): Promise<CaixaCadastrada[] | null> {
  if (!bancoConfigurado()) return null
  return executarNoBanco(async (tx) => ((await tabelaExiste(tx, 'caixas')) ? listarCaixas(tx) : null), { somenteLeitura: true })
}

/**
 * A bancada web ligada ao mundo real: o serviço da estação (frente B), o estado, as retiradas e
 * a trilha. A linha do painel usa uma transação própria — ver o topo de ./bancada.ts.
 */
export function portaDaBancadaDoServidor(): PortaDaBancada {
  return {
    abrir: abrirAnalise,
    fechar: fecharAnalise,
    estado: getState,
    retiradas: () => repositorioRetiradas().listarTodas(),
    caixas: () =>
      caixasCadastradas().catch((err: unknown) => {
        // Sem a lista, a bancada só perde a troca do código digitado pelo cadastrado.
        console.error('[admin] caixas indisponíveis na bancada:', err)
        return null
      }),
    auditar: async (linha) => {
      if (!bancoConfigurado()) return
      await executarNoBanco((tx) => registrarAcaoAdmin(tx, linha))
    },
  }
}

/** A publicação de documento contratual da A3, ligada ao banco de verdade. */
export function portaDePublicacaoDoServidor(): PortaDePublicacao {
  return {
    garantirVersoesDoCodigo: async () => {
      if (!bancoConfigurado()) return
      await executarNoBanco((tx) => garantirDocumentosVigentes(tx))
    },
    publicar: async (chave, conteudo, ator) => {
      const r = await publicarVersaoDocumento(chave, conteudo, ator)
      return { versao: r.versao, hash: r.hash }
    },
  }
}

export function portaDeVideoDoServidor(): PortaDeVideo {
  return {
    configurado: videoConfigurado,
    faltando: variaveisDoVideoFaltando,
    assinar: async (protocolo, arquivo) => {
      const r = await urlDeUploadDeVideo(protocolo, arquivo)
      return { url: r.url, caminho: r.caminho }
    },
  }
}

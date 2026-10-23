/**
 * A fila das NFS-e no painel — leitura (23/10/2026).
 *
 * Só lê. Quem pode ver é decidido por quem chama (`resultados.ver`); quem pode mandar à Sefin é
 * decidido de novo por cada Server Action (`resultados.nfse`). Devolve a tela pronta: nome do cliente,
 * contagem por situação e por que a emissão não está rodando, quando não está.
 */

import type { StatusNfse, EmissaoNfse } from '@/server/db/repositories/nfse'
import { contarPorStatus, listarEmissoes } from '@/server/db/repositories/nfse'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import { impedimentoDaEmissao } from '@/server/nfse/emissao'
import { ambienteConfigurado, type AmbienteNfse } from '@/server/nfse/sefin'
import { getState } from '@/server/state'

export interface LinhaFiscal {
  emissao: EmissaoNfse
  nome: string
}

export interface DadosFiscais {
  semBanco: boolean
  linhas: LinhaFiscal[]
  contagem: Record<StatusNfse, number>
  ambiente: AmbienteNfse
  impedimento: string | null
}

const STATUS_VALIDOS: readonly StatusNfse[] = ['pendente', 'processando', 'autorizada', 'rejeitada', 'erro', 'cancelando', 'cancelada']

export function lerStatus(v: string | undefined): StatusNfse | null {
  return v && (STATUS_VALIDOS as readonly string[]).includes(v) ? (v as StatusNfse) : null
}

export async function carregarFiscal(filtro: { status: StatusNfse | null; busca: string }): Promise<DadosFiscais> {
  const vazio: Record<StatusNfse, number> = { pendente: 0, processando: 0, autorizada: 0, rejeitada: 0, erro: 0, cancelando: 0, cancelada: 0 }
  if (!bancoConfigurado()) {
    return { semBanco: true, linhas: [], contagem: vazio, ambiente: ambienteConfigurado(), impedimento: impedimentoDaEmissao() }
  }
  const [emissoes, contagem, state] = await Promise.all([
    executarNoBanco((tx) => listarEmissoes(tx, { status: filtro.status, busca: filtro.busca, limite: 300 }), { somenteLeitura: true }),
    executarNoBanco((tx) => contarPorStatus(tx), { somenteLeitura: true }),
    getState(),
  ])
  return {
    semBanco: false,
    linhas: emissoes.map((e) => ({ emissao: e, nome: state.users[e.tomadorEmail]?.name ?? e.tomadorEmail })),
    contagem,
    ambiente: ambienteConfigurado(),
    impedimento: impedimentoDaEmissao(),
  }
}

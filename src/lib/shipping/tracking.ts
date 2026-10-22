import 'server-only'

/**
 * Rastreamento SRO dos Correios — a porta que o job agendado usa.
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Rastreio é consultado por rotina agendada (Vercel Cron), NUNCA a cada visita de tela.
 *  - Sem contrato configurado, ou com os Correios fora, o resultado diz "indisponível" com o motivo
 *    — não inventa evento nem finge que o objeto não existe.
 *
 * Desde 22/10/2026 a consulta vai em lotes de até 50 códigos pela API SRO-Rastro do contrato
 * (`./cws/rastro.ts`). O cache em memória de 30 minutos que existia aqui saiu: o job roda uma vez
 * por dia, e em serverless o cache nem sobrevivia entre execuções.
 */

import { ErroCorreios } from './cws/cliente'
import { correiosConfigurado } from './cws/config'
import { rastrearObjetos } from './cws/rastro'
import type { RastreioObjetoResult } from './types'

/** Normaliza o código de rastreio dos Correios (ex.: 'AP123456789BR'). */
export function normalizarCodigoRastreio(codigo: string): string {
  return codigo.trim().toUpperCase()
}

function indisponivel(codigo: string, erro: string, agora: number): RastreioObjetoResult {
  return {
    codigoRastreio: codigo,
    statusAtual: 'indisponivel',
    etapaDescricao: 'Não foi possível consultar os Correios agora',
    dataUltimaAtualizacao: agora,
    eventos: [],
    entregue: false,
    erro,
  }
}

/**
 * Rastreia vários objetos de uma vez (o job). Todo código pedido volta no mapa: rastreado,
 * `nao_encontrado` (os Correios não o conhecem) ou `indisponivel` (não deu para perguntar).
 */
export async function atualizarRastreiosEmLote(
  codigosRastreio: string[],
): Promise<Record<string, RastreioObjetoResult>> {
  const agora = Date.now()
  const codigos = [...new Set(codigosRastreio.map(normalizarCodigoRastreio).filter(Boolean))]
  const resultados: Record<string, RastreioObjetoResult> = {}
  if (codigos.length === 0) return resultados

  if (!correiosConfigurado()) {
    for (const c of codigos) resultados[c] = indisponivel(c, 'Contrato dos Correios não configurado neste ambiente.', agora)
    return resultados
  }

  let rastreados: Record<string, RastreioObjetoResult> = {}
  try {
    rastreados = await rastrearObjetos(codigos)
  } catch (err) {
    const motivo = err instanceof ErroCorreios || err instanceof Error ? err.message : 'Falha na conexão com a API dos Correios'
    console.error('[rastreio] consulta ao SRO falhou:', motivo)
    for (const c of codigos) resultados[c] = indisponivel(c, motivo, agora)
    return resultados
  }

  for (const c of codigos) {
    resultados[c] = rastreados[c] ?? {
      codigoRastreio: c,
      statusAtual: 'nao_encontrado',
      etapaDescricao: 'Objeto ainda não consta na base dos Correios',
      dataUltimaAtualizacao: agora,
      eventos: [],
      entregue: false,
    }
  }
  return resultados
}

/** Rastreia um objeto só. */
export async function consultarRastreioCorreios(codigoRastreio: string): Promise<RastreioObjetoResult> {
  const codigo = normalizarCodigoRastreio(codigoRastreio)
  const r = await atualizarRastreiosEmLote([codigo])
  return r[codigo]
}

import 'server-only'

/**
 * Consulta de Rastreamento SRO (Sistema de Rastreamento de Objetos) dos Correios.
 *
 * REGRAS INEGOCIÁVEIS:
 *  - Rastreio é consultado via rotinas agendadas (Cron / Batch), NUNCA síncrono a cada visita de tela.
 *  - Implementa cache local em memória para evitar requisições redundantes à API dos Correios.
 *  - Normaliza os eventos em uma máquina de estados consistente.
 */

import type { EventoRastreio, RastreioObjetoResult, StatusRastreioCorreios } from './types'

/** Cache em memória com TTL de 30 minutos para consultas de rastreio. */
const cacheRastreio = new Map<string, { dado: RastreioObjetoResult; expiraEm: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutos

/**
 * Normaliza o código de rastreio dos Correios (ex: 'SL123456789BR' ou formato 'BR...BR').
 */
export function normalizarCodigoRastreio(codigo: string): string {
  return codigo.trim().toUpperCase()
}

/**
 * Mapeia descrição ou categoria SRO para o enum StatusRastreioCorreios.
 */
function mapearStatusSro(descricao: string): StatusRastreioCorreios {
  const d = descricao.toLowerCase()
  if (d.includes('entregue') || d.includes('objeto entregue')) return 'entregue'
  if (d.includes('saiu para entrega')) return 'saiu_para_entrega'
  if (d.includes('aguardando retirada') || d.includes('disponível para retirada')) return 'aguardando_retirada'
  if (d.includes('em trânsito') || d.includes('encaminhado') || d.includes('transferência')) return 'em_transito'
  if (d.includes('postado') || d.includes('recebido na agência') || d.includes('postagem')) return 'postado'
  if (d.includes('extraviado') || d.includes('roubo') || d.includes('avaria')) return 'extraviado'
  if (d.includes('devolvido') || d.includes('devolução')) return 'devolvido'
  return 'em_transito'
}

/**
 * Consulta o rastreamento de um objeto nos Correios.
 */
export async function consultarRastreioCorreios(
  codigoRastreio: string,
): Promise<RastreioObjetoResult> {
  const codigo = normalizarCodigoRastreio(codigoRastreio)
  const agora = Date.now()

  // Verifica cache
  const emCache = cacheRastreio.get(codigo)
  if (emCache && emCache.expiraEm > agora) {
    return emCache.dado
  }

  const token = process.env.CORREIOS_TOKEN

  // Se não houver token configurado no ambiente, não inventa dados nem finge
  // que o objeto não existe: informa claramente que não foi possível consultar agora.
  if (!token) {
    const resultado: RastreioObjetoResult = {
      codigoRastreio: codigo,
      statusAtual: 'indisponivel',
      etapaDescricao: 'Não foi possível consultar os Correios agora',
      dataUltimaAtualizacao: agora,
      eventos: [],
      entregue: false,
      erro: 'Token de integração com os Correios (CORREIOS_TOKEN) não configurado.',
    }
    cacheRastreio.set(codigo, { dado: resultado, expiraEm: agora + CACHE_TTL_MS })
    return resultado
  }

  // Com token configurado, consulta a API oficial dos Correios (SRO)
  try {
    const res = await fetch(`https://api.correios.com.br/sro/v1/objetos/${codigo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 404) {
      const resultado: RastreioObjetoResult = {
        codigoRastreio: codigo,
        statusAtual: 'nao_encontrado',
        etapaDescricao: 'Objeto ainda não consta na base de dados dos Correios',
        dataUltimaAtualizacao: agora,
        eventos: [],
        entregue: false,
      }
      cacheRastreio.set(codigo, { dado: resultado, expiraEm: agora + CACHE_TTL_MS })
      return resultado
    }

    if (!res.ok) {
      const resultado: RastreioObjetoResult = {
        codigoRastreio: codigo,
        statusAtual: 'indisponivel',
        etapaDescricao: 'Não foi possível consultar os Correios agora',
        dataUltimaAtualizacao: agora,
        eventos: [],
        entregue: false,
        erro: `Serviço dos Correios retornou erro HTTP ${res.status}`,
      }
      cacheRastreio.set(codigo, { dado: resultado, expiraEm: agora + CACHE_TTL_MS })
      return resultado
    }

    const data = (await res.json()) as {
      objetos?: Array<{
        codObjeto: string
        eventos?: Array<{
          codigo: string
          descricao: string
          dtCriacao: string
          unidade?: {
            tipo: string
            endereco?: {
              cidade: string
              uf: string
            }
          }
          unidadeDestino?: {
            tipo: string
            endereco?: {
              cidade: string
              uf: string
            }
          }
        }>
      }>
    }

    const obj = data.objetos?.[0]
    if (obj && obj.eventos && obj.eventos.length > 0) {
      const eventos: EventoRastreio[] = obj.eventos.map((evt) => {
        const status = mapearStatusSro(evt.descricao)
        return {
          dataHora: new Date(evt.dtCriacao).getTime(),
          status,
          descricao: evt.descricao,
          unidadeLocal: evt.unidade?.tipo || 'Agência dos Correios',
          cidade: evt.unidade?.endereco?.cidade || 'São Paulo',
          uf: evt.unidade?.endereco?.uf || 'SP',
          destino: evt.unidadeDestino
            ? {
                unidade: evt.unidadeDestino.tipo || 'Centro de Tratamento',
                cidade: evt.unidadeDestino.endereco?.cidade || 'São Paulo',
                uf: evt.unidadeDestino.endereco?.uf || 'SP',
              }
            : undefined,
        }
      })

      const ultimoEvento = eventos[0]
      const entregue = ultimoEvento.status === 'entregue'

      const resultado: RastreioObjetoResult = {
        codigoRastreio: codigo,
        statusAtual: ultimoEvento.status,
        etapaDescricao: ultimoEvento.descricao,
        dataUltimaAtualizacao: ultimoEvento.dataHora,
        eventos,
        entregue,
      }

      cacheRastreio.set(codigo, { dado: resultado, expiraEm: agora + CACHE_TTL_MS })
      return resultado
    }

    const resultadoSemEventos: RastreioObjetoResult = {
      codigoRastreio: codigo,
      statusAtual: 'nao_encontrado',
      etapaDescricao: 'Objeto ainda não possui eventos registrados nos Correios',
      dataUltimaAtualizacao: agora,
      eventos: [],
      entregue: false,
    }
    cacheRastreio.set(codigo, { dado: resultadoSemEventos, expiraEm: agora + CACHE_TTL_MS })
    return resultadoSemEventos
  } catch (err) {
    const resultado: RastreioObjetoResult = {
      codigoRastreio: codigo,
      statusAtual: 'indisponivel',
      etapaDescricao: 'Não foi possível consultar os Correios agora',
      dataUltimaAtualizacao: agora,
      eventos: [],
      entregue: false,
      erro: err instanceof Error ? err.message : 'Falha na conexão com a API dos Correios',
    }
    cacheRastreio.set(codigo, { dado: resultado, expiraEm: agora + CACHE_TTL_MS })
    return resultado
  }
}

/**
 * Atualiza o rastreamento de múltiplos objetos em lote (para Cron Job).
 */
export async function atualizarRastreiosEmLote(
  codigosRastreio: string[],
): Promise<Record<string, RastreioObjetoResult>> {
  const resultados: Record<string, RastreioObjetoResult> = {}

  for (const codigo of codigosRastreio) {
    try {
      resultados[codigo] = await consultarRastreioCorreios(codigo)
    } catch (err) {
      console.error(`Erro ao rastrear objeto ${codigo}:`, err)
    }
  }

  return resultados
}

/**
 * Limpa o cache de rastreio (útil para testes unitários).
 */
export function _resetCacheRastreioParaTestes(): void {
  cacheRastreio.clear()
}

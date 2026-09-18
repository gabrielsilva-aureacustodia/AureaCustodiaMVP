/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Liga os envios do estado à biblioteca dos Correios e grava o último retrato
 * no banco. É chamado pelo job agendado, nunca por uma tela.
 *
 * Desde a E8 o job também acompanha a RETIRADA POSTADA — a moeda que sai da custódia para o
 * cliente. Antes ele só olhava o que chega, e o código de rastreio de uma retirada ficava gravado
 * sem nunca ser consultado. O retrato da retirada vai para a mesma tabela, com `retirada_id`
 * (migration 030).
 * ==========================================================================*/

import 'server-only'

import { ETAPAS_ENVIO, type Envio, type Retirada } from '@/domain/types'
import { atualizarRastreiosEmLote } from '@/lib/shipping'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  carregarRastreios,
  salvarRastreio,
  salvarRastreioDeRetirada,
  type RastreioGravado,
} from '@/server/db/repositories/rastreios'
import { repositorioRetiradas } from '@/server/shipping/retiradas'
import { getState } from '@/server/state'

export interface ResumoAtualizacao {
  verificados: number
  gravados: number
  persistido: boolean
  codigos: string[]
  /** Retiradas postadas com código, que entraram na consulta desta rodada (E8). */
  retiradasVerificadas: number
  /** Retiradas cujo retrato foi gravado no banco (E8). */
  retiradasGravadas: number
}

/**
 * Quais envios ainda valem uma consulta.
 *
 * Objeto entregue não muda mais de estado, e continuar consultando os Correios
 * por ele é gastar requisição — a API tem limite, e o limite é o motivo de o
 * rastreio ser um job agendado em vez de uma consulta por visita.
 */
function pendentes(envios: readonly Envio[]): Envio[] {
  const ultimaEtapa = ETAPAS_ENVIO[ETAPAS_ENVIO.length - 1]
  return envios.filter((e) => e.codigoRastreio !== null && e.etapaAtual !== ultimaEtapa)
}

/**
 * Quais retiradas ainda valem uma consulta: a que foi postada e tem código.
 *
 * Entregue e cancelada ficam de fora pelo mesmo motivo dos envios — objeto que não muda mais de
 * estado só gasta requisição. Antes de `postada` não existe objeto nos Correios para consultar.
 */
function retiradasPendentes(retiradas: readonly Retirada[]): Retirada[] {
  return retiradas.filter((r) => r.status === 'postada' && Boolean(r.codigoRastreio))
}

/**
 * Consulta os Correios para todos os envios pendentes e grava o resultado.
 *
 * Sem `POSTGRES_URL` a consulta acontece e o resultado é devolvido, mas nada é
 * gravado — não há onde. É o mesmo desenho do resto da plataforma: o ambiente
 * local funciona sem banco, e quem persiste é o banco quando ele existe.
 */
export async function atualizarRastreiosPendentes(): Promise<ResumoAtualizacao> {
  const state = await getState()
  const envios = pendentes(state.envios)
  const codigos = envios.map((e) => e.codigoRastreio as string)

  // A lista de retiradas mora no repositório, e não no estado. Se ela não vier, o job segue só com
  // os envios: perder o rastreio da saída é ruim, perder também o da entrada seria pior.
  let retiradas: Retirada[] = []
  try {
    retiradas = retiradasPendentes(await repositorioRetiradas().listarTodas())
  } catch (err) {
    console.error('[rastreio] retiradas indisponíveis; seguindo só com os envios:', err)
  }
  const codigosRetirada = retiradas.map((r) => r.codigoRastreio as string)

  if (codigos.length === 0 && codigosRetirada.length === 0) {
    return {
      verificados: 0,
      gravados: 0,
      persistido: bancoConfigurado(),
      codigos: [],
      retiradasVerificadas: 0,
      retiradasGravadas: 0,
    }
  }

  // Uma chamada só aos Correios para envios e retiradas: o lote é o que respeita o limite da API.
  const resultados = await atualizarRastreiosEmLote([...codigos, ...codigosRetirada])

  if (!bancoConfigurado()) {
    return {
      verificados: codigos.length,
      gravados: 0,
      persistido: false,
      codigos,
      retiradasVerificadas: codigosRetirada.length,
      retiradasGravadas: 0,
    }
  }

  // Uma transação para todas as gravações: o job é um retrato de um instante, e
  // meia atualização gravada é pior de diagnosticar do que nenhuma.
  const gravados = await executarNoBanco(async (tx) => {
    let n = 0
    for (const envio of envios) {
      const codigo = envio.codigoRastreio as string
      const r = resultados[codigo]
      if (!r) continue
      const registro: RastreioGravado = { ...r, protocolo: envio.protocolo }
      await salvarRastreio(tx, registro)
      n += 1
    }
    return n
  })

  // Transação separada para as retiradas, de propósito: uma gravação de retirada que falhe — por
  // exemplo com a migration 030 ainda não aplicada — não pode desfazer o retrato dos envios, que já
  // está certo e é o que a tela do cliente lê.
  let retiradasGravadas = 0
  if (retiradas.length > 0) {
    try {
      retiradasGravadas = await executarNoBanco(async (tx) => {
        let n = 0
        for (const ret of retiradas) {
          const codigo = ret.codigoRastreio as string
          const r = resultados[codigo]
          if (!r) continue
          await salvarRastreioDeRetirada(tx, { ...r, retiradaId: ret.id })
          n += 1
        }
        return n
      })
    } catch (err) {
      console.error('[rastreio] retrato das retiradas não gravou; os envios foram gravados:', err)
      retiradasGravadas = 0
    }
  }

  return {
    verificados: codigos.length,
    gravados,
    persistido: true,
    codigos,
    retiradasVerificadas: codigosRetirada.length,
    retiradasGravadas,
  }
}

/**
 * O que a tela de envios e o painel de logística mostram. Lê do banco, nunca dos Correios.
 *
 * A chave é a do dono: o protocolo, para envio; o id da retirada, para retirada (o mapeamento do
 * repositório já resolve isso). É a mesma chave que `/admin/logistica` procura.
 *
 * Sem banco configurado devolve vazio, e a tela cai no texto "rastreio ainda
 * não consultado" — que é a verdade, não uma falha.
 */
export async function rastreiosPorProtocolo(): Promise<Record<string, RastreioGravado>> {
  if (!bancoConfigurado()) return {}
  const linhas = await executarNoBanco((tx) => carregarRastreios(tx))
  const mapa: Record<string, RastreioGravado> = {}
  for (const l of linhas) mapa[l.protocolo] = l
  return mapa
}

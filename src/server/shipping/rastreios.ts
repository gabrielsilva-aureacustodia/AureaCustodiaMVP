/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Liga os envios do estado à biblioteca dos Correios e grava o último retrato
 * no banco. É chamado pelo job agendado, nunca por uma tela.
 * ==========================================================================*/

import 'server-only'

import { ETAPAS_ENVIO, type Envio } from '@/domain/types'
import { atualizarRastreiosEmLote } from '@/lib/shipping'
import { bancoConfigurado, executarNoBanco } from '@/server/db/client'
import {
  carregarRastreios,
  salvarRastreio,
  type RastreioGravado,
} from '@/server/db/repositories/rastreios'
import { getState } from '@/server/state'

export interface ResumoAtualizacao {
  verificados: number
  gravados: number
  persistido: boolean
  codigos: string[]
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

  if (codigos.length === 0) {
    return { verificados: 0, gravados: 0, persistido: bancoConfigurado(), codigos: [] }
  }

  const resultados = await atualizarRastreiosEmLote(codigos)

  if (!bancoConfigurado()) {
    return {
      verificados: codigos.length,
      gravados: 0,
      persistido: false,
      codigos,
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

  return { verificados: codigos.length, gravados, persistido: true, codigos }
}

/**
 * O que a tela de envios mostra. Lê do banco, nunca dos Correios.
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

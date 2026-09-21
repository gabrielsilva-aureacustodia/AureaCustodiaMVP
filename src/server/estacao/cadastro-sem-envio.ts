/* ============================================================================
 * CADASTRO SEM ENVIO — somente servidor.
 *
 * Cria um envio interno para moeda que já chegou fisicamente ao armazém, mas
 * ainda precisa passar pela análise. Ele pula somente o transporte postal: a
 * bancada continua sendo a única responsável por criar moeda, recibo e hash.
 * ==========================================================================*/

import 'server-only'

import { nextEnvioCode } from '@/domain/codes'
import { COIN_TYPES } from '@/domain/constants'
import type { CoinType, Envio } from '@/domain/types'
import { carregarCatalogo } from '@/server/config/carregar'
import { mutateState } from '@/server/state'

import { MAX_POR_CADASTRO_DIRETO } from './cadastro-direto'

export interface EntradaCadastroSemEnvio {
  userEmail: string
  tipoMoeda: string
  ano: number
  quantidade: number
  pesoMg?: number
  caixa?: string | null
  observacao?: string | null
}

export type ResultadoCadastroSemEnvio =
  | { tipo: 'ok'; protocolo: string }
  | { tipo: 'usuario-nao-encontrado' }
  | { tipo: 'tipo-invalido'; tipoMoeda: string }
  | { tipo: 'quantidade-invalida'; max: number }
  | { tipo: 'peso-invalido' }

function pesoInicial(entrada: EntradaCadastroSemEnvio, catalogo: readonly CoinType[]): number | null {
  const informado = Number.isFinite(entrada.pesoMg) ? Math.round(entrada.pesoMg as number) : 0
  if (informado > 0) return informado
  const padrao = catalogo.find((tipo) => tipo.key === entrada.tipoMoeda)?.pesoPadraoMg
  return typeof padrao === 'number' && padrao > 0 ? Math.round(padrao) : null
}

export async function cadastrarMoedasSemEnvio(
  entrada: EntradaCadastroSemEnvio,
): Promise<ResultadoCadastroSemEnvio> {
  const quantidade = Math.floor(entrada.quantidade)
  if (!Number.isFinite(quantidade) || quantidade < 1 || quantidade > MAX_POR_CADASTRO_DIRETO) {
    return { tipo: 'quantidade-invalida', max: MAX_POR_CADASTRO_DIRETO }
  }

  const catalogo = await carregarCatalogo().catch((err: unknown) => {
    console.error('[cadastroSemEnvio] catálogo não leu; valendo o do código:', err)
    return COIN_TYPES
  })
  if (!catalogo.some((tipo) => tipo.key === entrada.tipoMoeda)) {
    return { tipo: 'tipo-invalido', tipoMoeda: entrada.tipoMoeda }
  }

  const pesoMg = pesoInicial(entrada, catalogo)
  if (pesoMg === null) return { tipo: 'peso-invalido' }

  const email = entrada.userEmail.trim().toLowerCase()
  const caixa = entrada.caixa?.trim() || null
  const observacao = entrada.observacao?.trim() || null

  const { result } = await mutateState<ResultadoCadastroSemEnvio>((state) => {
    if (!state.users[email]) return { tipo: 'usuario-nao-encontrado' }

    const agora = Date.now()
    const envio: Envio = {
      protocolo: nextEnvioCode(state.seq),
      userEmail: email,
      tipoMoeda: entrada.tipoMoeda,
      ano: Math.round(entrada.ano),
      quantidade,
      codigoRastreio: null,
      dataPostagem: null,
      dataRecebimento: agora,
      etapaAtual: 'Recebido pela custódia',
      createdAt: agora,
      codigosAtivosGerados: [],
      origem: 'cadastro_sem_envio',
      pesoInicialMg: pesoMg,
      caixaInicial: caixa,
      observacao,
    }
    state.envios.push(envio)
    return { tipo: 'ok', protocolo: envio.protocolo }
  })

  return result
}

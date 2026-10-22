import 'server-only'

/**
 * Preço e prazo de um serviço do contrato (APIs Preço v1 e Prazo v1 da CWS).
 *
 * Os números saem com VÍRGULA decimal ("31,59"). O adaptador de 02/09/2026 fazia
 * `parseFloat('31,59')` e lia 31 — todo frete real perderia os centavos. `reaisParaCents` existe
 * por isso.
 */

import type { Cents } from '@/domain/types'

import type { DimensoesPacote, ModalidadeEnvio } from '../types'
import { chamarCws } from './cliente'
import { ADICIONAL_VALOR_DECLARADO, lerConfigCorreios, VALOR_DECLARADO_MINIMO_CENTS } from './config'

/** "31,59" | "1.234,56" | 31.59 → 3159. Texto vazio ou inválido vira 0. */
export function reaisParaCents(valor: string | number | undefined | null): Cents {
  if (valor === undefined || valor === null || valor === '') return 0
  if (typeof valor === 'number') return Math.round(valor * 100)
  const normalizado = valor.includes(',') ? valor.replace(/\./g, '').replace(',', '.') : valor
  const n = Number.parseFloat(normalizado)
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** 3159 → "31.59", o formato que a API aceita em `vlDeclarado` e na pré-postagem. */
export function centsParaReais(cents: Cents): string {
  return (cents / 100).toFixed(2)
}

export interface CotacaoServicoInput {
  codigoServico: string
  modalidade: ModalidadeEnvio
  cepOrigem: string
  cepDestino: string
  dimensoes: DimensoesPacote
  valorDeclaradoCents: Cents
}

export interface CotacaoServico {
  codigoServico: string
  /** O que os Correios vão faturar: serviço + adicionais (valor declarado). */
  precoTotalCents: Cents
  precoServicoCents: Cents
  precoAdicionaisCents: Cents
  prazoDiasUteis: number
  /** Último dia previsto de entrega, quando os Correios informam. */
  dataMaximaEntrega: string | null
}

interface RespostaPreco {
  pcFinal?: string
  pcProduto?: string
  pcTotalServicosAdicionais?: string
}

interface RespostaPrazo {
  prazoEntrega?: number
  dataMaxima?: string
}

/** Cota um serviço do contrato. Lança `ErroCorreios` se os Correios recusarem. */
export async function cotarServico(input: CotacaoServicoInput): Promise<CotacaoServico> {
  const cfg = lerConfigCorreios()
  const vd = Math.max(input.valorDeclaradoCents, VALOR_DECLARADO_MINIMO_CENTS)

  const [preco, prazo] = await Promise.all([
    chamarCws<RespostaPreco>(`/preco/v1/nacional/${input.codigoServico}`, {
      query: {
        cepOrigem: input.cepOrigem,
        cepDestino: input.cepDestino,
        psObjeto: input.dimensoes.pesoGramas,
        tpObjeto: 2, // caixa/pacote
        comprimento: input.dimensoes.comprimentoCm,
        largura: input.dimensoes.larguraCm,
        altura: input.dimensoes.alturaCm,
        vlDeclarado: centsParaReais(vd),
        servicosAdicionais: ADICIONAL_VALOR_DECLARADO[input.modalidade],
        nuContrato: cfg?.contrato,
        nuDR: cfg?.dr,
      },
    }),
    chamarCws<RespostaPrazo>(`/prazo/v1/nacional/${input.codigoServico}`, {
      query: { cepOrigem: input.cepOrigem, cepDestino: input.cepDestino },
    }),
  ])

  const precoTotalCents = reaisParaCents(preco.pcFinal)
  const precoAdicionaisCents = reaisParaCents(preco.pcTotalServicosAdicionais)
  return {
    codigoServico: input.codigoServico,
    precoTotalCents,
    precoServicoCents: reaisParaCents(preco.pcProduto) || precoTotalCents - precoAdicionaisCents,
    precoAdicionaisCents,
    prazoDiasUteis: Number(prazo.prazoEntrega ?? 0),
    dataMaximaEntrega: prazo.dataMaxima ?? null,
  }
}

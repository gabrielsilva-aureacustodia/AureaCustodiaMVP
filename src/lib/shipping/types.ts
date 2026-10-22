/**
 * Contrato de tipos do módulo de logística e Correios.
 *
 * RESTRIÇÕES DE NEGÓCIO INEGOCIÁVEIS:
 *  1. `ModalidadeEnvio` é estritamente 'PAC' | 'SEDEX'.
 *     Carta comum NÃO é representável, de propósito: o regimento interno dos
 *     Correios permite confisco de dinheiro circulável enviado em carta, e
 *     moeda comemorativa é dinheiro circulável.
 *  2. O objeto postal DEVE sempre conter a declaração de conteúdo explícita:
 *     "Moeda comemorativa / colecionável".
 *  3. Consultas de CEP são operacionais e NÃO DEVEM persistir histórico (LGPD).
 */

import type { Cents, Timestamp } from '@/domain/types'

/** Modalidades de envio permitidas para envio de moedas sob custódia. */
export type ModalidadeEnvio = 'PAC' | 'SEDEX'

/** Descrição obrigatória exigida no formulário de declaração de conteúdo dos Correios. */
export const DESCRICAO_CONTEUDO_PADRAO = 'Moeda comemorativa / colecionável' as const

/** Dimensões e peso padrão de um pacote de custódia (caixa pequena acolchoada). */
export interface DimensoesPacote {
  pesoGramas: number
  comprimentoCm: number
  larguraCm: number
  alturaCm: number
}

/** Dimensões padrão seguras para transporte de moedas em estojo/bolha. */
export const PACOTE_PADRAO_MOEDA: DimensoesPacote = {
  pesoGramas: 300,
  comprimentoCm: 16,
  larguraCm: 11,
  alturaCm: 6,
}

/** Parâmetros de entrada para cotação de frete. */
export interface CotacaoFreteInput {
  cepOrigem: string
  cepDestino: string
  modalidade: ModalidadeEnvio
  valorDeclaradoCents: Cents
  dimensoes?: Partial<DimensoesPacote>
}

/** Resultado de uma cotação de frete dos Correios. */
export interface CotacaoFreteResult {
  modalidade: ModalidadeEnvio
  prazoDiasUteis: number
  valorFreteCents: Cents
  valorSeguroCents: Cents
  valorTotalCents: Cents
  avisoRecebimento: boolean
  maoPropria: boolean
  /**
   * De onde veio o número: `'correios'` é o preço do contrato, devolvido pela API; `'tabela'` é a
   * estimativa local, usada só quando o contrato não está configurado neste ambiente. A tela
   * precisa dizer a diferença — cobrar um frete tabelado como se fosse o dos Correios não pode.
   */
  origem: 'correios' | 'tabela'
  /** Código do serviço cotado (ex.: '03301' PAC reverso). */
  codigoServico?: string
}

/**
 * Dimensões do pacote para N moedas: a caixa padrão e 30 g a mais por moeda além da primeira
 * (estojo + bolha). É estimativa — os Correios aferem na postagem e cobram o peso real se for maior.
 */
export function dimensoesParaMoedas(quantidade: number): DimensoesPacote {
  const q = Math.max(1, Math.floor(quantidade))
  return { ...PACOTE_PADRAO_MOEDA, pesoGramas: PACOTE_PADRAO_MOEDA.pesoGramas + 30 * (q - 1) }
}

/** Endereço de remetente ou destinatário para etiquetas. */
export interface EnderecoEnvio {
  nome: string
  cpfOuCnpj?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  telefone?: string
  email?: string
}

/*
 * `CriarPrePostagemInput` e `PrePostagemResult` saíram em 22/10/2026 junto com a pré-postagem
 * simulada. O contrato da pré-postagem real está em `./cws/prepostagem.ts`.
 */

/** Status padronizado do rastreamento de objeto postal. */
export type StatusRastreioCorreios =
  | 'postado'
  | 'em_transito'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'aguardando_retirada'
  | 'devolvido'
  | 'extraviado'
  | 'aguardando_postagem'
  /** Pré-postagem cancelada antes de postar (evento FC/84 do SRO). */
  | 'cancelado'
  | 'indisponivel'
  | 'nao_encontrado'

/** Evento individual na linha do tempo de rastreamento. */
export interface EventoRastreio {
  dataHora: Timestamp
  status: StatusRastreioCorreios
  descricao: string
  unidadeLocal: string
  cidade: string
  uf: string
  destino?: {
    unidade: string
    cidade: string
    uf: string
  }
}

/** Resultado compilado de rastreio de um objeto. */
export interface RastreioObjetoResult {
  codigoRastreio: string
  statusAtual: StatusRastreioCorreios
  etapaDescricao: string
  dataUltimaAtualizacao: Timestamp
  eventos: EventoRastreio[]
  entregue: boolean
  erro?: string
}

/** Dados retornados na consulta de CEP. */
export interface EnderecoCep {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  valido: boolean
}

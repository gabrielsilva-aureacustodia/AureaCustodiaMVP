/**
 * Regras de negócio puras e máquina de estados para retirada física de moedas.
 *
 * CONTRATO DA FRENTE C (Publicação · Retirada e Logística):
 *  - Camada de domínio PURA: sem React, sem Next, sem I/O, sem async.
 *  - Valores monetários SEMPRE inteiros em centavos (Cents).
 *  - Preços fechados pela Decisão D-1 (10/09/2026):
 *      * Comum: R$ 50,00 (5000 centavos)
 *      * Segura: R$ 180,00 (18000 centavos) em 2x
 *      * Ambas as modalidades são excludentes e já englobam todos os custos (transporte + taxa).
 *  - Prazo de retirada isolado em constante nomeada (Decisão D-2 em aberto):
 *      * PRAZO_RETIRADA_DIAS = 30
 *      * Permite alterar pontualmente sem espalhar lógica se D-2 fechar em D+30 total ou D+30 + D+5.
 *  - Trava de endereço (trava 2 da publicação): sem endereço completo e confirmado,
 *    a retirada não avança e o prazo D+30 nem começa a contar.
 */

import type {
  Cents,
  EnderecoEntrega,
  EventoHistoricoRetirada,
  ModalidadeRetirada,
  Retirada,
  StatusRetirada,
  Timestamp,
} from './types'

/** Taxa da modalidade comum: R$ 50,00 com frete incluso (D-1). */
export const TAXA_RETIRADA_COMUM_CENTS: Cents = 5000

/** Taxa da modalidade segura: R$ 180,00 com transporte de valores incluso (D-1). */
export const TAXA_RETIRADA_SEGURA_CENTS: Cents = 18000

/**
 * Prazo padrão para a retirada física da moeda em dias corridos (D+30).
 * Isolado em constante nomeada conforme Decisão D-2.
 */
export const PRAZO_RETIRADA_DIAS = 30

/**
 * Milissegundos em um dia civil (24 horas).
 */
const MS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Retorna o valor exato da taxa de retirada em centavos de acordo com a modalidade escolhida.
 */
export function calcularTaxaRetirada(modalidade: ModalidadeRetirada): Cents {
  switch (modalidade) {
    case 'comum':
      return TAXA_RETIRADA_COMUM_CENTS
    case 'segura':
      return TAXA_RETIRADA_SEGURA_CENTS
    default: {
      const _invalido: never = modalidade
      throw new Error(`Modalidade de retirada desconhecida: "${String(_invalido)}"`)
    }
  }
}

/**
 * Calcula a data-limite D+30 a partir da data de confirmação do pedido com endereço.
 */
export function calcularPrazoLimiteRetirada(
  solicitadoEm: Timestamp,
  dias: number = PRAZO_RETIRADA_DIAS,
): Timestamp {
  if (solicitadoEm <= 0 || !Number.isFinite(solicitadoEm)) {
    throw new Error('Data de solicitação inválida para cálculo de prazo-limite de retirada.')
  }
  return solicitadoEm + dias * MS_POR_DIA
}

/**
 * Validação estrita dos dados do endereço de entrega.
 * Atende à trava 2: sem endereço completo e válido, a solicitação é recusada
 * e o prazo D+30 não se inicia.
 */
export function validarEnderecoRetirada(endereco: Partial<EnderecoEntrega> | null | undefined): {
  valido: boolean
  erros: string[]
} {
  const erros: string[] = []

  if (!endereco) {
    return { valido: false, erros: ['Endereço de entrega não informado.'] }
  }

  if (!endereco.nome || endereco.nome.trim().length < 3) {
    erros.push('Nome completo do destinatário é obrigatório (mínimo 3 caracteres).')
  }

  const documentoLimpo = (endereco.cpfOuCnpj || '').replace(/\D/g, '')
  if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
    erros.push('CPF ou CNPJ do destinatário deve conter 11 (CPF) ou 14 (CNPJ) dígitos numéricos.')
  }

  if (!endereco.logradouro || endereco.logradouro.trim().length < 2) {
    erros.push('Logradouro é obrigatório.')
  }

  if (!endereco.numero || endereco.numero.trim().length === 0) {
    erros.push('Número do endereço é obrigatório.')
  }

  if (!endereco.bairro || endereco.bairro.trim().length < 2) {
    erros.push('Bairro é obrigatório.')
  }

  if (!endereco.cidade || endereco.cidade.trim().length < 2) {
    erros.push('Cidade é obrigatória.')
  }

  const ufLimpa = (endereco.uf || '').trim().toUpperCase()
  if (ufLimpa.length !== 2) {
    erros.push('UF deve conter exatamente 2 letras.')
  }

  const cepLimpo = (endereco.cep || '').replace(/\D/g, '')
  if (cepLimpo.length !== 8) {
    erros.push('CEP deve conter exatamente 8 dígitos numéricos.')
  }

  const telLimpo = (endereco.telefone || '').replace(/\D/g, '')
  if (telLimpo.length < 10 || telLimpo.length > 11) {
    erros.push('Telefone para contato deve conter 10 ou 11 dígitos numéricos (com DDD).')
  }

  return {
    valido: erros.length === 0,
    erros,
  }
}

/**
 * Tabela de transições permitidas na máquina de estados de Retirada:
 * - solicitada -> paga | cancelada
 * - paga -> separacao | cancelada
 * - separacao -> postada
 * - postada -> entregue
 *
 * Estados terminais: 'entregue' e 'cancelada' não possuem transição de saída.
 */
const TRANSIÇÕES_PERMITIDAS: Record<StatusRetirada, readonly StatusRetirada[]> = {
  solicitada: ['paga', 'cancelada'],
  paga: ['separacao', 'cancelada'],
  separacao: ['postada'],
  postada: ['entregue'],
  entregue: [],
  cancelada: [],
}

/**
 * Avalia se a transição entre dois estados da retirada é válida segundo a máquina de estados.
 */
export function podeTransicionarRetirada(de: StatusRetirada, para: StatusRetirada): boolean {
  if (de === para) return false
  const permitidos = TRANSIÇÕES_PERMITIDAS[de] || []
  return permitidos.includes(para)
}

export interface TransicaoRetiradaParams {
  data: Timestamp
  motivo?: string
  codigoRastreio?: string
  autor?: string
}

/**
 * Executa a transição de estado da retirada de forma pura e imutável.
 * Lança erro explícito caso a transição não seja autorizada pelo fluxo operacional.
 */
export function transicionarRetirada(
  retirada: Retirada,
  novoStatus: StatusRetirada,
  params: TransicaoRetiradaParams,
): Retirada {
  if (!podeTransicionarRetirada(retirada.status, novoStatus)) {
    throw new Error(
      `Transição de status de retirada inválida: de "${retirada.status}" para "${novoStatus}".`,
    )
  }

  if (novoStatus === 'postada') {
    const rastreio = (params.codigoRastreio || retirada.codigoRastreio || '').trim()
    if (!rastreio) {
      throw new Error(
        'Código de rastreamento postal é obrigatório para transicionar retirada para "postada".',
      )
    }
  }

  const novoEvento: EventoHistoricoRetirada = {
    de: retirada.status,
    para: novoStatus,
    data: params.data,
    motivo: params.motivo,
    autor: params.autor,
  }

  const rastreioAtualizado =
    novoStatus === 'postada'
      ? (params.codigoRastreio || retirada.codigoRastreio || '').trim()
      : retirada.codigoRastreio

  return {
    ...retirada,
    status: novoStatus,
    pagoEm: novoStatus === 'paga' && !retirada.pagoEm ? params.data : retirada.pagoEm,
    codigoRastreio: rastreioAtualizado,
    historico: [...retirada.historico, novoEvento],
  }
}

/**
 * Cria um objeto de Retirada no estado inicial 'solicitada'.
 * Valida o endereço antecipadamente para impedir o nascimento de retirada sem destino.
 */
export function criarSolicitacaoRetirada(params: {
  id: string
  coinId: string
  reciboCodigo: string
  userEmail: string
  modalidade: ModalidadeRetirada
  endereco: EnderecoEntrega
  solicitadoEm: Timestamp
  motivo?: string
  autor?: string
}): Retirada {
  const validacao = validarEnderecoRetirada(params.endereco)
  if (!validacao.valido) {
    throw new Error(
      `Endereço de retirada inválido: ${validacao.erros.join('; ')}`,
    )
  }

  const valorTaxaCents = calcularTaxaRetirada(params.modalidade)
  const dataLimiteD30 = calcularPrazoLimiteRetirada(params.solicitadoEm)

  const eventoInicial: EventoHistoricoRetirada = {
    de: null,
    para: 'solicitada',
    data: params.solicitadoEm,
    motivo: params.motivo ?? 'Solicitação de retirada realizada pelo cliente',
    autor: params.autor ?? params.userEmail,
  }

  return {
    id: params.id,
    coinId: params.coinId,
    reciboCodigo: params.reciboCodigo,
    userEmail: params.userEmail,
    modalidade: params.modalidade,
    status: 'solicitada',
    valorTaxaCents,
    endereco: { ...params.endereco },
    solicitadoEm: params.solicitadoEm,
    dataLimiteD30,
    historico: [eventoInicial],
  }
}

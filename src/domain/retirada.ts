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
  AppState,
  Cents,
  EnderecoEntrega,
  EventoHistoricoRetirada,
  ModalidadeRetirada,
  PrePostagemRegistro,
  Retirada,
  StatusRetirada,
  Timestamp,
} from './types'

/**
 * A moeda tem uma retirada física em andamento?
 *
 * ESTA É A CHECAGEM QUE `publishOffer` NUNCA FEZ (28/09/2026, achado do
 * Gabriel, mesma família do buraco da reserva em aberto). `availableCoinsForSell`
 * (src/domain/market.ts) já recusa moeda com retirada `solicitada`, `paga`,
 * `separacao` ou `postada` — mas `publishOffer` mantém o próprio filtro de
 * moedas, que nunca perguntava isso. Sem esta trava, dava para anunciar para
 * venda uma moeda que já está a caminho dos Correios para outro endereço.
 *
 * `entregue` e `extraviada` NÃO contam: a etapa acabou (entregue = já saiu do
 * Real Olímpico; extraviada é caso raro tratado à parte), e a moeda ali já tem
 * `recibo.status: 'Extinto'`, que outra checagem já barra.
 */
export function moedaComRetiradaEmAndamento(state: AppState, coinId: string): boolean {
  return (state.retiradas ?? []).some(
    (r) =>
      r.coinId === coinId &&
      (r.status === 'solicitada' || r.status === 'paga' || r.status === 'separacao' || r.status === 'postada'),
  )
}

/** Interface da tabela de taxas para retiradas físicas (compatível com TabelaDeTaxas da Frente A). */
export interface TabelaDeTaxasRetirada {
  taxaRetiradaComum?: Cents
  taxaRetiradaSegura?: Cents
  retiradaSeguraParcelasMax?: number
}

/** Tabela padrão de taxas de retirada (D-1). */
export const TAXAS_RETIRADA_PADRAO: Required<TabelaDeTaxasRetirada> = {
  taxaRetiradaComum: 5000,
  taxaRetiradaSegura: 18000,
  retiradaSeguraParcelasMax: 2,
}

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
 * Retorna o valor exato da taxa de retirada em centavos de acordo com a modalidade escolhida
 * e a tabela de taxas vigente.
 */
export function calcularTaxaRetirada(
  modalidade: ModalidadeRetirada,
  taxas: TabelaDeTaxasRetirada = TAXAS_RETIRADA_PADRAO,
): Cents {
  switch (modalidade) {
    case 'comum':
      return taxas.taxaRetiradaComum ?? TAXAS_RETIRADA_PADRAO.taxaRetiradaComum
    case 'segura':
      return taxas.taxaRetiradaSegura ?? TAXAS_RETIRADA_PADRAO.taxaRetiradaSegura
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
  taxas?: TabelaDeTaxasRetirada
}): Retirada {
  const validacao = validarEnderecoRetirada(params.endereco)
  if (!validacao.valido) {
    throw new Error(
      `Endereço de retirada inválido: ${validacao.erros.join('; ')}`,
    )
  }

  const valorTaxaCents = calcularTaxaRetirada(params.modalidade, params.taxas)
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

/* ---------------------------------------------------------------------------
 * Etiqueta oficial dos Correios (pré-postagem de saída) — 22/10/2026
 *
 * Com o contrato dos Correios, a expedição deixou de ser "o operador posta no balcão e digita o
 * código". O painel emite a pré-postagem pela API e o código de rastreio nasce lá. Estas funções são
 * a parte PURA disso: o que muda na retirada quando a etiqueta é emitida ou cancelada. A chamada à
 * API mora na Server Action (`src/server/actions/admin/logistica.ts`).
 *
 * Por que a etiqueta leva a retirada só até `separacao`, e não até `postada`: emitir a etiqueta não
 * põe a caixa nos Correios. Quem diz que a moeda foi postada é o rastreio, quando a agência registra
 * o objeto (acordo 2 de docs/EXECUCAO_CORREIOS_CWS.md). Marcar `postada` na emissão faria o cliente
 * ver "a caminho" de uma moeda que ainda está no cofre.
 * ------------------------------------------------------------------------- */

/** Situações em que a retirada aceita emitir (ou cancelar) a etiqueta: paga e ainda não postada. */
export const STATUS_QUE_ACEITAM_ETIQUETA: readonly StatusRetirada[] = ['paga', 'separacao']

/** A retirada tem uma pré-postagem dos Correios valendo (emitida e não cancelada)? */
export function etiquetaAtivaDaRetirada(retirada: Retirada): PrePostagemRegistro | null {
  const p = retirada.prePostagem
  return p && !p.canceladaEm ? p : null
}

/**
 * Grava a pré-postagem emitida: o código de rastreio passa a ser o do objeto dos Correios e a
 * retirada vai de `paga` para `separacao` (se já estava em `separacao`, fica, e o histórico ganha a
 * linha da emissão — sem ela, a etiqueta apareceria sem dizer quem a emitiu nem quando).
 */
export function registrarEtiquetaNaRetirada(
  retirada: Retirada,
  prePostagem: PrePostagemRegistro,
  params: { data: Timestamp; autor?: string },
): Retirada {
  if (!STATUS_QUE_ACEITAM_ETIQUETA.includes(retirada.status)) {
    throw new Error(`A etiqueta só é emitida para retirada paga ou em separação. Situação atual: "${retirada.status}".`)
  }
  if (etiquetaAtivaDaRetirada(retirada)) {
    throw new Error(`Esta retirada já tem etiqueta emitida (${retirada.prePostagem?.codigoObjeto}). Cancele-a antes de emitir outra.`)
  }

  const motivo = `Etiqueta dos Correios emitida (${prePostagem.codigoObjeto}) — aguardando postagem`
  const base: Retirada =
    retirada.status === 'paga'
      ? transicionarRetirada(retirada, 'separacao', { data: params.data, motivo, autor: params.autor })
      : {
          ...retirada,
          historico: [
            ...retirada.historico,
            { de: retirada.status, para: retirada.status, data: params.data, motivo, autor: params.autor },
          ],
        }

  return {
    ...base,
    prePostagem: { ...prePostagem, canceladaEm: null },
    codigoRastreio: prePostagem.codigoObjeto,
    updatedAt: params.data,
  }
}

/**
 * Tira a etiqueta cancelada da retirada. A situação NÃO volta para `paga` — a máquina de estados não
 * anda para trás, e a moeda continua separada no cofre esperando a próxima etiqueta. O código e o id
 * da pré-postagem cancelada ficam na linha do histórico, que é o que resta dela.
 */
export function removerEtiquetaDaRetirada(
  retirada: Retirada,
  params: { data: Timestamp; autor?: string },
): Retirada {
  const ativa = etiquetaAtivaDaRetirada(retirada)
  if (!ativa) throw new Error('Esta retirada não tem etiqueta dos Correios emitida.')
  if (!STATUS_QUE_ACEITAM_ETIQUETA.includes(retirada.status)) {
    throw new Error(`A etiqueta não pode mais ser cancelada: a retirada está "${retirada.status}".`)
  }
  return {
    ...retirada,
    prePostagem: null,
    codigoRastreio: undefined,
    updatedAt: params.data,
    historico: [
      ...retirada.historico,
      {
        de: retirada.status,
        para: retirada.status,
        data: params.data,
        motivo: `Etiqueta dos Correios cancelada (${ativa.codigoObjeto}, pré-postagem ${ativa.id})`,
        autor: params.autor,
      },
    ],
  }
}

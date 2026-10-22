import 'server-only'

/**
 * Pré-postagem e rótulo oficial dos Correios (API Pré-postagem v1 da CWS).
 *
 * É AQUI QUE NASCE O CÓDIGO DE RASTREIO. Até 22/10/2026 o código era digitado pelo cliente depois
 * de postar no balcão, e o rastreio da API não o enxergava ("SRO-009: Objeto não pertence ao
 * contrato"). Com a pré-postagem, os Correios devolvem o código (`AP…BR`) já ligado ao cartão de
 * postagem, o frete vai para a fatura do contrato e a etiqueta sai deles, em PDF.
 *
 * Os limites de tamanho abaixo são os da especificação (nome 50, logradouro 50, número 6,
 * complemento/bairro/cidade 30, observação 50). Texto maior é recusado inteiro pela API, então
 * cortamos antes — perder o fim de um complemento é melhor do que não gerar a etiqueta.
 *
 * Conferido contra produção em 22/10/2026 com uma pré-postagem reversa criada e cancelada no mesmo
 * minuto (ver docs/EXECUCAO_CORREIOS_CWS.md).
 */

import type { Cents } from '@/domain/types'

import type { DimensoesPacote, ModalidadeEnvio } from '../types'
import { chamarCws, ErroCorreios } from './cliente'
import { ADICIONAL_VALOR_DECLARADO, VALOR_DECLARADO_MINIMO_CENTS } from './config'
import { centsParaReais } from './preco-prazo'

export interface EnderecoPostal {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
}

export interface PessoaPostal {
  nome: string
  /** CPF ou CNPJ, com ou sem pontuação. Obrigatório no remetente. */
  cpfCnpj?: string
  /** Obrigatório no remetente de logística reversa: é para ele que os Correios mandam as instruções. */
  email?: string
  /** Telefone com DDD, em qualquer formato ("(31) 99999-9999", "+55 31 ..."). */
  telefone?: string
  endereco: EnderecoPostal
}

export interface ItemDeclarado {
  conteudo: string
  quantidade: number
  valorUnitarioCents: Cents
}

export interface CriarPrePostagemInput {
  codigoServico: string
  modalidade: ModalidadeEnvio
  remetente: PessoaPostal
  destinatario: PessoaPostal
  dimensoes: DimensoesPacote
  valorDeclaradoCents: Cents
  itens: ItemDeclarado[]
  /** `true` para o envio do cliente à custódia: o frete é do contrato e o cliente posta sem pagar. */
  logisticaReversa: boolean
  avisoRecebimento?: boolean
  /** Sai impresso na etiqueta (até 50 caracteres) — usamos o protocolo ou o id da retirada. */
  observacao?: string
}

export interface PrePostagemCriada {
  /** Identificador da pré-postagem nos Correios ("PRI…"), usado para cancelar. */
  id: string
  /** O código de rastreio ("AP123456789BR"). */
  codigoObjeto: string
  /** Data-limite para postar, quando os Correios informam. */
  prazoPostagem: string | null
  statusAtual: number | null
}

const so = (s: string | undefined | null): string => (s ?? '').replace(/\D/g, '')
const corta = (s: string | undefined | null, max: number): string => (s ?? '').trim().slice(0, max)

/**
 * Separa um telefone brasileiro em DDD e número. A API quer celular com 9 dígitos e fixo com 8,
 * cada um no seu campo; qualquer outro tamanho vai fora — telefone é opcional, e mandar errado
 * derruba a pré-postagem inteira.
 */
export function separarTelefone(telefone: string | undefined): {
  ddd?: string
  celular?: string
  fixo?: string
} {
  let d = so(telefone)
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11) return { ddd: d.slice(0, 2), celular: d.slice(2) }
  if (d.length === 10) return { ddd: d.slice(0, 2), fixo: d.slice(2) }
  return {}
}

function pessoa(p: PessoaPostal): Record<string, unknown> {
  const tel = separarTelefone(p.telefone)
  const doc = so(p.cpfCnpj)
  return {
    nome: corta(p.nome, 50),
    ...(doc ? { cpfCnpj: doc } : {}),
    ...(p.email ? { email: corta(p.email, 255) } : {}),
    ...(tel.celular ? { dddCelular: tel.ddd, celular: tel.celular } : {}),
    ...(tel.fixo ? { dddTelefone: tel.ddd, telefone: tel.fixo } : {}),
    endereco: {
      cep: so(p.endereco.cep),
      logradouro: corta(p.endereco.logradouro, 50),
      numero: corta(p.endereco.numero || 'S/N', 6),
      ...(p.endereco.complemento ? { complemento: corta(p.endereco.complemento, 30) } : {}),
      bairro: corta(p.endereco.bairro, 30),
      cidade: corta(p.endereco.cidade, 30),
      uf: corta(p.endereco.uf, 2).toUpperCase(),
    },
  }
}

/** Monta o corpo do `POST /prepostagem/v1/prepostagens`. Exportado para os testes. */
export function corpoDaPrePostagem(input: CriarPrePostagemInput): Record<string, unknown> {
  const vd = Math.max(input.valorDeclaradoCents, VALOR_DECLARADO_MINIMO_CENTS)
  const adicionais: Array<Record<string, string>> = [
    { codigoServicoAdicional: ADICIONAL_VALOR_DECLARADO[input.modalidade], valorDeclarado: centsParaReais(vd) },
  ]
  if (input.avisoRecebimento) adicionais.push({ codigoServicoAdicional: '001' })

  return {
    remetente: pessoa(input.remetente),
    destinatario: pessoa(input.destinatario),
    codigoServico: input.codigoServico,
    listaServicoAdicional: adicionais,
    itensDeclaracaoConteudo: input.itens.map((i) => ({
      conteudo: corta(i.conteudo, 60),
      quantidade: String(i.quantidade),
      valor: centsParaReais(i.valorUnitarioCents),
    })),
    pesoInformado: String(Math.round(input.dimensoes.pesoGramas)),
    codigoFormatoObjetoInformado: '2', // caixa/pacote
    alturaInformada: String(input.dimensoes.alturaCm),
    larguraInformada: String(input.dimensoes.larguraCm),
    comprimentoInformado: String(input.dimensoes.comprimentoCm),
    cienteObjetoNaoProibido: '1',
    logisticaReversa: input.logisticaReversa ? 'S' : 'N',
    ...(input.observacao ? { observacao: corta(input.observacao, 50) } : {}),
  }
}

interface RespostaPrePostagem {
  id?: string
  codigoObjeto?: string
  prazoPostagem?: string
  statusAtual?: number
}

export async function criarPrePostagem(input: CriarPrePostagemInput): Promise<PrePostagemCriada> {
  const r = await chamarCws<RespostaPrePostagem>('/prepostagem/v1/prepostagens', {
    metodo: 'POST',
    corpo: corpoDaPrePostagem(input),
  })
  if (!r?.id || !r.codigoObjeto) {
    throw new ErroCorreios('Os Correios aceitaram a pré-postagem mas não devolveram o código do objeto.', 502)
  }
  return {
    id: r.id,
    codigoObjeto: r.codigoObjeto,
    prazoPostagem: r.prazoPostagem ?? null,
    statusAtual: typeof r.statusAtual === 'number' ? r.statusAtual : null,
  }
}

/** Cancela uma pré-postagem ainda não postada. Pré-postagem não postada não gera cobrança. */
export async function cancelarPrePostagem(id: string): Promise<void> {
  await chamarCws<unknown>(`/prepostagem/v1/prepostagens/${encodeURIComponent(id)}`, { metodo: 'DELETE' })
}

export interface SituacaoPrePostagem {
  id: string
  codigoObjeto: string
  /** 1 pré-atendido, 2 pré-postado, 3 postado, 4 expirado, 5 cancelado, 6 estornado, 7 pendente. */
  statusAtual: number | null
  descricao: string
}

export async function consultarPrePostagem(codigoObjeto: string): Promise<SituacaoPrePostagem | null> {
  const r = await chamarCws<{ itens?: Array<{ id: string; codigoObjeto: string; statusAtual?: number; descStatusAtual?: string }> }>(
    '/prepostagem/v2/prepostagens',
    { query: { codigoObjeto } },
  )
  const item = r?.itens?.[0]
  if (!item) return null
  return {
    id: item.id,
    codigoObjeto: item.codigoObjeto,
    statusAtual: typeof item.statusAtual === 'number' ? item.statusAtual : null,
    descricao: item.descStatusAtual ?? '',
  }
}

const esperar = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * O rótulo oficial em PDF. A geração é assíncrona nos Correios: pede-se o rótulo, recebe-se um
 * recibo, e o PDF fica pronto em um ou dois segundos. Tentamos algumas vezes antes de desistir —
 * quem chama é uma rota de download, e o usuário prefere esperar três segundos a ver um erro.
 */
export async function baixarRotuloPdf(
  codigosObjeto: string[],
  opcoes: { tentativas?: number; intervaloMs?: number } = {},
): Promise<Buffer> {
  const { idRecibo } = await chamarCws<{ idRecibo: string }>('/prepostagem/v1/prepostagens/rotulo/assincrono/pdf', {
    metodo: 'POST',
    corpo: { codigosObjeto, tipoRotulo: 'P', formatoRotulo: 'ET', imprimeRemetente: 'S', layoutImpressao: 'PADRAO' },
  })
  if (!idRecibo) throw new ErroCorreios('Os Correios não devolveram o recibo do rótulo.', 502)

  const tentativas = opcoes.tentativas ?? 6
  const intervaloMs = opcoes.intervaloMs ?? 1000
  let ultimoErro: unknown = null
  for (let i = 0; i < tentativas; i += 1) {
    if (i > 0) await esperar(intervaloMs)
    try {
      const r = await chamarCws<{ dados?: string }>(
        `/prepostagem/v1/prepostagens/rotulo/download/assincrono/${encodeURIComponent(idRecibo)}`,
      )
      if (r?.dados) return Buffer.from(r.dados, 'base64')
    } catch (err) {
      ultimoErro = err
    }
  }
  if (ultimoErro instanceof ErroCorreios) throw ultimoErro
  throw new ErroCorreios('O rótulo dos Correios ainda não ficou pronto. Tente de novo em instantes.', 504)
}

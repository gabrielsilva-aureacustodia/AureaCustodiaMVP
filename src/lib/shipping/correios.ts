import 'server-only'

/**
 * Integração com a API dos Correios (CWS / Pré-Postagem / Rastreamento SRO).
 *
 * RESTRIÇÕES INEGOCIÁVEIS:
 *  - `ModalidadeEnvio` é estritamente 'PAC' | 'SEDEX'. Nunca carta comum.
 *  - Toda postagem possui Declaração de Valor e Aviso de Recebimento (AR).
 *  - O item declarado é sempre "Moeda comemorativa / colecionável".
 *  - Valores monetários em centavos (`Cents`).
 */

import type {
  CotacaoFreteInput,
  CotacaoFreteResult,
  CriarPrePostagemInput,
  EnderecoEnvio,
  ModalidadeEnvio,
  PrePostagemResult,
} from './types'
import {
  DESCRICAO_CONTEUDO_PADRAO,
  PACOTE_PADRAO_MOEDA,
} from './types'

/**
 * Endereço oficial da Central de Custódia (destinatário dos envios).
 *
 * A definição mora em `./endereco-central`, que não é `server-only`, justamente para
 * que a tela de envios leia o mesmo valor que a etiqueta. O re-export aqui mantém
 * `import { ENDERECO_CENTRAL_AUREA } from '@/lib/shipping/correios'` funcionando em
 * todo servidor que já o usava.
 */
import { ENDERECO_CENTRAL_AUREA } from './endereco-central'

export { ENDERECO_CENTRAL_AUREA }

/** Códigos de serviço dos Correios (PAC e SEDEX com contrato / à vista). */
export const CODIGOS_SERVICO_CORREIOS = {
  SEDEX: '03220', // SEDEX Contrato
  PAC: '03298',   // PAC Contrato
  SEDEX_VAREJO: '04014',
  PAC_VAREJO: '04510',
} as const

/**
 * Valida se a modalidade é permitida ('PAC' ou 'SEDEX').
 * Lança erro explícito se for fornecida qualquer outra modalidade (ex: carta comum).
 */
export function validarModalidadeEnvio(modalidade: string): asserts modalidade is ModalidadeEnvio {
  if (modalidade !== 'PAC' && modalidade !== 'SEDEX') {
    throw new Error(
      `Modalidade de envio inválida: "${modalidade}". O envio de moedas sob custódia é restrito a PAC ou SEDEX com valor declarado. Carta comum não é permitida por regimento postal.`,
    )
  }
}

/**
 * Normaliza CEP para formato de 8 dígitos numéricos.
 */
export function normalizarCep(cep: string): string {
  return cep.replace(/\D/g, '').padStart(8, '0').slice(0, 8)
}

/**
 * Calcula prazo e frete para envio de moedas (PAC ou SEDEX) com valor declarado e seguro.
 */
export async function calcularFreteCorreios(
  input: CotacaoFreteInput,
): Promise<CotacaoFreteResult> {
  const { cepOrigem, cepDestino, modalidade, valorDeclaradoCents } = input
  validarModalidadeEnvio(modalidade)

  const cepOrigemLimpo = normalizarCep(cepOrigem)
  const cepDestinoLimpo = normalizarCep(cepDestino)

  if (cepOrigemLimpo.length !== 8 || cepDestinoLimpo.length !== 8) {
    throw new Error('CEPs de origem e destino devem conter 8 dígitos.')
  }

  const tokenCorreios = process.env.CORREIOS_TOKEN
  const temCredenciais = Boolean(tokenCorreios && process.env.CORREIOS_CARTAO_POSTAGEM)

  // Se houver contrato oficial configurado, chama a API CWS
  if (temCredenciais) {
    try {
      const codigoServico =
        modalidade === 'SEDEX'
          ? CODIGOS_SERVICO_CORREIOS.SEDEX
          : CODIGOS_SERVICO_CORREIOS.PAC

      const params = new URLSearchParams({
        cepOrigem: cepOrigemLimpo,
        cepDestino: cepDestinoLimpo,
        codigoServico,
        psObjeto: String(PACOTE_PADRAO_MOEDA.pesoGramas),
        vlDeclarado: (valorDeclaradoCents / 100).toFixed(2),
      })

      const res = await fetch(`https://api.correios.com.br/preco/v1/nacional?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${tokenCorreios}`,
        },
      })

      if (res.ok) {
        const data = (await res.json()) as {
          pcFinal?: string
          prazoEntrega?: string
          vlSeguro?: string
        }

        const valorTotalCents = Math.round(parseFloat(data.pcFinal || '35.00') * 100)
        const valorSeguroCents = Math.round(parseFloat(data.vlSeguro || '5.00') * 100)
        const valorFreteCents = Math.max(0, valorTotalCents - valorSeguroCents)
        const prazoDiasUteis = parseInt(data.prazoEntrega || (modalidade === 'SEDEX' ? '2' : '6'), 10)

        return {
          modalidade,
          prazoDiasUteis,
          valorFreteCents,
          valorSeguroCents,
          valorTotalCents,
          avisoRecebimento: true,
          maoPropria: true,
        }
      }
    } catch {
      // Fallback para cálculo tabelado seguro
    }
  }

  // Cálculo tabelado determinístico para ambiente de testes / simulação
  const isSpParaSp = cepOrigemLimpo.startsWith('0') && cepDestinoLimpo.startsWith('0')
  const isMesmaRegiao = cepOrigemLimpo.slice(0, 2) === cepDestinoLimpo.slice(0, 2)

  let baseFreteCents = 2800 // R$ 28,00
  const prazoDiasUteis = modalidade === 'SEDEX' ? 2 : 6

  if (modalidade === 'SEDEX') {
    baseFreteCents = isSpParaSp ? 2450 : isMesmaRegiao ? 3600 : 4900
  } else {
    baseFreteCents = isSpParaSp ? 1800 : isMesmaRegiao ? 2400 : 3200
  }

  // Seguro ad valorem Correios: aprox. 1% do valor declarado que excede R$ 25,00
  const valorSeguravel = Math.max(0, valorDeclaradoCents - 2500)
  const valorSeguroCents = Math.round(valorSeguravel * 0.01) + 400 // R$ 4,00 taxa AR + registro

  return {
    modalidade,
    prazoDiasUteis,
    valorFreteCents: baseFreteCents,
    valorSeguroCents,
    valorTotalCents: baseFreteCents + valorSeguroCents,
    avisoRecebimento: true,
    maoPropria: true,
  }
}

/*
 * REMOVIDO em 21/09/2026: `gerarCodigoRastreioSimulado(modalidade)`.
 *
 * Ela montava `SL`/`PB` + 9 dígitos aleatórios + `BR` — um código com a cara do
 * padrão SRO e que não existe nos Correios. Saía impresso no campo "Código de
 * Rastreamento" da etiqueta, então o cliente ia embora da agência com um número
 * que nunca rastrearia nada.
 *
 * Enquanto não houver contrato e pré-postagem pela API CWS, a etiqueta não
 * mostra código de rastreio nenhum: mostra o protocolo do envio, que é
 * identificador nosso e não promete o que não é. O código real entra depois da
 * postagem, digitado pelo cliente (`markPosted`).
 */

/**
 * Gera solicitação de pré-postagem e dados de etiqueta para envio aos Correios.
 */
export async function gerarPrePostagemCorreios(
  input: CriarPrePostagemInput,
): Promise<PrePostagemResult> {
  const {
    protocolo,
    remetente,
    destinatario = ENDERECO_CENTRAL_AUREA,
    modalidade,
    quantidadeMoedas,
    valorDeclaradoCents,
  } = input

  validarModalidadeEnvio(modalidade)

  if (!remetente.nome || !remetente.cep || !remetente.logradouro) {
    throw new Error('Dados do remetente incompletos para emissão de etiqueta.')
  }

  const destinatarioCompleto: EnderecoEnvio = {
    ...ENDERECO_CENTRAL_AUREA,
    ...destinatario,
  }

  const numeroPrePostagem = `PP-${Date.now()}-${Math.floor(Math.random() * 10000)}`

  return {
    numeroPrePostagem,
    // Vazio até a postagem acontecer de verdade. Quem preenche é o cliente, com
    // o código do comprovante dos Correios.
    codigoRastreio: '',
    modalidade,
    protocolo,
    declaracaoConteudo: {
      item: DESCRICAO_CONTEUDO_PADRAO,
      quantidade: quantidadeMoedas,
      valorTotalCents: valorDeclaradoCents,
    },
    remetente,
    destinatario: destinatarioCompleto,
    pdfEtiquetaUrl: `/api/envios/etiqueta/${protocolo}`,
    createdAt: Date.now(),
  }
}

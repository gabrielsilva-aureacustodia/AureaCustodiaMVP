import 'server-only'

/**
 * Integração com a API dos Correios (CWS / Pré-Postagem / Rastreamento SRO).
 *
 * Desde 22/10/2026 fala com a API CWS do contrato (`./cws/`): token renovado sozinho, preço e prazo
 * reais, pré-postagem com código de rastreio dos Correios.
 *
 * RESTRIÇÕES INEGOCIÁVEIS:
 *  - `ModalidadeEnvio` é estritamente 'PAC' | 'SEDEX'. Nunca carta comum.
 *  - Toda postagem leva valor declarado (seguro).
 *  - O item declarado é sempre "Moeda comemorativa / colecionável".
 *  - Valores monetários em centavos (`Cents`).
 */

import { correiosConfigurado, SERVICOS_CORREIOS } from './cws/config'
import { cotarServico } from './cws/preco-prazo'
import type { CotacaoFreteInput, CotacaoFreteResult, ModalidadeEnvio } from './types'
import { dimensoesParaMoedas } from './types'

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

/**
 * Códigos de serviço do contrato. O mapa completo, com entrada (logística reversa) e saída, mora em
 * `./cws/config` (`SERVICOS_CORREIOS`); este nome continua exportado porque o painel e os testes
 * antigos o importam.
 */
export const CODIGOS_SERVICO_CORREIOS = {
  SEDEX: SERVICOS_CORREIOS.saida.SEDEX,
  PAC: SERVICOS_CORREIOS.saida.PAC,
  SEDEX_REVERSO: SERVICOS_CORREIOS.entrada.SEDEX,
  PAC_REVERSO: SERVICOS_CORREIOS.entrada.PAC,
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
 * Prazo e frete de um envio de moedas, pelo contrato dos Correios.
 *
 * `sentido` escolhe o serviço: `'entrada'` (padrão) é a logística reversa do cliente para a
 * custódia; `'saida'` é a retirada, da custódia para o cliente. Com o contrato configurado o valor
 * é o que os Correios vão faturar (`origem: 'correios'`) e uma falha deles SOBE como erro — até
 * 22/10/2026 a falha caía calada na tabela abaixo, e a tela mostrava um frete inventado como se
 * fosse o oficial. Sem contrato (desenvolvimento local), vale a tabela, marcada `origem: 'tabela'`.
 */
export async function calcularFreteCorreios(
  input: CotacaoFreteInput & { sentido?: 'entrada' | 'saida'; quantidade?: number },
): Promise<CotacaoFreteResult> {
  const { cepOrigem, cepDestino, modalidade, valorDeclaradoCents } = input
  validarModalidadeEnvio(modalidade)

  const cepOrigemLimpo = normalizarCep(cepOrigem)
  const cepDestinoLimpo = normalizarCep(cepDestino)

  if (cepOrigemLimpo.length !== 8 || cepDestinoLimpo.length !== 8) {
    throw new Error('CEPs de origem e destino devem conter 8 dígitos.')
  }

  const dimensoes = { ...dimensoesParaMoedas(input.quantidade ?? 1), ...input.dimensoes }

  if (correiosConfigurado()) {
    const codigoServico = SERVICOS_CORREIOS[input.sentido ?? 'entrada'][modalidade]
    const cot = await cotarServico({
      codigoServico,
      modalidade,
      cepOrigem: cepOrigemLimpo,
      cepDestino: cepDestinoLimpo,
      dimensoes,
      valorDeclaradoCents,
    })
    return {
      modalidade,
      prazoDiasUteis: cot.prazoDiasUteis,
      valorFreteCents: cot.precoServicoCents,
      valorSeguroCents: cot.precoAdicionaisCents,
      valorTotalCents: cot.precoTotalCents,
      avisoRecebimento: false,
      maoPropria: false,
      origem: 'correios',
      codigoServico,
    }
  }

  // Tabela local, só sem contrato configurado (desenvolvimento). Os números de referência são os
  // do contrato em 22/10/2026 (SP→BH, 300 g: SEDEX R$ 31,59 e PAC R$ 21,14 com R$ 300 declarados).
  const isMesmaRegiao = cepOrigemLimpo.slice(0, 2) === cepDestinoLimpo.slice(0, 2)
  const prazoDiasUteis = modalidade === 'SEDEX' ? (isMesmaRegiao ? 1 : 2) : isMesmaRegiao ? 3 : 6
  const baseFreteCents = modalidade === 'SEDEX' ? (isMesmaRegiao ? 2200 : 2885) : isMesmaRegiao ? 1500 : 1840

  // Valor declarado: ~1% do que passa do seguro automático.
  const valorSeguravel = Math.max(0, valorDeclaradoCents - 2563)
  const valorSeguroCents = Math.round(valorSeguravel * 0.01)

  return {
    modalidade,
    prazoDiasUteis,
    valorFreteCents: baseFreteCents,
    valorSeguroCents,
    valorTotalCents: baseFreteCents + valorSeguroCents,
    avisoRecebimento: false,
    maoPropria: false,
    origem: 'tabela',
  }
}

/*
 * REMOVIDO em 21/09/2026: `gerarCodigoRastreioSimulado(modalidade)` — montava um código com a cara
 * do padrão SRO que não existia nos Correios.
 *
 * REMOVIDO em 22/10/2026: `gerarPrePostagemCorreios(input)` — devolvia um número `PP-<timestamp>`
 * inventado e nenhum código de rastreio. A pré-postagem de verdade está em `./cws/prepostagem.ts`
 * (`criarPrePostagem`), e quem a dispara é o servidor do envio e o da retirada, não a rota da
 * etiqueta.
 */

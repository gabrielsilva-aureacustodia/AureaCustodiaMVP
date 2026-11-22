/**
 * Validação de valores digitados em formulários de dinheiro (QA Davi B07 e S04, 22/11/2026).
 * Puro: a tela só decide como mostrar. O servidor continua conferindo por conta própria.
 */

import type { Cents } from '@/domain/types'

/**
 * Depósito mínimo por operação, em centavos. 0 = sem mínimo.
 * DECISÃO DO GABRIEL PENDENTE (cada Pix gerado tem custo do intermediador): a constante está pronta e
 * DESLIGADA — não ligar sem ele. Quando decidir, basta trocar o valor (ex.: 1000 = R$ 10,00).
 */
export const DEPOSITO_MINIMO_CENTS: Cents = 0

/** Deixa só dígitos e um separador decimal (vírgula ou ponto): sem letras, sem sinal de menos. */
export function somenteNumerico(texto: string): string {
  return texto.replace(/[^0-9.,]/g, '')
}

export type ResultadoDeposito =
  | { valido: true; cents: Cents }
  | { valido: false; cents: Cents; motivo: string | null }

/** `motivo: null` = campo vazio (nada a reclamar ainda). `formatarBRL` vem da tela para o domínio não importar UI. */
export function validarDeposito(
  cents: Cents,
  max: Cents,
  formatarBRL: (c: Cents) => string,
  min: Cents = DEPOSITO_MINIMO_CENTS,
): ResultadoDeposito {
  if (!Number.isFinite(cents) || cents <= 0) return { valido: false, cents: 0, motivo: null }
  if (cents > max) return { valido: false, cents, motivo: `O depósito máximo por operação é ${formatarBRL(max)}.` }
  if (min > 0 && cents < min) return { valido: false, cents, motivo: `O depósito mínimo por operação é ${formatarBRL(min)}.` }
  return { valido: true, cents }
}

/**
 * Oferta de compra (S04): devolve o motivo que desabilita o botão, ou null se pode publicar.
 * `custoTotalCents` é quantidade × custo por moeda já com comissão e custódia (calculado pela tela com as
 * mesmas funções do servidor); `saldoCents` só entra na modalidade "com saldo".
 */
export function motivoOfertaDeCompraInvalida(args: {
  quantidade: number
  precoCents: Cents
  comSaldo: boolean
  saldoCents: Cents
  custoTotalCents: Cents
  formatarBRL: (c: Cents) => string
}): string | null {
  const { quantidade, precoCents, comSaldo, saldoCents, custoTotalCents, formatarBRL } = args
  if (!Number.isInteger(quantidade) || quantidade <= 0) return 'Informe uma quantidade de moedas maior que zero.'
  if (!Number.isFinite(precoCents) || precoCents <= 0) return 'Informe um preço por moeda maior que zero.'
  if (comSaldo && custoTotalCents > saldoCents) {
    return `Seu saldo (${formatarBRL(saldoCents)}) não cobre esta oferta (${formatarBRL(custoTotalCents)}). Deposite ou reduza quantidade/preço.`
  }
  return null
}

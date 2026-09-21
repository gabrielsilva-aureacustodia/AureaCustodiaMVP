/**
 * DOMÍNIO — Depósito por Pix direto na conta da empresa.
 *
 * Decisão do Gabriel em 21/09/2026: o depósito deixa de passar pelo Mercado
 * Pago e passa a ser uma transferência Pix direta para a chave da AUREA
 * CUSTODIA LTDA. O motivo é o custo — o gateway cobra percentual sobre cada
 * entrada, e um depósito não é uma venda: é o cliente colocando o próprio
 * dinheiro na própria conta, então a taxa do intermediário sairia inteira do
 * caixa da empresa.
 *
 * COMO A TAXA É COBRADA
 * ---------------------
 * O cliente transfere o valor desejado MAIS R$ 5,00. Quem deposita R$ 500,00
 * envia R$ 505,00 e recebe R$ 500,00 de saldo; os R$ 5,00 ficam com a empresa e
 * cobrem o custo operacional da conciliação manual. É o inverso de descontar a
 * taxa do valor depositado, e é deliberado: o cliente pediu R$ 500,00 de saldo
 * e é R$ 500,00 que ele precisa ver na conta, sem arredondamento surpresa.
 *
 * O QUE ESTE MÓDULO NÃO FAZ
 * -------------------------
 * Não credita saldo. Pix direto não tem webhook: ninguém do lado do sistema
 * fica sabendo que o dinheiro entrou. O crédito é conferência da equipe no
 * extrato bancário e lançamento em /admin/usuarios — e essa é exatamente a
 * salvaguarda que impede alguém de criar saldo do nada declarando um Pix que
 * não existiu.
 *
 * Módulo puro: sem I/O, sem React, sem `server-only`. A chave precisa chegar à
 * tela do cliente para ser copiada, então ela não pode morar em `src/server/`.
 * Não é segredo — é chave de recebimento, feita para ser publicada.
 */

import type { Cents } from '@/domain/types'

/**
 * Chave Pix aleatória (EVP) da AUREA CUSTODIA LTDA, informada pelo Gabriel em
 * 21/09/2026. Chave aleatória e não CNPJ de propósito: pode ser trocada sem
 * mexer em cadastro, e não expõe outro identificador da empresa.
 */
export const CHAVE_PIX_DEPOSITO = '76df3c5c-6137-43d0-b922-2fb2c3a04284'

/** Nome que o cliente vê no aplicativo do banco ao confirmar a transferência. */
export const FAVORECIDO_PIX_DEPOSITO = 'AUREA CUSTODIA LTDA'

/** Taxa fixa somada ao valor depositado — R$ 5,00 por solicitação. */
export const TAXA_DEPOSITO_PIX_CENTS: Cents = 500

/** O que o cliente recebe de saldo e o que ele transfere, no par certo. */
export interface ValoresDoDepositoPix {
  /** O que entra no saldo depois da confirmação. */
  creditoCents: Cents
  /** A taxa fixa retida pela empresa. */
  taxaCents: Cents
  /** O que precisa ser transferido no Pix: crédito + taxa. */
  totalCents: Cents
}

/**
 * Monta os três valores do depósito a partir do que o cliente digitou.
 *
 * Trunca para inteiro e nunca devolve negativo: a Server Action é um endpoint
 * HTTP, e `NaN`, `Infinity` e valores fracionários chegam aqui se alguém quiser
 * mandá-los.
 */
export function valoresDoDepositoPix(
  creditoDesejadoCents: number,
  taxaCents: Cents = TAXA_DEPOSITO_PIX_CENTS,
): ValoresDoDepositoPix {
  const credito = Number.isFinite(creditoDesejadoCents)
    ? Math.max(0, Math.floor(creditoDesejadoCents))
    : 0
  const taxa = Number.isFinite(taxaCents) ? Math.max(0, Math.floor(taxaCents)) : 0
  return { creditoCents: credito, taxaCents: taxa, totalCents: credito + taxa }
}

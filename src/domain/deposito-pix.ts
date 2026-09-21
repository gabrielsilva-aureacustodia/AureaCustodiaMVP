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
 * DEPÓSITO NÃO TEM TAXA (correção do Gabriel em 21/09/2026).
 * ----------------------------------------------------------
 * Por algumas horas esta tela somou R$ 5,00 ao valor depositado. Era erro de
 * leitura minha: a tarifa fixa de R$ 5,00 da Tabela de Taxas é do SAQUE, não do
 * depósito. Quem deposita R$ 500,00 transfere R$ 500,00 e recebe R$ 500,00 de
 * saldo. Quem saca é que recebe R$ 5,00 a menos (`taxaSaqueFixa` em
 * `src/domain/fees.ts`, cláusula 4.2 da Tabela de Taxas).
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

/**
 * O valor do depósito, saneado.
 *
 * A função continua existindo mesmo devolvendo um campo só: é ela que trunca
 * para inteiro e barra negativo, `NaN` e `Infinity` — e a Server Action é um
 * endpoint HTTP, então esses chegam se alguém quiser mandá-los.
 */
export function valorDoDepositoPix(valorCents: number): Cents {
  return Number.isFinite(valorCents) ? Math.max(0, Math.floor(valorCents)) : 0
}

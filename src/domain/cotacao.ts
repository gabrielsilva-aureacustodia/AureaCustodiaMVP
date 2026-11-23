/**
 * A COTAÇÃO É UMA SÓ (Gabriel, 23/11/2026).
 *
 * Até aqui o servidor calculava o que cobrar com a tabela de taxas COM a isenção da Áurea e do CEO, e quatro telas
 * recalculavam o mesmo número no navegador com a tabela CHEIA: o servidor não cobrava taxa da Áurea, a tela mostrava.
 * A fórmula nunca foi duplicada (`fees.ts`); o que divergia era a tabela que cada lado escolhia.
 *
 * Agora ninguém escolhe tabela. Quem precisa de um valor de compra ou de venda — tela ou ação do servidor — chama
 * `cotarCompra` ou `cotarVenda` dizendo QUEM compra e QUEM vende; a isenção é aplicada aqui dentro, num lugar só.
 * O teste `isencao-nas-telas.test.ts` falha se uma tela voltar a chamar as funções de taxa direto.
 *
 * Regra pura, sem I/O: serve ao navegador e ao servidor. Todos os valores em centavos inteiros.
 */

import { comissaoPorMoeda, custodiaDaCompraPorMoeda, type TabelaDeTaxas } from '@/domain/fees'
import { taxasDaNegociacao } from '@/domain/isencao'
import type { Cents, UserEmail } from '@/domain/types'

export interface CotacaoDeCompra {
  /** Preço das moedas (preço unitário × quantidade). */
  subtotal: Cents
  /** Comissão de compra, por moeda e no total. */
  comissaoUnit: Cents
  comissao: Cents
  /** Primeiro mês de custódia que entra na compra, por moeda e no total. */
  custodiaUnit: Cents
  custodia: Cents
  /** Tudo o que o comprador paga: por moeda e no total. É o número que o gateway cobra e o saldo precisa cobrir. */
  totalUnit: Cents
  total: Cents
}

export interface CotacaoDeVenda {
  /** Preço bruto (preço unitário × quantidade). */
  bruto: Cents
  comissaoUnit: Cents
  comissao: Cents
  /** O que o vendedor recebe: por moeda e no total. */
  liquidoUnit: Cents
  liquido: Cents
}

/**
 * Quanto custa comprar. `vendedor` vazio ('') quando a contraparte ainda não existe (oferta de compra): vale a
 * isenção do próprio comprador. Preço zero ou negativo cota tudo em zero (o campo ainda está vazio).
 */
export function cotarCompra(
  comprador: UserEmail,
  vendedor: UserEmail | '',
  precoUnit: Cents,
  qty: number,
  taxasCheias: TabelaDeTaxas,
): CotacaoDeCompra {
  if (!(precoUnit > 0) || !(qty > 0)) {
    return { subtotal: 0, comissaoUnit: 0, comissao: 0, custodiaUnit: 0, custodia: 0, totalUnit: 0, total: 0 }
  }
  const t = taxasDaNegociacao(comprador, vendedor, taxasCheias)
  const comissaoUnit = comissaoPorMoeda(precoUnit, 'comprador', t)
  const custodiaUnit = custodiaDaCompraPorMoeda(t)
  const totalUnit = precoUnit + comissaoUnit + custodiaUnit
  return {
    subtotal: precoUnit * qty,
    comissaoUnit,
    comissao: comissaoUnit * qty,
    custodiaUnit,
    custodia: custodiaUnit * qty,
    totalUnit,
    total: totalUnit * qty,
  }
}

/** Quanto se recebe ao vender. `comprador` vazio ('') quando ainda não há comprador (anúncio). */
export function cotarVenda(
  vendedor: UserEmail,
  comprador: UserEmail | '',
  precoUnit: Cents,
  qty: number,
  taxasCheias: TabelaDeTaxas,
): CotacaoDeVenda {
  if (!(precoUnit > 0) || !(qty > 0)) return { bruto: 0, comissaoUnit: 0, comissao: 0, liquidoUnit: 0, liquido: 0 }
  const t = taxasDaNegociacao(comprador, vendedor, taxasCheias)
  const comissaoUnit = comissaoPorMoeda(precoUnit, 'vendedor', t)
  const liquidoUnit = precoUnit - comissaoUnit
  return {
    bruto: precoUnit * qty,
    comissaoUnit,
    comissao: comissaoUnit * qty,
    liquidoUnit,
    liquido: liquidoUnit * qty,
  }
}

/** O que UMA negociação custa e rende, por moeda, entre quem compra e quem vende. */
export interface CotacaoDaNegociacao {
  /** A tabela efetiva desta negociação (com a isenção). Só para repassar a funções do domínio que a pedem. */
  taxas: TabelaDeTaxas
  comissaoComprador: Cents
  comissaoVendedor: Cents
  /** Primeiro mês de custódia que o comprador paga na compra. */
  custodia: Cents
  /** Preço + comissão de compra + custódia: o que o comprador precisa ter e paga, por moeda. */
  custoUnit: Cents
  /** Preço − comissão de venda: o que o vendedor recebe, por moeda. */
  liquidoVendedor: Cents
}

/**
 * A cotação do motor e das ações do servidor, por moeda. `vendedor` ou `comprador` vazio ('') quando a contraparte
 * ainda não existe. Ninguém fora de `fees.ts`, `isencao.ts` e deste arquivo chama `comissaoPorMoeda`,
 * `custoDeCompraPorMoeda` ou `taxasDaNegociacao`: o teste `isencao-nas-telas.test.ts` vigia.
 */
export function cotarNegociacao(
  comprador: UserEmail | '',
  vendedor: UserEmail | '',
  precoUnit: Cents,
  taxasCheias: TabelaDeTaxas,
): CotacaoDaNegociacao {
  const taxas = taxasDaNegociacao(comprador, vendedor, taxasCheias)
  const lados = comissaoPorMoeda(precoUnit, taxas)
  const custodia = custodiaDaCompraPorMoeda(taxas)
  return {
    taxas,
    comissaoComprador: lados.comprador,
    comissaoVendedor: lados.vendedor,
    custodia,
    custoUnit: precoUnit + lados.comprador + custodia,
    liquidoVendedor: precoUnit - lados.vendedor,
  }
}

/**
 * ISENÇÃO DE TAXAS — DUAS CONTAS, E SÓ ELAS (Gabriel, 22/11/2026).
 *
 * A) A CONTA DA PRÓPRIA AUREA CUSTÓDIA não paga nada à plataforma: nem comissão de compra ou venda, nem custódia
 *    (ciclo, entrada ou primeiro mês da compra). Quem compra dela ou vende para ela paga NORMALMENTE: a isenção é
 *    do lado da Áurea, nunca da contraparte — moeda dela, comprada por cliente, nasce com a custódia do cliente
 *    cobrada como qualquer outra.
 * B) A negociação entre a conta da Áurea e a conta do CEO (Rogério) não paga comissão de nenhum dos dois lados.
 * C) O CEO NÃO paga custódia em nenhuma moeda dele (ciclo, entrada, compra), mesmo negociando com clientes (regra
 *    corrigida pelo Gabriel em 22/11/2026). As demais taxas ele paga normalmente, exceto com a conta da Áurea.
 *    Cliente que compra moeda do CEO paga a custódia dele normalmente.
 *
 * COMO AS DUAS CONTAS SÃO RECONHECIDAS. Por e-mail, lido de variável de ambiente (`NEXT_PUBLIC_…`, porque as telas
 * calculam o custo no navegador com a mesma função e o valor não é segredo). NÃO se reconhece por CNPJ nem por
 * qualquer campo do cadastro: o cadastro é preenchido pelo próprio cliente, e quem digitasse o CNPJ da Áurea
 * ganharia a isenção. Variável vazia = ninguém é isento; o padrão do sistema não muda.
 *
 * Regra pura: sem I/O. Lê só `process.env`, que o Next inlina no bundle do cliente quando começa com NEXT_PUBLIC.
 */

import type { TabelaDeTaxas } from '@/domain/fees'
import type { UserEmail } from '@/domain/types'

function normalizar(v: string | undefined): string {
  return (v ?? '').trim().toLowerCase()
}

/** E-mail da conta da própria Áurea Custódia ('' quando ainda não foi configurado). */
export function emailDaContaDaAurea(): string {
  return normalizar(process.env.NEXT_PUBLIC_AUREA_CONTA_PROPRIA_EMAIL ?? process.env.AUREA_CONTA_PROPRIA_EMAIL)
}

/** E-mail da conta do CEO ('' quando ainda não foi configurado). */
export function emailDaContaDoCeo(): string {
  return normalizar(process.env.NEXT_PUBLIC_AUREA_CONTA_CEO_EMAIL ?? process.env.AUREA_CONTA_CEO_EMAIL)
}

export function ehContaDaAurea(email: UserEmail | null | undefined): boolean {
  const a = emailDaContaDaAurea()
  return a !== '' && normalizar(email ?? undefined) === a
}

function ehContaDoCeo(email: UserEmail | null | undefined): boolean {
  const c = emailDaContaDoCeo()
  return c !== '' && normalizar(email ?? undefined) === c
}

/**
 * Quem nunca paga custódia (ciclo, entrada ou 1º mês da compra): a conta da Áurea e a do CEO (Gabriel, 22/11/2026).
 * É só da própria conta: o cliente que compra moeda deles paga a custódia dele normalmente.
 */
export function ehIsentoDeCustodia(email: UserEmail | null | undefined): boolean {
  return ehContaDaAurea(email) || ehContaDoCeo(email)
}

/** Aurea ↔ CEO, em qualquer sentido: o único par que não paga comissão dos dois lados. */
export function ehParAureaCeo(a: UserEmail, b: UserEmail): boolean {
  return (ehContaDaAurea(a) && ehContaDoCeo(b)) || (ehContaDoCeo(a) && ehContaDaAurea(b))
}

/**
 * A tabela de taxas que vale para ESTA negociação.
 *
 * Devolve a própria tabela quando ninguém é isento (o caso de quase toda negociação). Comprador = Áurea:
 * sem comissão de compra; comprador = Áurea ou CEO: sem o primeiro mês de custódia. Vendedor = Áurea: sem comissão de venda. Par
 * Áurea ↔ CEO: sem comissão dos dois lados. Os outros campos (saque, retirada) não entram em negociação.
 */
export function taxasDaNegociacao(compradorEmail: UserEmail, vendedorEmail: UserEmail, taxas: TabelaDeTaxas): TabelaDeTaxas {
  const par = ehParAureaCeo(compradorEmail, vendedorEmail)
  const semCompra = par || ehContaDaAurea(compradorEmail)
  const semVenda = par || ehContaDaAurea(vendedorEmail)
  const semCustodia = ehIsentoDeCustodia(compradorEmail)
  if (!semCompra && !semVenda && !semCustodia) return taxas
  return {
    ...taxas,
    ...(semCompra ? { comissaoCompradorBp: 0, comissaoCompradorFixa: 0 } : {}),
    ...(semVenda ? { comissaoVendedorBp: 0, comissaoVendedorFixa: 0 } : {}),
    ...(semCustodia ? { custodiaMensalPorMoeda: 0 } : {}),
  }
}

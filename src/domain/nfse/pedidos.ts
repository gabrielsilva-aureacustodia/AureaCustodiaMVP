/**
 * Que nota cada mutação gera — a derivação da NFS-e, irmã de `derivarLancamentos` (ledger).
 *
 * NÃO É PORT. O monolito não emitia nota nenhuma. A regra vem da reunião com o contador (16/10/2026)
 * e das decisões do Gabriel de 23/10/2026 (docs/fiscal-contabil/REGRAS_FISCAIS_E_CONTABEIS.md, R2/R5):
 *
 *  - COMISSÃO: toda negociação nova gera DUAS notas, uma para o comprador e outra para o vendedor —
 *    cada um é tomador de um serviço diferente, e cada nota casa com uma linha do livro-razão dele.
 *  - CUSTÓDIA: nota SOMENTE quando a fatura passa a PAGA, com a data e a hora do pagamento. Fatura
 *    em aberto não gera nota nem imposto, jamais. A nota descreve o período do ciclo que foi pago,
 *    que começa no aceite da moeda (ou na compra, quando o ciclo recomeça com o dono novo).
 *
 * Por que derivar do diff, e não chamar "emitir nota" em cada Server Action: a negociação acontece
 * em seis caminhos (publishOffer, sellToBid, buyLot, compra direta, liquidador da conciliação,
 * matchOrders) e a fatura é paga em outros tantos (saldo, Pix, cartão, assinatura, compra). Um
 * caminho esquecido seria receita sem nota. Comparando o estado antes e depois — como o ledger já
 * faz —, nenhum escapa, e a nota nasce na MESMA transação que grava o dinheiro.
 *
 * REGRA PURA: devolve pedidos. Quem grava é src/server/db/repositories/nfse.ts; quem envia é
 * src/server/nfse/.
 */

import { dataBrasilia } from '@/domain/ciclo-custodia'
import type { AppState, Cents, FaturaCustodia, Timestamp, Trade, UserEmail } from '@/domain/types'

import { CODIGOS_POR_SERVICO, type ServicoNfse } from './codigos'

/** O pedido de uma nota, antes de virar DPS: o fato, o tomador e o valor. */
export interface PedidoNfse {
  /**
   * Identidade do pedido — uma nota por fato, por tomador, por serviço. É a chave única da tabela:
   * a mesma mutação derivada duas vezes não gera duas notas.
   */
  chave: string
  servico: ServicoNfse
  /** O fato no sistema: `TRADE-12` (a mesma referência do ledger) ou o id da fatura. */
  refFato: string
  tomadorEmail: UserEmail
  valorCents: Cents
  /** Quando o fato aconteceu: o casamento da negociação ou o pagamento da fatura. */
  ocorridoEm: Timestamp
  /** Data de competência da nota, 'AAAA-MM-DD' no dia de Brasília de `ocorridoEm`. */
  competencia: string
  descricao: string
  quantidadeMoedas: number
}

/** 'DD/MM/AAAA' de Brasília → 'AAAA-MM-DD', o formato do campo `dCompet`. */
export function competenciaDe(ts: Timestamp): string {
  const [dia, mes, ano] = dataBrasilia(ts).split('/')
  return `${ano}-${mes}-${dia}`
}

function plural(qtd: number): string {
  return `${qtd} MOEDA${qtd === 1 ? '' : 'S'}`
}

/**
 * O período que a fatura cobre, no formato do exemplo do Gabriel ("25/10/2026 A 25/11/2026"): do
 * dia em que o ciclo começou ao dia da próxima cobrança. `coberturaAte` é o último instante pago
 * (23:59 da véspera do aniversário), então o fim exibido é o minuto seguinte. Fatura anterior à
 * regra do ciclo por moeda não tem cobertura: cai no mês da competência, como a nota nº 1.
 */
export function periodoDaFatura(f: FaturaCustodia): string {
  if (f.coberturaAte) {
    const inicio = dataBrasilia(f.dataEmissao)
    const fim = dataBrasilia(f.coberturaAte + 60_000)
    return `${inicio} A ${fim}`
  }
  const [ano, mes] = f.competencia.split('-')
  return `${mes}/${ano}`
}

export function descricaoDaCustodia(f: FaturaCustodia): string {
  return `${CODIGOS_POR_SERVICO.custodia.descricaoBase} - ${periodoDaFatura(f)} - ${plural(f.quantidadeMoedas)} - REF ${f.id}`
}

export function descricaoDaComissao(servico: 'intermediacao_compra' | 'intermediacao_venda', t: Trade, ref: string): string {
  const qtd = t.qty || 1
  return `${CODIGOS_POR_SERVICO[servico].descricaoBase} - ${plural(qtd)} - REF ${ref}`
}

function pedidosDaNegociacao(t: Trade, ref: string): PedidoNfse[] {
  const qtd = t.qty || 1
  const lados: Array<[ServicoNfse & ('intermediacao_compra' | 'intermediacao_venda'), UserEmail, Cents | undefined]> = [
    ['intermediacao_compra', t.buyer, t.feeComprador],
    ['intermediacao_venda', t.seller, t.feeVendedor],
  ]
  const pedidos: PedidoNfse[] = []
  for (const [servico, tomador, valor] of lados) {
    // Comissão zero (tabela configurada sem taxa de um dos lados) não é serviço cobrado: sem nota.
    if (!valor || valor <= 0) continue
    pedidos.push({
      chave: `${servico}:${ref}`,
      servico,
      refFato: ref,
      tomadorEmail: tomador,
      valorCents: valor,
      ocorridoEm: t.date,
      competencia: competenciaDe(t.date),
      descricao: descricaoDaComissao(servico, t, ref),
      quantidadeMoedas: qtd,
    })
  }
  return pedidos
}

function pedidoDaFaturaPaga(f: FaturaCustodia, agora: Timestamp): PedidoNfse | null {
  if (f.valorCents <= 0) return null
  const pagaEm = f.dataPagamento ?? agora
  return {
    chave: `custodia:${f.id}`,
    servico: 'custodia',
    refFato: f.id,
    tomadorEmail: f.userEmail,
    valorCents: f.valorCents,
    ocorridoEm: pagaEm,
    competencia: competenciaDe(pagaEm),
    descricao: descricaoDaCustodia(f),
    quantidadeMoedas: f.quantidadeMoedas,
  }
}

/**
 * Os pedidos de nota de uma mutação. `antes` e `depois` são os dois retratos que `mutarEstado`
 * já tem; `agora` só entra quando a fatura paga não trouxe a hora do pagamento.
 *
 * As negociações novas são as que passaram do fim do histórico anterior — a mesma convenção do
 * ledger, que é o que mantém `TRADE-n` igual nos dois lugares.
 */
export function pedidosDeNfse(antes: AppState, depois: AppState, agora: Timestamp): PedidoNfse[] {
  const pedidos: PedidoNfse[] = []

  depois.trades.slice(antes.trades.length).forEach((t, i) => {
    pedidos.push(...pedidosDaNegociacao(t, `TRADE-${antes.trades.length + i + 1}`))
  })

  const faturasAntes = new Map((antes.faturasCustodia ?? []).map((f) => [f.id, f]))
  for (const f of depois.faturasCustodia ?? []) {
    if (f.status !== 'paga') continue
    if (faturasAntes.get(f.id)?.status === 'paga') continue
    const pedido = pedidoDaFaturaPaga(f, agora)
    if (pedido) pedidos.push(pedido)
  }

  return pedidos
}

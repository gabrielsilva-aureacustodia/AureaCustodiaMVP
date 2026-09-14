/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Aqui o dinheiro entra no saldo ou liquida serviços (depósito, compra direta,
 * fatura de custódia, retirada física). É o passo 7 do fluxo do M5, e o único
 * lugar da plataforma em que um pagamento externo vira crédito interno.
 * ==========================================================================*/

import 'server-only'

import { competenciaAtual, isInadimplente } from '@/domain/custody'
import { tradeFee } from '@/domain/fees'
import { transferCoin } from '@/domain/market'
import { brl } from '@/domain/money'
import { calcularPagoAte, somarMeses } from '@/domain/plano-custodia'
import type { AppState, FormaPagamentoFatura } from '@/domain/types'
import { consultarPagamentoMercadoPago, type DetalhesPagamento } from '@/lib/payments'
import type { IntencaoDeposito, TipoOperacaoPagamento } from '@/server/db/repositories/payments'
import { mutateState } from '@/server/state'

import { gravarRecebimento } from './recebimentos'
import { repositorioIntencoes } from './repositorios'

export interface ResultadoLiquidacao {
  sucesso: boolean
  motivo: string
  compraConcluida?: boolean
}

export type Liquidador = (
  s: AppState,
  intencao: IntencaoDeposito,
  detalhes: DetalhesPagamento,
) => ResultadoLiquidacao

export interface ResultadoConciliacao {
  creditado: boolean
  motivo: string
  externalReference?: string
  valorCents?: number
  userEmail?: string
  tipoOperacao?: TipoOperacaoPagamento
  compraConcluida?: boolean
}

/* ------------------------------------------------------------------ *
 * Liquidadores por tipo de operação (Passo B1.4)                     *
 * ------------------------------------------------------------------ */

function liquidarDeposito(
  s: AppState,
  reivindicada: IntencaoDeposito,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  buyer.balance += reivindicada.valor
  s.deposits.push({
    userEmail: reivindicada.userEmail,
    valor: reivindicada.valor,
    date: Date.now(),
  })
  return { sucesso: true, motivo: 'creditado' }
}

function liquidarCompraDireta(
  s: AppState,
  reivindicada: IntencaoDeposito,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  // Compra direta de lote via gateway
  const lotId = (reivindicada.metadata?.lotId as string) || ''
  const qtyPedida = Number(reivindicada.metadata?.qty) || 1

  const offers = lotId ? s.sellOffers.filter((o) => o.lotId === lotId) : []
  const sellerId = offers[0]?.seller
  const seller = sellerId ? s.users[sellerId] : undefined

  const podeComprar =
    offers.length >= qtyPedida &&
    Boolean(seller) &&
    sellerId !== reivindicada.userEmail

  if (podeComprar && seller) {
    const toBuy = offers.slice(0, qtyPedida)
    const price = offers[0].price
    const idsConsumidos = new Set<string>()
    let compradas = 0

    for (const o of toBuy) {
      idsConsumidos.add(o.id)
      const fee = tradeFee(price)
      if (!transferCoin(seller, buyer, o.coinId)) continue
      seller.balance += price - fee
      compradas += 1
    }

    s.sellOffers = s.sellOffers.filter((o) => !idsConsumidos.has(o.id))

    if (compradas > 0) {
      s.trades.push({
        price,
        qty: compradas,
        date: Date.now(),
        buyer: reivindicada.userEmail,
        seller: sellerId,
        tipoMoeda: offers[0].tipoMoeda,
      })

      // Para a contabilidade: entrada externa que cobriu a compra
      s.deposits.push({
        userEmail: reivindicada.userEmail,
        valor: price * compradas,
        date: Date.now(),
      })

      // Se apenas parte das moedas do lote pôde ser transferida, o troco fica no saldo
      const troco = reivindicada.valor - price * compradas
      if (troco > 0) {
        buyer.balance += troco
        s.deposits.push({
          userEmail: reivindicada.userEmail,
          valor: troco,
          date: Date.now(),
        })
      }

      return { sucesso: true, motivo: 'compra_direta_concluida', compraConcluida: true }
    } else {
      // Transferência falhou em todas as moedas: credita integralmente ao comprador
      buyer.balance += reivindicada.valor
      s.deposits.push({
        userEmail: reivindicada.userEmail,
        valor: reivindicada.valor,
        date: Date.now(),
      })
      return { sucesso: true, motivo: 'lote_indisponivel_creditado_em_saldo', compraConcluida: false }
    }
  } else {
    // Lote indisponível (corrida de compra ou lote cancelado):
    // O dinheiro não se perde: vira saldo em conta para o cliente
    buyer.balance += reivindicada.valor
    s.deposits.push({
      userEmail: reivindicada.userEmail,
      valor: reivindicada.valor,
      date: Date.now(),
    })
    return { sucesso: true, motivo: 'lote_indisponivel_creditado_em_saldo', compraConcluida: false }
  }
}

/**
 * Liquidador de fatura de custódia (passo B2.4).
 * Marca a fatura como paga, ativa o plano correspondente (se origem 'contratacao')
 * ou renova (se origem 'renovacao_anual'), registra a entrada externa em deposits
 * e reavalia a inadimplência do usuário.
 */
function liquidarFaturaCustodia(
  s: AppState,
  reivindicada: IntencaoDeposito,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  const faturaId = (reivindicada.metadata?.faturaId as string) || ''
  s.faturasCustodia = s.faturasCustodia ?? []
  const fatura = s.faturasCustodia.find((f) => f.id === faturaId)

  if (!fatura) {
    buyer.balance += reivindicada.valor
    s.deposits.push({
      userEmail: reivindicada.userEmail,
      valor: reivindicada.valor,
      date: Date.now(),
    })
    return { sucesso: true, motivo: 'fatura_custodia_creditada_saldo' }
  }

  if (fatura.status === 'paga') {
    return { sucesso: true, motivo: 'fatura_ja_paga' }
  }

  const agora = Date.now()
  const metodoPagamento: FormaPagamentoFatura =
    reivindicada.metodo === 'pix' ? 'pix' : 'cartao'

  fatura.status = 'paga'
  fatura.dataPagamento = agora
  fatura.formaPagamento = metodoPagamento
  fatura.paymentIntentId = reivindicada.externalReference

  // Para a contabilidade: entrada externa que cobriu a fatura de custódia
  s.deposits.push({
    userEmail: reivindicada.userEmail,
    valor: fatura.valorCents,
    date: agora,
  })

  // Se a fatura é de contratação de plano, ativa o plano correspondente
  if (fatura.origem === 'contratacao' && fatura.planoId) {
    s.planosCustodia = s.planosCustodia ?? []
    const plano = s.planosCustodia.find((p) => p.id === fatura.planoId)
    if (plano) {
      plano.status = 'vigente'
      plano.pagoAteCompetencia = calcularPagoAte(plano.inicioCompetencia, plano.modalidade)
      plano.formaPagamento = metodoPagamento
      plano.paymentIntentRef = reivindicada.externalReference
      plano.atualizadoEm = agora
    }
  } else if (fatura.origem === 'renovacao_anual' && fatura.planoId) {
    s.planosCustodia = s.planosCustodia ?? []
    const plano = s.planosCustodia.find((p) => p.id === fatura.planoId)
    if (plano) {
      plano.pagoAteCompetencia = somarMeses(plano.pagoAteCompetencia ?? plano.inicioCompetencia, 12)
      plano.formaPagamento = metodoPagamento
      plano.atualizadoEm = agora
    }
  }

  // Reavalia status de inadimplência do usuário
  const faturasRestantes = s.faturasCustodia.filter((f) => f.userEmail === reivindicada.userEmail)
  buyer.inadimplente = isInadimplente(buyer, faturasRestantes, agora)

  return { sucesso: true, motivo: 'fatura_custodia_liquidada' }
}

/**
 * Liquidador de assinatura de custódia (passo B2.8).
 * Atualiza o plano de custódia com a assinaturaId, avança competência paga
 * e quita a fatura correspondente caso exista.
 */
function liquidarAssinaturaCustodia(
  s: AppState,
  reivindicada: IntencaoDeposito,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  const agora = Date.now()
  const planoId = (reivindicada.metadata?.planoId as string) || ''
  s.planosCustodia = s.planosCustodia ?? []
  const plano = s.planosCustodia.find((p) => p.id === planoId)

  s.deposits.push({
    userEmail: reivindicada.userEmail,
    valor: reivindicada.valor,
    date: agora,
  })

  if (plano) {
    if (reivindicada.metadata?.assinaturaId) {
      plano.assinaturaId = String(reivindicada.metadata.assinaturaId)
    }
    plano.status = 'vigente'
    plano.pagoAteCompetencia = somarMeses(plano.pagoAteCompetencia ?? plano.inicioCompetencia, 1)
    plano.formaPagamento = 'cartao'
    plano.atualizadoEm = agora

    // Se houver fatura pendente para esta competência e este plano, marca como paga
    s.faturasCustodia = s.faturasCustodia ?? []
    const fatura = s.faturasCustodia.find(
      (f) => f.planoId === plano.id && f.status !== 'paga' && f.status !== 'cancelada',
    )
    if (fatura) {
      fatura.status = 'paga'
      fatura.dataPagamento = agora
      fatura.formaPagamento = 'cartao'
      fatura.paymentIntentId = reivindicada.externalReference
    }
  } else {
    // Failsafe: se plano não foi encontrado, credita no saldo
    buyer.balance += reivindicada.valor
  }

  // Reavalia status de inadimplência
  const faturasRestantes = (s.faturasCustodia || []).filter((f) => f.userEmail === reivindicada.userEmail)
  buyer.inadimplente = isInadimplente(buyer, faturasRestantes, agora)

  return { sucesso: true, motivo: 'assinatura_custodia_liquidada' }
}

/**
 * Liquidador de retirada física (passo B3).
 * Como salvaguarda, credita o valor ao saldo do cliente.
 */
function liquidarRetirada(
  s: AppState,
  reivindicada: IntencaoDeposito,
): ResultadoLiquidacao {
  const buyer = s.users[reivindicada.userEmail]
  if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

  buyer.balance += reivindicada.valor
  s.deposits.push({
    userEmail: reivindicada.userEmail,
    valor: reivindicada.valor,
    date: Date.now(),
  })
  return { sucesso: true, motivo: 'retirada_creditada_saldo' }
}

export const LIQUIDADORES: Record<TipoOperacaoPagamento, Liquidador> = {
  deposito: liquidarDeposito,
  compra_direta: liquidarCompraDireta,
  fatura_custodia: liquidarFaturaCustodia,
  plano_custodia: liquidarFaturaCustodia,
  assinatura_custodia: liquidarAssinaturaCustodia,
  retirada: liquidarRetirada,
}

/**
 * Confere um pagamento no gateway e despacha a liquidação pelo tipo de operação.
 *
 * A ORDEM DAS TRAVAS É A REGRA, NÃO O ESTILO
 * ------------------------------------------
 *  1. **O status vem do gateway, nunca do webhook.** O corpo da notificação diz
 *     apenas "algo aconteceu com o pagamento X"; quem afirma que ele foi
 *     aprovado é a consulta autenticada à API. Confiar no payload seria aceitar
 *     que qualquer pessoa com a URL do webhook se credite.
 *  2. **O valor é conferido contra a intenção.** Se o que o gateway cobrou não
 *     bate com o que a plataforma pediu, o depósito é recusado e o motivo fica
 *     gravado. Creditar o valor do gateway sem conferir permitiria pagar R$ 1,00
 *     numa cobrança de R$ 1.000,00 e receber os mil.
 *  3. **A intenção é reivindicada antes do crédito**, com um UPDATE que só
 *     encontra `pendente` uma vez. É o que impede duas entregas simultâneas do
 *     mesmo evento de creditarem duas vezes — a idempotência do evento protege
 *     o caso comum, esta trava protege o caso simultâneo.
 *  4. **Despachante por tipo de operação (Passo B1.4)**:
 *     - `deposito`: credita `u.balance` e registra em `deposits`.
 *     - `compra_direta`: transfere as moedas e credita vendedor líquido de taxa.
 *     - `fatura_custodia` / `plano_custodia` / `assinatura_custodia`: B2.
 *     - `retirada`: B3.
 *  5. **Separação contábil do gateway (Passo B1.3 / B1.4, F-5, RA-30, RA-32)**:
 *     Após a mutação de estado, grava o recebimento em `aurea.recebimentos_gateway`
 *     com valor bruto, taxa do gateway, valor líquido e competência contábil.
 *
 * Se o crédito falhar depois da reivindicação, a intenção volta para `pendente`:
 * caso contrário ela ficaria travada em `creditando` para sempre, e o cliente
 * teria pago sem receber.
 */
export async function conciliarPagamento(paymentId: string): Promise<ResultadoConciliacao> {
  const detalhes = await consultarPagamentoMercadoPago(paymentId)

  if (detalhes.status !== 'approved') {
    return { creditado: false, motivo: `pagamento com status "${detalhes.status}"` }
  }

  const ref = detalhes.externalReference
  if (!ref) {
    return { creditado: false, motivo: 'pagamento sem referência externa' }
  }

  const intencoes = repositorioIntencoes()
  const intencao = await intencoes.buscar(ref)
  if (!intencao) {
    return { creditado: false, motivo: `nenhuma intenção de depósito para ${ref}`, externalReference: ref }
  }

  if (intencao.valor !== detalhes.valorCents) {
    const motivo = `valor divergente: cobrado ${brl(detalhes.valorCents)}, esperado ${brl(intencao.valor)}`
    await intencoes.recusar(ref, motivo)
    return { creditado: false, motivo, externalReference: ref }
  }

  const reivindicada = await intencoes.reivindicar(ref)
  if (!reivindicada) {
    return {
      creditado: false,
      motivo: `intenção ${ref} já estava com status "${intencao.status}"`,
      externalReference: ref,
    }
  }

  const tipo: TipoOperacaoPagamento =
    reivindicada.tipoOperacao || (ref.startsWith('CMP-') ? 'compra_direta' : 'deposito')
  const liquidador = LIQUIDADORES[tipo] ?? liquidarDeposito

  let resLiquidacao: ResultadoLiquidacao = { sucesso: true, motivo: 'creditado' }

  try {
    await mutateState((s) => {
      resLiquidacao = liquidador(s, reivindicada, detalhes)
    })
  } catch (erro) {
    await intencoes.devolverParaPendente(ref)
    throw erro
  }

  // Gravação idempotente em aurea.recebimentos_gateway (Passo B1.3/B1.4, F-5, RA-30, RA-32).
  // Fica fora da transação do estado.
  try {
    const aprovadoEm = detalhes.dateApproved ?? Date.now()
    await gravarRecebimento({
      paymentId,
      externalReference: ref,
      tipoOperacao: tipo,
      userEmail: reivindicada.userEmail,
      metodo: detalhes.paymentMethodId || detalhes.paymentTypeId || 'desconhecido',
      parcelas: detalhes.parcelas || 1,
      valorBruto: detalhes.valorCents,
      valorPagoCliente: detalhes.totalPagoCents || detalhes.valorCents,
      tarifaGateway: detalhes.tarifaCents || 0,
      valorLiquido:
        detalhes.valorLiquidoCents || (detalhes.valorCents - (detalhes.tarifaCents || 0)),
      aprovadoEm,
      liberacaoPrevista: detalhes.dataLiberacao,
      competencia: competenciaAtual(aprovadoEm),
    })
  } catch (errRecebimento) {
    console.error('[conciliarPagamento] Erro ao gravar recebimento_gateway:', errRecebimento)
  }

  await intencoes.concluir(ref, paymentId)
  return {
    creditado: true,
    motivo: resLiquidacao.motivo,
    externalReference: ref,
    valorCents: reivindicada.valor,
    userEmail: reivindicada.userEmail,
    tipoOperacao: tipo,
    compraConcluida: resLiquidacao.compraConcluida,
  }
}

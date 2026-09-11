/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Aqui o dinheiro entra no saldo. É o passo 7 do fluxo do M5, e o único lugar
 * da plataforma em que um pagamento externo vira crédito interno.
 * ==========================================================================*/

import 'server-only'

import { tradeFee } from '@/domain/fees'
import { transferCoin } from '@/domain/market'
import { brl } from '@/domain/money'
import { consultarPagamentoMercadoPago } from '@/lib/payments'
import { mutateState } from '@/server/state'

import { repositorioIntencoes } from './repositorios'

export interface ResultadoConciliacao {
  creditado: boolean
  motivo: string
  externalReference?: string
  valorCents?: number
  userEmail?: string
  tipoOperacao?: 'deposito' | 'compra_direta'
  compraConcluida?: boolean
}

/**
 * Confere um pagamento no gateway e credita o saldo ou liquida a compra direta.
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
 *  4. **Distinção contábil**:
 *     - Depósito simples (`DEP-*`): credita `u.balance` e registra em `deposits`.
 *     - Compra direta (`CMP-*`): liquida o lote imediatamente transferindo a
 *       moeda para o comprador, creditando o vendedor líquido da comissão da
 *       Áurea e registrando a negociação no histórico/ledger. Se o anúncio tiver
 *       sido consumido por outro usuário durante o pagamento, o valor não é
 *       perdido e é creditado no saldo do comprador para uso livre ou saque.
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

  const ehCompraDireta =
    reivindicada.tipoOperacao === 'compra_direta' || ref.startsWith('CMP-')

  let compraConcluida = false

  try {
    await mutateState((s) => {
      const buyer = s.users[reivindicada.userEmail]
      // A conta some do estado quando o ambiente recomeça do seed. Sem esta
      // guarda, o crédito estouraria um TypeError no meio da transação.
      if (!buyer) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)

      if (!ehCompraDireta) {
        buyer.balance += reivindicada.valor
        s.deposits.push({
          userEmail: reivindicada.userEmail,
          valor: reivindicada.valor,
          date: Date.now(),
        })
        return
      }

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

          compraConcluida = true
        } else {
          // Transferência falhou em todas as moedas: credita integralmente ao comprador
          buyer.balance += reivindicada.valor
          s.deposits.push({
            userEmail: reivindicada.userEmail,
            valor: reivindicada.valor,
            date: Date.now(),
          })
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
      }
    })
  } catch (erro) {
    await intencoes.devolverParaPendente(ref)
    throw erro
  }

  await intencoes.concluir(ref, paymentId)
  return {
    creditado: true,
    motivo: ehCompraDireta
      ? compraConcluida
        ? 'compra_direta_concluida'
        : 'lote_indisponivel_creditado_em_saldo'
      : 'creditado',
    externalReference: ref,
    valorCents: reivindicada.valor,
    userEmail: reivindicada.userEmail,
    tipoOperacao: ehCompraDireta ? 'compra_direta' : 'deposito',
    compraConcluida: ehCompraDireta ? compraConcluida : undefined,
  }
}

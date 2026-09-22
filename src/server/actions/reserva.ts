'use server'

/**
 * Server Actions da compra pós-paga e do financiamento da oferta pré-paga.
 *
 * Contexto, porque o mecanismo é novo (22/09/2026): publicar oferta de compra
 * deixou de exigir saldo. Quem não tem dinheiro na conta escolhe entre pagar
 * antes (`prepago`) ou pagar depois que a oferta casar (`pospago`), e o
 * pós-pago tem prazo — dez minutos, senão a moeda volta ao mercado e a oferta
 * perde a vez. O desenho está inteiro em `src/domain/reserva-de-compra.ts`.
 *
 * A REGRA QUE ORGANIZA ESTE ARQUIVO
 * ---------------------------------
 * A moeda só troca de dono quando o dinheiro entrou. No pagamento por saldo
 * isso é imediato e acontece na mesma transação. No pagamento por Pix ou
 * cartão, quem conclui é a conciliação (`src/server/payments/conciliacao.ts`),
 * depois que o gateway confirma — aqui só se abre a cobrança.
 */

import { randomUUID } from 'node:crypto'

import { comissaoPorMoeda } from '@/domain/fees'
import { transferirMoedaVendida } from '@/domain/market'
import { brl } from '@/domain/money'
import {
  marcarReservaPaga,
  MENSAGEM_RESERVA_DE_OUTRO,
  reservasEmAberto,
  tempoRestante,
} from '@/domain/reserva-de-compra'
import type { ActionResult, Cents, ReservaDeCompra } from '@/domain/types'
import {
  criarCobrancaCartao,
  criarCobrancaPix,
  type CobrancaCartao,
  type CobrancaPix,
} from '@/lib/payments'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { repositorioIntencoes } from '@/server/payments/repositorios'
import { getSessionEmail } from '@/server/session'
import { getState, mutateState } from '@/server/state'

const SESSAO_EXPIRADA = 'Sessão expirada.'
const NAO_ENCONTRADA = 'Reserva não encontrada.'

export type FormaDePagamentoDaReserva = 'saldo' | 'pix' | 'cartao'

export interface ReservaNaTela extends ReservaDeCompra {
  /** Milissegundos que faltam para vencer, já calculados no servidor. */
  restanteMs: number
}

/** As reservas em aberto do usuário logado, com o relógio já resolvido. */
export async function listarMinhasReservas(): Promise<ActionResult<ReservaNaTela[]>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const agora = Date.now()
  const state = await getState()
  const lista = reservasEmAberto(state, session, agora)
    .map((r) => ({ ...r, restanteMs: tempoRestante(r, agora) }))
    .sort((a, b) => a.expiraEm - b.expiraEm)

  return { ok: true, data: lista }
}

/**
 * Quita a reserva debitando o saldo em conta e entrega a moeda.
 *
 * É o único caminho que fecha a compra numa transação só, porque o dinheiro já
 * está na plataforma. Tudo o que acontece aqui — débito, crédito do vendedor,
 * transferência da moeda, registro no histórico — é o mesmo que o motor de
 * casamento faria se a oferta fosse de saldo.
 */
export async function pagarReservaComSaldo(reservaId: string): Promise<ActionResult> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const { taxas } = await carregarRegrasDoMercado()

  try {
    const { result } = await mutateState<ActionResult>((s) => {
      const r = (s.reservas ?? []).find((x) => x.id === reservaId)
      if (!r) return { ok: false, error: NAO_ENCONTRADA }
      if (r.comprador !== session) return { ok: false, error: MENSAGEM_RESERVA_DE_OUTRO }

      const agora = Date.now()
      const podePagar = marcarReservaPaga(r, agora)
      if (!podePagar.ok) return { ok: false, error: podePagar.erro }

      const comprador = s.users[r.comprador]
      const vendedor = s.users[r.vendedor]
      if (!comprador || !vendedor) {
        r.status = 'aguardando_pagamento'
        return { ok: false, error: 'Uma das contas da negociação não existe mais.' }
      }

      if (comprador.balance < r.totalCents) {
        // Devolve a reserva ao estado anterior: recusar por saldo não é
        // motivo para queimar o prazo que ainda está correndo.
        r.status = 'aguardando_pagamento'
        return {
          ok: false,
          error: `Saldo insuficiente: a reserva custa ${brl(r.totalCents)} e você tem ${brl(comprador.balance)}.`,
        }
      }

      const moeda = transferirMoedaVendida(
        s,
        vendedor,
        comprador,
        r.vendedor,
        r.comprador,
        r.coinId,
        taxas,
        agora,
      )
      if (!moeda) {
        // A moeda saiu do acervo do vendedor durante os dez minutos. A reserva
        // é cancelada, e não expirada: quem falhou não foi o comprador.
        r.status = 'cancelada'
        return { ok: false, error: 'A moeda reservada não está mais disponível com o vendedor.' }
      }

      const { vendedor: feeVendedor } = comissaoPorMoeda(r.precoCents, taxas)
      comprador.balance -= r.totalCents
      vendedor.balance += r.precoCents - feeVendedor

      s.trades.push({
        price: r.precoCents,
        qty: 1,
        date: agora,
        buyer: r.comprador,
        seller: r.vendedor,
        feeComprador: r.comissaoCompradorCents,
        feeVendedor,
        fee: r.comissaoCompradorCents + feeVendedor,
        tipoMoeda: r.tipoMoeda,
      })

      // A unidade só é consumida agora: no casamento o bid não foi decrementado
      // justamente porque a compra ainda podia não acontecer.
      const bo = s.buyOrders.find((b) => b.id === r.bidId)
      if (bo) {
        bo.qty -= 1
        if (bo.qty <= 0) s.buyOrders = s.buyOrders.filter((b) => b.id !== bo.id)
      }

      return { ok: true, message: `Compra concluída: 1 ${r.tipoMoeda} por ${brl(r.totalCents)}.` }
    })

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao pagar a reserva.'
    return { ok: false, error: msg }
  }
}

export type CobrancaDaReserva =
  | (CobrancaPix & { forma: 'pix' })
  | (CobrancaCartao & { forma: 'cartao' })

/**
 * Abre a cobrança da reserva no gateway (Pix ou cartão).
 *
 * Quem entrega a moeda é a conciliação, depois da confirmação — por isso aqui
 * a reserva continua `aguardando_pagamento`.
 *
 * O PRAZO CONTINUA CORRENDO ENQUANTO A COBRANÇA É PAGA, e isso é deliberado:
 * parar o relógio ao abrir um Pix permitiria segurar a moeda de graça só
 * gerando cobrança e não pagando. A conciliação confere o prazo de novo quando
 * o dinheiro chega; se tiver vencido, o pagamento é devolvido ao saldo do
 * comprador em vez de entregar a moeda.
 */
export async function iniciarPagamentoReserva(
  reservaId: string,
  forma: 'pix' | 'cartao',
): Promise<ActionResult<CobrancaDaReserva>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }
  if (forma !== 'pix' && forma !== 'cartao') {
    return { ok: false, error: 'Forma de pagamento desconhecida.' }
  }

  const agora = Date.now()
  const state = await getState()
  const r = (state.reservas ?? []).find((x) => x.id === reservaId)
  if (!r) return { ok: false, error: NAO_ENCONTRADA }
  if (r.comprador !== session) return { ok: false, error: MENSAGEM_RESERVA_DE_OUTRO }
  if (r.status !== 'aguardando_pagamento' || r.expiraEm <= agora) {
    return { ok: false, error: 'Esta reserva não está mais aberta para pagamento.' }
  }

  const externalReference = `RSV-${randomUUID()}`
  const intencoes = repositorioIntencoes()
  await intencoes.criar({
    externalReference,
    userEmail: session,
    valor: r.totalCents,
    metodo: forma === 'pix' ? 'pix' : 'checkout_pro',
    status: 'pendente',
    tipoOperacao: 'reserva_compra',
    metadata: { reservaId: r.id },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  await mutateState((s) => {
    const alvo = (s.reservas ?? []).find((x) => x.id === reservaId)
    if (alvo) alvo.paymentIntentRef = externalReference
    return null
  })

  const titulo = `Compra de 1 ${r.tipoMoeda} — Real Olímpico`
  const descricao = `Reserva ${r.id} · ${brl(r.precoCents)} + comissão de ${brl(r.comissaoCompradorCents)}`

  try {
    if (forma === 'pix') {
      const pix = await criarCobrancaPix({
        externalReference,
        userEmail: session,
        valorCents: r.totalCents,
        titulo,
        descricao,
        parcelasMax: 1,
      })
      await intencoes.anotarPagamento(externalReference, pix.paymentId)
      return { ok: true, data: { ...pix, forma: 'pix' } }
    }

    const cartao = await criarCobrancaCartao({
      externalReference,
      userEmail: session,
      valorCents: r.totalCents,
      titulo,
      descricao,
      parcelasMax: 1,
      voltarPara: { sucesso: '/compras', pendente: '/compras', falha: '/compras' },
    })
    return { ok: true, data: { ...cartao, forma: 'cartao' } }
  } catch (err) {
    await intencoes.recusar(externalReference, 'falha ao abrir a cobrança da reserva')
    const msg = err instanceof Error ? err.message : 'Falha ao abrir a cobrança.'
    return { ok: false, error: msg }
  }
}

/**
 * Abre a cobrança que banca uma oferta de compra PRÉ-PAGA.
 *
 * A oferta pré-paga nasce com `pagoAntecipadoCents: 0` e, por isso, não casa
 * com nada: `fundosDoBid` devolve zero e o motor a pula. Ela entra no mercado
 * de verdade quando a conciliação credita o valor confirmado.
 *
 * O valor é o custo cheio — preço mais comissão de compra — vezes a quantidade
 * ainda aberta. É o mesmo cálculo que decidiria se o saldo dá, na modalidade
 * de saldo (`custoDeCompraPorMoeda`).
 */
export async function financiarOfertaPrepaga(
  bidId: string,
  forma: 'pix' | 'cartao',
): Promise<ActionResult<CobrancaDaReserva>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }
  if (forma !== 'pix' && forma !== 'cartao') {
    return { ok: false, error: 'Forma de pagamento desconhecida.' }
  }

  const { taxas } = await carregarRegrasDoMercado()
  const state = await getState()
  const bo = state.buyOrders.find((b) => b.id === bidId)
  if (!bo) return { ok: false, error: 'Oferta de compra não encontrada.' }
  if (bo.buyer !== session) return { ok: false, error: 'Esta oferta pertence a outro usuário.' }
  if ((bo.modalidade ?? 'saldo') !== 'prepago') {
    return { ok: false, error: 'Esta oferta não é pré-paga.' }
  }

  const { comprador: fee } = comissaoPorMoeda(bo.price, taxas)
  const unitario: Cents = bo.price + fee
  const jaPago = bo.pagoAntecipadoCents ?? 0
  const falta = unitario * bo.qty - jaPago
  if (falta <= 0) return { ok: false, error: 'Esta oferta já está totalmente paga.' }

  const externalReference = `PRE-${randomUUID()}`
  const agora = Date.now()
  const intencoes = repositorioIntencoes()
  await intencoes.criar({
    externalReference,
    userEmail: session,
    valor: falta,
    metodo: forma === 'pix' ? 'pix' : 'checkout_pro',
    status: 'pendente',
    tipoOperacao: 'oferta_prepaga',
    metadata: { bidId: bo.id },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  const titulo = `Oferta de compra de ${bo.qty} ${bo.tipoMoeda} — Real Olímpico`
  const descricao = `Pagamento antecipado · ${brl(bo.price)} por moeda + comissão de ${brl(fee)}`

  try {
    if (forma === 'pix') {
      const pix = await criarCobrancaPix({
        externalReference,
        userEmail: session,
        valorCents: falta,
        titulo,
        descricao,
        parcelasMax: 1,
      })
      await intencoes.anotarPagamento(externalReference, pix.paymentId)
      return { ok: true, data: { ...pix, forma: 'pix' } }
    }

    const cartao = await criarCobrancaCartao({
      externalReference,
      userEmail: session,
      valorCents: falta,
      titulo,
      descricao,
      parcelasMax: 1,
      voltarPara: { sucesso: '/compras', pendente: '/compras', falha: '/compras' },
    })
    return { ok: true, data: { ...cartao, forma: 'cartao' } }
  } catch (err) {
    await intencoes.recusar(externalReference, 'falha ao abrir a cobrança da oferta pré-paga')
    const msg = err instanceof Error ? err.message : 'Falha ao abrir a cobrança.'
    return { ok: false, error: msg }
  }
}

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

import { temCadastroCompleto } from '@/domain/cadastro'
import { novoBidId } from '@/domain/codes'
import { isNegociavel } from '@/domain/constants'
import { comissaoPorMoeda, custoDeCompraPorMoeda } from '@/domain/fees'
import { matchOrders, transferirMoedaVendida } from '@/domain/market'
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

  // Mesmo cuidado de `iniciarOfertaPrePaga`: falha ao gravar a intenção é erro
  // desta etapa, não do gateway, e o texto precisa dizer isso. Aqui o motivo é
  // mais grave do que lá — o relógio da reserva está correndo.
  try {
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
  } catch (err) {
    console.error('[iniciarPagamentoReserva] falha ao gravar a intenção de pagamento:', err)
    return {
      ok: false,
      error: 'Não foi possível registrar a cobrança desta reserva. Nada foi cobrado — avise o suporte.',
    }
  }

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
 * Abre a cobrança que PUBLICA uma oferta de compra pré-paga.
 *
 * A ORDEM NÃO EXISTE AINDA, E É ESSE O PONTO (28/09/2026)
 * -------------------------------------------------------
 * Até 27/09 a oferta pré-paga era gravada no livro com `pagoAntecipadoCents: 0`
 * e esta função só a financiava depois. O motor não a casava — `fundosDoBid`
 * devolve zero —, mas ela APARECIA publicada, para o dono e para todo mundo,
 * antes de qualquer pagamento. Era a queixa do Gabriel: "o sistema já publicou
 * antes de eu pagar; só pode publicar após eu pagar".
 *
 * Agora a intenção de pagamento carrega a oferta INTEIRA (quantidade, preço,
 * tipo) na metadata, e quem cria a linha no livro é o liquidador da
 * conciliação, quando o gateway confirma o valor. Enquanto o pagamento não
 * entra, não existe oferta nenhuma para ninguém ver.
 *
 * O valor é o custo cheio — preço mais taxa de compra — vezes a quantidade. É o
 * mesmo cálculo que decidiria se o saldo dá, na modalidade de saldo
 * (`custoDeCompraPorMoeda`).
 */
export async function iniciarOfertaPrePaga(
  qtyPedida: number,
  precoUnit: Cents,
  tipoMoeda: string,
  forma: 'pix' | 'cartao',
): Promise<ActionResult<CobrancaDaReserva>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }
  if (forma !== 'pix' && forma !== 'cartao') {
    return { ok: false, error: 'Forma de pagamento desconhecida.' }
  }

  // TODA NEGOCIAÇÃO EXIGE CADASTRO COMPLETO (28/09/2026, decisão do Gabriel).
  // Esta é a porta de entrada da oferta pré-paga: abrir a cobrança antes de
  // checar o cadastro cobraria o cliente por uma oferta que nunca vai poder
  // ser publicada.
  const estadoAtual = await getState()
  const solicitante = estadoAtual.users[session]
  if (!solicitante) return { ok: false, error: SESSAO_EXPIRADA }
  if (!temCadastroCompleto(solicitante)) {
    return {
      ok: false,
      error: 'Complete seu cadastro formal em Minha conta antes de publicar uma oferta de compra.',
    }
  }

  const qty = Math.floor(Number(qtyPedida))
  const preco = Math.floor(Number(precoUnit))
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(preco) || preco <= 0) {
    return { ok: false, error: 'Informe quantidade e preço unitário válidos.' }
  }

  const { taxas, catalogo } = await carregarRegrasDoMercado()
  if (!isNegociavel(tipoMoeda, catalogo)) {
    return { ok: false, error: 'Este tipo de moeda não é negociável no mercado.' }
  }

  const total = custoDeCompraPorMoeda(preco, taxas) * qty
  const { comprador: fee } = comissaoPorMoeda(preco, taxas)

  const externalReference = `PRE-${randomUUID()}`
  const agora = Date.now()
  const intencoes = repositorioIntencoes()

  /*
   * GRAVAR A INTENÇÃO É UM PASSO QUE PODE FALHAR SOZINHO, E PRECISA DIZER ISSO.
   *
   * Ficava fora do try: qualquer falha aqui subia como exceção crua, a tela a
   * tratava no catch genérico e dizia "erro de comunicação com o gateway" —
   * mesmo sem o gateway ter sido chamado. Foi o que escondeu, de 22 a 28/09,
   * uma constraint de banco desatualizada (migration 038): o tipo
   * 'oferta_prepaga' existia no código e não existia no CHECK da tabela.
   */
  try {
    await intencoes.criar({
      externalReference,
      userEmail: session,
      valor: total,
      metodo: forma === 'pix' ? 'pix' : 'checkout_pro',
      status: 'pendente',
      tipoOperacao: 'oferta_prepaga',
      // A oferta inteira viaja aqui: é com isto que o liquidador a cria.
      metadata: { qty, price: preco, tipoMoeda },
      paymentId: null,
      motivoRecusa: null,
      createdAt: agora,
      updatedAt: agora,
    })
  } catch (err) {
    console.error('[iniciarOfertaPrePaga] falha ao gravar a intenção de pagamento:', err)
    return {
      ok: false,
      error: 'Não foi possível registrar a cobrança desta oferta. Nada foi cobrado — avise o suporte.',
    }
  }

  const titulo = `Oferta de compra de ${qty} ${tipoMoeda} — Real Olímpico`
  const descricao = `Pagamento antecipado · ${brl(preco)} por moeda + taxa de ${brl(fee)}`

  try {
    if (forma === 'pix') {
      const pix = await criarCobrancaPix({
        externalReference,
        userEmail: session,
        valorCents: total,
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
      valorCents: total,
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

/**
 * Publica a oferta pré-paga PAGANDO COM O SALDO em conta, numa transação só.
 *
 * É a opção "Comprar com saldo" do mesmo pop-up da compra direta. Aqui o
 * dinheiro já está na plataforma, então não há webhook a esperar: debita, cria
 * a oferta já bancada e casa as ordens na mesma transação.
 *
 * O dinheiro fica PRESO à oferta, em `pagoAntecipadoCents`, e não volta para o
 * saldo. Deixá-lo no caixa permitiria gastá-lo em outra compra, e a oferta
 * ficaria anunciada sem lastro — exatamente o que a modalidade pré-paga existe
 * para evitar.
 */
export async function publicarOfertaPrePagaComSaldo(
  qtyPedida: number,
  precoUnit: Cents,
  tipoMoeda: string,
): Promise<ActionResult<{ bidId: string; pagoCents: Cents }>> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  const qty = Math.floor(Number(qtyPedida))
  const preco = Math.floor(Number(precoUnit))
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(preco) || preco <= 0) {
    return { ok: false, error: 'Informe quantidade e preço unitário válidos.' }
  }

  const { taxas, catalogo } = await carregarRegrasDoMercado()
  if (!isNegociavel(tipoMoeda, catalogo)) {
    return { ok: false, error: 'Este tipo de moeda não é negociável no mercado.' }
  }

  const total = custoDeCompraPorMoeda(preco, taxas) * qty

  try {
    const { result } = await mutateState<ActionResult<{ bidId: string; pagoCents: Cents }>>((s) => {
      const u = s.users[session]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      if (!temCadastroCompleto(u)) {
        return {
          ok: false,
          error: 'Complete seu cadastro formal em Minha conta antes de publicar uma oferta de compra.',
        }
      }

      if (u.balance < total) {
        return {
          ok: false,
          error: `Saldo insuficiente para comprar esta quantidade (faltam ${brl(total - u.balance)}).`,
        }
      }

      const agora = Date.now()
      u.balance -= total

      const bidId = novoBidId()
      s.buyOrders.push({
        id: bidId,
        buyer: session,
        price: preco,
        qty,
        createdAt: agora,
        // A prioridade na fila conta do PAGAMENTO, que é quando a oferta passa
        // a existir. Não há como uma oferta não paga guardar lugar na fila.
        prioridadeEm: agora,
        tipoMoeda,
        modalidade: 'prepago',
        pagoAntecipadoCents: total,
      })

      matchOrders(s, taxas)

      return {
        ok: true,
        message: `Oferta publicada: ${qty} ${tipoMoeda} a ${brl(preco)} cada, bancada com ${brl(total)} do seu saldo.`,
        data: { bidId, pagoCents: total },
      }
    })

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao publicar a oferta pré-paga.'
    return { ok: false, error: msg }
  }
}

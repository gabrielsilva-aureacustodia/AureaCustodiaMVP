'use server'

/**
 * Ações de mercado — o livro de ordens da Áurea Custódia.
 *
 * Port de aurea-mvp-teste.html: execLotBuy (1410-1435), cancelBuyOrder
 * (1437-1443), saveEditBid (1465-1480) e publishBuyOrder (1711-1728).
 *
 * POR QUE ISTO SAIU DO NAVEGADOR
 * ------------------------------
 * No monolito estas quatro funções eram JavaScript da página: liam a global
 * `state`, conferiam saldo, mexiam em saldo alheio e gravavam. Quem abrisse o
 * console comprava de graça — bastava reescrever `buyer.balance`. Aqui a regra
 * roda no servidor, dentro de mutateState(), e o cliente só manda três coisas:
 * qual lote/oferta, quantas moedas e por quanto. Tudo o mais — se a oferta
 * existe, de quem ela é, quanto o comprador tem em caixa — é relido do estado
 * do servidor e conferido de novo, mesmo que a tela já tenha conferido antes.
 *
 * O QUE CONTINUA IGUAL
 * --------------------
 * A aritmética, a ordem das conferências e o TEXTO de cada aviso. As mensagens
 * abaixo são cópia literal dos toasts do original — o port se prova mostrando
 * as mesmas palavras nas mesmas situações.
 *
 * ARQUIVO COMPARTILHADO: as ações do lado da VENDA (publishOffer, cancelLot,
 * editLot, sellToBid) entram neste mesmo arquivo, em seguida. Por isso tudo o
 * que é comum — `executar()`, as mensagens, o gerador de id — está no topo,
 * isolado e sem nenhuma amarra com as ações de compra.
 */

import { isNegociavel } from '@/domain/constants'
import { tradeFee } from '@/domain/fees'
import { matchOrders, transferCoin } from '@/domain/market'
import { brl } from '@/domain/money'
import type { ActionResult, AppState, Cents, UserEmail } from '@/domain/types'
import { getSessionEmail } from '@/server/session'
import { mutateState } from '@/server/state'

/* ---------- mensagens (texto exato do monolito, salvo onde anotado) ---------- */

/** Sem sessão válida. Formato exigido pelo contrato da camada de servidor. */
const SESSAO_EXPIRADA = 'Sessão expirada.'

/**
 * Mensagem do saveState do MVP (linha 915). getState/mutateState PROPAGAM
 * exceção; sem este texto o usuário veria um erro 500 genérico do Next no lugar
 * do aviso do produto.
 */
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

/** Linha 1414: o lote sumiu entre a abertura da tela e a confirmação. */
const ANUNCIO_INDISPONIVEL = 'Este anúncio não está mais disponível.'

/** Linha 1470: o bid sumiu entre abrir a modal de edição e salvar. */
const OFERTA_INDISPONIVEL = 'Esta oferta não está mais disponível.'

/** Linha 1419. */
const SALDO_INSUFICIENTE_QTD = 'Saldo insuficiente para esta quantidade.'

/** Linha 1714. */
const BID_INVALIDO_PUBLICAR = 'Informe quantidade e preço unitário válidos.'

/** Linha 1466 — texto diferente do de publicação, e é assim mesmo no original. */
const BID_INVALIDO_EDITAR = 'Informe quantidade e preço válidos.'

/** Linha 1718. */
const SALDO_INSUFICIENTE_OFERTAR = 'Saldo insuficiente para ofertar esse preço.'

/**
 * ACRÉSCIMO DO MERCADO MULTI-ATIVO. O seletor da tela só lista tipos
 * negociáveis, mas a server action é um endpoint HTTP: sem esta recusa, um bid
 * de "Mascote Vinicius" entraria no livro e ficaria preso lá para sempre, sem
 * nunca encontrar oferta de venda.
 */
const TIPO_NAO_NEGOCIAVEL = 'Este tipo de moeda ainda não está disponível para negociação.'

/** Linha 1473. */
const SALDO_INSUFICIENTE_PRECO = 'Saldo insuficiente para esse preço.'

/**
 * ACRÉSCIMO DESTE PORT — não existe texto equivalente no monolito.
 *
 * Lá a proteção era só visual: o cartão do próprio anúncio não desenhava o
 * botão "Comprar" (linha 1269). Nada impedia a chamada direta de
 * execLotBuy('LOT-...') pelo console, e ela executava — o vendedor comprava de
 * si mesmo, pagava a comissão e inflava o histórico de negociações com volume
 * que não existiu. O motor de casamento já barrava isso do lado dele
 * (`s.seller !== bo.buyer`, domain/market.ts); a compra direta de lote era a
 * porta que ficou aberta.
 */
const COMPRA_DO_PROPRIO_ANUNCIO = 'Você não pode comprar do seu próprio anúncio.'

/* ---------- infraestrutura comum a todas as ações de mercado ---------- */

/**
 * Molde de toda ação deste arquivo: confere a sessão, roda a regra dentro de
 * mutateState() e traduz falha de gravação na mensagem do produto.
 *
 * A regra recebe o estado do SERVIDOR — nunca um objeto vindo do cliente — e
 * devolve o ActionResult pronto, com a mensagem que a tela vai mostrar. Mutar o
 * estado no lugar é o esperado: é o mesmo gesto das funções do MVP sobre a
 * global `state`, e a gravação acontece quando a função retorna.
 *
 * Recusa (ok:false) também passa pela gravação, porque mutateState escreve o
 * estado que recebeu de volta. É inofensivo: nesse caminho nada foi alterado, e
 * o que vai para o banco é byte a byte o que de lá veio.
 */
async function executar(
  regra: (state: AppState, session: UserEmail) => ActionResult,
): Promise<ActionResult> {
  const session = await getSessionEmail()
  if (!session) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState<ActionResult>((state) => regra(state, session))
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/**
 * Quantidade vinda do cliente, saneada. Qualquer coisa que não seja número
 * finito vira 0 — e 0 é reprovado por quem chama. O cliente manda number, mas
 * uma server action é um endpoint HTTP: NaN e Infinity chegam se alguém quiser
 * mandar.
 */
function inteiroSeguro(v: number): number {
  return Number.isFinite(v) ? Math.floor(v) : 0
}

/** Id de oferta de compra, no formato da linha 1720 do monolito. */
function novoBidId(): string {
  return 'BID-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}

/* ===========================================================================
 * COMPRA (tela 1.1)
 * =========================================================================*/

/**
 * Compra N moedas de um lote anunciado — o "Confirmar compra" da vitrine.
 *
 * Port de execLotBuy (1410-1435). As três conferências que o original fazia no
 * navegador continuam aqui, agora contra o estado do servidor:
 *
 *   1. o lote ainda existe (ninguém comprou antes de você nos últimos 10s);
 *   2. a quantidade não passa do que sobrou no lote;
 *   3. o saldo cobre o total.
 *
 * E uma quarta, nova, explicada em COMPRA_DO_PROPRIO_ANUNCIO.
 *
 * NÃO chama matchOrders: comprar direto de um lote é execução imediata contra
 * uma oferta escolhida a dedo, fora do livro. O original também não chamava.
 */
export async function buyLot(lotId: string, qtyPedida: number): Promise<ActionResult> {
  return executar((state, session) => {
    // Ordem natural do array, como na linha 1413 — as ofertas de um lote têm
    // todas o mesmo preço e o mesmo vendedor, então qual vem primeiro só decide
    // QUAIS moedas saem, não por quanto.
    const offers = state.sellOffers.filter((o) => o.lotId === lotId)
    if (!offers.length) return { ok: false, error: ANUNCIO_INDISPONIVEL }

    const price = offers[0].price
    const sellerId = offers[0].seller
    // Todas as ofertas de um lote compartilham tipo, preço e vendedor — o tipo
    // é gravado na publicação e nunca é reescrito.
    const tipoMoeda = offers[0].tipoMoeda

    if (sellerId === session) return { ok: false, error: COMPRA_DO_PROPRIO_ANUNCIO }

    const buyer = state.users[session]
    const seller = state.users[sellerId]
    // Vendedor que saiu do estado (banco recriado, conta removida): sem os dois
    // lados não há para onde mover moeda nem dinheiro. O anúncio é órfão.
    if (!buyer || !seller) return { ok: false, error: ANUNCIO_INDISPONIVEL }

    // Mesmo teto da linha 1416: o pedido nunca passa do que resta no lote.
    const qty = Math.min(Math.max(inteiroSeguro(qtyPedida), 1), offers.length)
    if (buyer.balance < price * qty) return { ok: false, error: SALDO_INSUFICIENTE_QTD }

    /*
     * A TRANSFERÊNCIA VEM ANTES DO DINHEIRO.
     *
     * Divergência deliberada do MVP (linha 1426), autorizada pelos sócios — a
     * mesma correção que o motor de casamento já recebeu em domain/market.ts.
     * Lá o original debitava, creditava, gravava a negociação e SÓ ENTÃO chamava
     * transferCoin, ignorando o retorno: uma oferta apontando para moeda que já
     * não estava com o vendedor movia dinheiro sem mover moeda, e o histórico
     * registrava uma negociação que não aconteceu.
     *
     * Aqui a compra é de LOTE, então o resultado é por unidade: cada oferta
     * órfã é descartada individualmente, sem contaminar as boas do mesmo lote.
     * Órfã ou não, toda oferta tocada sai do livro — é o que impede a moeda
     * fantasma de continuar anunciada para o próximo comprador.
     */
    const toBuy = offers.slice(0, qty)
    const idsConsumidos = new Set<string>()
    let compradas = 0

    for (const o of toBuy) {
      idsConsumidos.add(o.id)
      // A comissão é por MOEDA, não por negociação — por isso é recalculada a
      // cada unidade, dentro do laço, exatamente como na linha 1423.
      const fee = tradeFee(price)
      if (!transferCoin(seller, buyer, o.coinId)) continue
      buyer.balance -= price // o comprador paga o preço cheio
      seller.balance += price - fee // a comissão sai do lado do vendedor
      compradas += 1
    }

    state.sellOffers = state.sellOffers.filter((o) => !idsConsumidos.has(o.id))

    // Lote inteiro órfão: nenhum saldo mexido, nenhuma linha no histórico. O
    // livro já ficou limpo das ofertas mortas, então a próxima tentativa nem
    // chega aqui — encontra o anúncio inexistente e para antes.
    if (compradas === 0) return { ok: false, error: ANUNCIO_INDISPONIVEL }

    const total = price * compradas

    // Uma linha no histórico para a compra inteira, com qty = N — e não N linhas
    // de uma moeda. É o que a tela de gráficos e a média de 7 dias esperam.
    state.trades.push({
      price,
      qty: compradas,
      date: Date.now(),
      buyer: session,
      seller: sellerId,
      tipoMoeda,
    })

    return {
      ok: true,
      message: `Compra concluída: ${compradas} ${tipoMoeda} por ${brl(total)}.`,
    }
  })
}

/**
 * Publica uma oferta de compra (bid) e roda o livro em seguida.
 *
 * Port de publishBuyOrder (1711-1728). Dois pontos que parecem detalhe e não
 * são:
 *
 *  - a quantidade é REDUZIDA ao que o saldo aguenta em vez de recusada, e o
 *    aviso conta isso ao usuário. Publicar um bid de 10 com dinheiro para 3
 *    deixaria 7 execuções fadadas a falhar no motor.
 *  - matchOrders roda logo depois, então uma oferta de venda igual ou mais
 *    barata já publicada é comprada na hora — é a promessa escrita na .note da
 *    tela ("a compra acontece automaticamente ao publicar").
 *
 * O preço chega em centavos: quem digita é a tela, e parsePrice() (domain/money)
 * é quem converte. O servidor só aceita inteiro positivo.
 */
export async function publishBid(
  qtyPedida: number,
  precoUnit: Cents,
  tipoMoeda: string,
): Promise<ActionResult> {
  return executar((state, session) => {
    const qtyRaw = inteiroSeguro(qtyPedida)
    const cents = inteiroSeguro(precoUnit)
    if (qtyRaw <= 0 || cents <= 0) return { ok: false, error: BID_INVALIDO_PUBLICAR }
    if (!isNegociavel(tipoMoeda)) return { ok: false, error: TIPO_NAO_NEGOCIAVEL }

    const u = state.users[session]
    if (!u) return { ok: false, error: SESSAO_EXPIRADA }

    // Divisão inteira: quantas unidades cabem no caixa a esse preço-limite.
    const maxAfford = Math.floor(u.balance / cents)
    if (maxAfford <= 0) return { ok: false, error: SALDO_INSUFICIENTE_OFERTAR }

    const qty = Math.min(qtyRaw, maxAfford)
    state.buyOrders.push({
      id: novoBidId(),
      buyer: session,
      price: cents,
      qty,
      createdAt: Date.now(),
      tipoMoeda,
    })

    const { matched } = matchOrders(state)

    // Montagem incremental da mensagem, na mesma ordem das linhas 1724-1726.
    let msg = `Oferta de compra publicada: ${qty} ${tipoMoeda} a ${brl(cents)} cada.`
    if (qty < qtyRaw) msg += ' (ajustada ao seu saldo disponível)'
    if (matched) msg += ' Parte já foi executada automaticamente com ofertas de venda existentes.'
    return { ok: true, message: msg }
  })
}

/**
 * Retira uma oferta de compra do livro.
 *
 * Port de cancelBuyOrder (1437-1443), com UM acréscimo: a conferência de dono.
 * O original filtrava só pelo id — `state.buyOrders.filter(b=>b.id!==id)` —, de
 * modo que qualquer conta conseguia derrubar o bid de qualquer outra chamando a
 * função com o id alheio, que a própria tela exibia. O botão "Cancelar" só
 * aparecia no bid do dono, e era essa a única barreira.
 *
 * Bid de terceiro e bid inexistente devolvem a MESMA recusa, de propósito: não
 * há por que confirmar a quem tentou que a oferta existe.
 */
export async function cancelBid(bidId: string): Promise<ActionResult> {
  return executar((state, session) => {
    const bo = state.buyOrders.find((b) => b.id === bidId)
    if (!bo || bo.buyer !== session) return { ok: false, error: OFERTA_INDISPONIVEL }

    state.buyOrders = state.buyOrders.filter((b) => b.id !== bidId)
    return { ok: true, message: 'Oferta de compra removida.' }
  })
}

/**
 * Altera preço e quantidade de uma oferta de compra já publicada.
 *
 * Port de saveEditBid (1465-1480), na mesma ordem de conferências: dados
 * válidos, oferta existe, saldo cobre ao menos uma unidade no preço novo. A
 * quantidade é reduzida ao que o caixa aguenta, como na publicação.
 *
 * A conferência de dono é acréscimo deste port, pelo mesmo motivo de cancelBid:
 * o original localizava o bid só pelo id.
 *
 * matchOrders roda depois porque subir o preço-limite pode casar na hora com
 * uma oferta de venda que antes estava cara demais — daí a segunda metade do
 * aviso.
 */
export async function editBid(
  bidId: string,
  qtyPedida: number,
  precoUnit: Cents,
): Promise<ActionResult> {
  return executar((state, session) => {
    const qtyRaw = inteiroSeguro(qtyPedida)
    const cents = inteiroSeguro(precoUnit)
    if (cents <= 0 || qtyRaw <= 0) return { ok: false, error: BID_INVALIDO_EDITAR }

    const bo = state.buyOrders.find((b) => b.id === bidId)
    if (!bo || bo.buyer !== session) return { ok: false, error: OFERTA_INDISPONIVEL }

    const u = state.users[session]
    if (!u) return { ok: false, error: SESSAO_EXPIRADA }

    const maxAfford = Math.floor(u.balance / cents)
    if (maxAfford <= 0) return { ok: false, error: SALDO_INSUFICIENTE_PRECO }

    // `bo.tipoMoeda` NÃO é editável: trocar o ativo de uma ordem já publicada
    // preservaria a posição dela na fila de um livro em que ela nunca esteve,
    // furando a prioridade de quem chegou antes naquele mercado. Para comprar
    // outro tipo, cancela-se este bid e publica-se outro.
    bo.price = cents
    bo.qty = Math.min(qtyRaw, maxAfford)

    const { matched } = matchOrders(state)
    return {
      ok: true,
      message:
        'Oferta de compra atualizada.' +
        (matched ? ' Parte foi executada automaticamente com o novo preço.' : ''),
    }
  })
}

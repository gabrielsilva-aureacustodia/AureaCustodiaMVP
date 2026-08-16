'use server'

/**
 * Ações de VENDA — port de aurea-mvp-teste.html, publishOffer (1634-1652),
 * cancelLot (1653-1659), saveEditLot (1691-1708) e execSellToBid (1764-1792).
 *
 * O QUE MUDOU DE LUGAR, E POR QUÊ IMPORTA
 * ---------------------------------------
 * No monolito estas quatro funções rodavam no navegador: liam a global `state`,
 * mexiam nela e gravavam. Quem abrisse o console podia publicar uma oferta de
 * uma moeda que não era sua, remover o anúncio de outra conta ou vender por um
 * preço que o comprador nunca aceitou — bastava chamar a função com outros
 * argumentos. Aqui o cliente manda apenas INTENÇÃO (quais ids, qual preço,
 * quantas unidades) e TODA a conferência acontece contra o estado do servidor,
 * dentro de mutateState(), que é onde o banco está travado.
 *
 * O padrão de cada ação é sempre o mesmo:
 *   1. sessão válida?           -> 'Sessão expirada.'
 *   2. mutateState(): revalida contra o estado REAL e aplica a regra
 *   3. try/catch devolvendo a mensagem de falha de gravação do MVP
 *
 * DIVERGÊNCIAS DELIBERADAS (registradas em "issues" para decisão dos sócios):
 *  - cancelLot e editLot passam a exigir que o lote seja DO VENDEDOR logado. O
 *    original filtrava só por lotId, então qualquer conta conseguia remover ou
 *    reprecificar o anúncio de qualquer outra. Isso é exatamente o tipo de coisa
 *    que o cliente não pode decidir, e é a razão de a regra ter vindo para cá.
 *  - sellToBid recusa vender para a própria oferta de compra. O motor de
 *    casamento (domain/market.ts) já bloqueia isso com `s.seller !== bo.buyer`;
 *    pela porta da venda direta o original deixava passar, e o efeito seria
 *    queimar a comissão contra si mesmo e sujar o histórico de preços com uma
 *    negociação que não moveu moeda nenhuma.
 */

import { tradeFee } from '@/domain/fees'
import { availableCoinsForSell, matchOrders, transferCoin } from '@/domain/market'
import { brl } from '@/domain/money'
import type { ActionResult, AppState, Cents, SellOffer } from '@/domain/types'
import { getSessionEmail } from '@/server/session'
import { mutateState } from '@/server/state'

/** Cookie ausente ou assinatura inválida. Texto fixado pelo contrato da camada. */
const SESSAO_EXPIRADA = 'Sessão expirada.'

/**
 * Mensagem do saveState do MVP (linha 915). getState/mutateState PROPAGAM
 * exceção; sem este catch o usuário veria um 500 genérico do Next no lugar da
 * mensagem do produto.
 */
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

/**
 * Recusa comum a "o lote sumiu" e "a oferta de compra sumiu". São os textos
 * exatos das linhas 1696 e 1769 do monolito.
 */
const LOTE_SUMIU = 'Este anúncio não está mais disponível.'
const BID_SUMIU = 'Esta oferta de compra não está mais disponível.'

/** Tamanho máximo da observação — o `maxlength="140"` do textarea (linha 1560). */
const OBS_MAX = 140

/**
 * Sufixos de identificador do original (linhas 1642, 1644 e 1720). O `slice`
 * tem tamanhos diferentes entre lote (4) e oferta (5) — está assim no MVP e é
 * preservado, porque ids gravados no banco de teste já seguem esse formato.
 */
function novoLotId(): string {
  return 'LOT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
}
function novoOfferId(): string {
  return 'OF-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
}

/* ------------------------------------------------------------------------- */
/* 1.2 — publicar anúncio de venda                                            */
/* ------------------------------------------------------------------------- */

/**
 * Publica um lote de venda e roda o casamento de ordens em seguida — parte do
 * lote pode ser vendida na hora para bids que já estavam no livro, e é por isso
 * que a mensagem tem duas metades.
 *
 * `data.limparSelecao` existe porque o original, nos DOIS desfechos que a tela
 * enxerga (publicou / as moedas sumiram), zerava `selectedCoins` antes de
 * redesenhar. Falha de sessão ou de gravação não zerava nada: a seleção
 * continua válida e a pessoa pode tentar de novo.
 */
export async function publishOffer(
  coinIds: string[],
  priceCents: Cents,
  obs: string,
): Promise<ActionResult<{ limparSelecao: boolean }>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA, data: { limparSelecao: false } }

  // Guarda do original (linha 1637): `if(!selectedCoins.length || cents<=0 ...) return`
  // — um `return` mudo, sem toast, porque o botão já estava desabilitado. Sem
  // `error` o run() do cliente também não abre aviso nenhum.
  if (!coinIds.length || priceCents <= 0) {
    return { ok: false, data: { limparSelecao: false } }
  }

  // A observação é texto livre que aparece na vitrine das OUTRAS contas. O
  // maxlength do textarea é enfeite do lado de fora; o corte real é aqui.
  const observacao = String(obs ?? '').trim().slice(0, OBS_MAX)

  try {
    const { result } = await mutateState(
      (s: AppState): ActionResult<{ limparSelecao: boolean }> => {
        const u = s.users[email]
        if (!u) return { ok: false, error: SESSAO_EXPIRADA, data: { limparSelecao: false } }

        // A revalidação inteira do original (linha 1640), agora contra o estado
        // do servidor: a moeda precisa estar NO INVENTÁRIO DE QUEM VENDE e não
        // pode já ter oferta aberta. Ids repetidos são colapsados — sem o Set,
        // um cliente que mandasse o mesmo id duas vezes criaria duas ofertas
        // apontando para a mesma moeda.
        const pedidos = [...new Set(coinIds)]
        const validIds = pedidos.filter(
          (id) => u.coins.some((c) => c.id === id) && !s.sellOffers.some((o) => o.coinId === id),
        )

        if (!validIds.length) {
          return {
            ok: false,
            error: 'As moedas selecionadas não estão mais disponíveis.',
            data: { limparSelecao: true },
          }
        }

        const lotId = novoLotId()
        validIds.forEach((id) => {
          const oferta: SellOffer = {
            id: novoOfferId(),
            coinId: id,
            seller: email,
            price: priceCents,
            obs: observacao,
            lotId,
            createdAt: Date.now(),
          }
          s.sellOffers.push(oferta)
        })

        // Casamento imediato: o anúncio novo pode ser mais barato que um bid já
        // publicado, e nesse caso a venda acontece antes de a tela redesenhar.
        const { matched } = matchOrders(s)

        return {
          ok: true,
          message:
            `Anúncio publicado: ${validIds.length} moeda(s) a ${brl(priceCents)} cada.` +
            (matched
              ? ' Parte já foi vendida automaticamente para ofertas de compra existentes.'
              : ''),
          data: { limparSelecao: true },
        }
      },
    )
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO, data: { limparSelecao: false } }
  }
}

/* ------------------------------------------------------------------------- */
/* 1.2 — remover anúncio                                                      */
/* ------------------------------------------------------------------------- */

/**
 * Remove todas as ofertas de um lote. As moedas voltam a aparecer em "Escolha
 * os ativos" sozinhas, porque `availableCoinsForSell` deriva a disponibilidade
 * de `sellOffers` — não há campo a desfazer.
 */
export async function cancelLot(lotId: string): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState((s: AppState): ActionResult => {
      // `seller === email` é a divergência anotada no topo: sem ela, o lotId
      // vindo do cliente seria autorização suficiente para apagar anúncio alheio.
      const doLote = s.sellOffers.filter((o) => o.lotId === lotId && o.seller === email)
      if (!doLote.length) return { ok: false, error: LOTE_SUMIU }

      s.sellOffers = s.sellOffers.filter((o) => !(o.lotId === lotId && o.seller === email))
      return { ok: true, message: 'Anúncio removido.' }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/* ------------------------------------------------------------------------- */
/* 1.2 — editar anúncio publicado                                             */
/* ------------------------------------------------------------------------- */

/**
 * Reprecifica o lote e, se for o caso, REDUZ a quantidade anunciada. Só reduz:
 * é a regra escrita na própria modal ("Para anunciar mais moedas, publique um
 * novo anúncio"), e ela existe porque aumentar exigiria escolher QUAIS moedas
 * entram — decisão que pertence à tela de publicação.
 *
 * As ofertas que ficam são as PRIMEIRAS da lista, como no original (slice), e o
 * casamento roda depois porque o preço novo pode cruzar com um bid aberto.
 */
export async function editLot(lotId: string, priceCents: Cents, qty: number): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  // Mesma checagem da linha 1692, repetida aqui: o cliente já barra, mas o
  // preço é o dado que menos pode chegar torto ao livro de ordens.
  if (!priceCents || priceCents <= 0) return { ok: false, error: 'Informe um preço válido.' }

  try {
    const { result } = await mutateState((s: AppState): ActionResult => {
      const offers = s.sellOffers.filter((o) => o.lotId === lotId && o.seller === email)
      if (!offers.length) return { ok: false, error: LOTE_SUMIU }

      // O stepper da modal já limita entre 1 e o total anunciado; o servidor
      // reaplica o limite porque a quantidade chega como número livre.
      const manter = Math.min(offers.length, Math.max(1, Math.floor(qty)))
      const keep = offers.slice(0, manter)
      const drop = offers.slice(manter)

      // `keep` guarda as MESMAS referências que estão em s.sellOffers, então
      // atribuir o preço aqui já altera o livro.
      keep.forEach((o) => {
        o.price = priceCents
      })

      if (drop.length) {
        const dropIds = new Set(drop.map((o) => o.id))
        s.sellOffers = s.sellOffers.filter((o) => !dropIds.has(o.id))
      }

      const { matched } = matchOrders(s)
      return {
        ok: true,
        message:
          'Anúncio atualizado.' +
          (matched ? ' Parte foi vendida automaticamente com o novo preço.' : ''),
      }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

/* ------------------------------------------------------------------------- */
/* 1.2 — vender direto para uma oferta de compra                              */
/* ------------------------------------------------------------------------- */

/**
 * Venda casada na hora contra um bid existente, sem passar pelo livro: o
 * vendedor aceita o preço-limite do comprador e a execução acontece ali.
 *
 * A quantidade executada é o menor entre TRÊS limites — o que o vendedor pediu,
 * o que resta no bid e quantas moedas ele realmente tem livres — e ainda é
 * cortada pelo saldo do comprador. Nenhum desses quatro números vem do cliente:
 * todos são lidos do estado dentro da transação.
 */
export async function sellToBid(bidId: string, qtyWanted: number): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  try {
    const { result } = await mutateState((s: AppState): ActionResult => {
      const bo = s.buyOrders.find((b) => b.id === bidId)
      if (!bo || bo.qty <= 0) return { ok: false, error: BID_SUMIU }

      // Venda para a própria oferta: ver a divergência anotada no topo. A recusa
      // reaproveita o texto de "não está mais disponível" de propósito — é um
      // caminho que a interface nunca oferece, então não há mensagem nova a
      // inventar para ele.
      if (bo.buyer === email) return { ok: false, error: BID_SUMIU }

      const seller = s.users[email]
      const buyer = s.users[bo.buyer]
      if (!seller) return { ok: false, error: SESSAO_EXPIRADA }
      // Comprador some do estado (banco recriado): no original isso estourava um
      // TypeError; aqui a oferta órfã é tratada como oferta que já não existe.
      if (!buyer) return { ok: false, error: BID_SUMIU }

      const availableCoins = availableCoinsForSell(s, seller)
      const pedido = Number.isFinite(qtyWanted) ? Math.floor(qtyWanted) : 0
      const n = Math.min(pedido, bo.qty, availableCoins.length)
      if (n <= 0) return { ok: false, error: 'Você não possui moedas disponíveis para esta venda.' }

      // Saldo do comprador conferido AGORA, no servidor: entre abrir a modal e
      // confirmar, ele pode ter gastado o dinheiro em outra aba.
      const affordable = Math.floor(buyer.balance / bo.price)
      const execN = Math.min(n, affordable)
      if (execN <= 0) return { ok: false, error: 'O comprador não possui saldo suficiente no momento.' }

      for (let i = 0; i < execN; i++) {
        const coin = availableCoins[i]
        const price = bo.price
        const fee = tradeFee(price)
        buyer.balance -= price // o comprador paga o preço cheio
        seller.balance += price - fee // a comissão sai do lado do vendedor
        transferCoin(seller, buyer, coin.id)
      }

      // UM registro para as execN unidades, com qty = execN — é assim que o
      // histórico do MVP guarda venda direta (linha 1786) e é o que a média
      // ponderada de 7 dias espera encontrar.
      s.trades.push({ price: bo.price, qty: execN, date: Date.now(), buyer: bo.buyer, seller: email })
      bo.qty -= execN
      s.buyOrders = s.buyOrders.filter((b) => b.qty > 0)

      return {
        ok: true,
        message: `Venda concluída: ${execN} moeda(s) vendida(s) diretamente a ${buyer.name} por ${brl(bo.price)} cada.`,
      }
    })
    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

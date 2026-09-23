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

import { isNegociavel } from '@/domain/constants'
import { comissaoPorMoeda, custoDeCompraPorMoeda } from '@/domain/fees'
import { availableCoinsForSell, transferirMoedaVendida } from '@/domain/market'
import { brl } from '@/domain/money'
import type { ActionResult, AppState, Cents, SellOffer } from '@/domain/types'
import { apelidoComprador } from '@/domain/contraparte'
import { sincronizarAssinaturaCustodia } from '@/server/custodia/assinatura'
import {
  casarOrdensRespeitandoPendencia,
  contaComPendenciaNoEstado,
  MENSAGEM_ANUNCIO_PAUSADO,
  MENSAGEM_CUSTODIA_NAO_PAGA,
  MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA,
  custodiaNaoComprovadaNoEstado,
  moedaComCustodiaNaoPagaNoEstado,
} from '@/domain/bloqueio-por-debito'
import { contaBloqueavel, vendedoresBloqueaveis } from '@/server/custodia/isencao-da-equipe'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
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
  obs: string = '',
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
  // Taxas e catálogo da configuração (C3): lidos antes da transação, valem para esta operação.
  const { taxas, catalogo } = await carregarRegrasDoMercado()
  const bloqueavel = await contaBloqueavel(email)
  const bloqueaveis = await vendedoresBloqueaveis()

  try {
    const { result } = await mutateState(
      (s: AppState): ActionResult<{ limparSelecao: boolean }> => {
        const u = s.users[email]
        if (!u) return { ok: false, error: SESSAO_EXPIRADA, data: { limparSelecao: false } }

        const agora = Date.now()
        if (bloqueavel && contaComPendenciaNoEstado(s, email, agora)) {
          return {
            ok: false,
            error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA,
            data: { limparSelecao: false },
          }
        }

        // A revalidação inteira do original (linha 1640), agora contra o estado
        // do servidor: a moeda precisa estar NO INVENTÁRIO DE QUEM VENDE e não
        // pode já ter oferta aberta. Ids repetidos são colapsados — sem o Set,
        // um cliente que mandasse o mesmo id duas vezes criaria duas ofertas
        // apontando para a mesma moeda.
        const pedidos = [...new Set(coinIds)]
        const validas = pedidos
          .map((id) => u.coins.find((c) => c.id === id))
          .filter((c): c is NonNullable<typeof c> => !!c)
          .filter((c) => c.recibo.status === 'Ativo')
          .filter((c) => !s.sellOffers.some((o) => o.coinId === c.id))

        if (!validas.length) {
          return {
            ok: false,
            error: 'As moedas selecionadas não estão mais disponíveis.',
            data: { limparSelecao: true },
          }
        }

        // AG8: moeda com custódia em aberto não pode ser publicada para venda,
        // mesmo que ainda não tenha vencido. A recusa é por moeda, não por conta.
        const comCustodiaDevida = validas.filter((c) => custodiaNaoComprovadaNoEstado(s, c.id))
        if (comCustodiaDevida.length) {
          return {
            ok: false,
            error: MENSAGEM_CUSTODIA_NAO_PAGA,
            data: { limparSelecao: false },
          }
        }

        /*
         * O TIPO DO LOTE SAI DAS MOEDAS, NÃO DO CLIENTE.
         *
         * A tela tem um seletor de tipo, mas ele é conveniência de interface: o
         * que vai para o livro de ordens é o `tipoMoeda` que está gravado em
         * cada moeda do inventário. Aceitar o tipo pela requisição permitiria
         * anunciar uma Bandeira de R$ 285 dentro do livro da Direitos Humanos e
         * casá-la com um bid de R$ 450.
         */
        const tipoMoeda = validas[0].tipoMoeda

        // Lote misto: a interface nunca monta um, mas a server action é um
        // endpoint HTTP e nada impede a chamada direta com ids de tipos
        // diferentes. Um lote tem UM preço unitário — misturar ativos ali
        // venderia a moeda cara pelo preço da barata.
        if (validas.some((c) => c.tipoMoeda !== tipoMoeda)) {
          return {
            ok: false,
            error: 'Um anúncio só pode conter moedas do mesmo tipo.',
            data: { limparSelecao: true },
          }
        }

        if (!isNegociavel(tipoMoeda, catalogo)) {
          return {
            ok: false,
            error: 'Este tipo de moeda ainda não está disponível para negociação.',
            data: { limparSelecao: true },
          }
        }

        const lotId = novoLotId()
        validas.forEach((c) => {
          const oferta: SellOffer = {
            id: novoOfferId(),
            coinId: c.id,
            seller: email,
            price: priceCents,
            obs: observacao,
            lotId,
            createdAt: agora,
            prioridadeEm: agora,
            tipoMoeda,
          }
          s.sellOffers.push(oferta)
        })

        // Casamento imediato: o anúncio novo pode ser mais barato que um bid já
        // publicado, e nesse caso a venda acontece antes de a tela redesenhar.
        const { matched } = casarOrdensRespeitandoPendencia(s, taxas, agora, bloqueaveis)

        return {
          ok: true,
          message:
            `Anúncio publicado: ${validas.length} ${tipoMoeda} a ${brl(priceCents)} cada.` +
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
export async function editLot(
  lotId: string,
  priceCents: Cents,
  qty: number,
  obs?: string,
): Promise<ActionResult> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  // Mesma checagem da linha 1692, repetida aqui: o cliente já barra, mas o
  // preço é o dado que menos pode chegar torto ao livro de ordens.
  if (!priceCents || priceCents <= 0) return { ok: false, error: 'Informe um preço válido.' }

  const qtyDesejada = Math.max(1, Math.floor(qty))
  const observacao = obs !== undefined ? String(obs).trim().slice(0, OBS_MAX) : undefined
  const { taxas, catalogo } = await carregarRegrasDoMercado()
  const bloqueavel = await contaBloqueavel(email)
  const bloqueaveis = await vendedoresBloqueaveis()

  try {
    const { result } = await mutateState((s: AppState): ActionResult => {
      const u = s.users[email]
      if (!u) return { ok: false, error: SESSAO_EXPIRADA }

      const offers = s.sellOffers.filter((o) => o.lotId === lotId && o.seller === email)
      if (!offers.length) return { ok: false, error: LOTE_SUMIU }

      const tipoMoeda = offers[0].tipoMoeda
      const precoAntigo = offers[0].price
      const precoMudou = precoAntigo !== priceCents
      const agora = Date.now()
      const obsFinal = observacao !== undefined ? observacao : offers[0].obs

      let perdeuVez = precoMudou

      if (qtyDesejada > offers.length) {
        if (bloqueavel && contaComPendenciaNoEstado(s, email, agora)) {
          return {
            ok: false,
            error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA,
          }
        }

        // Aumentar quantidade passa a ser possível (Decisão F-3)
        const necessarias = qtyDesejada - offers.length
        const livres = availableCoinsForSell(s, u, tipoMoeda, catalogo)
        if (livres.length < necessarias) {
          return {
            ok: false,
            error: `Você tem ${livres.length} moeda(s) livre(s) desse tipo para acrescentar.`,
          }
        }
        perdeuVez = true

        // Ofertas existentes recebem novo preço, obs e nova prioridade
        offers.forEach((o) => {
          o.price = priceCents
          o.obs = obsFinal
          o.prioridadeEm = agora
        })

        // Acrescenta moedas livres do mesmo tipo, na ordem do inventário
        for (let i = 0; i < necessarias; i++) {
          const coin = livres[i]
          s.sellOffers.push({
            id: novoOfferId(),
            coinId: coin.id,
            seller: email,
            price: priceCents,
            obs: obsFinal,
            lotId,
            createdAt: agora,
            prioridadeEm: agora,
            tipoMoeda,
          })
        }
      } else if (qtyDesejada < offers.length) {
        // Reduzir: saem as de prioridadeEm mais recente; as que ficam mantêm a vez
        offers.sort((a, b) => (a.prioridadeEm ?? a.createdAt) - (b.prioridadeEm ?? b.createdAt))
        const keep = offers.slice(0, qtyDesejada)
        const drop = offers.slice(qtyDesejada)

        keep.forEach((o) => {
          o.price = priceCents
          o.obs = obsFinal
          if (precoMudou) {
            o.prioridadeEm = agora
          }
        })

        const dropIds = new Set(drop.map((o) => o.id))
        s.sellOffers = s.sellOffers.filter((o) => !dropIds.has(o.id))
      } else {
        // Mesma quantidade: altera preço e/ou observação
        offers.forEach((o) => {
          o.price = priceCents
          o.obs = obsFinal
          if (precoMudou) {
            o.prioridadeEm = agora
          }
        })
      }

      const { matched } = casarOrdensRespeitandoPendencia(s, taxas, agora, bloqueaveis)
      const msgFila = perdeuVez
        ? ' Como o preço mudou, ela foi para o fim da fila desse preço.'
        : ''
      return {
        ok: true,
        message:
          `Oferta atualizada.${msgFila}` +
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
  const { taxas, catalogo } = await carregarRegrasDoMercado()
  const bloqueavel = await contaBloqueavel(email)

  try {
    let buyerParaSync: string | null = null
    const { result } = await mutateState((s: AppState): ActionResult => {
      const bo = s.buyOrders.find((b) => b.id === bidId)
      if (!bo || bo.qty <= 0) return { ok: false, error: BID_SUMIU }
      buyerParaSync = bo.buyer

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

      const agora = Date.now()
      if (bloqueavel && contaComPendenciaNoEstado(s, email, agora)) {
        return { ok: false, error: MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA }
      }

      // Só as moedas DO TIPO que o bid pede. Sem o recorte, aceitar uma oferta
      // de compra de Direitos Humanos entregaria a primeira moeda livre do
      // inventário — que quase sempre seria uma Bandeira, bem mais barata.
      const availableCoins = availableCoinsForSell(s, seller, bo.tipoMoeda, catalogo)
      const pedido = Number.isFinite(qtyWanted) ? Math.floor(qtyWanted) : 0
      const n = Math.min(pedido, bo.qty, availableCoins.length)
      if (n <= 0) {
        // AG8: se o vendedor tem moedas do tipo mas todas estão bloqueadas por
        // custódia não paga, a mensagem precisa dizer o motivo real.
        const temDoTipoNoCofre = seller.coins.some(
          (c) => c.tipoMoeda === bo.tipoMoeda && c.recibo.status === 'Ativo',
        )
        if (temDoTipoNoCofre) {
          return { ok: false, error: MENSAGEM_CUSTODIA_NAO_PAGA }
        }
        return {
          ok: false,
          error: `Você não possui ${bo.tipoMoeda} disponível para esta venda.`,
        }
      }

      // Saldo do comprador conferido AGORA, no servidor: entre abrir a modal e
      // confirmar, ele pode ter gastado o dinheiro em outra aba.
      const affordable = Math.floor(buyer.balance / custoDeCompraPorMoeda(bo.price, taxas))
      const execN = Math.min(n, affordable)
      if (execN <= 0) return { ok: false, error: 'O comprador não possui saldo suficiente no momento.' }

      const { comprador: feeCompradorUnit, vendedor: feeVendedorUnit } = comissaoPorMoeda(bo.price, taxas)

      for (let i = 0; i < execN; i++) {
        const coin = availableCoins[i]
        const price = bo.price
        buyer.balance -= price + feeCompradorUnit // comprador paga preço + comissão
        seller.balance += price - feeVendedorUnit // vendedor recebe preço líquido da comissão
        transferirMoedaVendida(s, seller, buyer, email, bo.buyer, coin.id, taxas)
      }

      const feeComprador = feeCompradorUnit * execN
      const feeVendedor = feeVendedorUnit * execN

      // UM registro para as execN unidades, com qty = execN — é assim que o
      // histórico do MVP guarda venda direta (linha 1786) e é o que a média
      // ponderada de 7 dias espera encontrar.
      s.trades.push({
        price: bo.price,
        qty: execN,
        date: agora,
        buyer: bo.buyer,
        seller: email,
        feeComprador,
        feeVendedor,
        fee: feeComprador + feeVendedor,
        tipoMoeda: bo.tipoMoeda,
      })
      bo.qty -= execN
      s.buyOrders = s.buyOrders.filter((b) => b.qty > 0)

      return {
        ok: true,
        message: `Venda concluída: ${execN} ${bo.tipoMoeda} vendida(s) diretamente a ${apelidoComprador(bo.id)} por ${brl(bo.price)} cada.`,
      }
    })

    if (result.ok) {
      void sincronizarAssinaturaCustodia(email, taxas)
      if (buyerParaSync) void sincronizarAssinaturaCustodia(buyerParaSync, taxas)
    }

    return result
  } catch {
    return { ok: false, error: FALHA_GRAVACAO }
  }
}

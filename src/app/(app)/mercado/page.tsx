'use client'

/**
 * TELA 1.1 — Comprar moeda olímpica.
 *
 * Port de renderBuy (aurea-mvp-teste.html, 1294-1359), refreshMarketLists
 * (1360-1371), clearMarketFilter (1372-1377), adjustBuyQty (1378-1385),
 * updateBidTotal (1386-1391), confirmLotBuy (1393-1407) e openEditBidModal /
 * renderEditBidModal (1446-1464).
 *
 * O título da página ("Comprar moeda olímpica" + subtítulo) NÃO está aqui: no
 * monolito cada renderizador escrevia dentro de #pageTitle, e neste port quem
 * cuida disso é a topbar do casco, a partir da rota. Ver components/shell/Topbar.
 *
 * COMPONENTE DE CLIENTE, E POR QUÊ
 * --------------------------------
 * Filtro de valores, seletor de quantidade por lote e o formulário de oferta de
 * compra são estado de tela que muda a cada tecla. O dado de negócio continua
 * vindo do servidor — `useApp()` entrega o estado que o casco buscou e que o
 * ciclo de 10s mantém fresco — e toda escrita passa por uma server action.
 *
 * DIVERGÊNCIA CONSCIENTE: O QUE OS CAMPOS FAZEM AO REDESENHAR
 * -----------------------------------------------------------
 * No original, qualquer render() reconstruía o innerHTML inteiro da tela, e com
 * ele os <input>. O efeito colateral era que o filtro de valores e o formulário
 * de oferta ESVAZIAVAM sozinhos — inclusive no meio de uma digitação, quando o
 * ciclo de sincronização de 10s percebia que outra conta mexeu no mercado
 * (linha 1101). Isso não era uma decisão de produto, era consequência de
 * redesenhar por string.
 *
 * Aqui o estado dos campos é do React e sobrevive à chegada de dados novos, que
 * é o comportamento que qualquer pessoa espera de um campo de texto. O único
 * esvaziamento preservado é o do formulário de oferta DEPOIS de publicar com
 * sucesso — esse era visível, intencional na prática e evita republicar a mesma
 * oferta por engano.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { BidRow } from '@/components/market/BidRow'
import { LotCard } from '@/components/market/LotCard'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { COIN } from '@/domain/constants'
import { fdate } from '@/domain/dates'
import { avg7, fmtTrade, lastTrade, lotsFromOffers } from '@/domain/market'
import { brl, parsePrice } from '@/domain/money'
import type { BuyOrder, Cents, Lot } from '@/domain/types'
import { buyLot, cancelBid, editBid, publishBid } from '@/server/actions/market'

/**
 * Pré-checagem do formulário de oferta (linha 1714). O texto é o mesmo que a
 * server action devolve: aqui ele só poupa uma ida ao servidor para um erro que
 * a tela já enxerga. Quem manda é o servidor — a conferência lá continua.
 */
const BID_INVALIDO_PUBLICAR = 'Informe quantidade e preço unitário válidos.'

/** Linha 1466 — a edição usa um texto ligeiramente diferente, e é assim mesmo. */
const BID_INVALIDO_EDITAR = 'Informe quantidade e preço válidos.'

export default function MercadoPage(): ReactNode {
  const { state, session, me, run } = useApp()
  const modal = useModal()
  const toast = useToast()

  /* ---------- estado de tela ---------- */

  // Filtro de valores: guardado como TEXTO, porque é isso que o usuário digita.
  // A conversão para centavos acontece a cada render, como no original, que
  // relia os campos dentro de refreshMarketLists.
  const [filMin, setFilMin] = useState('')
  const [filMax, setFilMax] = useState('')

  // O mapa `buyQty` do monolito (linha 890): quantidade escolhida por lote.
  // Nasce vazio a cada visita à tela, igual ao `buyQty = {}` de go() (linha 1110)
  // — aqui de graça, porque o estado morre junto com a página.
  const [buyQty, setBuyQty] = useState<Record<string, number>>({})

  // Formulário de oferta de compra. Texto também, e pelo mesmo motivo: o campo
  // de quantidade precisa poder ficar vazio enquanto se digita.
  const [bidQty, setBidQty] = useState('1')
  const [bidPrice, setBidPrice] = useState('')

  /* ---------- recortes do estado ---------- */

  const media7 = avg7(state)
  const ultima = lastTrade(state)

  // Filtro de faixa (linha 1364): limite não informado é limite ausente, e por
  // isso o `!min ||` — parsePrice devolve 0 para campo vazio ou inválido.
  const min = parsePrice(filMin)
  const max = parsePrice(filMax)
  const passa = (p: Cents): boolean => (!min || p >= min) && (!max || p <= max)

  const lots = lotsFromOffers(state).filter((l) => passa(l.price))
  const bids = state.buyOrders
    .slice() // cópia: sort muta, e state.buyOrders é o array do servidor
    .sort((a, b) => b.price - a.price || a.createdAt - b.createdAt)
    .filter((b) => passa(b.price))

  // Últimas seis negociações, da mais nova para a mais antiga. O índice absoluto
  // no histórico viaja junto para servir de key: `trades` só cresce por acréscimo
  // no fim, então a posição de uma negociação nunca muda.
  const inicioHist = Math.max(0, state.trades.length - 6)
  const historico = state.trades
    .slice(-6)
    .map((t, i) => ({ trade: t, idx: inicioHist + i }))
    .reverse()

  // Prévia do total da oferta de compra (linha 1390).
  const bidQtyNum = parseInt(bidQty, 10) || 0
  const bidPriceCents = parsePrice(bidPrice)
  const bidTotal = bidQtyNum > 0 && bidPriceCents > 0 ? brl(bidQtyNum * bidPriceCents) : '—'

  /* ---------- ações ---------- */

  /** adjustBuyQty (linha 1378): soma o passo e prende entre 1 e o teto do lote. */
  function ajustarQtd(lotId: string, delta: number, teto: number): void {
    setBuyQty((atual) => {
      let proximo = (atual[lotId] || 1) + delta
      if (proximo < 1) proximo = 1
      if (proximo > teto) proximo = teto
      return { ...atual, [lotId]: proximo }
    })
  }

  /** Esquece a escolha do lote comprado — o `delete buyQty[lotId]` da linha 1432. */
  function esquecerQtd(lotId: string): void {
    setBuyQty((atual) => {
      const copia = { ...atual }
      delete copia[lotId]
      return copia
    })
  }

  /** confirmLotBuy (linha 1393): a compra passa por uma confirmação explícita. */
  function confirmarCompra(lot: Lot, qty: number): void {
    modal.open(
      <ConfirmarCompraModal lot={lot} qty={qty} aoConcluir={() => esquecerQtd(lot.lotId)} />,
    )
  }

  /** publishBuyOrder (linha 1711) — a regra inteira roda no servidor. */
  async function publicarBid(): Promise<void> {
    const qtyRaw = parseInt(bidQty, 10)
    if (!qtyRaw || qtyRaw <= 0 || bidPriceCents <= 0) {
      toast(BID_INVALIDO_PUBLICAR)
      return
    }
    const res = await run(() => publishBid(qtyRaw, bidPriceCents))
    // Só limpa quando publicou: erro mantém o que foi digitado para corrigir.
    if (res.ok) {
      setBidQty('1')
      setBidPrice('')
    }
  }

  return (
    <>
      <div className="cols">
        <div>
          <div className="panel">
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M3 5h18l-7 8v6l-4 2v-8z" />
              </svg>
              Mercado
            </h3>

            <div className="avg-box">
              <div className="l">Média de mercado — 7 dias</div>
              {/* avg7 devolve null sem negociação na janela: traço, não zero. */}
              <div className="v">{media7 ? brl(media7) : '—'}</div>
              <div className="s">Base: negociações concluídas na plataforma</div>
            </div>

            <div className="avg-box">
              <div className="l">
                Última negociação{' '}
                <span className="sync-dot">
                  <i />
                  10s
                </span>
              </div>
              <div className="v" style={{ fontSize: '19px' }}>
                {ultima ? fmtTrade(ultima) : '—'}
              </div>
              <div className="s">
                {ultima ? fdate(ultima.date) : ''} · {COIN.name}
              </div>
            </div>

            <div className="hist">
              <div className="hist-head">Últimas negociações</div>
              {historico.map(({ trade, idx }) => (
                <div className="hist-row" key={idx}>
                  <span className="d">{fdate(trade.date)}</span>
                  <span className="p">{fmtTrade(trade)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: '18px' }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filtrar por valor
            </h3>
            <div className="filter-row">
              <div className="ffield">
                <label htmlFor="filMin">Valor mínimo</label>
                <input
                  id="filMin"
                  className="tinput"
                  placeholder="R$ 0,00"
                  value={filMin}
                  onChange={(e) => setFilMin(e.target.value)}
                />
              </div>
              <div className="ffield">
                <label htmlFor="filMax">Valor máximo</label>
                <input
                  id="filMax"
                  className="tinput"
                  placeholder="Sem limite"
                  value={filMax}
                  onChange={(e) => setFilMax(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setFilMin('')
                  setFilMax('')
                }}
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: '18px' }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <ellipse cx="12" cy="6.5" rx="7" ry="3" />
                <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
              </svg>
              Ofertas de venda
            </h3>
            {lots.length ? (
              lots.map((lot) => (
                <LotCard
                  key={lot.lotId}
                  lot={lot}
                  mine={lot.seller === session}
                  sellerName={state.users[lot.seller] ? state.users[lot.seller].name : '—'}
                  balance={me.balance}
                  qtyEscolhida={buyQty[lot.lotId]}
                  onAdjust={ajustarQtd}
                  onBuy={confirmarCompra}
                />
              ))
            ) : (
              <div className="empty">
                Nenhuma oferta de venda encontrada. Use &quot;Vender ativo&quot; em outra conta para
                publicar um anúncio e vê-lo aqui.
              </div>
            )}
          </div>

          <div className="panel" style={{ marginBottom: '18px' }}>
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              Ofertas de compra ativas
            </h3>
            {bids.length ? (
              bids.map((bid) => (
                <BidRow
                  key={bid.id}
                  bid={bid}
                  mine={bid.buyer === session}
                  buyerName={state.users[bid.buyer] ? state.users[bid.buyer].name : '—'}
                  onEdit={(b) => modal.open(<EditarBidModal bid={b} />)}
                  onCancel={(b) => void run(() => cancelBid(b.id))}
                />
              ))
            ) : (
              <div className="empty">Nenhuma oferta de compra encontrada para este filtro.</div>
            )}
          </div>

          <div className="panel">
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M6 7h12l1.5 13h-15zM9 7a3 3 0 016 0" />
              </svg>
              Fazer oferta de compra
            </h3>

            <div className="field-lbl">Quantidade desejada</div>
            <input
              id="bidQty"
              type="number"
              min="1"
              className="tinput"
              value={bidQty}
              onChange={(e) => setBidQty(e.target.value)}
            />

            <div className="field-lbl">Preço unitário máximo</div>
            <div className="price-input">
              <span>R$</span>
              <input
                id="bidPrice"
                inputMode="decimal"
                placeholder="0,00"
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
              />
            </div>

            <div className="summary-row total">
              <span className="k">Total estimado</span>
              <span className="v" style={{ fontSize: '19px' }}>
                {bidTotal}
              </span>
            </div>

            <button type="button" className="btn btn-gold" onClick={() => void publicarBid()}>
              Publicar oferta de compra
            </button>

            <div className="note">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              Se já existir uma oferta de venda igual ou abaixo desse preço, a compra acontece
              automaticamente ao publicar.
            </div>
          </div>
        </div>
      </div>

      <div className="note" style={{ justifyContent: 'center', marginTop: '14px' }}>
        <svg viewBox="0 0 24 24">
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        </svg>
        Todas as moedas são armazenadas com segurança na Áurea Custódia. A plataforma não recomenda
        preço; valores são definidos por oferta e demanda.
      </div>
    </>
  )
}

/* ===========================================================================
 * Modais
 * =========================================================================*/

/**
 * Confirmação de compra de lote — port de confirmLotBuy (1398-1405).
 *
 * A modal FECHA antes de a compra ser enviada, como na linha 1411: o aviso do
 * resultado é o toast, e manter a caixa aberta esperando resposta não era o
 * comportamento do original.
 *
 * A quantidade chega pronta do cartão (ver a nota em LotCard) e viaja para o
 * servidor, que a limita de novo ao que restou do lote e ao saldo real.
 */
function ConfirmarCompraModal({
  lot,
  qty,
  aoConcluir,
}: {
  lot: Lot
  qty: number
  aoConcluir(): void
}): ReactNode {
  const { run } = useApp()
  const { close } = useModal()

  const total = lot.price * qty

  async function confirmar(): Promise<void> {
    close()
    const res = await run(() => buyLot(lot.lotId, qty))
    if (res.ok) aoConcluir()
  }

  return (
    <>
      <h3 className="serif">Confirmar compra</h3>
      <p>
        <b style={{ color: 'var(--gold)' }}>{COIN.name}</b> · {qty} unidade(s)
      </p>
      <p>
        Preço unitário: <b>{brl(lot.price)}</b> · Total: <b>{brl(total)}</b> — debitado do seu saldo
        disponível.
      </p>
      <div className="m-actions">
        <button type="button" className="btn btn-outline" onClick={close}>
          Cancelar
        </button>
        <button type="button" className="btn btn-gold" onClick={() => void confirmar()}>
          Confirmar compra
        </button>
      </div>
    </>
  )
}

/**
 * Edição de uma oferta de compra já publicada — port de renderEditBidModal
 * (1453-1464) e da validação de saveEditBid (1466).
 *
 * O par quantidade/preço fica em TEXTO e é convertido na leitura, reproduzindo o
 * `editBidTemp` do original: lá o campo era não-controlado e o valor guardado
 * caía para 1 quando a caixa ficava vazia (`parseInt(...)||1`), sem que o campo
 * mostrasse esse 1. Guardar o número puro faria o campo saltar para "1" no meio
 * da digitação.
 *
 * A recusa por dados inválidos NÃO fecha a modal (linha 1466 retorna antes do
 * closeModal), para que dê para corrigir o que foi digitado.
 */
function EditarBidModal({ bid }: { bid: BuyOrder }): ReactNode {
  const { run } = useApp()
  const { close } = useModal()
  const toast = useToast()

  const [qtyTexto, setQtyTexto] = useState(String(bid.qty))
  // Preço inicial no formato brasileiro, como na linha 1459.
  const [precoTexto, setPrecoTexto] = useState((bid.price / 100).toFixed(2).replace('.', ','))

  const qty = parseInt(qtyTexto, 10) || 1
  const preco = parsePrice(precoTexto)

  async function salvar(): Promise<void> {
    if (!preco || preco <= 0 || !qty || qty <= 0) {
      toast(BID_INVALIDO_EDITAR)
      return
    }
    close()
    await run(() => editBid(bid.id, qty, preco))
  }

  return (
    <>
      <h3 className="serif">Editar oferta de compra</h3>

      <div className="field-lbl">Quantidade desejada</div>
      <input
        id="editBidQty"
        type="number"
        min="1"
        className="tinput"
        value={qtyTexto}
        onChange={(e) => setQtyTexto(e.target.value)}
      />

      <div className="field-lbl">Preço unitário máximo</div>
      <div className="price-input">
        <span>R$</span>
        <input
          id="editBidPrice"
          inputMode="decimal"
          value={precoTexto}
          onChange={(e) => setPrecoTexto(e.target.value)}
        />
      </div>

      <div className="m-actions">
        <button type="button" className="btn btn-outline" onClick={close}>
          Cancelar
        </button>
        <button type="button" className="btn btn-gold" onClick={() => void salvar()}>
          Salvar alterações
        </button>
      </div>
    </>
  )
}

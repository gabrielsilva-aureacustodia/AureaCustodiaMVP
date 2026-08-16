'use client'

/**
 * TELA 1.2 — Colocar ativo à venda.
 *
 * Port de aurea-mvp-teste.html, renderSell (1519-1584) e todo o bloco de
 * comportamento que a acompanha: selectAllAvailable/clearSelection/toggleTerms
 * (1586-1592), toggleCoinCheckbox/onSellQtyInput/syncSellSelectionUI (1594-1619),
 * updateSellDerived (1620-1632) e as modais de editar anúncio (1662-1690) e de
 * venda direta (1731-1763).
 *
 * O TÍTULO NÃO ESTÁ AQUI. O original abria com
 * `pageTitle.innerHTML = '<h1>Colocar ativo à venda</h1>...'`; neste port a
 * topbar deriva o mesmo texto do pathname (ver components/shell/Topbar.tsx),
 * então a página desenha só o conteúdo — que no monolito era o #viewSell, uma
 * div sem classe nenhuma. Por isso a raiz aqui é direto o `.cols.sell`.
 *
 * O QUE SUBSTITUIU O `render()` GLOBAL
 * ------------------------------------
 * No monolito, QUALQUER interação desta tela chamava renderSell(), que refazia o
 * innerHTML do painel inteiro. Isso tinha dois efeitos colaterais que este port
 * NÃO reproduz, e que estão registrados como divergência:
 *
 *  - o campo de preço e a observação eram apagados a cada re-render, porque o
 *    HTML era remontado sem `value`. Marcar "Aceito os termos" depois de digitar
 *    o preço, por exemplo, zerava o preço. Aqui os campos são estado React e
 *    sobrevivem, que é o que qualquer pessoa espera de um formulário;
 *  - o campo de quantidade voltava a mostrar `selectedCoins.length`. O único
 *    caso em que isso mudava algo era o de um número digitado maior que o
 *    estoque ("5" com 3 moedas livres) — situação que o próprio original já
 *    deixava divergente enquanto ninguém tocasse em mais nada (a linha 1605
 *    chama syncSellSelectionUI(false), que de propósito NÃO reescreve o campo).
 *
 * O resto é fiel: mesma ordem de painéis, mesmos textos, mesma aritmética.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { COIN } from '@/domain/constants'
import { tradeFee } from '@/domain/fees'
import { availableCoinsForSell, avg7, lotsFromOffers } from '@/domain/market'
import { brl, parsePrice } from '@/domain/money'
import type { BuyOrder, Lot } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { CoinPicker } from '@/components/sell/CoinPicker'
import { SellerBidRow } from '@/components/sell/SellerBidRow'
import { useModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { cancelLot, editLot, publishOffer, sellToBid } from '@/server/actions/sell'

export default function VenderPage(): ReactNode {
  const { state, session, me, run } = useApp()
  const modal = useModal()
  const toast = useToast()

  /* ---------- estado da tela (as globais selectedCoins/termsOk do MVP) ------- */
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [termsOk, setTermsOk] = useState(false)
  /**
   * Texto CRU do campo de quantidade, separado da seleção de propósito. O
   * original mantinha os dois dessincronizados quando o número digitado passava
   * do estoque (ver a nota do topo); guardar só `selecionadas.length` faria o
   * campo "corrigir" o que a pessoa digitou, que é comportamento novo.
   */
  const [qtyTexto, setQtyTexto] = useState('')
  const [precoTexto, setPrecoTexto] = useState('')
  const [obs, setObs] = useState('')

  /* ---------- recortes do estado (as mesmas quatro linhas do renderSell) ----- */
  const negociaveis = me.coins.filter((c) => c.tipoMoeda === COIN.name)
  const anunciadas = new Set(state.sellOffers.map((o) => o.coinId))
  const avail = availableCoinsForSell(state, me)
  const meusLotes = lotsFromOffers(state).filter((l) => l.seller === session)
  // Ofertas de compra das OUTRAS contas, da mais alta para a mais baixa: quem
  // vende quer ver primeiro quem paga mais.
  const bidsDeTerceiros = state.buyOrders
    .filter((b) => b.buyer !== session)
    .sort((a, b) => b.price - a.price)
  const media7 = avg7(state)

  /* ---------- pré-seleção vinda do certificado NFT (?moeda=RO-000042) -------- */
  /**
   * Equivalente do par preselectCoinId/goSellFromNft (linhas 901, 1111-1112 e
   * 1949): o original guardava o id numa global, consumia na primeira montagem
   * da tela e zerava a global em seguida. O ref faz o mesmo papel — sem ele, o
   * parâmetro voltaria a marcar a moeda a cada re-render e seria impossível
   * desmarcá-la.
   *
   * O parâmetro é lido de `window.location.search` e NÃO de `useSearchParams()`.
   * O motivo é concreto: `useSearchParams()` num Client Component obriga a uma
   * fronteira de Suspense acima dele, e essa fronteira quebrou a tela em
   * produção — o React streamava o conteúdo para a div de staging (`S:0`),
   * agendava a revelação e nunca a concluía, deixando a lista de moedas
   * renderizada porém invisível, com largura e altura zero. Aqui a leitura
   * acontece dentro de um efeito, que só roda no cliente: `window` existe,
   * não há SSR envolvido e o estado inicial não depende do parâmetro, então
   * não há divergência de hidratação possível.
   *
   * O comportamento é idêntico ao de antes: o ref garante consumo único, e a
   * navegação para /vender?moeda=X vindo de /vender já era ignorada nas duas
   * versões, porque o ref sai da primeira montagem marcado como consumido.
   */
  const paramConsumido = useRef(false)
  useEffect(() => {
    if (paramConsumido.current) return
    paramConsumido.current = true
    const moedaParam = new URLSearchParams(window.location.search).get('moeda')
    if (!moedaParam) return
    setSelecionadas([moedaParam])
    setQtyTexto('1')
  }, [])

  /* ---------- prévia de preço (updateSellDerived) ---------------------------- */
  const cents = parsePrice(precoTexto)
  const qty = selecionadas.length
  const gross = cents * qty
  /**
   * O `cents > 0 ?` não é zelo extra: `tradeFee(0)` devolve 100, porque a parte
   * fixa de R$ 1,00 não tem guarda nenhuma. Sem esta condição, a tela mostraria
   * "taxa R$ 1,00" com o campo de preço ainda vazio — a linha 1625 do monolito
   * tem exatamente esta mesma proteção do lado de fora.
   */
  const feeUnit = cents > 0 ? tradeFee(cents) : 0
  const fee = feeUnit * qty
  const net = gross - fee
  const podePublicar = qty > 0 && cents > 0 && termsOk

  /* ---------- seleção -------------------------------------------------------- */
  function alternarMoeda(id: string): void {
    const proximo = selecionadas.includes(id)
      ? selecionadas.filter((x) => x !== id)
      : [...selecionadas, id]
    setSelecionadas(proximo)
    // syncSellSelectionUI(true) do original: clique na lista MANDA no campo.
    setQtyTexto(proximo.length ? String(proximo.length) : '')
  }

  function selecionarTodas(): void {
    const ids = avail.map((c) => c.id)
    setSelecionadas(ids)
    setQtyTexto(ids.length ? String(ids.length) : '')
  }

  function limparSelecao(): void {
    setSelecionadas([])
    setQtyTexto('')
  }

  /**
   * Digitar a quantidade seleciona as N PRIMEIRAS moedas disponíveis, na ordem
   * do inventário (linha 1604). Número acima do estoque é cortado no estoque,
   * mas o texto digitado permanece — ver a nota do topo.
   */
  function aoDigitarQuantidade(v: string): void {
    setQtyTexto(v)
    let n = parseInt(v, 10)
    if (isNaN(n) || n < 0) n = 0
    n = Math.min(n, avail.length)
    setSelecionadas(avail.slice(0, n).map((c) => c.id))
  }

  /* ---------- publicar ------------------------------------------------------- */
  async function publicar(): Promise<void> {
    // Mesma guarda muda da linha 1637: o botão já está desabilitado, isto só
    // fecha o caminho do teclado.
    if (!podePublicar) return

    const res = await run(() => publishOffer(selecionadas, cents, obs.trim()))

    // O servidor avisa quando a seleção deixou de fazer sentido — publicou, ou
    // as moedas sumiram do inventário no meio do caminho. Nos dois casos o
    // original zerava selectedCoins antes de redesenhar (linhas 1641 e 1649).
    if (res.data?.limparSelecao) {
      setSelecionadas([])
      setQtyTexto('')
    }
    // Só o sucesso limpa o formulário inteiro: no original o render() pós-publicação
    // trazia o painel em branco, com os termos desmarcados.
    if (res.ok) {
      setTermsOk(false)
      setPrecoTexto('')
      setObs('')
    }
  }

  /* ---------- modais --------------------------------------------------------- */
  function abrirEdicaoDeLote(lote: Lot): void {
    modal.open(<ModalEditarLote lote={lote} />)
  }

  function abrirVendaDireta(bid: BuyOrder): void {
    // Limite calculado ANTES de abrir, como em openSellToBidModal (linha 1735):
    // não faz sentido abrir um stepper que não pode passar de zero.
    const maxQ = Math.min(bid.qty, avail.length)
    if (maxQ <= 0) {
      toast('Você não possui moedas disponíveis para vender agora.')
      return
    }
    modal.open(<ModalVenderParaBid bidId={bid.id} maxQ={maxQ} />)
  }

  /* ---------- desenho -------------------------------------------------------- */
  return (
    <div className="cols sell">
      {/* ================= coluna 1 — escolha dos ativos ================= */}
      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24">
            <ellipse cx="12" cy="6.5" rx="7" ry="3" />
            <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
          </svg>
          Escolha os ativos
        </h3>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <span className="back-link" onClick={selecionarTodas}>
            Selecionar todas
          </span>
          <span className="back-link" onClick={limparSelecao}>
            Limpar seleção
          </span>
        </div>

        <div>
          <CoinPicker
            moedas={negociaveis}
            anunciadas={anunciadas}
            selecionadas={selecionadas}
            onToggle={alternarMoeda}
          />
        </div>

        {meusLotes.length > 0 && (
          <>
            <div className="hist-head" style={{ marginTop: 18 }}>
              Meus anúncios ativos
            </div>
            {meusLotes.map((l) => (
              <div className="hist-row" key={l.lotId}>
                <span className="d">
                  {l.coinIds.length}× {COIN.name} · {brl(l.price)} cada
                </span>
                <span>
                  <span className="edit-link" onClick={() => abrirEdicaoDeLote(l)}>
                    Editar
                  </span>
                  <span
                    className="p"
                    style={{ color: 'var(--red)', cursor: 'pointer', fontSize: 12, marginLeft: 12 }}
                    onClick={() => void run(() => cancelLot(l.lotId))}
                  >
                    Remover
                  </span>
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ================= coluna 2 — detalhes do anúncio ================= */}
      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M9 11h7M9 15h7" />
          </svg>
          Detalhes do anúncio
        </h3>

        <div className="field-lbl">
          <svg viewBox="0 0 24 24">
            <path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4" />
          </svg>
          Quantidade a ofertar
        </div>
        <input
          type="number"
          min={0}
          max={avail.length}
          className="tinput"
          placeholder="0"
          aria-label="Quantidade a ofertar"
          value={qtyTexto}
          onChange={(e) => aoDigitarQuantidade(e.target.value)}
        />
        <div className="qty-note">
          {selecionadas.length} de {avail.length} moeda(s) disponíveis selecionada(s)
        </div>

        <div className="field-lbl">
          <svg viewBox="0 0 24 24">
            <path d="M20 12l-8 8-9-9V4h7z" />
          </svg>
          Preço unitário de venda
        </div>
        {/* inputMode="decimal" abre o teclado numérico no celular sem impedir a
            vírgula — o type continua texto porque a máscara é brasileira. */}
        <div className="price-input">
          <span>R$</span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Preço unitário de venda em reais"
            value={precoTexto}
            onChange={(e) => setPrecoTexto(e.target.value)}
          />
        </div>

        <div className="summary-row">
          <span className="k">Subtotal (qtd. × preço)</span>
          <span className="v">{gross > 0 ? brl(gross) : '—'}</span>
        </div>
        <div className="summary-row">
          <span className="k">Taxa total (0,5% + R$1,00 por moeda)</span>
          <span className="v">{fee > 0 ? brl(fee) : '—'}</span>
        </div>
        <div className="summary-row total">
          <span className="k">Valor líquido estimado</span>
          {/* 19px sobrescreve os 21px de .summary-row.total .v — está inline no
              original e continua inline aqui pelo mesmo motivo: precedência. */}
          <span className="v" style={{ fontSize: 19 }}>
            {net > 0 ? brl(net) : '—'}
          </span>
        </div>

        <div className="field-lbl">
          <svg viewBox="0 0 24 24">
            <path d="M4 5h16v11H8l-4 4z" />
          </svg>
          Observação (opcional)
        </div>
        <textarea
          className="obs"
          maxLength={140}
          placeholder="Ex.: moedas em custódia, prontas para negociação."
          aria-label="Observação do anúncio"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />

        <div className={termsOk ? 'terms on' : 'terms'} onClick={() => setTermsOk(!termsOk)}>
          <span className="cb">{termsOk ? '✓' : ''}</span>
          <span>
            Aceito os <b>termos de publicação</b>
          </span>
        </div>

        <button
          className="btn btn-gold"
          type="button"
          disabled={!podePublicar}
          onClick={() => void publicar()}
        >
          Publicar anúncio
        </button>

        <div className="note">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
          Após publicado, o anúncio ficará visível no mercado para todas as contas até ser removido
          ou concluído.
        </div>
      </div>

      {/* ================= coluna 3 — bids recebidos e formação de preço ====== */}
      <div>
        <div className="panel" style={{ marginBottom: 18 }}>
          <h3>
            <svg viewBox="0 0 24 24">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            Ofertas de compra recebidas
          </h3>
          {bidsDeTerceiros.length ? (
            bidsDeTerceiros.map((b) => (
              <SellerBidRow
                key={b.id}
                bid={b}
                // O fallback '—' é da linha 1503: conta que saiu do estado não
                // pode derrubar a lista inteira.
                buyerName={state.users[b.buyer] ? state.users[b.buyer].name : '—'}
                onSellDirect={() => abrirVendaDireta(b)}
              />
            ))
          ) : (
            <div className="empty">Nenhuma oferta de compra no momento.</div>
          )}
        </div>

        <div className="panel">
          <h3>
            <svg viewBox="0 0 24 24">
              <path d="M12 3v18M8 7h6a3 3 0 010 6H9a3 3 0 000 6h7" />
            </svg>
            Como o preço é formado
          </h3>

          <div className="how-row">
            <div className="hi">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
              </svg>
            </div>
            Você define o valor.
          </div>
          <div className="how-row">
            <div className="hi">
              <svg viewBox="0 0 24 24">
                <circle cx="9" cy="8" r="3.2" />
                <circle cx="16.5" cy="9.5" r="2.6" />
                <path d="M3 20c.8-3.4 3.2-5 6-5s5.2 1.6 6 5M14 15.5c2.4.2 4.3 1.6 5 4.5" />
              </svg>
            </div>
            Compradores fazem ofertas — ou você pode vender direto para uma oferta já publicada.
          </div>
          <div className="how-row">
            <div className="hi">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            A plataforma não recomenda preço.
          </div>

          <div className="avg-box" style={{ marginTop: 14 }}>
            <div className="l">Média de mercado — 7 dias</div>
            {/* avg7 devolve null sem negociação nos últimos 7 dias, e aí é traço:
                média zero seria uma informação falsa. */}
            <div className="v">{media7 ? brl(media7) : '—'}</div>
            <div className="s">Referência informativa, não recomendação</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Modal — editar anúncio já publicado (renderEditLotModal, linhas 1669-1690)  */
/* ========================================================================== */

/**
 * O `editLotTemp` do monolito era uma global com {price, qty, maxQty}; aqui é
 * estado local do componente da modal, que nasce e morre com ela.
 *
 * Uma diferença sem efeito prático: no original, clicar no stepper redesenhava
 * a modal inteira e REFORMATAVA o preço digitado ('300' virava '300,00'), porque
 * o value era reescrito a partir de editLotTemp.price. Aqui o texto digitado
 * fica como está e só é interpretado na hora de salvar — o número que vai para o
 * servidor é o mesmo nos dois casos.
 */
function ModalEditarLote({ lote }: { lote: Lot }): ReactNode {
  const { run } = useApp()
  const { close } = useModal()
  const toast = useToast()

  const maxQty = lote.coinIds.length
  const [precoTexto, setPrecoTexto] = useState(() =>
    (lote.price / 100).toFixed(2).replace('.', ','),
  )
  const [qty, setQty] = useState(maxQty)

  function ajustar(d: number): void {
    setQty((atual) => Math.min(maxQty, Math.max(1, atual + d)))
  }

  function salvar(): void {
    const cents = parsePrice(precoTexto)
    // A modal NÃO fecha quando o preço é inválido (linha 1692): a pessoa precisa
    // ver o campo para corrigi-lo.
    if (!cents || cents <= 0) {
      toast('Informe um preço válido.')
      return
    }
    close()
    void run(() => editLot(lote.lotId, cents, qty))
  }

  return (
    <>
      <h3 className="serif">Editar anúncio</h3>
      <p>
        {COIN.name} — {maxQty} moeda(s) anunciada(s) atualmente.
      </p>

      <div className="field-lbl">Novo preço unitário</div>
      <div className="price-input">
        <span>R$</span>
        <input
          inputMode="decimal"
          aria-label="Novo preço unitário em reais"
          value={precoTexto}
          onChange={(e) => setPrecoTexto(e.target.value)}
        />
      </div>

      <div className="field-lbl">Quantidade anunciada</div>
      <div className="stepper">
        <button type="button" disabled={qty <= 1} onClick={() => ajustar(-1)} aria-label="Diminuir">
          −
        </button>
        <span className="n">{qty}</span>
        <button
          type="button"
          disabled={qty >= maxQty}
          onClick={() => ajustar(1)}
          aria-label="Aumentar"
        >
          +
        </button>
      </div>
      <p style={{ fontSize: 12, marginTop: 4 }}>
        Só é possível reduzir a quantidade aqui — moedas removidas voltam para &quot;Escolha os
        ativos&quot;. Para anunciar mais moedas, publique um novo anúncio.
      </p>

      <div className="m-actions">
        <button className="btn btn-outline" type="button" onClick={close}>
          Cancelar
        </button>
        <button className="btn btn-gold" type="button" onClick={salvar}>
          Salvar alterações
        </button>
      </div>
    </>
  )
}

/* ========================================================================== */
/* Modal — vender direto para um bid (renderSellToBidModal, linhas 1741-1763)  */
/* ========================================================================== */

/**
 * `maxQ` chega congelado do momento da abertura, como no original (linha 1735).
 * Já o bid é lido do estado VIVO a cada render: o ciclo de sincronização de 10s
 * pode derrubá-lo enquanto a modal está aberta, e nesse caso a modal se fecha
 * sozinha — é o `if(!bo){ closeModal(); return; }` da linha 1743.
 */
function ModalVenderParaBid({ bidId, maxQ }: { bidId: string; maxQ: number }): ReactNode {
  const { state, run } = useApp()
  const { close } = useModal()
  const [qty, setQty] = useState(1)

  const bo = state.buyOrders.find((b) => b.id === bidId)

  // O fechamento vai para um efeito porque mudar estado de outro componente
  // durante a renderização deste é proibido pelo React.
  useEffect(() => {
    if (!bo) close()
  }, [bo, close])

  if (!bo) return null

  const comprador = state.users[bo.buyer]
  const total = bo.price * qty

  function ajustar(d: number): void {
    setQty((atual) => Math.min(maxQ, Math.max(1, atual + d)))
  }

  function confirmar(): void {
    // Fecha ANTES de disparar, como execSellToBid (linha 1766): a confirmação já
    // foi dada, e deixar a modal aberta durante a ida ao servidor convidaria a um
    // segundo clique.
    close()
    void run(() => sellToBid(bidId, qty))
  }

  return (
    <>
      <h3 className="serif">Vender direto para esta oferta</h3>
      <p>
        Comprador: <b>{comprador ? comprador.name : '—'}</b> · Preço: <b>{brl(bo.price)}</b> por
        unidade
      </p>

      <div className="stepper" style={{ justifyContent: 'center', margin: '18px 0' }}>
        <button type="button" disabled={qty <= 1} onClick={() => ajustar(-1)} aria-label="Diminuir">
          −
        </button>
        <span className="n" style={{ fontSize: 20 }}>
          {qty}
        </span>
        <button
          type="button"
          disabled={qty >= maxQ}
          onClick={() => ajustar(1)}
          aria-label="Aumentar"
        >
          +
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>de {maxQ} disponíveis</span>
      </div>

      <p>
        Total a receber (antes da taxa): <b style={{ color: 'var(--gold)' }}>{brl(total)}</b>
      </p>

      <div className="m-actions">
        <button className="btn btn-outline" type="button" onClick={close}>
          Cancelar
        </button>
        <button className="btn btn-gold" type="button" onClick={confirmar}>
          Confirmar venda
        </button>
      </div>
    </>
  )
}

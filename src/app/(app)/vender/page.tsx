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

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { coinTypeInfo, tiposNegociaveis } from '@/domain/constants'
import {
  MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA,
  moedasComCustodiaNaoPagaDoUsuario,
} from '@/domain/bloqueio-por-debito'
import { comissaoPorMoeda, liquidoDeVendaPorMoeda } from '@/domain/fees'
import { availableCoinsForSell, avg7 } from '@/domain/market'
import { brl, parsePrice } from '@/domain/money'
import { useApp } from '@/components/providers/AppProvider'
import { useBloqueioPorPendencia } from '@/components/custody/useBloqueioPorPendencia'
import { TipoSelector } from '@/components/market/TipoSelector'
import { MinhasOfertas } from '@/components/market/MinhasOfertas'
import { ComoPrecoEFormado } from '@/components/market/ComoPrecoEFormado'
import { ComoNegociacaoAcontece } from '@/components/market/ComoNegociacaoAcontece'
import { CoinPicker } from '@/components/sell/CoinPicker'
import { ModalCustodiaNaoPaga } from '@/components/sell/ModalCustodiaNaoPaga'
import { publishOffer } from '@/server/actions/sell'

export default function VenderPage(): ReactNode {
  const { state, me, run, taxas, catalogo } = useApp()
  const { minhaContaBloqueada: pendencia, consultar } = useBloqueioPorPendencia()

  useEffect(() => {
    void consultar()
  }, [consultar])

  /** Tipos que a plataforma aceita negociar hoje — do catálogo vigente, editado no painel (C3). */
  const NEGOCIAVEIS = tiposNegociaveis(catalogo)
  const primeiroTipo = NEGOCIAVEIS[0]?.key ?? ''

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

  /**
   * Tipo de moeda que está sendo anunciado. Não existia no monolito porque só
   * havia um ativo negociável; agora é o que dá sentido ao preço unitário — sem
   * ele, "R$ 450,00 cada" não diz de qual moeda se está falando.
   *
   * Nasce no primeiro tipo do catálogo (a moeda-referência), e não no primeiro
   * que o usuário possui: assim a tela abre sempre no mesmo lugar, e quem não
   * tem Bandeira vê a pasta vazia com o motivo à vista em vez de ser levado a
   * um tipo que não escolheu.
   */
  const [tipoAtivo, setTipoAtivo] = useState<string>(primeiroTipo)

  /** Categorias abertas na lista de moedas. Ver a nota em components/market/Folder. */
  const [abertas, setAbertas] = useState<ReadonlySet<string>>(() => new Set())

  /* ---------- recortes do estado (as mesmas quatro linhas do renderSell) ----- */
  // Todas as moedas de tipos negociáveis: é o universo das pastas. As não
  // negociáveis ficam de fora porque esta tela existe para anunciar.
  const negociaveis = me.coins.filter((c) => coinTypeInfo(c.tipoMoeda, catalogo).negociavel)
  const anunciadas = new Set(state.sellOffers.map((o) => o.coinId))
  // Livres DO TIPO ATIVO — é o teto do campo de quantidade e da seleção.
  const avail = availableCoinsForSell(state, me, tipoAtivo, catalogo)
  const media7 = avg7(state, tipoAtivo)

  /** Quantas moedas livres o usuário tem de cada tipo — alimenta o seletor. */
  const livresPorTipo: Record<string, string> = {}
  NEGOCIAVEIS.forEach((t) => {
    const n = availableCoinsForSell(state, me, t.key, catalogo).length
    livresPorTipo[t.key] = `${n} disponível(is)`
  })

  /* ---------- pré-seleção vinda do certificado (?moeda=RO-000042) ------------ */
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
    // O tipo vem da moeda, não do seletor: quem chegou aqui pelo botão "Colocar
    // à venda" do certificado já escolheu a moeda, e deixar o seletor no tipo
    // padrão faria a própria moeda pré-selecionada aparecer bloqueada como
    // "outro tipo".
    const moeda = me.coins.find((c) => c.id === moedaParam)
    if (!moeda) return
    setTipoAtivo(moeda.tipoMoeda)
    setAbertas(new Set([coinTypeInfo(moeda.tipoMoeda, catalogo).categoria]))
    setSelecionadas([moedaParam])
    setQtyTexto('1')
    // `me.coins` fora das dependências de propósito: o efeito consome o
    // parâmetro UMA vez (ver o `paramConsumido` acima) e reexecutá-lo a cada
    // chegada de estado novo remarcaria a moeda que o usuário acabou de
    // desmarcar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const feeUnit = cents > 0 ? comissaoPorMoeda(cents, 'vendedor', taxas) : 0
  const fee = feeUnit * qty
  const netUnit = cents > 0 ? liquidoDeVendaPorMoeda(cents, taxas) : 0
  const net = netUnit * qty
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
   * Troca o tipo anunciado. LIMPA a seleção de propósito: as moedas marcadas
   * são do tipo anterior e um lote não pode misturar ativos — carregá-las para
   * o tipo novo levaria a uma recusa do servidor que o usuário não teria como
   * antecipar. Abre também a pasta do tipo escolhido, senão o clique no seletor
   * não mostraria nada de novo.
   */
  function trocarTipo(tipo: string): void {
    setTipoAtivo(tipo)
    setSelecionadas([])
    setQtyTexto('')
    setAbertas(new Set([coinTypeInfo(tipo, catalogo).categoria]))
  }

  function alternarPasta(categoria: string): void {
    setAbertas((atual) => {
      const proxima = new Set(atual)
      if (proxima.has(categoria)) proxima.delete(categoria)
      else proxima.add(categoria)
      return proxima
    })
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

  /* ---------- desenho -------------------------------------------------------- */
  return (
    <>
      {pendencia ? (
        <div className="warn-box" style={{ marginBottom: 18 }}>
          <div>
            {MENSAGEM_RECIBO_BLOQUEADO_POR_PENDENCIA}{' '}
            <Link href="/conta/faturas">Abrir faturas de custódia</Link>
          </div>
        </div>
      ) : null}
      <div className="cols sell">
      {/* ================= coluna 1 — o anúncio, que é o que se veio fazer ====== */}
      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M9 11h7M9 15h7" />
          </svg>
          Detalhes do anúncio
        </h3>

        <TipoSelector
          name="tipo-anuncio"
          titulo="Tipo de moeda a vender"
          tipos={NEGOCIAVEIS}
          valor={tipoAtivo}
          onChange={trocarTipo}
          detalhePorTipo={livresPorTipo}
        />

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
          {selecionadas.length} de {avail.length} {tipoAtivo} disponível(is) selecionada(s)
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
          <span className="k">Comissão de venda (0,5% + R$ 1,00/moeda)</span>
          <span className="v">{fee > 0 ? `- ${brl(fee)}` : '—'}</span>
        </div>
        <div className="summary-row total">
          <span className="k">Você recebe</span>
          {/* 19px sobrescreve os 21px de .summary-row.total .v — está inline no
              original e continua inline aqui pelo mesmo motivo: precedência. */}
          <span className="v" style={{ fontSize: 19 }}>
            {net > 0 ? (
              qty > 1 ? `${brl(net)} (${brl(netUnit)}/moeda)` : brl(net)
            ) : '—'}
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
          disabled={!podePublicar || pendencia}
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

      {/* ====== coluna 2 — escolha da moeda específica, para quem precisa ====== */}
      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24">
            <ellipse cx="12" cy="6.5" rx="7" ry="3" />
            <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
          </svg>
          Escolha as moedas
        </h3>

        <TipoSelector
          name="tipo-venda"
          titulo="Tipo de moeda a vender"
          tipos={NEGOCIAVEIS}
          valor={tipoAtivo}
          onChange={trocarTipo}
          detalhePorTipo={livresPorTipo}
        />

        <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
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
            tipoAtivo={tipoAtivo}
            abertas={abertas}
            onToggleFolder={alternarPasta}
            onToggle={alternarMoeda}
          />
        </div>
      </div>

      {/* ================= coluna 3 — bids recebidos e formação de preço ====== */}
      <div>
        {/* O painel "Ofertas de compra recebidas" saiu daqui em 28/09/2026, a
            pedido do Gabriel: ficava sempre desatualizado (o ciclo de
            sincronização de 10s não é rápido o bastante para uma lista que o
            comprador também está mexendo) e a venda direta a partir dela não
            era usada. Quem quiser vender continua publicando o anúncio à
            esquerda — é o motor de casamento automático que encontra o
            comprador, sem precisar que o vendedor escolha um da lista. */}
        <ComoPrecoEFormado tipoAtivo={tipoAtivo} media7={media7} style={{ marginBottom: 18 }} />
        <ComoNegociacaoAcontece />
      </div>
    </div>

    <div style={{ marginTop: 24 }}>
      <MinhasOfertas />
    </div>
    </>
  )
}

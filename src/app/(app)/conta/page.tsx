'use client'

/**
 * 3.0 MINHA CONTA — port de aurea-mvp-teste.html, renderAccount (2582-2664) e
 * toggleAcctShowAll (2581).
 *
 * CLIENT COMPONENT DE PROPÓSITO
 * -----------------------------
 * Tudo aqui depende do estado vivo que o AppProvider mantém sincronizado a cada
 * 10s: o saldo muda quando alguém compra do usuário, "Ativos à venda" muda
 * quando um lote é comprado, e a pill "À venda" de cada moeda muda junto. Um
 * Server Component congelaria a tela no instante da requisição, que é
 * justamente o que o ciclo de sincronização do original existia para evitar.
 *
 * O TÍTULO DA PÁGINA NÃO ESTÁ AQUI. O original abria renderAccount escrevendo
 * '<h1>Minha conta</h1><p>Olá, ${primeiro nome}</p>' dentro de #pageTitle; neste
 * port quem monta esse par é a Topbar, derivando-o da rota (ver o comentário no
 * topo de components/shell/Topbar.tsx). Os textos são os mesmos, ao caractere.
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { COIN, LOGO_AUREA } from '@/domain/constants'
import { medianSellPrice } from '@/domain/market'
import { brl } from '@/domain/money'
import type { Cents, Coin } from '@/domain/types'
import { ModalDadosPessoais, ModalNotificacoes } from '@/components/account/AccountModals'
import { useApp } from '@/components/providers/AppProvider'
import { CoinArt } from '@/components/svg/CoinArt'
import { useModal } from '@/components/ui/Modal'

/** Quantas moedas aparecem antes de o "Ver todas" ser oferecido (linha 2591). */
const VISIVEIS = 4

export default function ContaPage(): ReactNode {
  const { state, session, me } = useApp()
  const { open } = useModal()
  const router = useRouter()

  /**
   * O `acctShowAll` global do monolito (linha 903). Lá, go('account') o zerava a
   * cada entrada na tela (linha 1119); aqui isso é de graça — o estado nasce
   * junto com a página e some quando o roteador a desmonta.
   */
  const [showAll, setShowAll] = useState(false)

  const med = medianSellPrice(state)

  const aVenda = state.sellOffers.filter((o) => o.seller === session).length
  const aCompra = state.buyOrders.filter((b) => b.buyer === session).reduce((s, b) => s + b.qty, 0)

  /**
   * Valor exibido de cada moeda. Só a moeda-referência é negociada, então só ela
   * ganha o preço de mercado; as demais mostram a estimativa gravada na custódia.
   * O `&& med` importa: sem negociação nem oferta aberta, medianSellPrice devolve
   * null e a linha volta para o valor estimado em vez de mostrar "R$ 0,00".
   */
  const valOf = (c: Coin): Cents => (c.tipoMoeda === COIN.name && med ? med : c.valorEstimado)

  const coins = me.coins
  const shown = showAll ? coins : coins.slice(0, VISIVEIS)

  return (
    <>
      <div className="stats four" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="stat-ico">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M16 13h2M3 11h18" />
            </svg>
          </div>
          <div>
            <div className="lbl">Saldo disponível</div>
            {/* .val.small: o saldo é o único número desta faixa que passa de seis
                dígitos e precisa da fonte menor para não quebrar o cartão. */}
            <div className="val small">{brl(me.balance)}</div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-ico">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="lbl">Moedas tokenizadas</div>
            <div className="val">{coins.length}</div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-ico">
            <svg viewBox="0 0 24 24">
              <path d="M20 12l-8 8-9-9V4h7z" />
              <circle cx="7.5" cy="7.5" r="1.3" />
            </svg>
          </div>
          <div>
            <div className="lbl">Ativos à venda</div>
            {/* Conta OFERTAS, não lotes: um anúncio de 3 moedas são 3 registros
                em sellOffers, e é isso que o usuário tem exposto no mercado. */}
            <div className="val">{aVenda}</div>
          </div>
        </div>

        <div className="stat">
          <div className="stat-ico">
            <svg viewBox="0 0 24 24">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
          <div>
            <div className="lbl">Ativos à compra</div>
            {/* Soma as quantidades RESTANTES das ordens de compra: uma ordem de 5
                que já teve 2 preenchidas conta 3. */}
            <div className="val">{aCompra}</div>
          </div>
        </div>
      </div>

      <div className="cols-rev">
        <div className="panel">
          <h3>
            <svg viewBox="0 0 24 24">
              <ellipse cx="12" cy="6.5" rx="7" ry="3" />
              <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
            </svg>
            Minhas moedas
          </h3>

          {shown.length ? (
            shown.map((c) => <LinhaMoeda key={c.id} coin={c} valor={valOf(c)} />)
          ) : (
            <div className="empty">Nenhuma moeda nesta conta de teste ainda.</div>
          )}

          {coins.length > VISIVEIS && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <span className="back-link" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Mostrar menos ↑' : 'Ver todas as moedas →'}
              </span>
            </div>
          )}
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <h3>Configurações rápidas</h3>

            {/* Os três atalhos do original: dois abrem modal, um navega. Ficaram
                <div> com onClick, como lá — .qk-row é uma linha inteira clicável
                e transformá-la em <a> traria o sublinhado do link para dentro dos
                dois textos empilhados. */}
            <div className="qk-row" onClick={() => open(<ModalDadosPessoais />)}>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
              </svg>
              <div className="qk-t">
                <div className="qk-name">Dados pessoais</div>
                <div className="qk-sub">Gerencie suas informações</div>
              </div>
              <span className="arr">›</span>
            </div>

            <div className="qk-row" onClick={() => router.push('/conta/configuracoes')}>
              <svg viewBox="0 0 24 24">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <div className="qk-t">
                <div className="qk-name">Segurança</div>
                <div className="qk-sub">Senha, autenticação e acesso</div>
              </div>
              <span className="arr">›</span>
            </div>

            <div className="qk-row" onClick={() => open(<ModalNotificacoes />)}>
              <svg viewBox="0 0 24 24">
                <path d="M6 9a6 6 0 0112 0v5l2 3H4l2-3z" />
                <path d="M10 20a2 2 0 004 0" />
              </svg>
              <div className="qk-t">
                <div className="qk-name">Notificações</div>
                <div className="qk-sub">Preferências e alertas</div>
              </div>
              <span className="arr">›</span>
            </div>
          </div>

          <div className="panel" style={{ textAlign: 'center' }}>
            <div className="logo-box logo-footer" style={{ marginBottom: 10 }}>
              {/* Mesma logo do menu (linha 2663 do original). <img> puro e não
                  next/image: o webp de marca já vem otimizado de /public e as
                  dimensões saem do CSS. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_AUREA} alt="Áurea Custódia" />
            </div>
            <div className="note" style={{ justifyContent: 'center', textAlign: 'center' }}>
              Você está em um ambiente de teste seguro. A Áurea Custódia protege o que tem valor
              para gerações.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------
 * Linha de moeda
 * ---------------------------------------------------------------------- */

interface LinhaMoedaProps {
  coin: Coin
  /** Já resolvido pelo pai (valOf): mediana de mercado ou valor estimado. */
  valor: Cents
}

/**
 * Uma moeda do inventário (linhas 2596-2610).
 *
 * A estrutura .a-line2 / .a-actions parece redundante no desktop — os dois são
 * display:contents ali — mas NÃO pode ser achatada: no celular (responsive.css,
 * <=560px) eles voltam a ser caixas e viram a segunda e a terceira linha da
 * pilha. Sem os invólucros, o layout mobile deixa de existir.
 */
function LinhaMoeda({ coin, valor }: LinhaMoedaProps): ReactNode {
  const { state } = useApp()
  const router = useRouter()

  const listed = state.sellOffers.some((o) => o.coinId === coin.id)
  // 'Retirado' vem do NFT extinto (retirada física, bloco 4.3 — ainda não
  // implementado); no MVP nenhuma moeda chega nesse estado, mas o ramo existe.
  const status = coin.nft.status === 'Extinto' ? 'Retirado' : listed ? 'À venda' : 'Em custódia'
  const pill = status === 'Em custódia' ? 'g' : status === 'À venda' ? 'y' : 'n'

  return (
    <div className="acct-row">
      <CoinArt type={coin.tipoMoeda} />
      <div className="a-info">
        {/* O ano só acompanha o nome nas moedas que NÃO são a de referência —
            a "Entrega da Bandeira Olímpica" é sempre 2012 e repetir o ano ali
            seria ruído. */}
        <div className="a-name">
          {coin.tipoMoeda}
          {coin.tipoMoeda !== COIN.name ? ' ' + coin.ano : ''}
        </div>
        <div className="a-line2">
          <span className="a-meta">
            {coin.id} · {coin.nft.codigo}
          </span>
          <span className="a-val">{brl(valor)}</span>
        </div>
        <div className="a-actions">
          <span className={'pill ' + pill}>{status}</span>
          {/* openNftDetail(session, id) do original virou rota: /recibos/<id>.
              Continua <button> e não <Link> porque .btn-outline não zera o
              sublinhado que o navegador dá a <a> — viraria um botão sublinhado.
              Os dois valores inline são os da linha 2607. */}
          <button
            className="btn btn-outline"
            type="button"
            style={{ padding: '7px 14px', fontSize: '12.5px' }}
            onClick={() => router.push(`/recibos/${coin.id}`)}
          >
            Ver recibo
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

/**
 * 3.0 MINHA CONTA — port de aurea-mvp-teste.html, renderAccount (2582-2664) e
 * toggleAcctShowAll (2581).
 *
 * CLIENT COMPONENT DE PROPÓSITO
 * -----------------------------
 * Tudo aqui depende do estado vivo que o AppProvider mantém sincronizado a cada
 * 10s: o saldo muda quando alguém compra do usuário, "Ativos à venda" muda
 * quando um lote é comprado, e o selo "À venda" de cada moeda muda junto. Um
 * Server Component congelaria a tela no instante da requisição, que é
 * justamente o que o ciclo de sincronização do original existia para evitar.
 *
 * O TÍTULO DA PÁGINA NÃO ESTÁ AQUI. O original abria renderAccount escrevendo
 * '<h1>Minha conta</h1><p>Olá, ${primeiro nome}</p>' dentro de #pageTitle; neste
 * port quem monta esse par é a Topbar, derivando-o da rota (ver o comentário no
 * topo de components/shell/Topbar.tsx). Os textos são os mesmos, ao caractere.
 */

import Link from 'next/link'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { COIN, LOGO_REAL_MARCA, tiposNegociaveis } from '@/domain/constants'
import { temCadastroCompleto, temDadosBancarios } from '@/domain/cadastro'
import { medianSellPrice } from '@/domain/market'
import { brl } from '@/domain/money'
import type { Cents, Coin } from '@/domain/types'
import {
  ModalCadastro,
  ModalDadosPessoais,
  ModalDeposito,
  ModalNotificacoes,
  ModalSaque,
} from '@/components/account/AccountModals'
import { AvisoDebitoCustodia } from '@/components/custody/AvisoDebitoCustodia'
import { ResumoDaCustodia } from '@/components/custody/ResumoDaCustodia'
import { useApp } from '@/components/providers/AppProvider'
import { CoinArt } from '@/components/svg/CoinArt'
import { useModal } from '@/components/ui/Modal'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { Selo } from '@/components/ui/Selo'

/** Quantas moedas aparecem antes de o "Ver todas" ser oferecido (linha 2591). */
const VISIVEIS = 4

export default function ContaPage(): ReactNode {
  const { state, session, me, catalogo } = useApp()
  const { open } = useModal()

  /**
   * O `acctShowAll` global do monolito (linha 903). Lá, go('account') o zerava a
   * cada entrada na tela (linha 1119); aqui isso é de graça — o estado nasce
   * junto com a página e some quando o roteador a desmonta.
   */
  const [showAll, setShowAll] = useState(false)

  const aVenda = state.sellOffers.filter((o) => o.seller === session).length
  const aCompra = state.buyOrders.filter((b) => b.buyer === session).reduce((s, b) => s + b.qty, 0)
  const saquesPendentes = (state.saques ?? []).filter(
    (s) => s.userEmail === session && (s.status === 'solicitado' || s.status === 'em_processamento'),
  )

  /**
   * Mediana de mercado de cada tipo negociável, calculada UMA vez por tipo.
   *
   * Antes era um único `med`, porque só um ativo tinha mercado. Chamar
   * medianSellPrice dentro de `valOf` varreria `sellOffers` inteiro a cada
   * moeda da lista — com 21 moedas na conta são 21 varreduras para responder
   * duas perguntas distintas.
   */
  const medPorTipo: Record<string, Cents | null> = {}
  tiposNegociaveis(catalogo).forEach((t) => {
    medPorTipo[t.key] = medianSellPrice(state, t.key)
  })

  /**
   * Valor exibido de cada moeda: preço de mercado do TIPO dela quando existe,
   * senão a estimativa gravada na custódia. O teste de veracidade (`?? null`
   * seguido de `? :`) importa: sem negociação nem oferta aberta,
   * medianSellPrice devolve null e a linha volta para o valor estimado em vez
   * de mostrar "R$ 0,00".
   */
  const valOf = (c: Coin): Cents => {
    const med = medPorTipo[c.tipoMoeda]
    return med ? med : c.valorEstimado
  }

  const coins = me.coins
  const shown = showAll ? coins : coins.slice(0, VISIVEIS)

  // Os dois caminhos de dinheiro, cada um com a trava de cadastro que já existia.
  const abrirDeposito = (): void => {
    if (temCadastroCompleto(me)) {
      open(<ModalDeposito />)
    } else {
      open(<ModalCadastro motivo="deposito" onSuccess={() => open(<ModalDeposito />)} />)
    }
  }
  const abrirSaque = (): void => {
    if (temDadosBancarios(me)) {
      open(<ModalSaque />)
    } else {
      open(<ModalCadastro motivo="saque" onSuccess={() => open(<ModalSaque />)} />)
    }
  }

  return (
    <>
      {/* Aviso de cadastro pendente (D-7, 11/09/2026).
          Fica no topo, some sozinho quando o cadastro fecha, e existe porque o
          pop-up que aparece na frente da ação é o caminho principal — este é o
          lembrete para quem fechou a modal e saiu da tela. */}
      {!temCadastroCompleto(me) ? (
        <div className="note aviso-cadastro" role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16v.5" />
          </svg>
          <span className="aviso-cadastro-tx">
            <b>Complete seu cadastro</b> para depositar, comprar ou enviar moedas para custódia.
            São quatro dados e leva menos de um minuto.
          </span>
          <button
            className="btn btn-outline auto"
            type="button"
            onClick={() => open(<ModalCadastro motivo="configuracoes" />)}
          >
            Completar cadastro
          </button>
        </div>
      ) : null}

      {/* TOPO DA CONTA (25/10/2026): o saldo ganhou um cartão próprio, com Depositar como ação
          principal da tela e Sacar ao lado; os três contadores do acervo ficam à direita. Antes os
          quatro números eram cartões iguais e os dois botões de dinheiro ficavam espremidos dentro
          do primeiro. Mesmas ações, mesmas travas de cadastro e de dados bancários. */}
      <div className="conta-topo">
        <section className="panel conta-saldo" aria-labelledby="conta-saldo-titulo">
          <h2 id="conta-saldo-titulo" className="eyebrow">
            Saldo disponível
          </h2>
          <div className="conta-saldo-val">{brl(me.balance)}</div>

          {/* Ações financeiras: depósito e saque.
              Regras da publicação (Seção 3.3 do Plano Executivo):
              1. Cadastro formal progressivo acionado no primeiro movimento de dinheiro.
              2. Saque de dinheiro exige dados bancários ou Pix cadastrados. Sem eles, o
                 motivo e o prazo D+3 ficam explícitos logo abaixo. */}
          <div className="acoes">
            <button className="btn btn-gold" type="button" onClick={abrirDeposito}>
              Depositar
            </button>
            <button className="btn btn-outline" type="button" onClick={abrirSaque}>
              Sacar
            </button>
          </div>

          {!temDadosBancarios(me) && (
            <p className="conta-saldo-nota">
              Cadastre sua chave Pix ou dados bancários para liberar saques (prazo D+3).{' '}
              <button
                type="button"
                className="link-btn inline"
                onClick={() => open(<ModalCadastro motivo="saque" onSuccess={() => open(<ModalSaque />)} />)}
              >
                Cadastrar dados
              </button>
            </p>
          )}

          {saquesPendentes.length > 0 && (
            <div className="conta-saques" role="status">
              <div className="t">Saque em processamento (D+3)</div>
              {saquesPendentes.map((sq) => (
                <div key={sq.id} className="d">
                  {brl(sq.valorLiquido)} líquido · Previsão até{' '}
                  {new Date(sq.previsaoPagamentoEm).toLocaleDateString('pt-BR')} ·{' '}
                  {sq.status === 'em_processamento'
                    ? 'Pix enviado, aguardando confirmação'
                    : 'aguardando aprovação da equipe'}
                </div>
              ))}
              <div className="d">
                O valor já saiu do seu saldo e fica reservado para o saque. Se o pedido for recusado, ele volta
                integralmente.
              </div>
            </div>
          )}
        </section>

        <dl className="conta-contadores">
          <div className="kpi">
            <dt className="lbl">Moedas em custódia</dt>
            <dd className="val ouro">{coins.length}</dd>
          </div>
          <div className="kpi">
            {/* Conta OFERTAS, não lotes: um anúncio de 3 moedas são 3 registros
                em sellOffers, e é isso que o usuário tem exposto no mercado. */}
            <dt className="lbl">Moedas à venda</dt>
            <dd className="val">{aVenda}</dd>
          </div>
          <div className="kpi">
            {/* Soma as quantidades RESTANTES das ordens de compra: uma ordem de 5
                que já teve 2 preenchidas conta 3. */}
            <dt className="lbl">Moedas à compra</dt>
            <dd className="val">{aCompra}</dd>
          </div>
        </dl>
      </div>

      <div className="cols-rev">
        <div className="panel">
          <h3>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="6.5" rx="7" ry="3" />
              <path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11" />
            </svg>
            Minhas moedas
          </h3>

          <AvisoDebitoCustodia estilo={{ marginTop: 0, marginBottom: 14 }} />

          {shown.length ? (
            shown.map((c) => <LinhaMoeda key={c.id} coin={c} valor={valOf(c)} />)
          ) : (
            <EstadoVazio
              titulo="Você ainda não tem moedas em custódia."
              ilustracao="semItens"
              acao={
                <Link href="/envios" className="btn btn-outline">
                  Enviar uma moeda
                </Link>
              }
            >
              A moeda aparece aqui assim que for aceita na avaliação, com o recibo que libera a negociação.
            </EstadoVazio>
          )}

          {coins.length > VISIVEIS && (
            <div className="mostrar-todas">
              <button type="button" className="link-btn" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Mostrar menos ↑' : `Ver todas as ${coins.length} moedas →`}
              </button>
            </div>
          )}
        </div>

        <div className="coluna-pilha">
          {/* A custódia abre a coluna lateral, acima das configurações rápidas:
              é a informação do acervo que estava faltando ao lado do acervo. O
              atalho "Faturas e planos" continua abaixo, para quem já sabe o que
              procura. */}
          <ResumoDaCustodia />

          <div className="panel">
            <h3>Configurações rápidas</h3>

            {/* Atalhos: os que abrem modal são <button>, os que navegam são <Link> (25/10/2026).
                Eram <div> com onClick — fora do Tab e sem papel para o leitor de tela. A linha
                inteira continua clicável e o desenho é o mesmo (.qk-row). */}
            <button type="button" className="qk-row" onClick={() => open(<ModalDadosPessoais />)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Dados pessoais</span>
                <span className="qk-sub">Gerencie suas informações</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </button>

            <Link href="/conta/configuracoes" className="qk-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Segurança</span>
                <span className="qk-sub">Senha, autenticação e acesso</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </Link>

            {/* O extrato é uma tela própria, não uma modal: tem tabela, filtro
                e exportação, e precisa de URL para poder ser recarregada. */}
            <Link href="/conta/extrato" className="qk-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 3h9l4 4v14H6z" />
                <path d="M9 11h7M9 15h7" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Extrato da conta</span>
                <span className="qk-sub">Suas movimentações e exportação</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </Link>

            {/* Plano de custódia: extrato do que já foi pago, preço e data da
                próxima cobrança, e o cancelamento da assinatura. */}
            <Link href="/conta/custodia" className="qk-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Minha custódia</span>
                <span className="qk-sub">Plano, extrato pago e próxima cobrança</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </Link>

            {/* Faturas de custódia e planos de assinatura */}
            <Link href="/conta/faturas" className="qk-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Faturas e planos</span>
                <span className="qk-sub">Planos de custódia, faturas e pagamentos</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </Link>

            <button type="button" className="qk-row" onClick={() => open(<ModalNotificacoes />)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9a6 6 0 0112 0v5l2 3H4l2-3z" />
                <path d="M10 20a2 2 0 004 0" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Notificações</span>
                <span className="qk-sub">Preferências e alertas</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </button>

            {/* Retirada física — D-8, 11/09/2026.
                Fica DISCRETA de propósito: é a última linha, sem destaque e sem
                cor de ação. Pedir a moeda de volta é oneroso para o cliente e
                para a empresa, e o desenho não deve estimular. Mas existe e é
                encontrável, aqui e em Meus recibos — esconder seria pior. */}
            <Link href="/retirada" className="qk-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16v13H4z" />
                <path d="M9 7V4h6v3M12 11v5M9.5 13.5L12 11l2.5 2.5" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Retiradas físicas</span>
                <span className="qk-sub">Acompanhar ou pedir a saída de uma moeda</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </Link>
          </div>

          {/* ------------------------------------------------------------------
              Documentos legais sempre à mão.

              As três páginas já existiam e só eram alcançáveis pelo rodapé e
              pelo fluxo de aceite do cadastro — ou seja, quem já tinha aceitado
              não achava mais o texto que aceitou. Pedido do Gabriel em
              21/09/2026: os Termos e a Tabela de Taxas ficam disponíveis para
              leitura a qualquer momento aqui na Minha Conta.

              São links de verdade (<Link>): documento jurídico precisa abrir em
              aba nova, ser copiável e ter endereço próprio.
              ------------------------------------------------------------- */}
          <div className="panel">
            <h3>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 3h8l4 4v14H6z" />
                <path d="M14 3v4h4M9 12h6M9 16h6" />
              </svg>
              Documentos legais
            </h3>

            <Link href="/termos" className="qk-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 3h8l4 4v14H6z" />
                <path d="M14 3v4h4" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Termos de Uso</span>
                <span className="qk-sub">O contrato que rege a sua conta e as transações</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </Link>

            <Link href="/taxas" className="qk-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Tabela de Taxas</span>
                <span className="qk-sub">Custódia, comissões do mercado, retirada e saque</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </Link>

            <Link href="/privacidade" className="qk-row">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
              </svg>
              <span className="qk-t">
                <span className="qk-name">Política de Privacidade</span>
                <span className="qk-sub">Quais dados tratamos e por quanto tempo</span>
              </span>
              <span className="arr" aria-hidden="true">
                ›
              </span>
            </Link>
          </div>

          <div className="panel conta-marca">
            <div className="logo-box logo-footer">
              {/* Mesma logo do menu (linha 2663 do original). <img> puro e não
                  next/image: o webp de marca já vem otimizado de /public e as
                  dimensões saem do CSS. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_REAL_MARCA} alt="Real Olímpico" />
            </div>
            <div className="note">O Real Olímpico protege o que tem valor para gerações.</div>
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

  const listed = state.sellOffers.some((o) => o.coinId === coin.id)
  // 'Retirado' vem do recibo extinto (retirada física, bloco 4.3 — ainda não
  // implementado); no MVP nenhuma moeda chega nesse estado, mas o ramo existe.
  const status =
    coin.recibo.status === 'Extinto'
      ? 'Retirado'
      : coin.recibo.status === 'Bloqueado'
      ? 'Bloqueado'
      : listed
      ? 'À venda'
      : 'Em custódia'
  const tom =
    status === 'Em custódia' ? 'sucesso' : status === 'À venda' ? 'ouro' : status === 'Bloqueado' ? 'perigo' : 'neutro'

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
            {coin.id} · {coin.recibo.codigo}
          </span>
          <span className="a-val">{brl(valor)}</span>
        </div>
        <div className="a-actions">
          <Selo tom={tom}>{status}</Selo>
          {/* openNftDetail(session, id) do original virou rota: /recibos/<id>. Link de verdade desde
              25/10/2026 (abre em nova aba, tem URL); o nome acessível leva o código da moeda, porque
              "Ver recibo" repetido em cada linha não diz de qual moeda é. */}
          <Link className="btn btn-outline a-recibo" href={`/recibos/${coin.id}`}>
            Ver recibo<span className="sr-only"> da moeda {coin.id}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

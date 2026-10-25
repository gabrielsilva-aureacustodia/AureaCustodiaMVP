/**
 * Landing pública do Real Olímpico — Frente 3 do polimento (25/10/2026).
 *
 * A ordem dos blocos responde, nesta sequência, às perguntas de quem nunca ouviu falar do serviço
 * (benchmark em docs/polimento/landing/BENCHMARK.md):
 *   1. O que é?               herói (cofre + moeda + recibo) + faixa "é / não é" (posicionamento no topo)
 *   1b. Por que guardar?      reserva de valor: proteger, valorizar, ganhar dinheiro (conceito da marca, não só moeda)
 *   2. Isso existe de verdade? faixa "Mercado agora" + vitrine com os números reais do livro (Heritage, StockX)
 *   3. Como funciona?         quatro passos, do correio ao recibo (Stripe, Mercury: passos numerados)
 *   4. Posso confiar?         perícia + cofre + comparação com a gaveta de casa (PCGS, Royal Mint)
 *   5. Quanto custa?          taxas da tabela VIGENTE + simulador (Robinhood, Public: preço à vista)
 *   6. Quem está por trás?    a história do Rogério (museus: contexto antes de preço)
 *   7. Dúvidas                perguntas em <details>, sem JavaScript
 *   8. Chamada final + rodapé com razão social e CNPJ
 *
 * Nenhum número é digitado aqui: taxas vêm da tabela vigente (`carregarTabelaDeTaxas`, via page.tsx), preços
 * do livro de ofertas (`carregarDestaquesDaLanding`) e a tiragem do catálogo (`COIN_TYPES`). O inventário do
 * que não pode mudar está em docs/polimento/landing/INVENTARIO.md.
 *
 * Sem 'use client'. O que hidrata no navegador são as peças de `movimento/` (cada uma pequena, cada uma com
 * "reduzir movimento" tratado), o simulador e o reveal de rolagem. Mapa do movimento: herói (revelação do
 * título, inclinação em camadas, carimbo, brilho), faixa de conceito (marquee com pausa), holofote nos pilares,
 * demonstração do marketplace (laço só na tela), jornada presa em "Como funciona", contagem nos preços.
 */

import Image from 'next/image'
import Link from 'next/link'
import { Fragment, type CSSProperties, type ReactNode } from 'react'

import { COIN_TYPES } from '@/domain/constants'
import type { DestaqueDeMercado } from '@/domain/destaques-de-mercado'
import type { TabelaDeTaxas } from '@/domain/fees'
import { brl } from '@/domain/money'

import { CoinSpecimenViewer } from './CoinSpecimenViewer'
import { DemoNegociacao } from './DemoNegociacao'
import { DestaqueDoCard } from './DestaqueDoCard'
import { FeeSimulator } from './FeeSimulator'
import { MercadoAgora } from './MercadoAgora'
import { PictureResponsiva } from './PictureResponsiva'
import { ReciboIlustrado } from './ReciboIlustrado'
import {
  ArmoredCarIcon,
  ValueReserveIcon,
  BankVaultIcon,
  ChevronDownIcon,
  MarketTradeIcon,
  ReceiptIcon,
  ShieldVaultIcon,
  UntouchedSealIcon,
} from './LandingIcons'
import { FaixaDeConceito } from './movimento/FaixaDeConceito'
import { Holofote } from './movimento/Holofote'
import { InclinacaoNoPonteiro } from './movimento/InclinacaoNoPonteiro'
import { JornadaPresa } from './movimento/JornadaPresa'
import { PublicFooter } from './PublicFooter'
import { PublicHeader } from './PublicHeader'
import { ScrollRevealInit } from './ScrollRevealInit'
import { comissaoDoLado, comissaoSimetrica } from './textoDasTaxas'
import { VideoDeFundo } from './movimento/VideoDeFundo'
import {
  CENAS_DA_JORNADA,
  FRENTE_2_MESCLADA,
  SPOTS_DA_RESERVA,
  TEXTURA_GUILLOCHE,
  VIDEO_COFRE,
  VISUAL_COFRE,
  VISUAL_COFRE_RETRATO,
  VISUAL_GAVETAS,
  VISUAL_SERRILHA,
} from './visuais'

const TIPO_BANDEIRA = 'Entrega da Bandeira Olímpica'
const TIPO_DH = 'Direitos Humanos'

function tiragem(tipo: string): string {
  return COIN_TYPES.find((c) => c.key === tipo)?.tiragem ?? '—'
}

const PASSOS = [
  { titulo: 'Envie seu item', texto: 'Você paga o frete no site e imprime a etiqueta. A postagem é pelos Correios.' },
  {
    titulo: 'A perícia confere',
    texto: 'A equipe pesa, mede e confere cada detalhe. Aprovado, o item é lacrado e vai para o cofre.',
  },
  { titulo: 'Você recebe o recibo', texto: 'O recibo mostra que o item é seu e está guardado. Ele fica na sua conta.' },
  {
    titulo: 'Venda, guarde ou retire',
    texto:
      'Venda quando quiser: quem compra fica com o recibo e o item não sai do cofre. Ou guarde, ou peça de volta.',
  },
] as const

const CONCEITOS = [
  'Proteja sua coleção',
  'Recibo no seu nome',
  'Venda quando quiser',
  'Sem frete a cada venda',
  'Potencial de valorização',
  'Cofre de padrão bancário',
  'Dinheiro no seu saldo',
  'Feito por colecionadores',
] as const

/** O título do herói em palavras, cada uma com seu atraso: a revelação por desfoque do tópico 14. */
function palavras(texto: string, inicio: number): ReactNode[] {
  // O espaço fica FORA da palavra: dentro de um inline-block ele seria engolido e as palavras se colariam.
  return texto.split(' ').map((p, i) => (
    <Fragment key={`${p}-${i}`}>
      <span className="pub-palavra" style={{ '--i': inicio + i } as CSSProperties}>
        {p}
      </span>{' '}
    </Fragment>
  ))
}

const COMPARACAO = [
  {
    criterio: 'Segurança',
    casa: 'Exposta a furto, assalto e acidente',
    cofre: 'Cofre de padrão bancário (Sicoob)',
  },
  {
    criterio: 'Conservação',
    casa: 'Oxidação, maresia e desgaste ao manusear',
    cofre: 'Ambiente controlado e lacre da perícia',
  },
  {
    criterio: 'Venda',
    casa: 'Demora e frete entre estados a cada venda',
    cofre: 'Venda no marketplace, sem frete a cada negociação',
  },
  {
    criterio: 'Comprovação',
    casa: 'Nenhum registro formal',
    cofre: 'Recibo digital ligado ao laudo da perícia',
  },
] as const

const PILARES = [
  {
    titulo: 'Proteja',
    texto: 'No cofre, seu item fica longe de furto, umidade e desgaste. Nada de guardar na gaveta.',
    Icone: ShieldVaultIcon,
    spot: SPOTS_DA_RESERVA.proteja,
  },
  {
    titulo: 'Valorize',
    texto:
      'Itens raros e bem conservados costumam ser disputados por colecionadores. Com o tempo, o seu pode ter potencial de valorização.',
    Icone: ValueReserveIcon,
    spot: SPOTS_DA_RESERVA.valorize,
  },
  {
    titulo: 'Ganhe dinheiro quando quiser',
    texto:
      'Coloque o item à venda no marketplace. Quando alguém compra, o dinheiro cai no seu saldo e você pode sacar para o banco.',
    Icone: MarketTradeIcon,
    spot: SPOTS_DA_RESERVA.ganhe,
  },
] as const

interface LandingPageProps {
  destaques?: Record<string, DestaqueDeMercado>
  taxas: TabelaDeTaxas
}

export function LandingPage({ destaques = {}, taxas }: LandingPageProps): ReactNode {
  const comissao = comissaoSimetrica(taxas)
    ? `${comissaoDoLado(taxas, 'vendedor')} por moeda, de cada lado`
    : `${comissaoDoLado(taxas, 'comprador')} de quem compra e ${comissaoDoLado(taxas, 'vendedor')} de quem vende, por moeda`
  const guarda = brl(taxas.custodiaMensalPorMoeda)

  const duvidas = [
    {
      pergunta: 'Como vocês sabem que a moeda é verdadeira?',
      resposta:
        'Toda moeda passa por perícia antes de entrar no cofre. A equipe pesa numa balança de precisão, mede o diâmetro e a espessura, faz testes que não danificam a peça e confere os detalhes do cunho. O laudo fica ligado ao recibo antes de a moeda ser lacrada.',
    },
    {
      pergunta: 'Posso tirar minha moeda do cofre?',
      resposta:
        'Sim, quando quiser. A moeda é de quem tem o recibo. Você pede a retirada pela plataforma e recebe em casa, como dizem os Termos de Uso.',
    },
    {
      pergunta: 'Quanto custa?',
      resposta: `A guarda custa ${guarda} por moeda, por mês, sem prazo mínimo. Numa venda, a comissão é de ${comissao}. Quem compra também paga o primeiro mês de guarda junto com a compra. Não há cobrança escondida: tudo está na Tabela de taxas.`,
    },
    {
      pergunta: 'O que é o recibo?',
      resposta:
        'É o comprovante digital de que a sua moeda está guardada no cofre. Quando você vende, o recibo passa para quem comprou, e a moeda continua no cofre. Assim ninguém paga frete nem corre risco de extravio a cada venda.',
    },
    {
      pergunta: 'Posso ganhar dinheiro com meus itens de coleção?',
      resposta:
        'Sim, vendendo no marketplace pelo preço que você combinar com o comprador. Você também pode guardar e esperar o momento que achar melhor para vender. Mas ninguém garante que o preço vai subir: quem decide o valor são os colecionadores.',
    },
    {
      pergunta: 'Só aceitam moedas?',
      resposta:
        'Hoje, sim: começamos pelas moedas comemorativas, e duas delas já se negociam no marketplace. A plataforma foi feita para receber outros itens de coleção com o tempo.',
    },
    {
      pergunta: 'Isso é um investimento?',
      resposta:
        'Não. O Real Olímpico é um serviço de guarda com um marketplace. Não é corretora nem instituição financeira. O preço de cada item é combinado entre quem compra e quem vende, e ninguém promete valorização.',
    },
  ]

  return (
    <main className="pub-page landing-page">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <ScrollRevealInit />
      <PublicHeader variante="landing" />

      {/* 1. HERÓI — o cofre ao fundo (Frente 2), a moeda real e o recibo: moeda → cofre → recibo
          numa imagem só. Com o cofre, ELE é o LCP (única imagem com priority); sem a Frente 2, a moeda assume. */}
      <section id="conteudo" tabIndex={-1} className="pub-hero pub-noite" aria-labelledby="hero-titulo">
        {FRENTE_2_MESCLADA && VISUAL_COFRE ? (
          <div className="pub-hero-fundo" aria-hidden="true">
            <PictureResponsiva visual={VISUAL_COFRE} retrato={VISUAL_COFRE_RETRATO} sizes="100vw" prioridade />
          </div>
        ) : null}
        <div className="pub-hero-inner">
          <div className="pub-hero-texto">
            <p className="pub-eyebrow">Guarda e marketplace de itens de coleção</p>
            <h1 id="hero-titulo" className="pub-titulo-revela">
              {palavras('Sua coleção protegida no cofre e', 0)}
              <em>{palavras('pronta para virar dinheiro.', 6)}</em>
            </h1>
            <p className="pub-lead">
              O Real Olímpico guarda seus itens de coleção em cofre e dá a cada um um recibo no seu nome. Com o
              recibo, você vende quando quiser, para outro colecionador, sem mandar nada pelo correio. Começamos
              pelas moedas comemorativas.
            </p>
            <div className="pub-acoes">
              <Link className="pub-btn pub-btn-primary pub-btn-lg" href="/cadastrar">
                Criar conta
              </Link>
              <Link className="pub-btn pub-btn-ghost pub-btn-lg" href="#como-funciona">
                Ver como funciona
              </Link>
            </div>
            <ul className="pub-hero-fatos" aria-label="Taxas em vigor">
              <li>
                <strong>{guarda}</strong> por moeda ao mês de guarda
              </li>
              <li>
                <strong>{comissaoDoLado(taxas, 'vendedor')}</strong> de comissão por moeda vendida
              </li>
              <li>
                <strong>Sem frete</strong> a cada venda
              </li>
            </ul>
          </div>

          <InclinacaoNoPonteiro className="pub-hero-visual">
            <div className="pub-hero-halo" aria-hidden="true" />
            <figure className="pub-hero-moeda">
              <span className="pub-hero-brilho" aria-hidden="true" />
              <Image
                src="/moedas/moeda-direitos-humanos-1998.png"
                alt="Moeda comemorativa de R$ 1 do cinquentenário da Declaração Universal dos Direitos Humanos, 1998"
                width={360}
                height={360}
                sizes="(max-width: 640px) 220px, 360px"
                priority={!(FRENTE_2_MESCLADA && VISUAL_COFRE)}
                loading={FRENTE_2_MESCLADA && VISUAL_COFRE ? 'eager' : undefined}
              />
            </figure>
            <ReciboIlustrado />
          </InclinacaoNoPonteiro>
        </div>
      </section>

      <MercadoAgora
        itens={[
          { tipo: TIPO_BANDEIRA, rotulo: 'Entrega da Bandeira · 2012', destaque: destaques[TIPO_BANDEIRA] },
          { tipo: TIPO_DH, rotulo: 'Direitos Humanos · 1998', destaque: destaques[TIPO_DH] },
        ]}
      />

      {/* 2. É / NÃO É — o posicionamento que a Academy detalha, logo abaixo da promessa. */}
      <section className="pub-posicao" aria-label="O que o Real Olímpico é">
        <ul>
          <li className="pub-posicao-sim">
            <ShieldVaultIcon className="pub-icone" />
            <span>
              <strong>É serviço de guarda</strong> de itens de coleção em cofre
            </span>
          </li>
          <li className="pub-posicao-sim">
            <ReceiptIcon className="pub-icone" />
            <span>
              <strong>É marketplace de recibos</strong> entre colecionadores
            </span>
          </li>
          <li className="pub-posicao-nao">
            <span>
              <strong>Não é</strong> corretora, instituição financeira nem investimento
            </span>
          </li>
        </ul>
      </section>

      <FaixaDeConceito itens={CONCEITOS} />

      {/* 2b. O CONCEITO — reserva de valor com o que a pessoa já tem: proteger, valorizar, ganhar dinheiro.
          A marca vai além das moedas, então este bloco fala de "item de coleção" e não de uma moeda só.
          Sem promessa: o fecho diz que o preço é combinado entre colecionadores. */}
      <section id="reserva" className="pub-secao pub-reserva reveal" aria-labelledby="reserva-titulo">
        <div className="pub-reserva-abertura">
        <header className="pub-secao-topo">
          <p className="pub-eyebrow">Reserva de valor</p>
          <h2 id="reserva-titulo">Um novo jeito de ter uma reserva de valor</h2>
          <p className="pub-secao-intro">
            Muita gente guarda ouro ou prata para ter uma reserva. Um item de coleção raro também pode ser uma
            reserva. E você não precisa começar do zero: talvez já tenha esse item em casa.
          </p>
        </header>
        {FRENTE_2_MESCLADA && VISUAL_SERRILHA ? (
          <figure className="pub-reserva-macro pub-revela-rolagem">
            <PictureResponsiva visual={VISUAL_SERRILHA} sizes="(max-width: 860px) 100vw, 560px" />
          </figure>
        ) : null}
        </div>
        <Holofote>
        <ul className="pub-reserva-pilares">
          {PILARES.map((p, i) => {
            const Icone = p.Icone
            return (
              <li key={p.titulo} className="reveal" data-holofote="" style={{ '--i': i } as CSSProperties}>
                <span className="pub-reserva-icone" aria-hidden="true">
                  {FRENTE_2_MESCLADA ? (
                    <span className="pub-mascara" style={{ '--src': `url(${p.spot})` } as CSSProperties} />
                  ) : (
                    <Icone className="pub-icone" />
                  )}
                </span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            )
          })}
        </ul>
        </Holofote>
        <p className="pub-reserva-aviso">
          Não prometemos valorização. O preço é sempre combinado entre quem compra e quem vende.
        </p>
      </section>

      {/* 3. MERCADO — os números reais primeiro: maior oferta de compra, média e referência externa. */}
      <section id="mercado" className="pub-secao reveal" aria-labelledby="mercado-titulo">
        <header className="pub-secao-topo">
          <p className="pub-eyebrow">Marketplace</p>
          <h2 id="mercado-titulo">Um marketplace feito para colecionadores</h2>
          <p className="pub-secao-intro">
            Quem quer comprar faz uma oferta. Quem quer vender anuncia o preço. Quando os dois combinam, o recibo muda
            de dono na hora, e o item continua no cofre. Começamos pelas moedas comemorativas: estas duas já se
            negociam aqui. Os preços abaixo vêm das ofertas reais da plataforma.
          </p>
        </header>

        <DemoNegociacao />

        <div className="pub-mercado">
          <article className="pub-cartao-moeda">
            <div className="pub-cartao-moeda-topo">
              <span className="pub-selo">100% Custodiado</span>
              <span className="pub-codigo">BR-2012-BANDEIRA</span>
            </div>
            <h3>Entrega da Bandeira · 2012</h3>
            <p className="pub-cartao-moeda-ficha">
              Moeda comemorativa de R$ 1 · Bimetálica · Londres 2012 → Rio 2016 · Tiragem {tiragem(TIPO_BANDEIRA)}
            </p>
            <DestaqueDoCard destaque={destaques[TIPO_BANDEIRA]} demanda="Alta liquidez" />
            <div className="pub-cartao-moeda-pe">
              <span>Guarda física: Cofre Sicoob</span>
              <Link href="/cadastrar" aria-label="Negociar a Entrega da Bandeira 2012 — criar conta">
                Negociar →
              </Link>
            </div>
          </article>

          <article className="pub-cartao-moeda">
            <div className="pub-cartao-moeda-topo">
              <span className="pub-selo">100% Custodiado</span>
              <span className="pub-codigo">BR-1998-DH</span>
            </div>
            <h3>Direitos Humanos · 1998</h3>
            <p className="pub-cartao-moeda-ficha">
              Moeda comemorativa de R$ 1 · Cuproníquel · Tiragem histórica de {tiragem(TIPO_DH)}
            </p>
            <DestaqueDoCard destaque={destaques[TIPO_DH]} demanda="Raridade chave" />
            <div className="pub-cartao-moeda-pe">
              <span>Guarda física: Cofre Sicoob</span>
              <Link href="/cadastrar" aria-label="Negociar a Direitos Humanos 1998 — criar conta">
                Negociar →
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* 4. COMO FUNCIONA — história presa na tela (tópico 09); no celular e com "reduzir movimento", lista. */}
      <JornadaPresa
        id="como-funciona"
        sobretitulo="Como funciona"
        titulo="Quatro passos, do correio ao cofre"
        passos={PASSOS.map((p, i) => ({ ...p, foto: FRENTE_2_MESCLADA ? CENAS_DA_JORNADA[i] : undefined }))}
      />

      {/* 5. CONFIANÇA — perícia, cofre e a comparação com a gaveta de casa. */}
      <section id="seguranca" className="pub-secao reveal" aria-labelledby="seguranca-titulo">
        <header className="pub-secao-topo">
          <p className="pub-eyebrow">Segurança</p>
          <h2 id="seguranca-titulo">Sua coleção mais segura que na gaveta de casa</h2>
          <p className="pub-secao-intro">
            Usamos os mesmos cofres, carros fortes e cuidados que bancos como o Sicoob usam. Depois da perícia,
            ninguém toca no seu item. Nem nós.
          </p>
        </header>

        {FRENTE_2_MESCLADA && VISUAL_GAVETAS ? (
          <figure className="pub-foto-cofre pub-revela-rolagem">
            <PictureResponsiva visual={VISUAL_GAVETAS} sizes="(max-width: 1192px) 100vw, 1160px" />
          </figure>
        ) : null}

        <ul className="pub-pilares">
          <li>
            <BankVaultIcon className="pub-icone" />
            <strong>Cofres especializados</strong>
            <span>Padrão de segurança bancária e controle rigoroso de acesso</span>
          </li>
          <li>
            <ArmoredCarIcon className="pub-icone" />
            <strong>Carros fortes</strong>
            <span>Transporte protegido por operações homologadas</span>
          </li>
          <li>
            <UntouchedSealIcon className="pub-icone" />
            <strong>Moeda intocada</strong>
            <span>Lacrada logo depois da avaliação e do laudo da perícia</span>
          </li>
        </ul>

        <CoinSpecimenViewer />

        <div className="pub-tabela-wrap">
          <table className="pub-tabela">
            <caption>Onde sua moeda fica mais protegida?</caption>
            <thead>
              <tr>
                <th scope="col">Critério</th>
                <th scope="col">Guardada em casa</th>
                <th scope="col">No cofre do Real Olímpico</th>
              </tr>
            </thead>
            <tbody>
              {COMPARACAO.map((c) => (
                <tr key={c.criterio}>
                  <th scope="row">{c.criterio}</th>
                  <td className="pub-tabela-casa">{c.casa}</td>
                  <td className="pub-tabela-cofre">{c.cofre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. TAXAS — números da tabela vigente; o documento completo fica em /taxas. */}
      <section id="taxas" className="pub-secao pub-secao-faixa reveal" aria-labelledby="taxas-titulo">
        <header className="pub-secao-topo">
          <p className="pub-eyebrow">Quanto custa</p>
          <h2 id="taxas-titulo">Sem taxa escondida</h2>
          <p className="pub-secao-intro">
            Digite um valor e veja quanto paga quem compra e quanto recebe quem vende.
          </p>
        </header>

        <div className="pub-precos">
          <div className="pub-preco">
            <span>Guarda no cofre</span>
            <strong>{guarda}</strong>
            <small>por moeda, por mês, sem prazo mínimo</small>
          </div>
          <div className="pub-preco">
            <span>Comissão de venda</span>
            <strong>{comissaoDoLado(taxas, 'vendedor')}</strong>
            <small>por moeda, {comissaoSimetrica(taxas) ? 'de quem compra e de quem vende' : 'de quem vende'}</small>
          </div>
          <div className="pub-preco">
            <span>Saque para o banco</span>
            <strong>{brl(taxas.taxaSaqueFixa)}</strong>
            <small>por pedido de saque</small>
          </div>
        </div>

        <FeeSimulator taxas={taxas} />

        <p className="pub-secao-rodape">
          <Link href="/taxas" className="pub-link-seta">
            Ler a tabela de taxas completa →
          </Link>
        </p>
      </section>

      {/* 7. HISTÓRIA — quem está por trás e por que o serviço existe. */}
      <section className="pub-secao reveal" aria-labelledby="historia-titulo">
        <div className="pub-historia">
          <header className="pub-secao-topo">
            <p className="pub-eyebrow">Nossa história</p>
            <h2 id="historia-titulo">De colecionador para colecionador</h2>
          </header>
          <div className="pub-historia-texto">
            <p>
              O Real Olímpico nasceu da coleção de Rogério Siqueira, um dos fundadores. Ele junta as moedas da série
              Real Olímpico. Logo viu dois problemas que todo colecionador conhece: guardar em casa dá medo, e mandar
              moeda pelo correio, com valor declarado, a cada venda para outro estado custa caro.
            </p>
            <p>
              A saída foi guardar tudo num cofre especializado. Cada moeda ganha um recibo que pode ser conferido. E
              os colecionadores vendem o recibo entre si, sem precisar despachar a moeda a cada venda.
            </p>
          </div>
        </div>
      </section>

      {/* 8. DÚVIDAS — <details> nativo: abre e fecha sem JavaScript e o texto está no HTML (bom para busca). */}
      <section id="duvidas" className="pub-secao pub-secao-faixa reveal" aria-labelledby="duvidas-titulo">
        <header className="pub-secao-topo">
          <p className="pub-eyebrow">Dúvidas</p>
          <h2 id="duvidas-titulo">Perguntas frequentes</h2>
        </header>
        <div className="pub-faq">
          {duvidas.map((d) => (
            <details key={d.pergunta}>
              <summary>
                <span>{d.pergunta}</span>
                <ChevronDownIcon className="pub-faq-seta" />
              </summary>
              <p>{d.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 9. POSICIONAMENTO + CHAMADA FINAL — a citação institucional fica inteira, como na Academy. */}
      <section
        className="pub-final pub-noite reveal"
        aria-labelledby="final-titulo"
        style={FRENTE_2_MESCLADA ? ({ '--pub-guilloche': `url(${TEXTURA_GUILLOCHE})` } as CSSProperties) : undefined}
      >
        {FRENTE_2_MESCLADA ? <VideoDeFundo {...VIDEO_COFRE} /> : null}
        <blockquote className="pub-citacao">
          &ldquo;O Real Olímpico <strong>não é corretora</strong> e não está sujeito à regulação da CVM ou do mercado
          de capitais. O Real Olímpico <strong>não é instituição financeira</strong>. O Real Olímpico{' '}
          <strong>não é plataforma de ativos digitais</strong>. O Real Olímpico é um serviço de guarda de itens de
          coleção com um marketplace onde quem guarda pode negociar o recibo do item sem precisar resgatá-lo
          fisicamente.&rdquo;
        </blockquote>
        <div className="pub-final-cta">
          <h2 id="final-titulo">Pronto para proteger sua coleção e vender quando quiser?</h2>
          <p>Crie sua conta e acompanhe o mercado.</p>
          <div className="pub-acoes">
            <Link className="pub-btn pub-btn-primary pub-btn-lg" href="/cadastrar">
              Criar minha conta
            </Link>
            <Link className="pub-btn pub-btn-ghost pub-btn-lg" href="/academy">
              Entender melhor na Academy
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}

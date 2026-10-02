/**
 * Landing institucional pública do Real Olímpico.
 *
 * Apresentação de custódia física de moedas comemorativas e marketplace de colecionadores.
 * Redesign fundamentado nos guias de aprendizado_frontend:
 * - Layout intrínseco e responsivo sem dependência de breakpoints artificiais (Guias 04 e 05)
 * - Tipografia fluida com clamp() e text-wrap: balance/pretty (Guia 03)
 * - Hero em camadas com fotos reais das moedas e aura numismática (Guia 11)
 * - Progressive enhancement para reveal de seções via IntersectionObserver (Guia 07)
 * - Conformidade rigorosa com marca masculina e ausência de terminologia proibida (CLAUDE.md)
 */

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_REAL_EMBLEMA } from '@/domain/constants'
import {
  VaultIcon,
  ReceiptIcon,
  MarketTradeIcon,
  ValueReserveIcon,
  CollectorBoxIcon,
  ShieldVaultIcon,
  ArmoredCarIcon,
  BankVaultIcon,
  UntouchedSealIcon,
} from './LandingIcons'
import { ScrollRevealInit } from './ScrollRevealInit'

const etapas = [
  {
    number: '01',
    title: 'Custódia Segura',
    text: 'O item é recebido, avaliado e mantido em acervo custodiado, em cofre especializado.',
    Icon: VaultIcon,
  },
  {
    number: '02',
    title: 'Recibo lastreado',
    text: 'Cada item aprovado recebe um comprovante digital ligado ao registro de custódia.',
    Icon: ReceiptIcon,
  },
  {
    number: '03',
    title: 'Marketplace',
    text: 'Colecionadores negociam itens elegíveis dentro da plataforma, ganhando dinheiro sobre a valorização e negociação.',
    Icon: MarketTradeIcon,
  },
] as const

export function LandingPage(): ReactNode {
  return (
    <main className="landing-page">
      <ScrollRevealInit />

      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="Real Olímpico — início">
          <Image src={LOGO_REAL_EMBLEMA} alt="Real Olímpico" width={56} height={56} priority />
          <span>
            <strong>Real Olímpico</strong>
            <small>Custódia de moedas comemorativas</small>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Acesso à plataforma">
          <Link className="landing-nav-link" href="/academy">
            Academy
          </Link>
          <Link className="btn btn-outline" href="/entrar">
            Entrar
          </Link>
          <Link className="btn landing-primary" href="/cadastrar">
            Criar conta
          </Link>
        </nav>
      </header>

      {/* BLOCO 1: Hero com fotos reais das moedas em diagonal */}
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Custódia de moedas comemorativas</p>
          <h1 id="landing-title">Transforme seus itens de colecionador em liquidez</h1>
          <p className="landing-lead">
            É possível ganhar dinheiro com moedas de colecionador e itens similares, sem depender do
            mercado paralelo. Você pode proteger seus itens de qualquer calamidade e ainda ganhar
            dinheiro com eles, sem nunca colocar nas mãos de estranhos.
          </p>
          <div className="landing-actions">
            <Link className="btn landing-primary" href="/cadastrar">
              Criar conta
            </Link>
            <Link className="btn btn-outline" href="/entrar">
              Entrar
            </Link>
          </div>
        </div>

        <div className="landing-hero-coins" aria-label="Moedas comemorativas em custódia">
          <div className="landing-hero-coins-halo" aria-hidden="true" />
          <div className="landing-hero-coins-track">
            {/* Moeda 1: Entrega da Bandeira Olímpica 2012 */}
            <div className="landing-coin-item landing-coin-bandeira">
              <Image
                src="/moedas/moeda-entrega-da-bandeira-2012.png"
                alt="Moeda comemorativa de R$ 1 da Entrega da Bandeira Olímpica Londres 2012 – Rio 2016"
                width={250}
                height={250}
                unoptimized
                priority
              />
              <span className="landing-coin-caption">Entrega da Bandeira · 2012</span>
            </div>

            {/* Moeda 2: Direitos Humanos 1998 */}
            <div className="landing-coin-item landing-coin-dh">
              <Image
                src="/moedas/moeda-direitos-humanos-1998.png"
                alt="Moeda comemorativa de R$ 1 do cinquentenário da Declaração Universal dos Direitos Humanos 1998"
                width={250}
                height={250}
                unoptimized
                priority
              />
              <span className="landing-coin-caption">Direitos Humanos · 1998</span>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 2: Um novo conceito de reserva de valor */}
      <section className="landing-reserve reveal" aria-labelledby="reserve-title">
        <div className="landing-reserve-card">
          <div className="landing-reserve-header">
            <div className="landing-reserve-badge">
              <ValueReserveIcon className="landing-badge-icon" />
              <span>Patrimônio Tangível</span>
            </div>
            <h2 id="reserve-title">Um novo conceito de reserva de valor</h2>
          </div>
          <p className="landing-reserve-text">
            Imagine ter uma reserva como ouro ou prata, mas sem precisar investir valores absurdos ou
            pagar caro na custódia, usando apenas seus itens de colecionador. Imagine ainda, com itens
            de alto valor que você já tem em casa, crescer seu patrimônio, sem precisar entender de
            jargões técnicos. Essa é a nossa proposta, através de um marketplace simples e seguro,
            começando pelas moedas de colecionador, pelas quais temos tanto carinho.
          </p>
        </div>
      </section>

      {/* BLOCO 3: Sua coleção protegida, registrada e pronta para negociar */}
      <section className="landing-process reveal" aria-labelledby="process-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Como funciona</p>
          <h2 id="process-title">Sua coleção protegida, registrada e pronta para negociar.</h2>
        </div>
        <div className="landing-steps">
          {etapas.map((step, index) => {
            const Icon = step.Icon
            return (
              <article
                className="landing-step reveal"
                key={step.number}
                style={{ '--i': index } as React.CSSProperties}
              >
                <div className="landing-step-top">
                  <span className="landing-step-num">{step.number}</span>
                  <div className="landing-step-icon-wrap" aria-hidden="true">
                    <Icon className="landing-step-icon" />
                  </div>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* BLOCO 4: De colecionador para colecionador */}
      <section className="landing-origin reveal" aria-labelledby="origin-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Nossa história</p>
          <h2 id="origin-title">De colecionador para colecionador</h2>
        </div>
        <div className="landing-origin-cards">
          <article className="landing-origin-card reveal" style={{ '--i': 0 } as React.CSSProperties}>
            <div className="landing-origin-card-top">
              <div className="landing-origin-icon-wrap" aria-hidden="true">
                <CollectorBoxIcon className="landing-origin-icon" />
              </div>
              <span className="landing-origin-tag">O desafio cotidiano</span>
            </div>
            <p>
              O Real Olímpico nasceu da experiência direta de quem vivencia o colecionismo. Rogério
              Siqueira, um dos fundadores da empresa, começou a reunir sua coleção particular da série
              de moedas comemorativas Real Olímpico e logo se deparou com desafios que todo colecionador
              conhece: a preocupação com a guarda segura em domicílio e o alto custo e o atrito dos
              fretes com declaração de valor a cada negociação entre estados.
            </p>
          </article>

          <article className="landing-origin-card reveal" style={{ '--i': 1 } as React.CSSProperties}>
            <div className="landing-origin-card-top">
              <div className="landing-origin-icon-wrap" aria-hidden="true">
                <ShieldVaultIcon className="landing-origin-icon" />
              </div>
              <span className="landing-origin-tag">A solução estruturada</span>
            </div>
            <p>
              A solução foi estruturar um serviço de custódia profissional: guarda física em cofre
              especializado, comprovação digital por meio de recibos de custódia auditáveis e um
              marketplace onde a posse das moedas pode ser negociada instantaneamente entre
              colecionadores, sem a necessidade de despachar o item físico a cada transação comercial.
            </p>
          </article>
        </div>
      </section>

      {/* BLOCO 5: Acervo físico em cofre especializado */}
      <section className="landing-assurance reveal" aria-labelledby="assurance-title">
        <div className="landing-assurance-content">
          <div className="landing-assurance-header">
            <p className="landing-eyebrow">Cuidado em cada etapa</p>
            <h2 id="assurance-title">Acervo físico em cofre especializado</h2>
          </div>
          <p className="landing-assurance-lead">
            Nós asseguramos a sua moeda com os mesmos cofres, carros fortes e mecanismos de segurança
            que bancos como o Sicoob utilizam. Seus itens não serão tocados, após a avaliação, nem
            mesmo por nós.
          </p>

          <div className="landing-assurance-pillars">
            <div className="landing-assurance-pillar">
              <div className="landing-assurance-icon-wrap" aria-hidden="true">
                <BankVaultIcon className="landing-assurance-icon" />
              </div>
              <div>
                <strong>Cofres especializados</strong>
                <span>Padrão de segurança bancária e controle rigoroso de acesso</span>
              </div>
            </div>

            <div className="landing-assurance-pillar">
              <div className="landing-assurance-icon-wrap" aria-hidden="true">
                <ArmoredCarIcon className="landing-assurance-icon" />
              </div>
              <div>
                <strong>Carros fortes</strong>
                <span>Logística e transporte protegidos por operações homologadas</span>
              </div>
            </div>

            <div className="landing-assurance-pillar">
              <div className="landing-assurance-icon-wrap" aria-hidden="true">
                <UntouchedSealIcon className="landing-assurance-icon" />
              </div>
              <div>
                <strong>Itens intocados</strong>
                <span>Lacrados imediatamente após avaliação e laudo pericial</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Posicionamento institucional */}
      <section className="landing-positioning reveal" aria-labelledby="positioning-title">
        <div className="landing-positioning-card">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Transparência e conformidade</p>
            <h2 id="positioning-title">Nosso posicionamento institucional</h2>
          </div>
          <blockquote className="landing-positioning-quote">
            &ldquo;O Real Olímpico <strong>não é corretora</strong> e não está sujeito à regulação da
            CVM ou do mercado de capitais. O Real Olímpico <strong>não é instituição financeira</strong>.
            O Real Olímpico <strong>não é plataforma de ativos digitais</strong>. O Real Olímpico é um
            serviço de guarda de itens de coleção com um marketplace onde quem guarda pode negociar o
            recibo do item sem precisar resgatá-lo fisicamente.&rdquo;
          </blockquote>
          <div className="landing-positioning-actions">
            <Link className="landing-link-academy" href="/academy">
              Entenda em detalhes no Real Olímpico Academy &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Rodapé institucional */}
      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Image src={LOGO_REAL_EMBLEMA} alt="" width={52} height={52} />
          <p>
            <strong>AUREA CUSTODIA LTDA</strong>
            <span>CNPJ 68.071.452/0001-06</span>
          </p>
        </div>
        <nav aria-label="Informações institucionais e legais">
          <Link href="/academy">Academy</Link>
          <Link href="/termos">Termos de Uso</Link>
          <Link href="/privacidade">Política de Privacidade</Link>
        </nav>
      </footer>
    </main>
  )
}

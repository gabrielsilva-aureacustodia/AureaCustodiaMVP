/** Landing institucional pública, sem estado de cliente nem dependência de banco. */

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'

const etapas = [
  {
    number: '01',
    title: 'Custódia física',
    text: 'A moeda é recebida, identificada e mantida em acervo custodiado e segurado.',
  },
  {
    number: '02',
    title: 'Recibo digital',
    text: 'Cada item aprovado recebe um comprovante digital ligado ao registro de custódia.',
  },
  {
    number: '03',
    title: 'Marketplace',
    text: 'Sócios negociam moedas elegíveis dentro da plataforma, com histórico e transparência.',
  },
] as const

export function LandingPage(): ReactNode {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="Áurea Custódia — início">
          <Image src={LOGO_AUREA} alt="Áurea Custódia" width={72} height={72} priority />
          <span>
            <strong>Áurea Custódia</strong>
            <small>Real Olímpico</small>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Acesso à plataforma">
          <Link className="btn btn-outline" href="/entrar">
            Entrar
          </Link>
          <Link className="btn landing-primary" href="/cadastrar">
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Custódia de moedas comemorativas</p>
          <h1 id="landing-title">Sua coleção protegida, registrada e pronta para negociar.</h1>
          <p className="landing-lead">
            A Áurea Custódia conecta o cuidado com o patrimônio físico a uma experiência
            digital simples para acompanhar recibos e oportunidades de mercado.
          </p>
          <div className="landing-actions">
            <Link className="btn landing-primary" href="/cadastrar">
              Criar conta
            </Link>
            <Link className="btn btn-outline" href="/entrar">
              Entrar
            </Link>
          </div>
          <p className="landing-test-note">Ambiente de teste · Pré-MVP · Dados fictícios</p>
        </div>

        <div className="landing-emblem" aria-label="Marca Áurea Custódia">
          <div className="landing-emblem-halo" aria-hidden="true" />
          <Image
            src={LOGO_AUREA}
            alt="Áurea Custódia"
            width={420}
            height={420}
            sizes="(max-width: 720px) 76vw, 380px"
            priority
          />
        </div>
      </section>

      <section className="landing-process" aria-labelledby="process-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">Como funciona</p>
          <h2 id="process-title">Do recebimento à negociação</h2>
        </div>
        <div className="landing-steps">
          {etapas.map((step) => (
            <article className="landing-step" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-assurance" aria-labelledby="assurance-title">
        <div>
          <p className="landing-eyebrow">Cuidado em cada etapa</p>
          <h2 id="assurance-title">Acervo físico com seguro confirmado</h2>
        </div>
        <p>
          A operação prevê seguro para o acervo custodiado. Detalhes de cobertura e apólice
          serão publicados quando a contratação estiver concluída.
        </p>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Image src={LOGO_AUREA} alt="" width={52} height={52} />
          <p>
            <strong>AUREA CUSTODIA LTDA</strong>
            <span>CNPJ 68.071.452/0001-06</span>
          </p>
        </div>
        <nav aria-label="Informações legais">
          <Link href="/termos">Termos de Uso</Link>
          <Link href="/privacidade">Política de Privacidade</Link>
        </nav>
      </footer>
    </main>
  )
}

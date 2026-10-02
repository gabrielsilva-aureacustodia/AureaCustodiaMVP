'use client'

/**
 * Exame Numismático de Espécime em Custódia — Real Olímpico.
 *
 * Inspirado nas melhores práticas de PCGS CoinFacts, CAC e Heritage Auctions:
 * - Alternância instantânea de faces (Anverso e Reverso)
 * - Ficha técnica pericial completa (peso a 0,01g, diâmetro, bordo, metal)
 * - Selo visual de guarda física certificada em cofre Sicoob
 * - 0 KB de dependências externas
 */

import Image from 'next/image'
import { useState, type ReactNode } from 'react'

export function CoinSpecimenViewer(): ReactNode {
  const [face, setFace] = useState<'reverso' | 'anverso'>('reverso')

  return (
    <section className="landing-specimen-section reveal" aria-labelledby="specimen-title">
      <div className="landing-section-heading">
        <p className="landing-eyebrow">Inspeção Numismática</p>
        <h2 id="specimen-title">Exame Técnico do Espécime em Custódia</h2>
        <p className="landing-lead">
          Cada moeda que entra em nosso acervo passa por rigorosa perícia física, pesagem analítica
          de precisão e catalogação técnica antes de ser lacrada em cofre bancário.
        </p>
      </div>

      <div className="landing-specimen-card">
        {/* Lado Esquerdo: Visualização da Moeda */}
        <div className="landing-specimen-visual">
          <div className="landing-specimen-toggles" role="group" aria-label="Alternar face da moeda">
            <button
              type="button"
              onClick={() => setFace('reverso')}
              className={`landing-specimen-btn ${face === 'reverso' ? 'active' : ''}`}
            >
              Reverso (Motivo Olímpico)
            </button>
            <button
              type="button"
              onClick={() => setFace('anverso')}
              className={`landing-specimen-btn ${face === 'anverso' ? 'active' : ''}`}
            >
              Anverso (Face de Valor)
            </button>
          </div>

          <div className="landing-specimen-coin-frame">
            <div className="landing-specimen-halo" aria-hidden="true" />
            <div className={`landing-specimen-coin-stage ${face === 'anverso' ? 'face-anverso' : 'face-reverso'}`}>
              {/* Moeda física real */}
              <Image
                src="/moedas/moeda-entrega-da-bandeira-2012.png"
                alt={
                  face === 'reverso'
                    ? 'Reverso da moeda comemorativa da Entrega da Bandeira Olímpica 2012'
                    : 'Anverso com valor facial de R$ 1 e grafismo marajoara'
                }
                width={260}
                height={260}
                unoptimized
                className="landing-specimen-img"
              />
            </div>
            <div className="landing-specimen-badge">
              <span className="specimen-dot" />
              <span>{face === 'reverso' ? 'Reverso · Passagem da Bandeira' : 'Anverso · Efígie & Valor de Face'}</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Ficha Pericial */}
        <div className="landing-specimen-sheet">
          <div className="landing-specimen-header">
            <span className="landing-specimen-tag">Certificação Numismática</span>
            <h3>Entrega da Bandeira Olímpica · Londres 2012 &rarr; Rio 2016</h3>
            <p className="landing-specimen-sub">
              Série Comemorativa dos Jogos Olímpicos · Emissão Oficial do Banco Central do Brasil
            </p>
          </div>

          <div className="landing-specimen-grid">
            <div className="landing-specimen-item">
              <span className="spec-label">Diâmetro Nominal</span>
              <strong className="spec-val">27,00 mm</strong>
            </div>
            <div className="landing-specimen-item">
              <span className="spec-label">Peso Homologado</span>
              <strong className="spec-val">7,00 g (± 0,01 g)</strong>
            </div>
            <div className="landing-specimen-item">
              <span className="spec-label">Espessura</span>
              <strong className="spec-val">1,95 mm</strong>
            </div>
            <div className="landing-specimen-item">
              <span className="spec-label">Bordo</span>
              <strong className="spec-val">Serrilhado intermitente</strong>
            </div>
            <div className="landing-specimen-item spec-wide">
              <span className="spec-label">Composição Metalográfica</span>
              <strong className="spec-val">Núcleo em aço inox / Anel em aço revestido de bronze</strong>
            </div>
            <div className="landing-specimen-item">
              <span className="spec-label">Tiragem Total</span>
              <strong className="spec-val">2.016.000 unidades</strong>
            </div>
            <div className="landing-specimen-item">
              <span className="spec-label">Estado de Conservação</span>
              <strong className="spec-val highlight-gold">Flor de Cunho / Soberba</strong>
            </div>
          </div>

          <div className="landing-specimen-vault-status">
            <div className="vault-status-icon" aria-hidden="true">🔒</div>
            <div className="vault-status-text">
              <strong>Guarda Física Auditada: Cofre Sicoob</strong>
              <span>Armazenada em cápsula numismática hermética com selo de inviolabilidade pericial.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

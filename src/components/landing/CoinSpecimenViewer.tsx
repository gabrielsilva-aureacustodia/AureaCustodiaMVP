'use client'

/**
 * Ficha do espécime: o que a perícia confere numa moeda antes de ela entrar no cofre (padrão PCGS CoinFacts e
 * Heritage: foto da peça ao lado da ficha técnica), com a troca anverso/reverso.
 *
 * O reverso da Entrega da Bandeira traz os anéis olímpicos cunhados pelo Banco Central. Entre 24 e 25/10/2026 a
 * face saiu da landing por causa deles; o Gabriel liberou retratar a moeda REAL com os anéis (Brandbook §8.3),
 * desde que eles apareçam só como parte da moeda — que é o caso aqui. A troca de face voltou, com a foto real.
 * Botões com 44 px (o Brandbook mediu os antigos em 40 px) e `aria-pressed` para dizer qual face está à mostra.
 *
 * A tiragem vem do catálogo (`COIN_TYPES`); os demais números da ficha são os mesmos de antes (INVENTARIO N16–N19).
 */

import Image from 'next/image'
import { useState, type ReactNode } from 'react'

import { COIN_TYPES } from '@/domain/constants'

const BANDEIRA = COIN_TYPES.find((c) => c.key === 'Entrega da Bandeira Olímpica')

const FACES = {
  reverso: {
    rotulo: 'Reverso',
    legenda: 'Reverso · passagem da bandeira',
    src: '/moedas/moeda-entrega-da-bandeira-2012.png',
    alt: 'Reverso da moeda comemorativa da Entrega da Bandeira Olímpica, Londres 2012 – Rio 2016',
  },
  anverso: {
    rotulo: 'Anverso',
    legenda: 'Anverso · valor de face',
    src: '/moedas/moeda-real-anverso.png',
    alt: 'Anverso da moeda comemorativa de R$ 1, com o valor de face e o grafismo marajoara',
  },
} as const

type Face = keyof typeof FACES

export function CoinSpecimenViewer(): ReactNode {
  const [face, setFace] = useState<Face>('reverso')
  const atual = FACES[face]

  return (
    <div className="pub-specimen">
      <figure className="pub-specimen-foto">
        <div className="pub-specimen-faces" role="group" aria-label="Face da moeda">
          {(Object.keys(FACES) as Face[]).map((f) => (
            <button key={f} type="button" aria-pressed={face === f} onClick={() => setFace(f)}>
              {FACES[f].rotulo}
            </button>
          ))}
        </div>
        <div className="pub-specimen-halo" aria-hidden="true" />
        <Image
          key={face}
          src={atual.src}
          alt={atual.alt}
          width={280}
          height={280}
          sizes="(max-width: 640px) 220px, 280px"
          className="pub-specimen-img"
        />
        <figcaption>{atual.legenda}</figcaption>
      </figure>

      <div className="pub-specimen-ficha">
        <p className="pub-tag">Ficha da perícia</p>
        <h3>Entrega da Bandeira Olímpica · Londres 2012 → Rio 2016</h3>
        <p className="pub-specimen-sub">Série comemorativa dos Jogos Olímpicos · Emissão do Banco Central do Brasil</p>

        <dl className="pub-specimen-grade">
          <div>
            <dt>Diâmetro</dt>
            <dd>27,00 mm</dd>
          </div>
          <div>
            <dt>Peso</dt>
            <dd>7,00 g (± 0,01 g)</dd>
          </div>
          <div>
            <dt>Espessura</dt>
            <dd>1,95 mm</dd>
          </div>
          <div>
            <dt>Bordo</dt>
            <dd>Serrilhado intermitente</dd>
          </div>
          <div className="pub-specimen-larga">
            <dt>Composição</dt>
            <dd>Núcleo em aço inox / Anel em aço revestido de bronze</dd>
          </div>
          <div>
            <dt>Tiragem</dt>
            <dd>{BANDEIRA?.tiragem ?? '—'} unidades</dd>
          </div>
          <div>
            <dt>Conservação</dt>
            <dd className="pub-ouro">Flor de Cunho / Soberba</dd>
          </div>
        </dl>

        <p className="pub-specimen-cofre">
          <strong>Guarda física: cofre Sicoob.</strong> Cada moeda fica em cápsula fechada, com selo da perícia.
        </p>
      </div>
    </div>
  )
}

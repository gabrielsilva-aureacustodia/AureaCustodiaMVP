/**
 * Ficha do espécime: o que a perícia confere numa moeda antes de ela entrar no cofre (padrão PCGS CoinFacts e
 * Heritage: foto da peça ao lado da ficha técnica).
 *
 * Mostra só o ANVERSO. O reverso da Entrega da Bandeira traz os anéis olímpicos, e anel olímpico não aparece
 * em arte do site (risco de PI do COB, CLAUDE.md). Até 24/10/2026 havia um botão de anverso/reverso que
 * exibia essa face — e era o único motivo de este componente ser 'use client'. Sem ele, é só marcação.
 * A decisão sobre voltar com o reverso está em docs/polimento/landing/PROPOSTAS_BACKEND.md.
 *
 * A tiragem vem do catálogo (`COIN_TYPES`); os demais números da ficha são os mesmos de antes (INVENTARIO N16–N19).
 */

import Image from 'next/image'
import type { ReactNode } from 'react'

import { COIN_TYPES } from '@/domain/constants'

const BANDEIRA = COIN_TYPES.find((c) => c.key === 'Entrega da Bandeira Olímpica')

export function CoinSpecimenViewer(): ReactNode {
  return (
    <div className="pub-specimen">
      <figure className="pub-specimen-foto">
        <div className="pub-specimen-halo" aria-hidden="true" />
        <Image
          src="/moedas/moeda-real-anverso.png"
          alt="Anverso da moeda comemorativa de R$ 1, com o valor de face e o grafismo marajoara"
          width={280}
          height={280}
          sizes="(max-width: 640px) 220px, 280px"
        />
        <figcaption>Anverso · valor de face</figcaption>
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

/**
 * O destaque de preço de cada moeda na landing (21/10/2026): a MAIOR OFERTA DE COMPRA em primeiro plano, e
 * logo abaixo a média de mercado da plataforma e a referência de mercado externo (flor de cunho).
 *
 * Os três números têm rótulos diferentes de propósito: um é o que alguém quer pagar agora, outro é o que a
 * plataforma negociou, e o terceiro é preço de fora, de moeda em flor de cunho. Sem oferta de compra a tela
 * diz isso, em vez de mostrar zero. Sem 'use client': só desenho, recebe os números prontos.
 */

import type { ReactNode } from 'react'

import { ROTULO_REFERENCIA_EXTERNA } from '@/domain/constants'
import type { DestaqueDeMercado } from '@/domain/destaques-de-mercado'
import { brl } from '@/domain/money'

export function DestaqueDoCard({ destaque, demanda }: { destaque: DestaqueDeMercado | undefined; demanda: string }): ReactNode {
  const maior = destaque?.maiorOfertaDeCompra ?? null
  const media = destaque?.mediaDeMercado ?? null
  const externa = destaque?.referenciaExterna ?? null

  return (
    <div className="landing-market-metric landing-market-metric-destaque">
      <div className="landing-market-maior" data-destaque="maior-oferta-de-compra">
        <span className="landing-market-label">Maior oferta de compra</span>
        {maior === null ? (
          <div className="landing-market-sem-oferta">Sem ofertas de compra no momento</div>
        ) : (
          <div className="landing-market-price landing-market-price-destaque">{brl(maior)}</div>
        )}
        <span className="landing-market-nota">O que um comprador paga agora por esta moeda</span>
      </div>

      <dl className="landing-market-refs">
        <div>
          <dt>Média de mercado</dt>
          <dd>{media === null ? 'Sem negociações ainda' : brl(media)}</dd>
        </div>
        {externa ? (
          <div data-destaque="referencia-externa">
            <dt>{ROTULO_REFERENCIA_EXTERNA}</dt>
            <dd>{brl(externa.valor)}</dd>
            <small>
              {externa.fonte} · cotado em {externa.cotadoEm}
            </small>
          </div>
        ) : null}
      </dl>

      <span className="landing-market-tag">{demanda}</span>
    </div>
  )
}

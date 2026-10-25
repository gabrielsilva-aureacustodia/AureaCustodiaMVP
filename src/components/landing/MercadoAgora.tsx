/**
 * Faixa "Mercado agora", logo abaixo do herói: a maior oferta de compra de cada moeda, do livro real.
 *
 * É a prova de que o marketplace existe, no lugar onde as landings estudadas põem prova social (Stripe com o
 * contador ao vivo, Heritage com "$17 Billion+ Sold"). Não temos — nem inventamos — cliente, logo ou
 * depoimento; temos o livro de ofertas. Os números são os mesmos de `DestaqueDoCard` (mesma função de domínio,
 * `destaqueDeMercado`), e sem oferta a faixa diz isso em vez de mostrar zero. Sem animação de letreiro: a
 * informação não se move (tópico 29 C). O número "conta" até o valor ao aparecer (ContagemDeValor), mas o HTML
 * do servidor já traz o valor final.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { DestaqueDeMercado } from '@/domain/destaques-de-mercado'

import { ContagemDeValor } from './movimento/ContagemDeValor'

interface MercadoAgoraProps {
  itens: readonly { tipo: string; rotulo: string; destaque: DestaqueDeMercado | undefined }[]
}

export function MercadoAgora({ itens }: MercadoAgoraProps): ReactNode {
  return (
    <section className="pub-agora" aria-labelledby="agora-titulo">
      <div className="pub-agora-inner">
        <h2 id="agora-titulo" className="pub-agora-titulo">
          <span className="pub-agora-ponto" aria-hidden="true" />
          Mercado agora
        </h2>
        <ul>
          {itens.map(({ tipo, rotulo, destaque }) => {
            const maior = destaque?.maiorOfertaDeCompra ?? null
            return (
              <li key={tipo}>
                <span className="pub-agora-moeda">{rotulo}</span>
                <span className="pub-agora-valor">
                  {maior === null ? (
                    'Sem ofertas de compra no momento'
                  ) : (
                    <>
                      <small>Maior oferta de compra</small>{' '}
                      <strong>
                        <ContagemDeValor centavos={maior} />
                      </strong>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        <Link href="#mercado" className="pub-agora-link">
          Ver o mercado →
        </Link>
      </div>
    </section>
  )
}

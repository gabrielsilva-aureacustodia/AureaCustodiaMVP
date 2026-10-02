'use client'

/**
 * Dois cartões explicativos das moedas negociáveis, abaixo dos indicadores do
 * Início: foto real, história curta, tiragem e valor médio de mercado.
 *
 * O VALOR NÃO É CALCULADO AQUI: vem de `medianSellPrice` (domain/market.ts), a
 * mesma mediana por tipo que a conta, os recibos e o certificado usam. Sem
 * oferta nem negociação do tipo ela devolve null, e o cartão diz isso em vez de
 * inventar um número ou mostrar zero.
 *
 * As fotos são de public/moedas/: a da Direitos Humanos é domínio público
 * (Wikimedia Commons) e a da Bandeira é a imagem oficial do Banco Central
 * (bcb.gov.br, Meios de Pagamento > Moedas Comemorativas), recortada em círculo.
 * É fotografia do objeto como foi cunhado, não arte própria.
 *
 * Tiragem e ficha técnica saem de COIN_TYPES para não duplicar número.
 */

import type { ReactNode } from 'react'

import { COIN_TYPES } from '@/domain/constants'
import { medianSellPrice } from '@/domain/market'
import { brl } from '@/domain/money'
import { useApp } from '@/components/providers/AppProvider'
import { CoinArt } from '@/components/svg/CoinArt'

interface Bloco {
  tipo: string
  titulo: string
  historia: string
}

const BLOCOS: Bloco[] = [
  {
    tipo: 'Direitos Humanos',
    titulo: 'Moeda dos Direitos Humanos',
    historia:
      'Emitida pelo Banco Central em dezembro de 1998 para os 50 anos da Declaração Universal dos Direitos Humanos. Traz um globo e uma figura humana estilizada e tem a menor tiragem entre as moedas de R$ 1.',
  },
  {
    tipo: 'Entrega da Bandeira Olímpica',
    titulo: 'Moeda da Entrega da Bandeira',
    historia:
      'Lançada em 2012, marca a passagem da bandeira olímpica de Londres para o Rio de Janeiro, na cerimônia de encerramento dos Jogos. Foi a primeira da série comemorativa que levou aos Jogos Rio 2016.',
  },
]

export function BlocosDeMoedas(): ReactNode {
  const { state } = useApp()

  return (
    <div className="moeda-blocos">
      {BLOCOS.map((b) => {
        const tipo = COIN_TYPES.find((t) => t.key === b.tipo)
        const medio = medianSellPrice(state, b.tipo)
        return (
          <section key={b.tipo} className="moeda-bloco">
            <div className="moeda-bloco-foto">
              <CoinArt type={b.tipo} className="coin-svg coin-showcase" />
            </div>
            <div className="moeda-bloco-tx">
              <h3>{b.titulo}</h3>
              <p>{b.historia}</p>
              {tipo && <p className="moeda-bloco-ficha">Tiragem {tipo.tiragem} · Bimetálica 27mm</p>}
              <div className="moeda-bloco-valor">
                <span className="lbl">Valor médio de mercado</span>
                <span className="val">{medio === null ? 'Sem ofertas no momento' : brl(medio)}</span>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

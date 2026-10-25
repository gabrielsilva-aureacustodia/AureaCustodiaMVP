/**
 * Demonstração viva do marketplace: a oferta de compra e o preço anunciado se encontram, o negócio fecha e o
 * recibo passa do vendedor para o comprador — enquanto o item continua no cofre. É o conceito inteiro do
 * marketplace numa cena de 8 segundos (padrão "demonstração viva" do Vercel SaaS Starter, doc 15 §1.5).
 *
 * Sem número nenhum: os rótulos dizem o que acontece, e os preços reais estão nos cartões logo abaixo
 * (regra: nada de valor inventado). A legenda numerada embaixo diz a mesma coisa em texto parado — quem não
 * vê a animação, ou pediu menos movimento, não perde nada. A animação só toca com `data-em-cena` (EmCena) e
 * sem "reduzir movimento"; fora disso a cena fica no quadro final, parada.
 */

import type { ReactNode } from 'react'

import { MarketTradeIcon, ReceiptIcon, VaultIcon } from './LandingIcons'
import { EmCena } from './movimento/EmCena'

export function DemoNegociacao(): ReactNode {
  return (
    <figure className="pub-demo-fig">
      <EmCena className="pub-demo" rotulo="Animação: como uma venda acontece no marketplace">
        <div className="pub-demo-pessoa pub-demo-comprador" aria-hidden="true">
          <span className="pub-demo-avatar">C</span>
          <span>Quem compra</span>
        </div>
        <div className="pub-demo-pessoa pub-demo-vendedor" aria-hidden="true">
          <span className="pub-demo-avatar">V</span>
          <span>Quem vende</span>
        </div>

        <span className="pub-demo-chip pub-demo-oferta" aria-hidden="true">
          Oferta de compra
        </span>
        <span className="pub-demo-chip pub-demo-anuncio" aria-hidden="true">
          Preço anunciado
        </span>
        <span className="pub-demo-fechado" aria-hidden="true">
          <MarketTradeIcon className="pub-icone" /> Negócio fechado
        </span>

        <span className="pub-demo-recibo" aria-hidden="true">
          <ReceiptIcon className="pub-icone" /> Recibo
        </span>

        <div className="pub-demo-cofre" aria-hidden="true">
          <VaultIcon className="pub-icone" />
          <span>O item continua no cofre</span>
        </div>
      </EmCena>
      <figcaption>
        <ol className="pub-demo-legenda">
          <li>Quem quer comprar faz uma oferta.</li>
          <li>Quem quer vender anuncia o preço.</li>
          <li>Quando os dois combinam, o recibo muda de dono na hora.</li>
          <li>O item não sai do cofre: ninguém paga frete.</li>
        </ol>
      </figcaption>
    </figure>
  )
}

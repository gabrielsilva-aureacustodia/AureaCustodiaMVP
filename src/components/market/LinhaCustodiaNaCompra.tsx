/**
 * A linha "Custódia (1º mês)" dos pop-ups de compra, com o sinal (i) que explica o que é (21/10/2026).
 *
 * Em toda compra o comprador paga, junto com o preço e a taxa de compra, o PRIMEIRO MÊS de custódia da moeda
 * que passa a ser dele — `custodiaDaCompraPorMoeda`. A linha existe para isso ser dito antes de o dinheiro
 * sair, no mesmo lugar em que a taxa de negociação já é dita.
 *
 * O texto do (i) é o pedido pelo Gabriel, numa frase só, e logo abaixo o caminho para a tabela de preços e
 * taxas, que abre em outra aba para o pop-up de compra continuar aberto.
 *
 * Sem estado e sem hook: é só desenho. O balão (cliente) vem do `InfoTip`.
 */

import type { ReactNode } from 'react'

import { brl } from '@/domain/money'
import type { Cents } from '@/domain/types'

import { InfoTip } from '../ui/InfoTip'

/** A frase do sinal (i), como o Gabriel pediu (21/10/2026): uma só. */
export const EXPLICACAO_DA_CUSTODIA_NA_COMPRA = 'O valor mensal da custódia da moeda em seu nome, no nosso armazenamento seguro.'

/** A tabela pública de preços e taxas, para quem quiser entender mais. */
export const LINK_DA_TABELA_DE_TAXAS = '/taxas'

export function LinhaCustodiaNaCompra({ cents }: { cents: Cents }): ReactNode {
  return (
    <div className="summary-row">
      <span className="k">
        Custódia (1º mês)
        <InfoTip titulo="custódia da moeda">
          {EXPLICACAO_DA_CUSTODIA_NA_COMPRA}
          <br />
          <a href={LINK_DA_TABELA_DE_TAXAS} target="_blank" rel="noopener noreferrer">
            Ver a tabela de preços e taxas
          </a>
        </InfoTip>
      </span>
      <span className="v">+ {brl(cents)}</span>
    </div>
  )
}

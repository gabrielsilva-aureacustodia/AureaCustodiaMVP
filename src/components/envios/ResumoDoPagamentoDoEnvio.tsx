/**
 * O resumo do que o cliente paga ao enviar moeda: Frete + 1º mês de custódia = Total (17/11/2026, frente B).
 *
 * O pagamento do envio é UM só — por saldo, Pix ou cartão — e leva o frete dos Correios e o primeiro mês de
 * custódia das moedas declaradas. A tela diz isso antes de o dinheiro sair, com as mesmas linhas e o mesmo
 * sinal (i) dos pop-ups de compra (`LinhaCustodiaNaCompra`), para o cliente reconhecer a cobrança.
 *
 * Quem calcula é o servidor (`cotarFreteDoEnvio`): esta peça só desenha o que recebe e não tem preço nenhum
 * dentro. Envio antigo, com o mês já pago à parte, mostra a linha "já pago" e o total fica só no frete.
 *
 * Sem estado e sem hook: é só desenho.
 */

import type { ReactNode } from 'react'

import { brl } from '@/domain/money'
import type { Cents } from '@/domain/types'
import { LinhaCustodiaNaCompra } from '../market/LinhaCustodiaNaCompra'

export interface ResumoDoPagamentoDoEnvioProps {
  /** Texto do rótulo do frete, ex.: "Frete SEDEX (contrato dos Correios)". */
  rotuloDoFrete: string
  freteCents: Cents
  /** O 1º mês que o mesmo pagamento cobra (0 quando já foi pago). */
  primeiroMesCents: Cents
  primeiroMesJaPago: boolean
  /** O que sai de uma vez: frete + 1º mês. */
  totalCents: Cents
}

export function ResumoDoPagamentoDoEnvio({
  rotuloDoFrete,
  freteCents,
  primeiroMesCents,
  primeiroMesJaPago,
  totalCents,
}: ResumoDoPagamentoDoEnvioProps): ReactNode {
  return (
    <div className="summary-box passo-resumo" data-testid="resumo-pagamento-envio">
      <div className="summary-row">
        <span className="k">{rotuloDoFrete}</span>
        <span className="v">{brl(freteCents)}</span>
      </div>
      {primeiroMesJaPago ? (
        <div className="summary-row">
          <span className="k">Custódia (1º mês)</span>
          <span className="v">já pago</span>
        </div>
      ) : (
        <LinhaCustodiaNaCompra cents={primeiroMesCents} />
      )}
      <div className="summary-row total">
        <span className="k">Total a pagar</span>
        <span className="v">{brl(totalCents)}</span>
      </div>
    </div>
  )
}

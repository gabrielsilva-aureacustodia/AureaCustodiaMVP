'use client'

/**
 * Simulador de custos da landing: quanto paga quem compra e quanto recebe quem vende.
 *
 * Único pedaço da landing que precisa de estado no navegador, por isso é o único 'use client' de seção.
 *
 * As contas são as MESMAS do servidor (`comissaoPorMoeda`, `custoDeCompraPorMoeda`, `liquidoDeVendaPorMoeda`,
 * de `src/domain/fees.ts`) com a tabela vigente que a página recebeu do servidor. Até 24/10/2026 este arquivo
 * refazia a conta à mão com 0.005 e 1.0 em reais (float) e somava só preço + comissão para o comprador —
 * sem o 1º mês de custódia que, desde 21/10/2026, entra em toda compra. Valores em centavos inteiros.
 */

import { useId, useState, type ReactNode } from 'react'

import {
  comissaoPorMoeda,
  custoDeCompraPorMoeda,
  custodiaDaCompraPorMoeda,
  liquidoDeVendaPorMoeda,
  type TabelaDeTaxas,
} from '@/domain/fees'
import { brl } from '@/domain/money'

import { comissaoDoLado, comissaoSimetrica } from './textoDasTaxas'

// Valores de exemplo para o visitante clicar — não são preços de mercado (os preços reais estão na vitrine).
const EXEMPLOS = [18_000, 45_000, 120_000] as const

export function FeeSimulator({ taxas }: { taxas: TabelaDeTaxas }): ReactNode {
  const id = useId()
  const [reais, setReais] = useState<number>(EXEMPLOS[0] / 100)

  const preco = Math.max(0, Math.round(reais * 100))
  const comissao = comissaoPorMoeda(preco, taxas)
  const custoComprador = custoDeCompraPorMoeda(preco, taxas)
  const custodiaDaCompra = custodiaDaCompraPorMoeda(taxas)
  const liquidoVendedor = Math.max(0, liquidoDeVendaPorMoeda(preco, taxas))

  return (
    <div className="pub-sim">
      <div className="pub-sim-entrada">
        <label htmlFor={`${id}-valor`} className="pub-sim-label">
          Preço combinado da moeda
        </label>
        <div className="pub-sim-campo">
          <span aria-hidden="true">R$</span>
          <input
            id={`${id}-valor`}
            type="number"
            inputMode="decimal"
            min="1"
            step="10"
            value={reais || ''}
            onChange={(e) => setReais(Math.max(0, Number(e.target.value)))}
          />
        </div>
        <div className="pub-sim-exemplos" role="group" aria-label="Valores de exemplo">
          {EXEMPLOS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={preco === v}
              aria-label={`Simular com ${brl(v)}`}
              onClick={() => setReais(v / 100)}
            >
              {brl(v)}
            </button>
          ))}
        </div>
        <p className="pub-sim-nota">Valores de exemplo. Os preços reais estão na vitrine do mercado.</p>
      </div>

      <dl className="pub-sim-saida" aria-live="polite">
        <div className="pub-sim-linha pub-sim-destaque">
          <dt>
            Quem compra paga
            <small>
              Preço + comissão ({brl(comissao.comprador)}) + 1º mês de guarda ({brl(custodiaDaCompra)})
            </small>
          </dt>
          <dd>{brl(custoComprador)}</dd>
        </div>
        <div className="pub-sim-linha pub-sim-destaque pub-sim-recebe">
          <dt>
            Quem vende recebe
            <small>Preço − comissão ({brl(comissao.vendedor)}), no saldo da conta</small>
          </dt>
          <dd>{brl(liquidoVendedor)}</dd>
        </div>
        {comissaoSimetrica(taxas) ? (
          <div className="pub-sim-linha">
            <dt>Comissão de cada lado</dt>
            <dd>{comissaoDoLado(taxas, 'vendedor')} por moeda</dd>
          </div>
        ) : (
          <>
            <div className="pub-sim-linha">
              <dt>Comissão de quem compra</dt>
              <dd>{comissaoDoLado(taxas, 'comprador')} por moeda</dd>
            </div>
            <div className="pub-sim-linha">
              <dt>Comissão de quem vende</dt>
              <dd>{comissaoDoLado(taxas, 'vendedor')} por moeda</dd>
            </div>
          </>
        )}
        <div className="pub-sim-linha">
          <dt>Guarda no cofre</dt>
          <dd>{brl(taxas.custodiaMensalPorMoeda)} por moeda, por mês</dd>
        </div>
      </dl>
    </div>
  )
}

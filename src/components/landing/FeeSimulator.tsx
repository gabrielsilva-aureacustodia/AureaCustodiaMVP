'use client'

/**
 * Simulador Factual de Custódia e Negociação — Real Olímpico.
 *
 * Implementado conforme os padrões do Tópico 32 do aprendizado_frontend:
 * - 0 KB de dependências externas (apenas React e CSS nativo com tokens)
 * - Números tabulares para evitar oscilações visuais
 * - Regras de negócio protegidas e exatas:
 *     Comissão: 0,5% + R$ 1,00 por moeda em cada lado da operação
 *     Custódia: R$ 2,00 por moeda ao mês, sem prazo mínimo e sem desconto por período
 *     (o valor vem de TAXAS_PADRAO; 6 meses e 1 ano são só a conta de 6 e 12 mensalidades)
 */

import { useState, type ReactNode } from 'react'

import { TAXAS_PADRAO } from '@/domain/fees'

const PRESETS = [
  { label: 'Bandeira 2012 (R$ 180,00)', val: 180 },
  { label: 'Direitos Humanos 1998 (R$ 450,00)', val: 450 },
  { label: 'Série Completa Rio 2016 (R$ 1.200,00)', val: 1200 },
] as const

export function FeeSimulator(): ReactNode {
  const [val, setVal] = useState<number>(180)
  const [periodo, setPeriodo] = useState<'1m' | '6m' | '1a'>('1a')

  const taxaPercentual = 0.005 // 0,5%
  const taxaFixa = 1.0 // R$ 1,00
  const comissao = Math.max(0, val * taxaPercentual + taxaFixa)
  const liquidoVendedor = Math.max(0, val - comissao)
  const custoComprador = Math.max(0, val + comissao)

  // Mensalidade única por moeda (centavos -> reais). Não há plano anual nem desconto por prazo.
  const mensalidade = TAXAS_PADRAO.custodiaMensalPorMoeda / 100
  const mesesDoPeriodo = periodo === '1a' ? 12 : periodo === '6m' ? 6 : 1
  const custoCustodia = mensalidade * mesesDoPeriodo
  const reais = (v: number): string =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <section className="landing-simulator-section reveal" aria-labelledby="simulator-title">
      <div className="landing-section-heading">
        <p className="landing-eyebrow">Transparência Factual</p>
        <h2 id="simulator-title">Simulador de Negociação e Custódia</h2>
        <p className="landing-lead">
          Sem taxas ocultas, sem jargões. Calcule exatamente o custo de guarda em cofre e os
          proventos líquidos de negociação no Real Olímpico.
        </p>
      </div>

      <div className="landing-sim-card">
        {/* Lado Esquerdo: Parâmetros */}
        <div className="landing-sim-controls">
          <div className="landing-sim-group">
            <label htmlFor="sim-valor" className="landing-sim-label">
              Valor de Referência da Moeda (R$)
            </label>
            <div className="landing-sim-input-wrap">
              <span className="landing-sim-prefix">R$</span>
              <input
                id="sim-valor"
                type="number"
                min="1"
                step="10"
                value={val || ''}
                onChange={(e) => setVal(Math.max(0, Number(e.target.value)))}
                className="landing-sim-input"
              />
            </div>
            <div className="landing-sim-presets" role="group" aria-label="Moedas sugeridas">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setVal(p.val)}
                  className={`landing-sim-preset-btn ${val === p.val ? 'active' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="landing-sim-group">
            <span className="landing-sim-label">Período de Custódia em Cofre Sicoob</span>
            <small className="landing-sim-sub">R$ {reais(mensalidade)} por moeda ao mês, sem prazo mínimo.</small>
            <div className="landing-sim-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={periodo === '1m'}
                onClick={() => setPeriodo('1m')}
                className={`landing-sim-tab ${periodo === '1m' ? 'active' : ''}`}
              >
                1 Mês (R$ {reais(mensalidade)})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={periodo === '6m'}
                onClick={() => setPeriodo('6m')}
                className={`landing-sim-tab ${periodo === '6m' ? 'active' : ''}`}
              >
                6 Meses (R$ {reais(mensalidade * 6)})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={periodo === '1a'}
                onClick={() => setPeriodo('1a')}
                className={`landing-sim-tab ${periodo === '1a' ? 'active' : ''}`}
              >
                1 Ano (R$ {reais(mensalidade * 12)})
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito: Resumo Factual */}
        <div className="landing-sim-results">
          <h3 className="landing-sim-results-title">Demonstrativo de Custos e Proventos</h3>

          <div className="landing-sim-rows">
            <div className="landing-sim-row">
              <span className="landing-sim-k">Comissão de Negociação (0,5% + R$ 1,00):</span>
              <strong className="landing-sim-v">
                R$ {comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="landing-sim-row highlight-green">
              <div>
                <span className="landing-sim-k">Proventos Líquidos do Vendedor:</span>
                <small className="landing-sim-sub">Creditado diretamente no saldo após negociação</small>
              </div>
              <strong className="landing-sim-v">
                R$ {liquidoVendedor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="landing-sim-row">
              <span className="landing-sim-k">Custo Total de Aquisição do Comprador:</span>
              <strong className="landing-sim-v">
                R$ {custoComprador.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <div className="landing-sim-row highlight-gold">
              <div>
                <span className="landing-sim-k">Custo da Guarda Física no Período:</span>
                <small className="landing-sim-sub">Cofre de segurança bancária Sicoob com laudo pericial</small>
              </div>
              <strong className="landing-sim-v">
                R$ {custoCustodia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="landing-sim-footnote">
            <span className="landing-sim-seal-icon" aria-hidden="true">✓</span>
            <span>
              <strong>Economia logística imediata:</strong> negociações de recibos lastreados no
              Real Olímpico dispensam fretes com seguro declaratório interestadual a cada transação comercial.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

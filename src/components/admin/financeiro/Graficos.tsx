/**
 * Os dois desenhos do controle financeiro (25/10/2026), sem JavaScript e sem biblioteca:
 *
 *  - `Cascata`: do faturamento ao resultado. Cada saída é uma barra que começa onde o dinheiro
 *    restante termina — o leitor vê o que sobra encolhendo a cada passo. Uma medida só (R$), um
 *    eixo só; entrada e resultado em ouro, saídas em vermelho suave (polaridade, não status). O
 *    valor e o peso sobre a receita vão escritos ao lado: a cor nunca é o único canal.
 *  - `BarrasNomeadas`: lista de barras horizontais com rótulo e valor (receita por tipo, custo por
 *    setor) — o "bar list" dos painéis da Stripe e do Shopify.
 *
 * Regras da skill dataviz: uma medida, um eixo; rótulo direto; tabela (ou a própria lista) como
 * visão textual; nada anima. Sem 'use client'.
 */

import type { ReactNode } from 'react'

import type { FatiaNomeada, PassoDaCascata } from '@/domain/financeiro/analise'

import { dinheiro, percentual } from '../formatos'

function bp(parte: number, total: number): string {
  return total > 0 ? percentual(Math.round((parte * 10000) / total)) : '—'
}

export function Cascata({ passos }: { passos: readonly PassoDaCascata[] }): ReactNode {
  const receita = passos.find((p) => p.natureza === 'entrada')?.valor ?? 0
  if (receita <= 0) return null
  let restante = receita
  return (
    <ol className="adm-cascata" aria-label="Do faturamento ao resultado">
      {passos.map((p) => {
        let inicio = 0
        let largura = 0
        if (p.natureza === 'entrada') {
          largura = 100
        } else if (p.natureza === 'saida') {
          restante -= p.valor
          inicio = Math.max(0, (restante / receita) * 100)
          largura = Math.min(100 - inicio, (p.valor / receita) * 100)
        } else {
          largura = Math.min(100, (p.valor / receita) * 100)
        }
        const negativo = p.natureza === 'resultado' && restante < 0
        return (
          <li key={p.chave} className={`adm-cascata-passo adm-cascata-${p.natureza}${negativo ? ' adm-cascata-prejuizo' : ''}`}>
            <span className="adm-cascata-rotulo">
              <b>
                {p.natureza === 'saida' ? '− ' : p.natureza === 'resultado' ? '= ' : ''}
                {p.rotulo}
              </b>
              {p.detalhe ? <small>{p.detalhe}</small> : null}
            </span>
            <span className="adm-cascata-trilho" aria-hidden="true">
              <span className="adm-cascata-barra" style={{ marginLeft: `${inicio}%`, width: `${Math.max(largura, p.valor > 0 ? 0.6 : 0)}%` }} />
            </span>
            <span className="adm-cascata-valor">
              {negativo ? '−' : ''}
              {dinheiro(p.valor)}
              <small>{p.natureza === 'entrada' ? '100%' : `${bp(p.valor, receita)} da receita`}</small>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function BarrasNomeadas({
  fatias,
  rotulo,
  vazio,
  tom = 'ouro',
}: {
  fatias: readonly FatiaNomeada[]
  rotulo: string
  vazio: ReactNode
  tom?: 'ouro' | 'saida'
}): ReactNode {
  const total = fatias.reduce((t, f) => t + f.valor, 0)
  const maior = Math.max(0, ...fatias.map((f) => f.valor))
  if (fatias.length === 0 || total === 0) return <div className="adm-vazio">{vazio}</div>
  return (
    <ul className={`adm-barras adm-barras-${tom}`} aria-label={rotulo}>
      {fatias.map((f) => (
        <li key={f.chave}>
          <span className="adm-barras-rotulo">{f.rotulo}</span>
          <span className="adm-barras-trilho" aria-hidden="true">
            <span className="adm-barras-barra" style={{ width: `${(f.valor / maior) * 100}%` }} />
          </span>
          <span className="adm-barras-valor">
            {dinheiro(f.valor)}
            <small>{bp(f.valor, total)}</small>
          </span>
        </li>
      ))}
    </ul>
  )
}

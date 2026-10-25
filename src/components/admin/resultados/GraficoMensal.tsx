/**
 * Colunas de uma série por mês (25/10/2026, rodada 2) — o "Fluxo mês a mês" do Financeiro em
 * desenho, ao lado da tabela que continua embaixo.
 *
 * Regras da skill de visualização (dataviz) aplicadas: uma série só → sem caixa de legenda (o título
 * diz o que é); colunas finas (≤ 24 px) com ponta arredondada e base reta; rótulo de valor só no
 * maior mês e no último, não em todos; grade recessiva; a tabela é a "visão em tabela" que a skill
 * exige. Cor: ouro da marca no escuro e um ouro mais fechado no claro (#9a7a2e), porque o ouro
 * padrão dá 2,3:1 contra o fundo claro (validado com scripts/validate_palette.js; o claro passa 3:1).
 * Dica de valor no hover E no foco do teclado (cada coluna é focável), sem JavaScript.
 *
 * Sem 'use client': só marcação.
 */

import type { ReactNode } from 'react'

export interface PontoMensal {
  chave: string
  /** Rótulo curto do eixo ("out"). */
  rotulo: string
  /** Rótulo completo para a dica e o leitor de tela ("outubro de 2026"). */
  rotuloLongo: string
  valor: number
  /** Valor já formatado ("R$ 1.234,00"). */
  texto: string
  detalhe?: string
}

export function GraficoMensal({ titulo, pontos }: { titulo: string; pontos: readonly PontoMensal[] }): ReactNode {
  if (pontos.length === 0) return null
  const maximo = Math.max(...pontos.map((p) => p.valor), 0)
  const iMax = pontos.findIndex((p) => p.valor === maximo)
  const ultimo = pontos.length - 1

  return (
    <figure className="adm-graf" aria-label={titulo}>
      <div className="adm-graf-area" role="list">
        {pontos.map((p, i) => {
          const altura = maximo > 0 ? Math.max((p.valor / maximo) * 100, p.valor > 0 ? 2 : 0) : 0
          const rotulado = (i === iMax && maximo > 0) || i === ultimo
          return (
            <div key={p.chave} className="adm-graf-col" role="listitem" tabIndex={0} aria-label={`${p.rotuloLongo}: ${p.texto}${p.detalhe ? `. ${p.detalhe}` : ''}`}>
              <span className="adm-graf-dica" aria-hidden="true">
                <b>{p.rotuloLongo}</b>
                {p.texto}
                {p.detalhe ? <small>{p.detalhe}</small> : null}
              </span>
              {rotulado ? (
                <span className="adm-graf-valor" aria-hidden="true">
                  {p.texto}
                </span>
              ) : null}
              <span className="adm-graf-barra" style={{ height: `${altura}%` }} aria-hidden="true" />
              <span className="adm-graf-eixo" aria-hidden="true">
                {p.rotulo}
              </span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}

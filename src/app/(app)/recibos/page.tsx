'use client'

/**
 * 1.4 MEUS RECIBOS NFT — port de aurea-mvp-teste.html, linhas 1851-1893
 * (`renderNfts`).
 *
 * Client Component de propósito: a grade precisa reagir ao ciclo de
 * sincronização de 10s do AppProvider. Uma moeda vendida em outra aba some da
 * lista sozinha, e uma moeda anunciada troca a etiqueta de "Em custódia" para
 * "À venda" — no monolito era o `render()` disparado pelo startSync que fazia
 * isso; aqui é o próprio React, ao receber o estado novo.
 *
 * O título da tela ('Meus recibos NFT' / 'Recibos digitais de validação e
 * recebimento de custódia.') NÃO está aqui: a Topbar o deriva da rota, ver a
 * nota no topo de components/shell/Topbar.tsx. O original o escrevia à mão em
 * #pageTitle na linha 1855.
 */

import type { ReactNode } from 'react'

import { tiposNegociaveis } from '@/domain/constants'
import { medianSellPrice } from '@/domain/market'
import { brl } from '@/domain/money'
import type { Cents, Coin } from '@/domain/types'
import { NftCard } from '@/components/nft/NftCard'
import { useApp } from '@/components/providers/AppProvider'

export default function RecibosPage(): ReactNode {
  const { state, me } = useApp()

  // Mediana das ofertas abertas nas últimas 24h (domain/market.ts), uma por
  // tipo negociável. É a referência de mercado de cada ativo; as moedas de
  // tipos sem mercado continuam valendo o `valorEstimado` da própria ficha.
  const medPorTipo: Record<string, Cents | null> = {}
  tiposNegociaveis().forEach((t) => {
    medPorTipo[t.key] = medianSellPrice(state, t.key)
  })
  const coins = me.coins

  /**
   * PORT FIEL da linha 1858, generalizado para vários ativos. O teste é de
   * VERACIDADE (`med`), não de `!== null`: uma mediana de zero centavos cai no
   * valor de ficha. Na prática não acontece — não há oferta de R$ 0,00 — mas
   * trocar por `med !== null` mudaria o comportamento num canto que ninguém
   * revisitaria.
   */
  const valOf = (c: Coin): Cents => {
    const med = medPorTipo[c.tipoMoeda]
    return med ? med : c.valorEstimado
  }

  const totalVal = coins.reduce<Cents>((s, c) => s + valOf(c), 0)
  const recibosAtivos = coins.filter((c) => c.nft.status === 'Ativo').length

  return (
    <div className="cols-rev">
      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M9 10h7M9 13.5h7M9 17h4" />
          </svg>
          Moedas em custódia
        </h3>
        {/* O estado vazio fica DENTRO da .nft-grid, como no original (linha
            1879): o `cardsHtml` era ou os cartões, ou o .empty, e os dois
            entravam no mesmo contêiner de grade. */}
        <div className="nft-grid">
          {coins.length ? (
            coins.map((c) => (
              // A chave é o código do ativo: sequencial, único e estável mesmo
              // quando a moeda troca de dono ou muda de status.
              <NftCard
                key={c.id}
                coin={c}
                valor={valOf(c)}
                listed={state.sellOffers.some((o) => o.coinId === c.id)}
              />
            ))
          ) : (
            <div className="empty">
              Você ainda não possui moedas custodiadas nesta conta de teste. Use &quot;Enviar moeda
              para custódia&quot; para começar.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="panel" style={{ marginBottom: '18px' }}>
          <h3>Resumo</h3>
          <div className="summary-row">
            <span className="k">Total em custódia</span>
            <span className="v">{coins.length} moeda(s)</span>
          </div>
          <div className="summary-row">
            <span className="k">Valor estimado</span>
            <span className="v">{brl(totalVal)}</span>
          </div>
          {/* .total é a última linha do bloco: sem borda inferior e com o número
              em dourado. Aqui ela destaca a contagem de recibos, não dinheiro —
              é assim no original. */}
          <div className="summary-row total">
            <span className="k">Recibos ativos</span>
            <span className="v">{recibosAtivos}</span>
          </div>
        </div>

        <div className="panel">
          <div className="note">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            </svg>
            Cada recibo NFT comprova a recepção e custódia da moeda física, com registro na
            plataforma. Segurança, transparência e conformidade em cada etapa.
          </div>
        </div>
      </div>
    </div>
  )
}

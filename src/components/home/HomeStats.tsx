'use client'

/**
 * Indicadores do topo do painel — port de aurea-mvp-teste.html, linhas
 * 1195-1209 (o bloco `.stats.stats-top` de renderHome).
 *
 * POR QUE ESTE PEDAÇO É CLIENTE E O RESTO DA TELA NÃO
 * ---------------------------------------------------
 * São três números que mudam sozinhos: o total custodiado sobe quando qualquer
 * conta conclui um envio, o volume e a última negociação mudam quando qualquer
 * conta compra ou vende. No monolito eles se atualizavam porque o ciclo de
 * sincronização de 10s chamava `render()` inteiro a cada volta (linhas
 * 1094-1105) e renderHome era refeito do zero.
 *
 * Aqui quem traz o estado novo é o AppProvider, e só este componente precisa
 * assinar a mudança. Os quatro blocos de navegação e o filete ★ são estáticos —
 * mantê-los no servidor evita mandar JS para redesenhar texto que nunca muda.
 *
 * NADA É CALCULADO AQUI QUE JÁ EXISTA NO DOMÍNIO: `lastTrade` e `fmtTrade` vêm
 * de @/domain/market. As duas somas (total de moedas e volume) são as do
 * original, linha por linha — elas não têm equivalente no domínio porque são
 * agregados de painel, não regra de mercado.
 */

import type { ReactNode } from 'react'

import { fmtTrade, lastTrade } from '@/domain/market'
import { brl } from '@/domain/money'
import { useApp } from '@/components/providers/AppProvider'

export function HomeStats(): ReactNode {
  const { state } = useApp()

  const lt = lastTrade(state)

  // Estoque custodiado de TODAS as contas, não só o da sessão: o painel mostra
  // o tamanho da custódia, que é um número público (original, linha 1190).
  const totalCoins = Object.values(state.users).reduce((s, x) => s + x.coins.length, 0)

  // `t.qty || 1` é do original (linha 1191) e fica: registros antigos do seed
  // podem não ter quantidade, e sem a guarda o volume viraria NaN.
  const vol = state.trades.reduce((s, t) => s + t.price * (t.qty || 1), 0)

  // Rótulo da última negociação, já com o travessão de "ainda não houve
  // nenhuma". Calculado fora do JSX porque também serve de `key` do elemento —
  // ver a nota logo abaixo.
  // `lastTrade` sem tipo: o painel mostra a última negociação DA PLATAFORMA,
  // qualquer que seja o ativo. O nome vem da própria negociação — antes era a
  // constante COIN.name, correta enquanto só a Bandeira era negociada e
  // mentirosa a partir da segunda moeda no mercado.
  const ultimaNegociacao = lt ? fmtTrade(lt) + ' · ' + lt.tipoMoeda : '—'

  return (
    <div className="stats stats-top">
      <div className="stat">
        <div className="stat-ico">
          <svg viewBox="0 0 24 24">
            <path d="M4 21h16M5 21V10h3v11M10.5 21V10h3v11M16 21V10h3v11M3 9l9-6 9 6z" />
          </svg>
        </div>
        <div>
          <div className="lbl">Moedas em custódia</div>
          <div className="val">{totalCoins}</div>
        </div>
      </div>

      <div className="stat">
        <div className="stat-ico">
          <svg viewBox="0 0 24 24">
            <ellipse cx="12" cy="6.5" rx="7" ry="3" />
            <path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
          </svg>
        </div>
        <div>
          <div className="lbl">Volume negociado</div>
          <div className="val">{brl(vol)}</div>
        </div>
      </div>

      <div className="stat">
        <div className="stat-ico">
          <svg viewBox="0 0 24 24">
            <path d="M5 21V4M5 4h13l-3 4 3 4H5" />
          </svg>
        </div>
        <div>
          <div className="lbl">
            Última negociação{' '}
            <span className="sync-dot">
              <i />
              10s
            </span>
          </div>
          {/*
            A classe .pulse é uma animação de 0.5s que roda UMA vez, na entrada
            do elemento no DOM. No monolito ela reaparecia a cada volta da
            sincronização porque o innerHTML era reescrito e o nó era outro —
            era assim que o painel avisava "chegou preço novo".

            Em React o nó sobreviveria ao re-render e a animação nunca mais
            tocaria. A `key` amarrada ao próprio texto devolve o comportamento
            original: valor igual, mesmo nó, sem piscada; valor diferente, nó
            novo, animação de novo. O id="ltHome" do original não veio junto —
            ele existia só para o updateHeader achar o elemento na mão.
          */}
          <div key={ultimaNegociacao} className="val small pulse">
            {ultimaNegociacao}
          </div>
        </div>
      </div>
    </div>
  )
}

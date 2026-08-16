'use client'

/**
 * Abas de período do gráfico de preço médio — port de aurea-mvp-teste.html,
 * linhas 2411-2415 (a marcação) e 2372/2376 (a função setMarketPeriod e a
 * tradução de período para dias).
 *
 * POR QUE ISTO É UM COMPONENTE, E NÃO TRÊS <span> SOLTOS NA PÁGINA
 * ---------------------------------------------------------------
 * No monolito as três abas eram string interpolada dentro de renderMarket(), e
 * o mapa período->dias vivia numa expressão ternária aninhada logo acima delas
 * (`marketPeriod==='D'?1:(marketPeriod==='S'?7:28)`). Rótulo e número de dias
 * estavam a quarenta linhas de distância um do outro: mexer num sem mexer no
 * outro era só uma questão de tempo.
 *
 * Aqui os dois moram no mesmo arquivo e no mesmo array — o rótulo 'Semana' e o
 * `7` são o mesmo registro. Quem consome pede `PERIOD_DAYS[period]` e não
 * refaz o ternário.
 *
 * O componente é CONTROLADO de propósito: o período é estado da tela (a página
 * 2.0 precisa dele para montar a série), não das abas. Guardá-lo aqui dentro
 * obrigaria a página a espiar o estado do filho.
 */

import type { ReactNode } from 'react'

/** 'D' (dia), 'S' (semana), 'M' (mês) — os mesmos três valores da global marketPeriod. */
export type Period = 'D' | 'S' | 'M'

/**
 * Janela de cada aba, em dias.
 *
 * PORT FIEL, inclusive na esquisitice: 'M' é 28 dias, não 30 nem "o mês
 * corrente". São quatro semanas cheias, que é o que o original calculava. A
 * série comparativa da mesma tela, essa sim, usa 30 dias fixos — a diferença
 * é do MVP e foi mantida.
 */
export const PERIOD_DAYS: Record<Period, number> = { D: 1, S: 7, M: 28 }

/** Rótulos na ordem em que aparecem na tela. A ordem do array É a ordem visual. */
const TABS: ReadonlyArray<{ value: Period; label: string }> = [
  { value: 'D', label: 'Dia' },
  { value: 'S', label: 'Semana' },
  { value: 'M', label: 'Mês' },
]

export interface PeriodTabsProps {
  value: Period
  onChange(p: Period): void
}

export function PeriodTabs({ value, onChange }: PeriodTabsProps): ReactNode {
  return (
    <div className="chart-tabs">
      {TABS.map((tab) => (
        <span
          key={tab.value}
          // .chart-tab.on é o que pinta a aba de dourado (reports.css). A classe
          // é exatamente a do original — nada de variante nova.
          className={value === tab.value ? 'chart-tab on' : 'chart-tab'}
          onClick={() => onChange(tab.value)}
          // O original era um <span onclick> puro: sem foco, sem teclado, sem
          // papel semântico. Continua <span> (trocar por <button> traria a
          // aparência de botão do agente e o reset viraria trabalho de CSS que
          // não existe na folha), mas ganha o mínimo para ser operável sem mouse.
          role="button"
          tabIndex={0}
          aria-pressed={value === tab.value}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault() // espaço em elemento focável rola a página
              onChange(tab.value)
            }
          }}
        >
          {tab.label}
        </span>
      ))}
    </div>
  )
}

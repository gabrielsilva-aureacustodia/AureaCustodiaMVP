/**
 * "Próximas cobranças": uma linha por data, cada uma dizendo quantas moedas e quanto (26/10/2026).
 *
 * O ciclo de custódia é de cada moeda, contado do dia em que ela foi aceita ou comprada — então a mesma
 * conta é cobrada em vários dias do mês, cada dia pelo seu grupo de moedas. Até aqui a tela mostrava uma
 * data só, a mais próxima: o Rogério pagou a custódia de 130 moedas e leu "próxima cobrança 28/10", que
 * era de UMA moeda. O grupo vem pronto de `resumoDaCustodia` (src/domain/custodia-do-cliente.ts).
 *
 * Sem `'use client'`: é só marcação, e quem a usa já é Client Component.
 */

import type { ReactNode } from 'react'

import type { CobrancaDoGrupo } from '@/domain/custodia-do-cliente'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'

function moedas(n: number): string {
  return `${n} ${n === 1 ? 'moeda' : 'moedas'}`
}

export function ProximasCobrancas({ grupos }: { grupos: readonly CobrancaDoGrupo[] }): ReactNode {
  if (grupos.length === 0) return null
  return (
    <div className="proximas-cobrancas">
      <span className="k">{grupos.length === 1 ? 'Próxima cobrança' : 'Próximas cobranças'}</span>
      <ul>
        {grupos.map((g) => (
          <li key={g.em}>
            <span className="pc-data">{fdate(g.em)}</span>
            <span className="pc-moedas">{moedas(g.moedas)}</span>
            <span className="pc-valor">{brl(g.valorCents)}</span>
            {g.travadas > 0 && (
              <span className="pc-travadas">
                {g.travadas === g.moedas
                  ? `${g.travadas === 1 ? 'travada' : 'travadas'} para negociar até pagar a custódia`
                  : `${moedas(g.travadas)} ${g.travadas === 1 ? 'travada' : 'travadas'} para negociar até pagar a custódia`}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

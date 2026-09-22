'use client'

/**
 * Aviso de custódia a pagar.
 *
 * A moeda entra em custódia antes do pagamento: o cliente envia, a bancada
 * analisa, o recibo é emitido — e só então ele paga o plano. O mesmo vale para
 * a moeda registrada por cadastro direto, que já estava no armazém. Nesse
 * intervalo a conta tem débito em aberto e a pessoa não tem como saber disso
 * sem entrar em Faturas de custódia, uma tela que ela não tem motivo para abrir.
 *
 * Daí este bloco, que aparece nas três telas onde ela olha o acervo: Meus
 * recibos, Minha conta e Envios. O texto muda conforme a fatura esteja só em
 * aberto ou já vencida — vencida bloqueia venda e retirada do recibo, e isso
 * precisa estar escrito antes de a pessoa tentar vender e receber uma recusa
 * que não entende.
 *
 * Silencioso quando não há nada a pagar: bloco de aviso que aparece sempre vira
 * paisagem, e quando tiver algo de verdade ninguém lê.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { brl } from '@/domain/money'
import type { FaturaCustodia } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'

/** Faturas da conta que ainda não foram pagas nem canceladas. */
function faturasEmAberto(faturas: readonly FaturaCustodia[], email: string): FaturaCustodia[] {
  return faturas.filter((f) => f.userEmail === email && f.status !== 'paga' && f.status !== 'cancelada')
}

export function AvisoDebitoCustodia({ estilo }: { estilo?: React.CSSProperties }): ReactNode {
  const { state, session } = useApp()

  const abertas = faturasEmAberto(state.faturasCustodia ?? [], session)
  if (abertas.length === 0) return null

  const total = abertas.reduce((soma, f) => soma + f.valorCents, 0)
  const moedas = abertas.reduce((soma, f) => soma + f.quantidadeMoedas, 0)
  const agora = Date.now()
  const vencida = abertas.some((f) => f.status === 'atrasada' || f.dataVencimento < agora)

  return (
    <div className={vencida ? 'warn-box' : 'note'} style={{ marginTop: 16, ...estilo }}>
      <svg viewBox="0 0 24 24">
        <path d="M12 3l9 16H3z" />
        <path d="M12 10v4M12 17v.5" />
      </svg>
      <div>
        <b>
          {vencida ? 'Custódia vencida' : 'Custódia a pagar'} — {brl(total)}
        </b>
        <div style={{ marginTop: 4 }}>
          {moedas} moeda(s) sob guarda com {abertas.length === 1 ? 'a fatura' : 'faturas'} em aberto.{' '}
          {vencida
            ? 'Enquanto estiver vencida, os recibos ficam bloqueados para venda e para retirada física.'
            : 'A guarda já está ativa; o pagamento libera o plano e mantém os recibos livres para negociar.'}{' '}
          <Link href="/conta/faturas" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
            Pagar agora
          </Link>
        </div>
      </div>
    </div>
  )
}

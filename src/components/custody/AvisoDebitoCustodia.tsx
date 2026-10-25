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
 *
 * DESDE 12/10/2026 O AVISO TAMBÉM DIZ O QUE ESTÁ TRAVADO. Moeda cuja custódia nunca foi paga não pode
 * ser vendida — nem anunciada, nem comprada do lote —, e antes o texto prometia que pagar "mantém os
 * recibos livres para negociar", como se já estivessem. O cliente descobria ao tentar vender e ler uma
 * recusa. Agora o aviso conta quantas moedas estão presas e o que as solta.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { moedasComCustodiaBloqueada } from '@/domain/bloqueio-por-debito'
import { brl } from '@/domain/money'
import type { FaturaCustodia } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { useTutorial } from '@/components/tutorial/contexto'

/** Faturas da conta que ainda não foram pagas nem canceladas. */
function faturasEmAberto(faturas: readonly FaturaCustodia[], email: string): FaturaCustodia[] {
  return faturas.filter((f) => f.userEmail === email && f.status !== 'paga' && f.status !== 'cancelada')
}

export function AvisoDebitoCustodia({ estilo }: { estilo?: React.CSSProperties }): ReactNode {
  const { state, session } = useApp()
  // Fatura de exemplo do tour guiado (etapa de custódia): só desenho, nunca estado — ver TutorialProvider.
  const { exemplo } = useTutorial()

  const abertas = faturasEmAberto(state.faturasCustodia ?? [], session)
  if (exemplo) abertas.push(exemplo)
  const agora = Date.now()
  const presas = moedasComCustodiaBloqueada(state, session, agora).length
  if (abertas.length === 0 && presas === 0) return null

  const total = abertas.reduce((soma, f) => soma + f.valorCents, 0)
  const moedas = abertas.reduce((soma, f) => soma + f.quantidadeMoedas, 0)
  const vencida = abertas.some((f) => f.status === 'atrasada' || f.dataVencimento < agora)

  // .note/.warn-box ficam: são a âncora do tutorial (src/domain/tutorial.ts). O desenho é o .ro-aviso
  // do Brandbook (§9.5), com o tom de perigo quando vencida.
  return (
    <div
      className={
        vencida ? 'warn-box ro-aviso ro-aviso--perigo aviso-custodia' : 'note ro-aviso ro-aviso--aviso aviso-custodia'
      }
      role={vencida ? 'alert' : 'status'}
      style={{ marginTop: 16, ...estilo }}
    >
      <svg className="ro-aviso__icone" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l9 16H3z" />
        <path d="M12 10v4M12 17v.5" />
      </svg>
      <div>
        <b className="ro-aviso__titulo">
          {vencida ? 'Custódia vencida' : 'Custódia a pagar'}
          {abertas.length > 0 ? ` — ${brl(total)}` : ''}
          {exemplo ? <span className="marca-exemplo">EXEMPLO DO TUTORIAL</span> : null}
        </b>
        <div className="aviso-custodia-tx">
          {presas > 0 ? (
            <>
              <b>
                {presas === 1 ? '1 moeda sua não pode' : `${presas} moedas suas não podem`} ser vendida
                {presas === 1 ? '' : 's'}
              </b>{' '}
              enquanto a custódia não for paga: nem anunciar, nem negociar. A guarda já está ativa — pagar
              solta {presas === 1 ? 'a moeda' : 'as moedas'} na hora.{' '}
            </>
          ) : (
            <>
              {moedas} moeda(s) sob guarda com {abertas.length === 1 ? 'a fatura' : 'faturas'} em aberto.{' '}
              {vencida
                ? 'Enquanto estiver vencida, os recibos ficam bloqueados para venda e para retirada física.'
                : 'Pague até o vencimento para manter os recibos livres para negociar.'}{' '}
            </>
          )}
          <Link href="/conta/faturas" className="aviso-custodia-link">
            Pagar agora
          </Link>
        </div>
      </div>
    </div>
  )
}

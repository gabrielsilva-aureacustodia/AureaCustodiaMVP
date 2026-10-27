'use client'

/**
 * O cartão de custódia que aparece ao lado do acervo, em Meus recibos e em
 * Minha conta.
 *
 * POR QUE ELE EXISTE (25/09/2026)
 * -------------------------------
 * Até aqui, quem quisesse saber quanto paga de custódia, quando vence e o que
 * já pagou tinha de adivinhar que essa informação estava atrás de "Faturas de
 * custódia", um item de menu dentro de Minha conta. O `AvisoDebitoCustodia`
 * aparecia só quando havia dívida — e, calado o resto do tempo, deixava a
 * custódia parecendo inexistente justamente para quem está em dia.
 *
 * Este bloco fica sempre visível para quem tem moeda guardada, e responde as
 * três perguntas na mesma linha de leitura do acervo: quanto por mês, quando
 * vence o próximo, e onde ver o resto.
 *
 * O NÚMERO GRANDE É A MENSALIDADE DO ACERVO, NÃO A SOMA DOS PLANOS. Moeda sem
 * plano paga o ciclo pela mesma tarifa, então quem olhasse os planos veria
 * R$ 2,00 com onze moedas guardadas. A conta mora em
 * src/domain/custodia-do-cliente.ts, uma só para as três telas.
 */

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

import { resumoDaCustodia } from '@/domain/custodia-do-cliente'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import { resumoComExemplo } from '@/domain/tutorial'
import { useApp } from '@/components/providers/AppProvider'
import { useTutorial } from '@/components/tutorial/contexto'
import { Selo } from '@/components/ui/Selo'

import { ProximasCobrancas } from './ProximasCobrancas'

export function ResumoDaCustodia({ estilo }: { estilo?: CSSProperties }): ReactNode {
  const { state, session, taxas } = useApp()
  const { exemplo } = useTutorial()
  const real = resumoDaCustodia(state, session, taxas.custodiaMensalPorMoeda)
  // Exemplo do tour guiado: soma uma fatura de mentira só para o desenho (ver TutorialProvider).
  const r = exemplo ? resumoComExemplo(real, exemplo) : real

  // Sem moeda guardada e sem fatura, não há custódia de que falar. Bloco que
  // aparece sempre vira paisagem, e quando tiver algo de verdade ninguém lê.
  if (r.moedasGuardadas === 0 && r.emAberto.length === 0 && r.pagas.length === 0) return null

  // <Selo> do Brandbook (§9.4): o estado se lê pelo TEXTO, a cor só reforça (Carbon; tópico 35 passo 4b).
  const tomDoSelo = r.vencida ? 'perigo' : r.emAberto.length > 0 ? 'aviso' : 'sucesso'
  const textoDoSelo = r.vencida ? 'Vencida' : r.emAberto.length > 0 ? 'A pagar' : 'Em dia'

  return (
    <div className={r.vencida ? 'panel resumo-custodia vencida' : 'panel resumo-custodia'} style={estilo}>
      <h3 className="resumo-custodia-cab">
        <span className="resumo-custodia-t">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Minha custódia
          {exemplo ? <small className="marca-exemplo">EXEMPLO DO TUTORIAL</small> : null}
        </span>
        <Selo tom={tomDoSelo}>{textoDoSelo}</Selo>
      </h3>

      <div className="summary-box">
        <div className="sr">
          <span className="k">Moedas sob guarda</span>
          <span className="v">{r.moedasGuardadas}</span>
        </div>
        <div className="sr">
          <span className="k">Mensalidade</span>
          <span className="v">
            {brl(r.mensalidadeCents)} / mês
            <span className="v-sub"> ({brl(r.porMoedaCents)} por moeda)</span>
          </span>
        </div>
        {/* COBERTURA E PRAZO SÃO COISAS DIFERENTES, e misturar as duas foi o
            que fez a tela parecer dizer que a custódia expirava dez dias depois
            de ser paga. "Guarda paga até" é o que o dinheiro comprou; "prazo
            para pagar" só existe enquanto há fatura em aberto. */}
        {r.cobertaAte && (
          <div className="sr">
            <span className="k">Guarda paga até</span>
            <span className="v">{fdate(r.cobertaAte)}</span>
          </div>
        )}
        {r.proximoVencimento && (
          <div className="sr">
            <span className="k">Prazo para pagar</span>
            <span className="v">{fdate(r.proximoVencimento)}</span>
          </div>
        )}
        {/* Uma linha por data, com quantas moedas (26/10/2026): o ciclo é de cada moeda. */}
        <ProximasCobrancas grupos={r.cobrancasPorData} />
        {r.emAberto.length > 0 && (
          <div className="sr">
            <span className="k">Em aberto</span>
            <span className={r.vencida ? 'v v-vencida' : 'v v-ouro'}>{brl(r.emAbertoCents)}</span>
          </div>
        )}
        {r.totalPagoCents > 0 && (
          <div className="sr">
            <span className="k">Já pago em custódia</span>
            <span className="v">{brl(r.totalPagoCents)}</span>
          </div>
        )}
      </div>

      {r.vencida && (
        <p className="resumo-custodia-alerta">
          Enquanto a fatura estiver vencida, seus recibos ficam bloqueados para venda e para
          retirada física. Pagar libera na hora.
        </p>
      )}

      <div className="acoes resumo-custodia-acoes">
        {r.emAberto.length > 0 && (
          <Link href="/conta/faturas" className="btn btn-gold">
            Pagar {brl(r.emAbertoCents)}
          </Link>
        )}
        <Link href="/conta/custodia" className="btn btn-outline">
          Ver plano e extrato
        </Link>
      </div>
    </div>
  )
}

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
import { useApp } from '@/components/providers/AppProvider'

export function ResumoDaCustodia({ estilo }: { estilo?: CSSProperties }): ReactNode {
  const { state, session, taxas } = useApp()
  const r = resumoDaCustodia(state, session, taxas.custodiaMensalPorMoeda)

  // Sem moeda guardada e sem fatura, não há custódia de que falar. Bloco que
  // aparece sempre vira paisagem, e quando tiver algo de verdade ninguém lê.
  if (r.moedasGuardadas === 0 && r.emAberto.length === 0 && r.pagas.length === 0) return null

  const corDoSelo = r.vencida ? '#d9383a' : r.emAberto.length > 0 ? 'var(--gold)' : '#3fb950'
  const textoDoSelo = r.vencida ? 'Vencida' : r.emAberto.length > 0 ? 'A pagar' : 'Em dia'

  return (
    <div
      className="panel"
      style={{ borderColor: r.vencida ? '#d9383a' : undefined, ...estilo }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Minha custódia
        </span>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 700,
            color: corDoSelo,
            border: `1px solid ${corDoSelo}`,
          }}
        >
          {textoDoSelo}
        </span>
      </h3>

      <div className="summary-box" style={{ marginBottom: 12 }}>
        <div className="sr">
          <span className="k">Moedas sob guarda</span>
          <span className="v">{r.moedasGuardadas}</span>
        </div>
        <div className="sr">
          <span className="k">Mensalidade</span>
          <span className="v">
            {brl(r.mensalidadeCents)} / mês
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              {' '}
              ({brl(r.porMoedaCents)} por moeda)
            </span>
          </span>
        </div>
        <div className="sr">
          <span className="k">{r.emAberto.length > 0 ? 'Vence em' : 'Próxima cobrança'}</span>
          <span className="v">
            {r.proximoVencimento ? fdate(r.proximoVencimento) : r.proximaCompetencia}
          </span>
        </div>
        {r.emAberto.length > 0 && (
          <div className="sr">
            <span className="k">Em aberto</span>
            <span className="v" style={{ color: r.vencida ? '#d9383a' : 'var(--gold)' }}>
              {brl(r.emAbertoCents)}
            </span>
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
        <p style={{ fontSize: 12.5, color: '#d9383a', marginBottom: 10 }}>
          Enquanto a fatura estiver vencida, seus recibos ficam bloqueados para venda e para
          retirada física. Pagar libera na hora.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {r.emAberto.length > 0 && (
          <Link
            href="/conta/faturas"
            className="btn btn-gold"
            style={{ flex: '1 1 140px', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Pagar {brl(r.emAbertoCents)}
          </Link>
        )}
        <Link
          href="/conta/custodia"
          className="btn btn-outline"
          style={{ flex: '1 1 140px', minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          Ver plano e extrato
        </Link>
      </div>
    </div>
  )
}

/**
 * A seção "Saques" com título, resumo e a fila — a moldura que o Financeiro, a página própria e o
 * painel inicial usam (14/10/2026). Sem 'use client': a fila (cliente) é um filho.
 */

import type { ReactNode } from 'react'

import type { DadosDaFilaDeSaques } from '@/server/admin/saques'

import { Cartao } from '../Blocos'
import { data, dinheiro, numero } from '../formatos'
import { FilaDeSaques } from './FilaDeSaques'

export function SecaoDeSaques({
  dados,
  podePagar,
  comCliente = true,
  titulo = 'Saques',
  compacto = false,
}: {
  dados: DadosDaFilaDeSaques
  podePagar: boolean
  comCliente?: boolean
  titulo?: string
  /** No painel inicial: sem cartões de resumo, só o alerta e a fila. */
  compacto?: boolean
}): ReactNode {
  const r = dados.resumo
  return (
    <section className="adm-secao" aria-labelledby="secao-saques">
      <h3 className="adm-titulo-secao" id="secao-saques">
        {titulo}
      </h3>
      {!compacto ? (
        <div className="adm-grade">
          <Cartao rotulo="Esperando" valor={numero(r.quantidade)} tom={r.quantidade ? 'alerta' : 'normal'} detalhe="pedidos de saque a pagar" />
          <Cartao rotulo="A pagar" valor={dinheiro(r.valorLiquido)} detalhe="soma do líquido dos pedidos" />
          <Cartao rotulo="Prazo vencido" valor={numero(r.atrasados)} tom={r.atrasados ? 'alerta' : 'normal'} detalhe="passaram do D+3 prometido" />
          <Cartao rotulo="Mais antigo" valor={r.maisAntigoEm ? data(r.maisAntigoEm) : '—'} />
        </div>
      ) : null}
      <div className="panel">
        <FilaDeSaques dados={dados} podePagar={podePagar} comCliente={comCliente} />
      </div>
    </section>
  )
}

/**
 * A seção "Saques" com título, resumo e a fila — a moldura que a página própria e o painel inicial
 * usam (14/10/2026). Sem 'use client': a fila (cliente) é um filho.
 *
 * 25/10/2026 (rodada 2): virou uma `Secao` com os indicadores no mesmo desenho do resto do painel.
 * Na versão compacta (Central de trabalho) os indicadores saem e fica o atalho para a fila inteira.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { DadosDaFilaDeSaques } from '@/server/admin/saques'

import { data, dinheiro, numero } from '../formatos'
import { Indicador, Secao } from '../Pecas'
import { FilaDeSaques } from './FilaDeSaques'

export function SecaoDeSaques({
  dados,
  podePagar,
  comCliente = true,
  titulo = 'Saques',
  compacto = false,
  descricao,
  acimaDaFila,
  vazio,
}: {
  dados: DadosDaFilaDeSaques
  podePagar: boolean
  comCliente?: boolean
  titulo?: string
  /** No painel inicial: sem indicadores, com o atalho para a página da fila. */
  compacto?: boolean
  descricao?: ReactNode
  /** Abas ou filtros que a página põe entre os indicadores e a tabela. */
  acimaDaFila?: ReactNode
  vazio?: string
}): ReactNode {
  const r = dados.resumo
  return (
    <Secao
      id="secao-saques"
      titulo={titulo}
      descricao={descricao ?? 'O valor já saiu do saldo do cliente: cada pedido espera a equipe aprovar, pagar por fora ou recusar com estorno.'}
      acoes={
        compacto ? (
          <Link href="/admin/saques" className="btn btn-outline">
            Abrir a fila inteira
          </Link>
        ) : undefined
      }
    >
      {!compacto ? (
        <div className="adm-inds">
          <Indicador rotulo="Esperando" valor={numero(r.quantidade)} tom={r.quantidade ? 'atencao' : 'ok'} detalhe="pedidos a pagar" />
          <Indicador rotulo="A pagar" valor={dinheiro(r.valorLiquido)} tom="ouro" detalhe="soma do líquido dos pedidos" />
          <Indicador rotulo="Prazo vencido" valor={numero(r.atrasados)} tom={r.atrasados ? 'alerta' : 'ok'} detalhe="passaram do D+3 prometido" />
          <Indicador rotulo="Mais antigo" valor={r.maisAntigoEm ? data(r.maisAntigoEm) : '—'} />
        </div>
      ) : null}
      {acimaDaFila}
      <FilaDeSaques dados={dados} podePagar={podePagar} comCliente={comCliente} vazio={vazio} />
    </Secao>
  )
}

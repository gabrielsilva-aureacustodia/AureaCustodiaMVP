/**
 * O livro de custos e receitas manuais do período (25/10/2026): cada lançamento que entrou na
 * DRE por fora da plataforma — os gerados pelos recorrentes e os feitos à mão na aba Contábil —,
 * com setor, conta e origem. Estornar continua sendo na aba Contábil (mesma ação de sempre).
 *
 * Sem 'use client'.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { DadosControleFinanceiro } from '@/server/admin/controle-financeiro'

import { data, dinheiro } from '../formatos'
import { Secao, Selo, Vazio, TabelaRolavel } from '../Pecas'

export function LancamentosDoPeriodo({ dados }: { dados: DadosControleFinanceiro }): ReactNode {
  const conta = new Map(dados.contas.map((c) => [c.codigo, c]))
  const setor = new Map(dados.setores.map((s) => [s.id, s.nome]))
  const custos = dados.lancamentos.filter((l) => l.contaCodigo.startsWith('4.')).reduce((t, l) => t + l.valor, 0)
  const receitas = dados.lancamentos.filter((l) => l.contaCodigo.startsWith('3.')).reduce((t, l) => t + l.valor, 0)
  return (
    <Secao
      id="ctrl-livro"
      titulo={`Lançamentos de ${dados.financeiro.dre.periodo.rotulo}`}
      descricao={`Custos ${dinheiro(custos)} · receitas ${dinheiro(receitas)}. Para desfazer um lançamento, estorne-o na aba Contábil.`}
      acoes={
        <Link href="/admin/resultados/contabil" className="btn btn-outline">
          Abrir a Contábil
        </Link>
      }
    >
      {dados.lancamentos.length ? (
        <TabelaRolavel rotulo="Lançamentos manuais e recorrentes do período: data, descrição, setor, conta e valor">
          <table className="audit-table">
            <caption className="adm-sr">Lançamentos manuais e recorrentes do período: data, descrição, setor, conta e valor</caption>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Descrição</th>
                <th scope="col">Setor</th>
                <th scope="col">Conta</th>
                <th scope="col">Origem</th>
                <th scope="col" className="adm-num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.lancamentos.map((l) => {
                const c = conta.get(l.contaCodigo)
                const receita = c?.natureza === 'receita'
                return (
                  <tr key={l.id}>
                    <td>{data(l.data)}</td>
                    <td>{l.descricao}</td>
                    <td>{l.setorId !== null ? (setor.get(l.setorId) ?? '—') : 'Sem setor'}</td>
                    <td>
                      {l.contaCodigo}
                      <div className="adm-fraco">{c?.nome ?? ''}</div>
                    </td>
                    <td>{l.recorrenteId !== null ? <Selo tom="ouro">Recorrente</Selo> : <Selo>Manual</Selo>}</td>
                    <td className={receita ? 'adm-num' : 'adm-num adm-negativo'}>
                      {receita ? '+' : '−'}
                      {dinheiro(l.valor)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TabelaRolavel>
      ) : (
        <Vazio titulo="Nenhum lançamento manual neste período.">Os custos recorrentes aparecem aqui no dia em que vencem.</Vazio>
      )}
    </Secao>
  )
}

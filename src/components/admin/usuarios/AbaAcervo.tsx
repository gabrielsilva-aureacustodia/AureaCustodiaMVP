/**
 * A aba Acervo da ficha: cada moeda da conta com código, recibo, hash, caixa e posição — e
 * o laudo que a aprovou na bancada (peso, operador, hash da análise). Moeda em retirada ou já
 * retirada aparece com a situação da retirada. Sem 'use client'.
 */

import type { ReactNode } from 'react'

import type { AbaAcervo as DadosAbaAcervo } from '@/server/admin/ficha'

import { dataHora, dinheiro, numero } from '../formatos'
import { TabelaRolavel } from '@/components/admin/Pecas'

const RECIBO: Record<string, string> = { Ativo: 'pill g', Bloqueado: 'pill adm-pill-vermelho', Extinto: 'pill n' }

export function AbaAcervo({ dados }: { dados: DadosAbaAcervo }): ReactNode {
  if (!dados.moedas.length) return <div className="empty">Esta conta não tem moedas.</div>
  return (
    <>
      <p className="adm-fraco">{numero(dados.moedas.length)} moeda(s), incluindo as já retiradas.</p>
      <TabelaRolavel rotulo="Moedas da conta: recibo, caixa, laudo e valor estimado">
        <table className="audit-table">
          <caption className="adm-sr">Moedas da conta: recibo, caixa, laudo e valor estimado</caption>
          <thead>
            <tr>
              <th scope="col">Moeda</th>
              <th scope="col">Recibo</th>
              <th scope="col">Caixa e posição</th>
              <th scope="col">Laudo</th>
              <th scope="col" className="adm-num">Valor estimado</th>
              <th scope="col">Retirada</th>
            </tr>
          </thead>
          <tbody>
            {dados.moedas.map((m) => (
              <tr key={m.id}>
                <td>
                  <b>{m.id}</b>
                  <div className="adm-fraco">
                    {m.tipoMoeda} · {m.ano} · {m.statusFisico}
                  </div>
                  <div className="adm-fraco">
                    envio {m.protocoloEnvio} · entrada {m.entrada}
                    {m.transferida ? ' · veio de negociação' : ''}
                  </div>
                </td>
                <td>
                  <span className={RECIBO[m.recibo.status] ?? 'pill n'}>{m.recibo.status}</span>
                  <div className="adm-mono">{m.recibo.codigo}</div>
                  <div className="adm-mono adm-fraco">{m.recibo.hash}</div>
                </td>
                <td>{m.analise?.caixa ? `${m.analise.caixa}${m.analise.posicao !== null ? ` · posição ${m.analise.posicao}` : ''}` : '—'}</td>
                <td>
                  {m.analise ? (
                    <>
                      {m.analise.protocolo} · {numero(m.analise.pesoMg)} mg
                      <div className="adm-fraco">
                        {m.analise.operador} · {dataHora(m.analise.validadoEm)}
                      </div>
                      <div className="adm-mono adm-fraco">{m.analise.hash.slice(0, 16)}…</div>
                    </>
                  ) : (
                    <span className="adm-fraco">sem laudo na corrente</span>
                  )}
                </td>
                <td className="adm-num">{dinheiro(m.valorEstimado)}</td>
                <td>{m.retirada ? `${m.retirada.id} · ${m.retirada.status}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabelaRolavel>
    </>
  )
}

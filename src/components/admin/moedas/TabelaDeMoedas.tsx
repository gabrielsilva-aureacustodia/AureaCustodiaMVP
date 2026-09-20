/**
 * A tabela do acervo: uma linha por moeda, com recibo, hash, caixa e posição, laudo de origem e
 * situação. O código abre a ficha da moeda. Sem 'use client'.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { ROTULO_SITUACAO, type LinhaMoeda } from '@/domain/admin/moedas'

import { dataHora, dinheiro, numero } from '../formatos'

const PILL_SITUACAO: Record<LinhaMoeda['situacao'], string> = { custodiada: 'pill g', em_retirada: 'pill y', retirada: 'pill n' }
const PILL_RECIBO: Record<string, string> = { Ativo: 'pill g', Bloqueado: 'pill adm-pill-vermelho', Extinto: 'pill n' }

/** Hash longo cortado nas pontas: dá para conferir de olho sem ocupar a tela. */
export function hashCurto(h: string): string {
  return h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h
}

export function TabelaDeMoedas({ linhas, total }: { linhas: LinhaMoeda[]; total: number }): ReactNode {
  if (linhas.length === 0) return <p className="empty">Nenhuma moeda com este filtro.</p>
  return (
    <>
      <p className="adm-fraco">
        {total > linhas.length ? `Mostrando ${numero(linhas.length)} de ${numero(total)} moedas — refine o filtro para ver o resto.` : `${numero(total)} moeda(s).`}
      </p>
      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Moeda</th>
              <th>Dono</th>
              <th>Recibo</th>
              <th>Caixa</th>
              <th>Análise</th>
              <th>Situação</th>
              <th className="adm-num">Valor estimado</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.codigo}>
                <td>
                  <Link href={`/admin/moedas/${encodeURIComponent(l.codigo)}`}>
                    <b>{l.codigo}</b>
                  </Link>
                  <div className="adm-fraco">
                    {l.tipoMoeda} ({l.ano})
                  </div>
                </td>
                <td>
                  <Link href={`/admin/usuarios/${encodeURIComponent(l.dono)}`}>{l.nomeDono}</Link>
                  <div className="adm-fraco">{l.dono}</div>
                </td>
                <td>
                  <span className={PILL_RECIBO[l.recibo.status] ?? 'pill n'}>{l.recibo.status}</span> {l.recibo.codigo}
                  <div className="adm-mono adm-fraco" title={l.recibo.hash}>
                    {hashCurto(l.recibo.hash)}
                  </div>
                  {l.hashConfere === false ? <div className="adm-alerta-texto">hash diferente da análise</div> : null}
                </td>
                <td>{l.caixa ? `${l.caixa}${l.posicao !== null ? ` · pos. ${l.posicao}` : ''}` : <span className="adm-fraco">—</span>}</td>
                <td>
                  {l.analise ? (
                    <>
                      {l.analise.protocolo}
                      <div className="adm-fraco">
                        {numero(l.analise.pesoMg / 1000)} g · {l.analise.operador}
                      </div>
                      <div className="adm-fraco">
                        {dataHora(l.analise.validadoEm)}
                        {l.analise.caminhoVideo ? ' · com vídeo' : ' · sem vídeo'}
                      </div>
                    </>
                  ) : (
                    <span className="adm-fraco">sem laudo de bancada</span>
                  )}
                </td>
                <td>
                  <span className={PILL_SITUACAO[l.situacao]}>{ROTULO_SITUACAO[l.situacao]}</span>
                  {l.negociando ? <div className="adm-fraco">com oferta aberta</div> : null}
                </td>
                <td className="adm-num">{dinheiro(l.valorEstimado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

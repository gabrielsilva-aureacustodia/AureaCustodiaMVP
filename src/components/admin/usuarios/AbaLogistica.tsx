/**
 * A aba Logística da ficha: envios e retiradas da conta, com a etapa atual e os eventos de
 * rastreio dos Correios — os mesmos que o cliente vê, lidos de `aurea.rastreios`. A tela nunca
 * consulta os Correios (regra do M6: quem atualiza o rastreio é o job agendado). Sem
 * 'use client'.
 */

import type { ReactNode } from 'react'

import type { RastreioGravado } from '@/server/db/repositories/rastreios'
import type { AbaLogistica as DadosAbaLogistica } from '@/server/admin/ficha'

import { data, dataHora, dinheiro, numero } from '../formatos'

function Rastreio({ rastreio }: { rastreio: RastreioGravado | undefined }): ReactNode {
  if (!rastreio) return <span className="adm-fraco">rastreio ainda não consultado</span>
  return (
    <details className="adm-detalhes" style={{ marginBottom: 0 }}>
      <summary>
        {rastreio.etapaDescricao}
        <span className="adm-fraco"> · {dataHora(rastreio.dataUltimaAtualizacao)}</span>
      </summary>
      <div className="adm-detalhes-corpo">
        <ul className="adm-lista">
          {rastreio.eventos.map((e, i) => (
            <li key={`${e.dataHora}-${i}`}>
              {dataHora(e.dataHora)} — {e.descricao}
              <span className="adm-fraco">
                {' '}
                · {e.unidadeLocal} {e.cidade}/{e.uf}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

export function AbaLogistica({ dados }: { dados: DadosAbaLogistica }): ReactNode {
  return (
    <>
      <div className="adm-subtitulo">Envios para a custódia</div>
      {dados.envios.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Moedas</th>
                <th>Etapa</th>
                <th>Postagem e recebimento</th>
                <th>Rastreio</th>
              </tr>
            </thead>
            <tbody>
              {dados.envios.map((e) => (
                <tr key={e.protocolo}>
                  <td>
                    <b>{e.protocolo}</b>
                    <div className="adm-fraco">criado {data(e.createdAt)}</div>
                  </td>
                  <td>
                    {numero(e.quantidade)} × {e.tipoMoeda} ({e.ano})
                  </td>
                  <td>{e.etapaAtual}</td>
                  <td>
                    {e.dataPostagem ? `postado ${data(e.dataPostagem)}` : 'não postado'}
                    {e.dataRecebimento ? <div className="adm-fraco">recebido {data(e.dataRecebimento)}</div> : null}
                  </td>
                  <td>
                    {e.codigoRastreio ? <div className="adm-mono">{e.codigoRastreio}</div> : null}
                    <Rastreio rastreio={dados.rastreios[e.protocolo]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-fraco">Nenhum envio.</p>
      )}

      <div className="adm-subtitulo">Retiradas</div>
      {dados.retiradas.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Retirada</th>
                <th>Moeda</th>
                <th>Situação</th>
                <th className="adm-num">Taxa</th>
                <th>Prazo</th>
                <th>Histórico</th>
              </tr>
            </thead>
            <tbody>
              {dados.retiradas.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.id}</b>
                    <div className="adm-fraco">
                      {r.modalidade} · pedida {data(r.solicitadoEm)}
                    </div>
                  </td>
                  <td>
                    {r.coinId}
                    <div className="adm-mono adm-fraco">{r.reciboCodigo}</div>
                  </td>
                  <td>
                    {r.status}
                    {r.codigoRastreio ? <div className="adm-mono">{r.codigoRastreio}</div> : null}
                  </td>
                  <td className="adm-num">{dinheiro(r.valorTaxaCents)}</td>
                  <td>{data(r.dataLimiteD30)}</td>
                  <td>
                    <ul className="adm-lista" style={{ marginBottom: 0 }}>
                      {r.historico.map((h, i) => (
                        <li key={`${h.data}-${i}`}>
                          {dataHora(h.data)}: {h.de ?? 'início'} → {h.para}
                          {h.motivo ? <span className="adm-fraco"> · {h.motivo}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-fraco">Nenhuma retirada.</p>
      )}
    </>
  )
}

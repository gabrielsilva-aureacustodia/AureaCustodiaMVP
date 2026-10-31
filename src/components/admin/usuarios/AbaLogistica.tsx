/**
 * A aba Logística da ficha: envios e retiradas da conta, com a etapa atual e os eventos de
 * rastreio dos Correios — os mesmos que o cliente vê, lidos de `aurea.rastreios`. A tela nunca
 * consulta os Correios (regra do M6: quem atualiza o rastreio é o job agendado). Sem
 * 'use client'.
 */

import type { ReactNode } from 'react'

import { textoDoRastreio } from '@/domain/rastreio'
import type { RastreioGravado } from '@/server/db/repositories/rastreios'
import type { AbaLogistica as DadosAbaLogistica } from '@/server/admin/ficha'

import { AcoesDoEnvio } from '../registros'
import { data, dataHora, dinheiro, numero } from '../formatos'
import { TabelaRolavel } from '@/components/admin/Pecas'

function Rastreio({ rastreio }: { rastreio: RastreioGravado | undefined }): ReactNode {
  if (!rastreio) return <span className="adm-fraco">rastreio ainda não consultado</span>
  return (
    <details className="adm-detalhes adm-mb0">
      <summary>
        {textoDoRastreio(rastreio)}
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
        <TabelaRolavel rotulo="Envios da conta para a custódia">
          <table className="audit-table">
            <caption className="adm-sr">Envios da conta para a custódia</caption>
            <thead>
              <tr>
                <th scope="col">Protocolo</th>
                <th scope="col">Moedas</th>
                <th scope="col">Etapa</th>
                <th scope="col">Postagem e recebimento</th>
                <th scope="col">Rastreio</th>
                <th scope="col" />
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
                  <td>
                    <AcoesDoEnvio protocolo={e.protocolo} quantidade={e.quantidade} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelaRolavel>
      ) : (
        <p className="adm-fraco">Nenhum envio.</p>
      )}

      <div className="adm-subtitulo">Retiradas</div>
      {dados.retiradas.length ? (
        <TabelaRolavel rotulo="Retiradas da conta">
          <table className="audit-table">
            <caption className="adm-sr">Retiradas da conta</caption>
            <thead>
              <tr>
                <th scope="col">Retirada</th>
                <th scope="col">Moeda</th>
                <th scope="col">Situação</th>
                <th scope="col" className="adm-num">Taxa</th>
                <th scope="col">Prazo</th>
                <th scope="col">Histórico</th>
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
                    {/* O retrato da retirada é gravado com o id dela (migration 030), e a ficha já os carrega. */}
                    {r.codigoRastreio ? <Rastreio rastreio={dados.rastreios[r.id]} /> : null}
                  </td>
                  <td className="adm-num">{dinheiro(r.valorTaxaCents)}</td>
                  <td>{data(r.dataLimiteD30)}</td>
                  <td>
                    <ul className="adm-lista adm-mb0">
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
        </TabelaRolavel>
      ) : (
        <p className="adm-fraco">Nenhuma retirada.</p>
      )}
    </>
  )
}

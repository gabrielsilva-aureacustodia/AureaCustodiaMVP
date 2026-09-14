/**
 * A logística de todas as contas: o filtro (formulário GET), os envios e as retiradas, com o
 * prazo estourado em vermelho e o rastreio dos Correios que o cliente também vê. Sem 'use client'.
 *
 * A reimpressão de etiqueta é um link para as rotas que já existem —
 * `/api/envios/etiqueta/[protocolo]` e `/api/retiradas/etiqueta/[id]` —, que conferem a permissão
 * `logistica.etiquetas` do painel além do dono (plano do Admin, 3.6).
 */

import Form from 'next/form'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_RETIRADA, type FiltroLogistica } from '@/domain/admin/logistica'
import type { RastreioGravado } from '@/server/db/repositories/rastreios'
import type { DadosDaLogistica } from '@/server/admin/logistica'

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

function Filtro({ filtro }: { filtro: FiltroLogistica }): ReactNode {
  return (
    <Form action="/admin/logistica" className="adm-form">
      <div className="field adm-campo-largo">
        <label htmlFor="logistica-busca">Protocolo, retirada, moeda, rastreio, nome ou e-mail</label>
        <input id="logistica-busca" name="busca" className="tinput" defaultValue={filtro.busca} placeholder="ex.: RO-ENV-0003, BR123, Ana" />
      </div>
      <div className="field">
        <label htmlFor="logistica-ver">Ver</label>
        <select id="logistica-ver" name="ver" className="tinput" defaultValue={filtro.ver}>
          <option value="tudo">Envios e retiradas</option>
          <option value="envios">Só envios</option>
          <option value="retiradas">Só retiradas</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="logistica-situacao">Situação</label>
        <select id="logistica-situacao" name="situacao" className="tinput" defaultValue={filtro.situacao}>
          <option value="abertos">Em andamento</option>
          <option value="atrasados">Com prazo estourado</option>
          <option value="todos">Todos</option>
        </select>
      </div>
      <div className="adm-acoes">
        <button type="submit" className="btn btn-gold adm-btn-compacto">
          Filtrar
        </button>
        <Link href="/admin/logistica" className="btn btn-outline adm-btn-compacto">
          Limpar
        </Link>
      </div>
    </Form>
  )
}

export function PainelLogistica({ dados, filtro, podeEtiqueta }: { dados: DadosDaLogistica; filtro: FiltroLogistica; podeEtiqueta: boolean }): ReactNode {
  return (
    <>
      <div className="panel">
        <h3>Filtro</h3>
        <Filtro filtro={filtro} />
        {dados.retiradasIndisponiveis ? <p className="note">As retiradas não puderam ser lidas agora.</p> : null}
        {dados.rastreiosIndisponiveis ? <p className="note">O último rastreio gravado não pôde ser lido agora; as etapas continuam valendo.</p> : null}
      </div>

      {filtro.ver !== 'retiradas' ? (
        <div className="panel">
          <h3>Envios para a custódia</h3>
          {dados.envios.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Protocolo</th>
                    <th>Cliente</th>
                    <th>Moedas</th>
                    <th>Etapa</th>
                    <th>Postagem e recebimento</th>
                    <th>Rastreio</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dados.envios.map((e) => (
                    <tr key={e.protocolo} className={e.atrasado ? 'adm-linha-alerta' : undefined}>
                      <td>
                        <b>{e.protocolo}</b>
                        <div className="adm-fraco">
                          criado {data(e.createdAt)}
                          {e.modalidadeEnvio ? ` · ${e.modalidadeEnvio}` : ''}
                        </div>
                      </td>
                      <td>
                        <Link href={`/admin/usuarios/${encodeURIComponent(e.email)}`}>{e.nome}</Link>
                        <div className="adm-fraco">{e.email}</div>
                      </td>
                      <td>
                        {numero(e.quantidade)} × {e.tipoMoeda} ({e.ano})
                      </td>
                      <td>
                        {e.etapaAtual}
                        {e.alerta ? <div className="adm-alerta-texto">{e.alerta}</div> : null}
                      </td>
                      <td>
                        {e.dataPostagem ? `postado ${data(e.dataPostagem)}` : 'não postado'}
                        {e.dataRecebimento ? <div className="adm-fraco">recebido {data(e.dataRecebimento)}</div> : null}
                      </td>
                      <td>
                        {e.codigoRastreio ? <div className="adm-mono">{e.codigoRastreio}</div> : null}
                        <Rastreio rastreio={dados.rastreios[e.protocolo]} />
                      </td>
                      <td>
                        {podeEtiqueta ? (
                          <a className="btn btn-outline adm-btn-compacto" href={`/api/envios/etiqueta/${encodeURIComponent(e.protocolo)}`} target="_blank" rel="noreferrer">
                            Etiqueta
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">Nenhum envio com este filtro.</p>
          )}
        </div>
      ) : null}

      {filtro.ver !== 'envios' ? (
        <div className="panel">
          <h3>Retiradas físicas</h3>
          {dados.retiradas.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Retirada</th>
                    <th>Cliente</th>
                    <th>Moeda</th>
                    <th>Situação</th>
                    <th className="adm-num">Taxa</th>
                    <th>Prazo</th>
                    <th>Histórico e rastreio</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dados.retiradas.map((r) => (
                    <tr key={r.id} className={r.atrasada ? 'adm-linha-alerta' : undefined}>
                      <td>
                        <b>{r.id}</b>
                        <div className="adm-fraco">
                          {r.modalidade} · pedida {data(r.solicitadoEm)}
                        </div>
                      </td>
                      <td>
                        <Link href={`/admin/usuarios/${encodeURIComponent(r.email)}`}>{r.nome}</Link>
                        <div className="adm-fraco">{r.email}</div>
                      </td>
                      <td>
                        <Link href={`/admin/moedas/${encodeURIComponent(r.coinId)}`}>{r.coinId}</Link>
                        <div className="adm-mono adm-fraco">{r.reciboCodigo}</div>
                      </td>
                      <td>
                        {ROTULO_STATUS_RETIRADA[r.status]}
                        {r.codigoRastreio ? <div className="adm-mono">{r.codigoRastreio}</div> : null}
                        {r.alerta ? <div className="adm-alerta-texto">{r.alerta}</div> : null}
                      </td>
                      <td className="adm-num">
                        {dinheiro(r.valorTaxaCents)}
                        <div className="adm-fraco">
                          {r.formaPagamento ? (ROTULO_FORMA_PAGAMENTO[r.formaPagamento] ?? r.formaPagamento) : 'forma não registrada'}
                          {r.parcelas > 1 ? ` · ${r.parcelas}x` : ''}
                        </div>
                        {r.pagoEm ? <div className="adm-fraco">paga {data(r.pagoEm)}</div> : null}
                      </td>
                      <td>{data(r.dataLimiteD30)}</td>
                      <td>
                        <details className="adm-detalhes" style={{ marginBottom: 6 }}>
                          <summary>{r.historico.length === 1 ? '1 etapa' : `${numero(r.historico.length)} etapas`}</summary>
                          <div className="adm-detalhes-corpo">
                            <ul className="adm-lista">
                              {r.historico.map((h, i) => (
                                <li key={`${h.data}-${i}`}>
                                  {dataHora(h.data)}: {h.de ? ROTULO_STATUS_RETIRADA[h.de] : 'início'} → {ROTULO_STATUS_RETIRADA[h.para]}
                                  {h.motivo ? <span className="adm-fraco"> · {h.motivo}</span> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </details>
                        <Rastreio rastreio={dados.rastreios[r.id]} />
                      </td>
                      <td>
                        {podeEtiqueta ? (
                          <a className="btn btn-outline adm-btn-compacto" href={`/api/retiradas/etiqueta/${encodeURIComponent(r.id)}`} target="_blank" rel="noreferrer">
                            Etiqueta
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">Nenhuma retirada com este filtro.</p>
          )}
        </div>
      ) : null}
    </>
  )
}

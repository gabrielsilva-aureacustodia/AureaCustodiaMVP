/**
 * A logística de todas as contas: o filtro (formulário GET), os envios e as retiradas, com o
 * prazo estourado em vermelho e o rastreio dos Correios que o cliente também vê. Sem 'use client'.
 *
 * A reimpressão de etiqueta é um link para as rotas que já existem —
 * `/api/envios/etiqueta/[protocolo]` e `/api/retiradas/etiqueta/[id]` —, que conferem a permissão
 * `logistica.etiquetas` do painel além do dono (plano do Admin, 3.6).
 *
 * A expedição da retirada (22/10/2026, contrato com os Correios) é a única parte interativa:
 * emitir, imprimir e cancelar a etiqueta oficial, ou — sem contrato — informar o código da postagem
 * no balcão. Mora em `ExpedicaoDaRetirada.tsx`, um Client Component, para esta tela continuar sendo
 * desenhada no servidor.
 */

import Form from 'next/form'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ROTULO_FORMA_PAGAMENTO, ROTULO_STATUS_RETIRADA, type FiltroLogistica } from '@/domain/admin/logistica'
import { AcoesDoEnvio } from '../registros'
import { ExpedicaoDaRetirada, type EtiquetaDaRetirada } from './ExpedicaoDaRetirada'
import type { RastreioGravado } from '@/server/db/repositories/rastreios'
import type { DadosDaLogistica } from '@/server/admin/logistica'

import { data, dataHora, dinheiro, numero } from '../formatos'
import { Abas, TabelaRolavel } from '../Pecas'

function Rastreio({ rastreio }: { rastreio: RastreioGravado | undefined }): ReactNode {
  if (!rastreio) return <span className="adm-fraco">rastreio ainda não consultado</span>
  // Código sem registro nos Correios (SRO-020: postado antes do contrato, digitado errado ou recém-postado):
  // uma linha curta, com a mensagem inteira na dica. O parágrafo dos Correios no meio da tabela parecia
  // erro do sistema (27/10/2026).
  if (rastreio.statusAtual === 'nao_encontrado') {
    return (
      <span className="adm-fraco" title={rastreio.etapaDescricao}>
        Correios sem registro deste código · {dataHora(rastreio.dataUltimaAtualizacao)}
      </span>
    )
  }
  return (
    <details className="adm-detalhes adm-mb0">
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
  const filtrosAtivos = [filtro.busca, filtro.situacao !== 'abertos'].filter(Boolean).length
  return (
    // Celular: os campos ficam numa gaveta "Filtros (N)", aberta quando há filtro valendo; no
    // computador o resumo some e os campos ficam sempre à vista (admin.css, ::details-content).
    <details className="adm-filtros-gaveta" open={filtrosAtivos > 0}>
      <summary>Filtros{filtrosAtivos ? ` (${filtrosAtivos})` : ''}</summary>
      <Form action="/admin/logistica" className="adm-form">
        <div className="field adm-campo-largo">
          <label htmlFor="logistica-busca">Protocolo, retirada, moeda, rastreio, nome ou e-mail</label>
          <input id="logistica-busca" name="busca" className="tinput" defaultValue={filtro.busca} placeholder="ex.: RO-ENV-0003, BR123, Ana" />
        </div>
        {/* "Ver" virou as abas acima da lista (rodada 2); o filtro só leva a aba atual junto. */}
        <input type="hidden" name="ver" value={filtro.ver} />
        <div className="field">
          <label htmlFor="logistica-situacao">Situação</label>
          <select id="logistica-situacao" name="situacao" className="tinput" defaultValue={filtro.situacao}>
            <option value="abertos">Em andamento</option>
            <option value="atrasados">Com prazo estourado</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <div className="adm-acoes">
          <button type="submit" className="btn btn-outline adm-btn-compacto">
            Filtrar envios e retiradas
          </button>
          {filtrosAtivos ? (
            <Link href={filtro.ver === 'tudo' ? '/admin/logistica' : `/admin/logistica?ver=${filtro.ver}`} className="btn btn-outline adm-btn-compacto">
              Limpar filtros ({filtrosAtivos})
            </Link>
          ) : null}
        </div>
      </Form>
    </details>
  )
}

export function PainelLogistica({
  dados,
  filtro,
  podeEtiqueta,
  podeExpedir = false,
  contratoCorreios = false,
  etiquetas = {},
}: {
  dados: DadosDaLogistica
  filtro: FiltroLogistica
  podeEtiqueta: boolean
  /** `logistica.expedir`: emitir/cancelar etiqueta e marcar a postagem. */
  podeExpedir?: boolean
  /** O contrato dos Correios está configurado neste ambiente (`correiosConfigurado()`). */
  contratoCorreios?: boolean
  /** Pré-postagem ativa de cada retirada visível, pelo id da retirada. */
  etiquetas?: Record<string, EtiquetaDaRetirada>
}): ReactNode {
  // Abas por tipo (rodada 2, 25/10/2026): o "Ver" que estava escondido no filtro. Levam a situação
  // e a busca junto; a contagem é a de "em andamento" que a página já calculou.
  const resto = new URLSearchParams()
  if (filtro.situacao !== 'abertos') resto.set('situacao', filtro.situacao)
  if (filtro.busca) resto.set('busca', filtro.busca)
  const url = (ver: string): string => {
    const q = new URLSearchParams(resto)
    if (ver !== 'tudo') q.set('ver', ver)
    const t = q.toString()
    return t ? `/admin/logistica?${t}` : '/admin/logistica'
  }

  return (
    <>
      <Abas
        rotulo="Envios e retiradas"
        itens={[
          { href: url('tudo'), rotulo: 'Tudo', atual: filtro.ver === 'tudo' },
          { href: url('envios'), rotulo: 'Envios para a custódia', atual: filtro.ver === 'envios', contagem: dados.contagem.enviosAbertos },
          { href: url('retiradas'), rotulo: 'Retiradas físicas', atual: filtro.ver === 'retiradas', contagem: dados.contagem.retiradasAbertas },
        ]}
      />
      <div className="adm-secao">
        <Filtro filtro={filtro} />
        {dados.retiradasIndisponiveis ? <p className="note">As retiradas não puderam ser lidas agora.</p> : null}
        {dados.rastreiosIndisponiveis ? <p className="note">O último rastreio gravado não pôde ser lido agora; as etapas continuam valendo.</p> : null}
      </div>

      {filtro.ver !== 'retiradas' ? (
        <div className="panel">
          <h2>Envios para a custódia</h2>
          {dados.envios.length ? (
            <TabelaRolavel rotulo="Envios para a custódia: protocolo, cliente, moedas, etapa e prazos">
              <table className="audit-table">
                <caption className="adm-sr">Envios para a custódia: protocolo, cliente, moedas, etapa e prazos</caption>
                <thead>
                  <tr>
                    <th scope="col">Protocolo</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Moedas</th>
                    <th scope="col">Etapa</th>
                    <th scope="col">Postagem e recebimento</th>
                    <th scope="col">Rastreio</th>
                    <th scope="col" />
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
                        {e.desconsiderado ? <div className="adm-fraco">desconsiderado: não postado em 3 dias</div> : null}
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
                        <div className="adm-acoes-fim">
                          {podeEtiqueta ? (
                            <a className="btn btn-outline adm-btn-compacto" href={`/api/envios/etiqueta/${encodeURIComponent(e.protocolo)}`} target="_blank" rel="noreferrer">
                              Etiqueta
                            </a>
                          ) : null}
                          {/* Gestão do registro (23/09/2026): corrigir a
                              quantidade declarada ou apagar o envio. Apagar
                              recusa se o envio já virou acervo. */}
                          <AcoesDoEnvio protocolo={e.protocolo} quantidade={e.quantidade} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelaRolavel>
          ) : (
            <div className="adm-vazio">
              <b>Nenhum envio com este filtro.</b>
              {filtro.situacao === 'abertos' ? 'Sem envio em andamento. Troque a Situação para "Todos" para ver os concluídos.' : 'Afrouxe a busca ou use "Limpar filtros" acima.'}
            </div>
          )}
        </div>
      ) : null}

      {filtro.ver !== 'envios' ? (
        <div className="panel">
          <h2>Retiradas físicas</h2>
          {dados.retiradas.length ? (
            <TabelaRolavel rotulo="Retiradas físicas: cliente, moeda, situação, taxa e prazo">
              <table className="audit-table">
                <caption className="adm-sr">Retiradas físicas: cliente, moeda, situação, taxa e prazo</caption>
                <thead>
                  <tr>
                    <th scope="col">Retirada</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Moeda</th>
                    <th scope="col">Situação</th>
                    <th scope="col" className="adm-num">Taxa</th>
                    <th scope="col">Prazo</th>
                    <th scope="col">Histórico e rastreio</th>
                    <th scope="col" />
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
                        <details className="adm-detalhes adm-mb6">
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
                        <ExpedicaoDaRetirada
                          retiradaId={r.id}
                          status={r.status}
                          etiqueta={etiquetas[r.id] ?? null}
                          contratoCorreios={contratoCorreios}
                          podeExpedir={podeExpedir}
                          podeEtiqueta={podeEtiqueta}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelaRolavel>
          ) : (
            <div className="adm-vazio">
              <b>Nenhuma retirada com este filtro.</b>
              {filtro.situacao === 'abertos' ? 'Sem retirada em andamento. Troque a Situação para "Todos" para ver as entregues.' : 'Afrouxe a busca ou use "Limpar filtros" acima.'}
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}

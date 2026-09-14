/**
 * A aba Mercado da ficha: anúncios de venda (por lote), ofertas de compra, negociações e o
 * histórico da fila de ofertas.
 *
 * A POSIÇÃO NA FILA É DA FRENTE A. `posicaoNaFila` e `aurea.ofertas_historico` nascem na A2
 * (fila por ordem de cadastro), e o painel não recalcula a fila por conta própria: enquanto a
 * A2 não está na `main`, a coluna diz "disponível depois da A2". O histórico da fila aparece
 * sozinho quando a tabela existir neste banco. Sem 'use client'.
 */

import type { ReactNode } from 'react'

import type { AbaMercado as DadosAbaMercado } from '@/server/admin/ficha'

import { Indisponivel } from '../Blocos'
import { dataHora, dinheiro, numero } from '../formatos'

const EVENTO_DA_FILA: Record<string, string> = { publicada: 'Publicada', editada: 'Editada', cancelada: 'Cancelada', executada: 'Executada' }

export function AbaMercado({ dados, semBanco }: { dados: DadosAbaMercado; semBanco: boolean }): ReactNode {
  return (
    <>
      <div className="adm-subtitulo">Anúncios de venda</div>
      {dados.lotes.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Tipo</th>
                <th className="adm-num">Moedas</th>
                <th className="adm-num">Preço por moeda</th>
                <th>Publicado em</th>
                <th>Posição na fila</th>
              </tr>
            </thead>
            <tbody>
              {dados.lotes.map((l) => (
                <tr key={l.lotId}>
                  <td className="adm-mono">{l.lotId}</td>
                  <td>{l.tipoMoeda}</td>
                  <td className="adm-num">{numero(l.quantidade)}</td>
                  <td className="adm-num">{dinheiro(l.preco)}</td>
                  <td>{dataHora(l.createdAt)}</td>
                  <td className="adm-fraco">disponível depois da A2</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-fraco">Nenhum anúncio aberto.</p>
      )}

      <div className="adm-subtitulo">Ofertas de compra</div>
      {dados.ordensDeCompra.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Oferta</th>
                <th>Tipo</th>
                <th className="adm-num">Quantidade restante</th>
                <th className="adm-num">Preço-limite</th>
                <th>Cadastrada em</th>
                <th>Posição na fila</th>
              </tr>
            </thead>
            <tbody>
              {dados.ordensDeCompra.map((b) => (
                <tr key={b.id}>
                  <td className="adm-mono">{b.id}</td>
                  <td>{b.tipoMoeda}</td>
                  <td className="adm-num">{numero(b.qty)}</td>
                  <td className="adm-num">{dinheiro(b.price)}</td>
                  <td>{dataHora(b.createdAt)}</td>
                  <td className="adm-fraco">disponível depois da A2</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-fraco">Nenhuma oferta de compra aberta.</p>
      )}

      <div className="adm-subtitulo">Negociações</div>
      {dados.negociacoes.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Lado</th>
                <th>Tipo</th>
                <th className="adm-num">Qtd</th>
                <th className="adm-num">Preço</th>
                <th>Contraparte</th>
              </tr>
            </thead>
            <tbody>
              {dados.negociacoes.map((t, i) => (
                <tr key={`${t.date}-${i}`}>
                  <td>{dataHora(t.date)}</td>
                  <td>{t.lado === 'compra' ? 'Comprou' : 'Vendeu'}</td>
                  <td>{t.tipoMoeda}</td>
                  <td className="adm-num">{numero(t.qty)}</td>
                  <td className="adm-num">{dinheiro(t.price)}</td>
                  <td>{t.lado === 'compra' ? t.seller : t.buyer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="adm-fraco">Nenhuma negociação.</p>
      )}

      <div className="adm-subtitulo">Histórico da fila</div>
      {dados.historicoDaFila ? (
        dados.historicoDaFila.length ? (
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Oferta</th>
                  <th>Evento</th>
                  <th>Preço</th>
                  <th>Quantidade</th>
                  <th>Perdeu a vez?</th>
                </tr>
              </thead>
              <tbody>
                {dados.historicoDaFila.map((e, i) => (
                  <tr key={`${e.ofertaId}-${e.createdAt}-${i}`}>
                    <td>{dataHora(e.createdAt)}</td>
                    <td>
                      <span className="adm-mono">{e.ofertaId}</span>
                      <div className="adm-fraco">
                        {e.lado} · {e.tipoMoeda}
                      </div>
                    </td>
                    <td>{EVENTO_DA_FILA[e.evento] ?? e.evento}</td>
                    <td>
                      {e.precoAntes !== null && e.precoAntes !== e.precoDepois ? `${dinheiro(e.precoAntes)} → ` : ''}
                      {e.precoDepois !== null ? dinheiro(e.precoDepois) : '—'}
                    </td>
                    <td>
                      {e.qtdAntes !== null && e.qtdAntes !== e.qtdDepois ? `${numero(e.qtdAntes)} → ` : ''}
                      {e.qtdDepois !== null ? numero(e.qtdDepois) : '—'}
                    </td>
                    <td>{e.perdeuAVez ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="adm-fraco">Nenhum evento na fila.</p>
        )
      ) : (
        <Indisponivel titulo="Histórico da fila de ofertas" quando={semBanco ? 'Existe só com banco configurado.' : 'Disponível depois da A2.'} />
      )}
    </>
  )
}

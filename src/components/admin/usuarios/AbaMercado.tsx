/**
 * A aba Mercado da ficha: anúncios de venda (por lote), ofertas de compra, negociações e o
 * histórico da fila de ofertas.
 *
 * A POSIÇÃO NA FILA É DA FRENTE A. `posicaoNaFila` e `aurea.ofertas_historico` nascem na A2
 * (fila por ordem de cadastro), e o painel não recalcula a fila por conta própria: a posição vem
 * pronta de `posicaoNaFila` (src/domain/market.ts), a mesma que o cliente vê em "Minhas ofertas"
 * (ligada na C3, depois de a A2 entrar na `main`). O histórico da fila aparece quando a tabela existe
 * neste banco. Sem 'use client'.
 */

import type { ReactNode } from 'react'

import type { AbaMercado as DadosAbaMercado } from '@/server/admin/ficha'

import type { InfoPosicaoFila } from '@/domain/market'

import { AcoesDaOrdemDeCompra, AcoesDoLote } from '../registros'
import { Indisponivel } from '../Blocos'
import { dataHora, dinheiro, numero } from '../formatos'

/**
 * "1º no preço · 23 com preço melhor vendem primeiro · 3 no total a este preço"
 * — o mesmo resumo de "Minhas ofertas".
 *
 * A REDAÇÃO MUDOU EM 28/09/2026. Era "{posicao}º no preço" seguido de "{aFrente}
 * à frente · {mesmoPreco} no mesmo preço" — e o Gabriel leu "23 à frente" como
 * "23ª posição na fila", achando um bug: um anúncio sozinho num preço (1º no
 * preço, os 3 "no mesmo preço" eram as 3 moedas do PRÓPRIO lote) parecia estar
 * atrás de 23 outras ofertas.
 *
 * NÃO É BUG. A fila é Única e por prioridade preço-tempo dentro do tipo de
 * moeda (regra protegida, decidida pelos sócios — ver CLAUDE.md): quando um
 * comprador aparece, a oferta MAIS BARATA vende primeiro, não importa o
 * preço dela. "23 à frente" contava, corretamente, as ofertas de OUTROS
 * vendedores com preço melhor no livro inteiro — elas de fato vendem antes,
 * porque são mais baratas. O texto só não dizia isso.
 *
 * O texto novo separa as duas perguntas: "sou o 1º no MEU preço?" (sim,
 * sempre que for a única oferta ali) e "quantas OUTRAS ofertas, de qualquer
 * preço, vendem antes de mim?" (as com preço melhor). Comprador e vendedor
 * têm sentidos opostos de "melhor" — mais barato para quem compra, mais alto
 * para quem vende — e por isso a frase muda com `lado`.
 */
function Posicao({ p, lado }: { p: InfoPosicaoFila | null; lado: 'venda' | 'compra' }): ReactNode {
  if (!p) return <span className="adm-fraco">fora da fila</span>
  const verbo = lado === 'venda' ? 'vendem' : 'compram'
  const comparativo = lado === 'venda' ? 'com preço melhor' : 'com lance maior'
  return (
    <>
      {p.posicao}º no seu preço
      <div className="adm-fraco">
        {p.aFrente > 0 ? `${p.aFrente} ${comparativo} ${verbo} primeiro` : `nenhuma oferta ${comparativo}`}
        {' · '}
        {p.mesmoPreco} no total a este preço
      </div>
    </>
  )
}

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
                <th />
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
                  <td>
                    <Posicao p={l.posicao} lado="venda" />
                  </td>
                  <td>
                    <AcoesDoLote lotId={l.lotId} precoCents={l.preco} />
                  </td>
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
                <th />
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
                  <td>
                    <Posicao p={b.posicao} lado="compra" />
                  </td>
                  <td>
                    <AcoesDaOrdemDeCompra bidId={b.id} />
                  </td>
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

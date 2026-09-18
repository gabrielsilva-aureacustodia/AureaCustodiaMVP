/**
 * A aba KPIs da Central de Resultados — os números do negócio em cartões e tabelas.
 *
 * Os gráficos de série temporal ficaram para depois (plano do Admin, seção 9): primeiro
 * número e tabela. Nada é calculado aqui — tudo vem pronto de `montarKpis`
 * (src/domain/kpis.ts), testado sem banco.
 *
 * Indicador que depende de outra frente que ainda não chegou mostra "disponível depois
 * da A2/B2" em vez de zero: zero afirmaria que não houve, e o certo é dizer que ainda não
 * se mede.
 *
 * Sem 'use client': desenhado no servidor; só o seletor de período é de cliente.
 */

import type { ReactNode } from 'react'

import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import type { Kpis } from '@/domain/kpis'

import { AvisoSemBanco, Cartao, Indisponivel } from '../Blocos'
import { SeletorPeriodo } from '../SeletorPeriodo'
import { dinheiro, duracao, numero, percentual } from '../formatos'

const STATUS_RETIRADA: Record<string, string> = {
  solicitada: 'Solicitada',
  paga: 'Paga',
  separacao: 'Em separação',
  postada: 'Postada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
}

export function Indicadores({ kpis, periodo, semBanco }: { kpis: Kpis; periodo: PeriodoEscolhido; semBanco: boolean }): ReactNode {
  const { mercado, acervo, contas, envios, tempos, faturas, fila, planos } = kpis
  return (
    <>
      {semBanco ? <AvisoSemBanco>Os indicadores abaixo saem do estado em memória.</AvisoSemBanco> : null}

      <div className="panel adm-secao">
        <SeletorPeriodo ano={periodo.ano} mes={periodo.mes} trimestre={periodo.trimestre} />
        <p className="adm-fraco" style={{ marginTop: 10 }}>
          Negociações, envios, laudos e faturas são do período ({periodo.periodo.rotulo}). Acervo, contas, faturas em aberto e
          fila de ofertas são a situação de agora.
        </p>
      </div>

      {/* ---------- mercado ---------- */}
      <h3 className="adm-titulo-secao">Mercado</h3>
      <div className="adm-grade">
        <Cartao rotulo="Volume negociado" valor={dinheiro(mercado.volume)} detalhe={`${numero(mercado.moedasNegociadas)} moeda(s)`} />
        <Cartao rotulo="Negociações" valor={numero(mercado.negociacoes)} detalhe={`ticket médio ${dinheiro(mercado.ticketMedio)}`} />
        <Cartao rotulo="Comissão média por negociação" valor={dinheiro(mercado.comissaoMedia.total)} detalhe={`total ${dinheiro(mercado.comissaoTotal)}`} />
        <Cartao
          rotulo="Comissão média por lado"
          valor={`${dinheiro(mercado.comissaoMedia.comprador)} · ${dinheiro(mercado.comissaoMedia.vendedor)}`}
          detalhe={mercado.doisLados ? 'comprador · vendedor' : 'comprador · vendedor — sem comissão de compra no período'}
        />
      </div>

      <div className="adm-grade-larga">
        <div className="panel">
          <h3>Receita de comissão por tipo de moeda</h3>
          {mercado.receitaPorTipo.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Moeda</th>
                    <th className="adm-num">Negociações</th>
                    <th className="adm-num">Moedas</th>
                    <th className="adm-num">Volume</th>
                    <th className="adm-num">Comissões</th>
                  </tr>
                </thead>
                <tbody>
                  {mercado.receitaPorTipo.map((t) => (
                    <tr key={t.tipoMoeda}>
                      <td>{t.tipoMoeda}</td>
                      <td className="adm-num">{numero(t.negociacoes)}</td>
                      <td className="adm-num">{numero(t.moedas)}</td>
                      <td className="adm-num">{dinheiro(t.volume)}</td>
                      <td className="adm-num">{dinheiro(t.comissoes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Nenhuma negociação no período.</div>
          )}
        </div>

        <div className="panel">
          <h3>Fila de ofertas agora</h3>
          {fila.porTipo.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Moeda</th>
                    <th className="adm-num">À venda</th>
                    <th className="adm-num">Menor venda</th>
                    <th className="adm-num">Pedidas</th>
                    <th className="adm-num">Maior compra</th>
                  </tr>
                </thead>
                <tbody>
                  {fila.porTipo.map((t) => (
                    <tr key={t.tipoMoeda}>
                      <td>{t.tipoMoeda}</td>
                      <td className="adm-num">{numero(t.ofertasVenda)}</td>
                      <td className="adm-num">{dinheiro(t.melhorVenda)}</td>
                      <td className="adm-num" title={`${numero(t.ordensCompra)} oferta(s) de compra`}>
                        {numero(t.moedasCompra)}
                      </td>
                      <td className="adm-num">{dinheiro(t.melhorCompra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Nenhuma oferta aberta.</div>
          )}
          <div style={{ marginTop: 12 }}>
            {fila.tempoAteExecucao ? (
              <div className="adm-grade" style={{ marginBottom: 0 }}>
                <Cartao
                  rotulo="Da oferta de venda à execução"
                  valor={duracao(fila.tempoAteExecucao.venda.mediaMs)}
                  detalhe={`média de ${numero(fila.tempoAteExecucao.venda.amostras)} oferta(s)`}
                />
                <Cartao
                  rotulo="Da oferta de compra à execução"
                  valor={duracao(fila.tempoAteExecucao.compra.mediaMs)}
                  detalhe={`média de ${numero(fila.tempoAteExecucao.compra.amostras)} oferta(s)`}
                />
              </div>
            ) : (
              <Indisponivel titulo="Tempo entre o cadastro da oferta e a execução" quando="Disponível depois da A2, que grava o histórico da fila." />
            )}
          </div>
        </div>
      </div>

      {/* ---------- acervo e contas ---------- */}
      <h3 className="adm-titulo-secao">Acervo e contas</h3>
      <div className="adm-grade">
        <Cartao rotulo="Moedas em custódia" valor={numero(acervo.moedasEmCustodia)} detalhe={`${numero(acervo.porStatusFisico.armazenado)} armazenada(s) · ${numero(acervo.porStatusFisico.recebido)} recebida(s)`} />
        <Cartao rotulo="Retiradas em andamento" valor={numero(acervo.emRetirada)} detalhe={`${numero(acervo.retiradasPorStatus.entregue)} entregue(s) no total`} />
        <Cartao rotulo="Contas" valor={numero(contas.total)} detalhe={`${numero(contas.comCadastro)} com cadastro completo`} />
        <Cartao rotulo="Ativas nos últimos 30 dias" valor={numero(contas.ativas30d)} detalhe="pelo último acesso" />
        <Cartao rotulo="Contas com saldo" valor={numero(contas.comSaldo)} detalhe={`${dinheiro(contas.saldoTotal)} em saldo`} />
        <Cartao rotulo="Contas com moeda" valor={numero(contas.comMoeda)} />
      </div>

      <div className="adm-grade-larga">
        <div className="panel">
          <h3>Moedas por tipo</h3>
          <TabelaContagem linhas={acervo.porTipo.map((t) => ({ rotulo: t.tipoMoeda, valor: t.moedas }))} coluna="Moeda" vazio="Nenhuma moeda em custódia." />
        </div>
        <div className="panel">
          <h3>Ocupação do estoque físico, por caixa</h3>
          <TabelaContagem linhas={acervo.porCaixa.map((c) => ({ rotulo: c.caixa, valor: c.moedas }))} coluna="Caixa" vazio="Nenhuma moeda em custódia." />
          <p className="adm-fraco" style={{ marginTop: 10 }}>
            A caixa vem do laudo da bancada. Moedas do acervo de demonstração não passaram por bancada. A capacidade de cada
            caixa entra com o cadastro de caixas, na C3.
          </p>
          <h4 className="adm-subtitulo">Retiradas por situação</h4>
          <TabelaContagem
            linhas={Object.entries(acervo.retiradasPorStatus).map(([status, n]) => ({ rotulo: STATUS_RETIRADA[status] ?? status, valor: n }))}
            coluna="Situação"
            vazio="Nenhuma retirada."
          />
        </div>
      </div>

      {/* ---------- envios e análise ---------- */}
      <h3 className="adm-titulo-secao">Envios e análise</h3>
      <div className="adm-grade">
        <Cartao rotulo="Envios criados" valor={numero(envios.criados)} detalhe={`${numero(envios.concluidos)} com recibo emitido`} />
        <Cartao rotulo="Aprovação na análise" valor={percentual(envios.taxaAprovacaoBp)} detalhe={`${numero(envios.moedasAprovadas)} de ${numero(envios.moedasDeclaradas)} moeda(s)`} />
        <Cartao rotulo="Da postagem ao recebimento" valor={duracao(tempos.postagemAteRecebimento.mediaMs)} detalhe={`média de ${numero(tempos.postagemAteRecebimento.amostras)} envio(s)`} />
        <Cartao rotulo="Do recebimento ao laudo" valor={duracao(tempos.recebimentoAteLaudo.mediaMs)} detalhe={`média de ${numero(tempos.recebimentoAteLaudo.amostras)} envio(s)`} />
        <Cartao rotulo="Da postagem ao laudo" valor={duracao(tempos.postagemAteLaudo.mediaMs)} detalhe={`média de ${numero(tempos.postagemAteLaudo.amostras)} envio(s)`} />
      </div>

      <div className="adm-grade-larga">
        <div className="panel">
          <h3>Funil dos envios criados no período</h3>
          <TabelaContagem
            linhas={envios.funil.map((f) => ({ rotulo: f.etapa, valor: f.envios }))}
            coluna="Chegaram até"
            vazio="Nenhum envio criado no período."
            total={envios.criados}
          />
        </div>
        <div className="panel">
          <h3>Recusa por motivo</h3>
          {envios.recusasPorMotivo.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Motivo</th>
                    <th className="adm-num">Moedas</th>
                    <th className="adm-num">Das recusas</th>
                  </tr>
                </thead>
                <tbody>
                  {envios.recusasPorMotivo.map((r) => (
                    <tr key={r.motivo}>
                      <td>{r.motivo}</td>
                      <td className="adm-num">{numero(r.moedas)}</td>
                      <td className="adm-num">{percentual(r.bp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Nenhuma moeda recusada na bancada no período.</div>
          )}
          <p className="adm-fraco" style={{ marginTop: 10 }}>
            {numero(envios.moedasRecusadas)} moeda(s) recusada(s) nos envios concluídos da coorte.
          </p>
        </div>
      </div>

      {/* ---------- faturas e planos ---------- */}
      <h3 className="adm-titulo-secao">Faturas de custódia e planos</h3>
      <div className="adm-grade">
        <Cartao rotulo="Faturado no período" valor={dinheiro(faturas.valorEmitido)} detalhe={`${numero(faturas.emitidasNoPeriodo)} fatura(s) · ${dinheiro(faturas.valorPago)} pago`} />
        <Cartao rotulo="Faturas em aberto" valor={dinheiro(faturas.emAberto.valor)} detalhe={`${numero(faturas.emAberto.quantidade)} fatura(s), de qualquer mês`} />
        <Cartao
          rotulo="Faturas atrasadas"
          valor={dinheiro(faturas.atrasadas.valor)}
          tom={faturas.atrasadas.quantidade ? 'alerta' : 'normal'}
          detalhe={`${numero(faturas.atrasadas.quantidade)} fatura(s) · ${numero(faturas.contasInadimplentes)} conta(s) inadimplente(s)`}
        />
        <Cartao rotulo="Inadimplência do período" valor={percentual(faturas.taxaInadimplenciaBp)} detalhe="atrasado hoje ÷ faturado no período" />
        {planos ? (
          <>
            <Cartao rotulo="Planos anuais vigentes" valor={numero(planos.anual.vigentes)} detalhe={`${numero(planos.anual.moedas)} moeda(s) coberta(s)`} />
            <Cartao rotulo="Planos de 24 meses vigentes" valor={numero(planos.bienal.vigentes)} detalhe={`${numero(planos.bienal.moedas)} moeda(s) coberta(s) · ${numero(planos.aguardandoPagamento)} aguardando pagamento`} />
          </>
        ) : (
          <Indisponivel titulo="Planos anual × 24 meses" quando="Disponível depois da B2, que cria a contratação do plano no envio." />
        )}
      </div>
    </>
  )
}

function TabelaContagem({
  linhas,
  coluna,
  vazio,
  total,
}: {
  linhas: ReadonlyArray<{ rotulo: string; valor: number }>
  coluna: string
  vazio: string
  total?: number
}): ReactNode {
  const base = total ?? linhas.reduce((m, l) => Math.max(m, l.valor), 0)
  if (!linhas.length || base === 0) return <div className="empty">{vazio}</div>
  return (
    <div className="table-scroll">
      <table className="audit-table">
        <thead>
          <tr>
            <th>{coluna}</th>
            <th className="adm-num">Quantidade</th>
            <th style={{ width: '35%' }} aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.rotulo}>
              <td>{l.rotulo}</td>
              <td className="adm-num">{numero(l.valor)}</td>
              <td aria-hidden="true">
                <div className="adm-trilho">
                  <div className="adm-barra" style={{ width: `${Math.round((l.valor / base) * 100)}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

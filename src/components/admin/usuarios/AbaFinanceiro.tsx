/**
 * A aba Financeiro da ficha: saldo, extrato, o ledger daquela conta, depósitos, saques,
 * faturas de custódia, planos (B2) e recebimentos do gateway (B1).
 *
 * NADA É CALCULADO AQUI. O extrato é `userStatement` (src/domain/statement.ts), a situação da
 * fatura é `verificarStatusFatura` da frente B, e o ledger é o livro-razão gravado com hash.
 * O que depende de frente que ainda não chegou à `main` aparece como "disponível depois da X"
 * — nunca como zero. Sem 'use client'.
 */

import type { ReactNode } from 'react'

import { quitarFaturaComSaldoNoPainel } from '@/server/actions/admin/usuarios'
import type { AbaFinanceiro as DadosAbaFinanceiro } from '@/server/admin/ficha'

import { BotaoAcao } from '../BotaoAcao'
import { Cartao, Indisponivel } from '../Blocos'
import { data, dataHora, dinheiro, nomeDoMes, numero } from '../formatos'

const SITUACAO_FATURA: Record<string, { rotulo: string; classe: string }> = {
  paga: { rotulo: 'Paga', classe: 'pill g' },
  pendente: { rotulo: 'Pendente', classe: 'pill y' },
  atrasada: { rotulo: 'Atrasada', classe: 'pill adm-pill-vermelho' },
  cancelada: { rotulo: 'Cancelada', classe: 'pill n' },
}

const SITUACAO_SAQUE: Record<string, string> = { solicitado: 'Solicitado', em_processamento: 'Em processamento', pago: 'Pago', falhou: 'Falhou' }

const TIPO_LEDGER: Record<string, string> = {
  saldo_inicial: 'Saldo inicial',
  deposito: 'Depósito',
  compra: 'Compra',
  venda: 'Venda',
  comissao: 'Comissão',
  custodia: 'Custódia',
  estorno: 'Estorno',
  ajuste: 'Ajuste',
}

export function AbaFinanceiro({ dados, semBanco, email, podeEditar }: { dados: DadosAbaFinanceiro; semBanco: boolean; email: string; podeEditar: boolean }): ReactNode {
  const t = dados.totais
  return (
    <>
      <div className="adm-grade">
        <Cartao rotulo="Saldo" valor={dinheiro(dados.saldo)} />
        <Cartao rotulo="Depositado" valor={dinheiro(t.depositado)} />
        <Cartao rotulo="Sacado" valor={dinheiro(t.sacado)} />
        <Cartao rotulo="Comprado" valor={dinheiro(t.compradoValor)} detalhe={`${numero(t.compradoQtd)} moeda(s)`} />
        <Cartao rotulo="Vendido" valor={dinheiro(t.vendidoValor)} detalhe={`${numero(t.vendidoQtd)} moeda(s)`} />
        <Cartao rotulo="Taxas pagas" valor={dinheiro(t.taxasPagas)} />
      </div>

      <details className="adm-detalhes" open>
        <summary>Extrato ({numero(dados.extrato.length)} mais recentes)</summary>
        <div className="adm-detalhes-corpo">
          {dados.extrato.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Descrição</th>
                    <th className="adm-num">Qtd</th>
                    <th className="adm-num">Taxa</th>
                    <th className="adm-num">Efeito no saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.extrato.map((l, i) => (
                    <tr key={`${l.date}-${i}`}>
                      <td>{l.dateBR}</td>
                      <td>{l.kind}</td>
                      <td>{l.descricao}</td>
                      <td className="adm-num">{l.quantidade === null ? '—' : numero(l.quantidade)}</td>
                      <td className="adm-num">{l.taxa === null ? '—' : dinheiro(l.taxa)}</td>
                      <td className={l.impacto < 0 ? 'adm-num adm-negativo' : 'adm-num'}>{dinheiro(l.impacto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-fraco">Nenhum movimento.</p>
          )}
        </div>
      </details>

      <details className="adm-detalhes">
        <summary>Livro-razão da conta</summary>
        <div className="adm-detalhes-corpo">
          {dados.ledger === null ? (
            <p className="adm-fraco">{semBanco ? 'O livro-razão existe só com banco configurado.' : 'Livro-razão indisponível agora.'}</p>
          ) : dados.ledger.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Quando</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th className="adm-num">Valor</th>
                    <th className="adm-num">Saldo após</th>
                    <th>Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.ledger.map((l) => (
                    <tr key={l.id}>
                      <td>{l.id}</td>
                      <td>{dataHora(l.createdAt)}</td>
                      <td>{TIPO_LEDGER[l.tipo] ?? l.tipo}</td>
                      <td>{l.descricao}</td>
                      <td className={l.sinal < 0 ? 'adm-num adm-negativo' : 'adm-num'}>{dinheiro(l.valor * (l.sinal < 0 ? -1 : 1))}</td>
                      <td className="adm-num">{dinheiro(l.saldoApos)}</td>
                      <td className="adm-mono">{l.hash.slice(0, 12)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-fraco">Nenhum lançamento.</p>
          )}
        </div>
      </details>

      <details className="adm-detalhes">
        <summary>Depósitos e saques</summary>
        <div className="adm-detalhes-corpo">
          <div className="adm-subtitulo">Depósitos</div>
          {dados.depositos.length ? (
            <ul className="adm-lista">
              {dados.depositos.map((d, i) => (
                <li key={`${d.date}-${i}`}>
                  {dataHora(d.date)} — {dinheiro(d.valor)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-fraco">Nenhum depósito.</p>
          )}
          <div className="adm-subtitulo">Saques</div>
          {dados.saques.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Situação</th>
                    <th className="adm-num">Total</th>
                    <th className="adm-num">Taxa</th>
                    <th className="adm-num">Líquido</th>
                    <th>Previsão</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.saques.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.id}
                        <div className="adm-fraco">{dataHora(s.criadoEm)}</div>
                      </td>
                      <td>{SITUACAO_SAQUE[s.status] ?? s.status}</td>
                      <td className="adm-num">{dinheiro(s.valorTotal)}</td>
                      <td className="adm-num">{dinheiro(s.taxa)}</td>
                      <td className="adm-num">{dinheiro(s.valorLiquido)}</td>
                      <td>{data(s.previsaoPagamentoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-fraco">Nenhum saque.</p>
          )}
        </div>
      </details>

      <details className="adm-detalhes" open={dados.faturas.some((f) => f.situacao === 'atrasada')}>
        <summary>Faturas de custódia ({numero(dados.faturas.length)})</summary>
        <div className="adm-detalhes-corpo">
          {dados.faturas.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Competência</th>
                    <th>Situação</th>
                    <th className="adm-num">Moedas</th>
                    <th className="adm-num">Valor</th>
                    <th>Vencimento</th>
                    <th>Pagamento</th>
                    {podeEditar ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {dados.faturas.map((f) => (
                    <tr key={f.id}>
                      <td>
                        {nomeDoMes(f.competencia)}
                        <div className="adm-fraco">{f.id}</div>
                      </td>
                      <td>
                        <span className={SITUACAO_FATURA[f.situacao]?.classe ?? 'pill n'}>{SITUACAO_FATURA[f.situacao]?.rotulo ?? f.situacao}</span>
                      </td>
                      <td className="adm-num">{numero(f.quantidadeMoedas)}</td>
                      <td className="adm-num">{dinheiro(f.valorCents)}</td>
                      <td>{data(f.dataVencimento)}</td>
                      <td>{f.dataPagamento ? `${data(f.dataPagamento)}${f.formaPagamento ? ` · ${f.formaPagamento}` : ''}` : '—'}</td>
                      {podeEditar ? (
                        <td>
                          {f.situacao === 'pendente' || f.situacao === 'atrasada' ? (
                            // A liquidação é a da frente B; o botão só a chama, com a permissão conferida de novo.
                            <BotaoAcao acao={quitarFaturaComSaldoNoPainel.bind(null, email, f.id)} usoNome="usuarios.quitar_fatura">
                              Quitar com o saldo
                            </BotaoAcao>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-fraco">Nenhuma fatura.</p>
          )}
          {podeEditar ? (
            <p className="adm-fraco">
              “Quitar com o saldo” debita a fatura do saldo da conta, pela mesma liquidação que o cliente usa. Pagamento por Pix ou cartão
              continua sendo pelo próprio cliente.
            </p>
          ) : null}
        </div>
      </details>

      <div className="adm-grade-larga">
        {dados.planos ? (
          <div className="adm-cartao">
            <div className="adm-cartao-rotulo">Planos de custódia</div>
            {dados.planos.length ? (
              <ul className="adm-lista">
                {dados.planos.map((p) => (
                  <li key={p.id}>
                    <b>{p.id}</b> — {p.modalidade} · {numero(p.quantidadeContratada)} moeda(s) · {dinheiro(p.valorTotalCents)} · {p.status}
                    {p.pagoAteCompetencia ? <span className="adm-fraco"> · pago até {nomeDoMes(p.pagoAteCompetencia)}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-fraco">Nenhum plano contratado.</p>
            )}
          </div>
        ) : (
          <Indisponivel titulo="Planos de custódia" quando="Disponível depois da B2." />
        )}
        {dados.recebimentos ? (
          <div className="adm-cartao">
            <div className="adm-cartao-rotulo">Recebimentos pelo gateway</div>
            {dados.recebimentos.length ? (
              <ul className="adm-lista">
                {dados.recebimentos.map((r) => (
                  <li key={r.paymentId}>
                    {dataHora(r.aprovadoEm)} — {r.tipoOperacao} por {r.metodo}
                    {r.parcelas > 1 ? ` em ${r.parcelas}x` : ''}: {dinheiro(r.valorBruto)}
                    <span className="adm-fraco"> · tarifa {dinheiro(r.tarifaGateway)} · líquido {dinheiro(r.valorLiquido)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-fraco">Nenhum pagamento aprovado pelo gateway.</p>
            )}
          </div>
        ) : (
          <Indisponivel titulo="Recebimentos pelo gateway (Pix e cartão)" quando={semBanco ? 'Existe só com banco configurado.' : 'Disponível depois da B1.'} />
        )}
      </div>
    </>
  )
}

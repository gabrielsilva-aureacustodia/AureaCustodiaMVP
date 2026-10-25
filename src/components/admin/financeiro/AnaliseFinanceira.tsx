/**
 * Visão geral do controle financeiro (25/10/2026): para onde foi cada real que entrou.
 *
 * Tudo sai da DRE do período (mesma fonte da tela Financeiro) e das leituras de apoio de
 * `carregarControleFinanceiro`: as tarifas do Mercado Pago por meio de pagamento, o setor de cada
 * custo e as NFS-e. Nenhuma alíquota mora aqui — a DRE aplica as do contador; a tela mostra a
 * alíquota vigente ao lado do valor para o sócio entender de onde ele veio.
 *
 * Sem 'use client'.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { cascata, custosPorSetor, despesasPorConta, despesasSemGateway, receitasPorTipo, resumirRecorrentes } from '@/domain/financeiro/analise'
import { ROTULO_DO_SERVICO } from '@/domain/nfse/codigos'
import type { DadosControleFinanceiro } from '@/server/admin/controle-financeiro'

import { data, dinheiro, numero, percentual } from '../formatos'
import { Indicador, Secao, Vazio } from '../Pecas'
import { BarrasNomeadas, Cascata } from './Graficos'

const MEIO: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  account_money: 'Saldo do Mercado Pago',
  ticket: 'Boleto',
  bolbradesco: 'Boleto',
  consumer_credits: 'Linha de Crédito MP',
}

function bpDe(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte * 10000) / total) : null
}

export function AnaliseFinanceira({ dados, sufixo }: { dados: DadosControleFinanceiro; sufixo: string }): ReactNode {
  const dre = dados.financeiro.dre
  const t = dre.totais
  const gateway = dre.linhas.find((l) => l.codigo === '4.1.07')?.valor ?? 0
  const impostos = t.deducoes + t.irpj + t.irpjAdicional + t.csll
  const custos = despesasSemGateway(dre)
  const brutoGateway = dados.tarifas.reduce((s, x) => s + x.bruto, 0)
  const tarifaGateway = dados.tarifas.reduce((s, x) => s + x.tarifa, 0)
  const recorrentes = resumirRecorrentes(dados.recorrentes, dados.hoje)
  const aliquota = (chave: string): string => {
    const p = dados.parametros.find((x) => x.chave === chave)
    return p && p.valor !== null ? (p.unidade === 'bp' ? percentual(p.valor) : dinheiro(p.valor)) : 'não configurada'
  }
  const impostosDetalhe: Array<[string, number, string]> = [
    ['ISS', t.iss, aliquota('issBp')],
    ['PIS', t.pis, aliquota('pisBp')],
    ['COFINS', t.cofins, aliquota('cofinsBp')],
    ['IRPJ', t.irpj, `${aliquota('irpjBp')} sobre ${aliquota('presuncaoLucroBp')} da receita`],
    ['Adicional de IRPJ', t.irpjAdicional, aliquota('irpjAdicionalBp')],
    ['CSLL', t.csll, `${aliquota('csllBp')} sobre a base presumida`],
  ]
  const notasPorServico = new Map<string, { autorizadas: number; valor: number; outras: number }>()
  for (const n of dados.notas) {
    const atual = notasPorServico.get(n.servico) ?? { autorizadas: 0, valor: 0, outras: 0 }
    if (n.status === 'autorizada') {
      atual.autorizadas += n.notas
      atual.valor += n.valor
    } else if (n.status !== 'cancelada') atual.outras += n.notas
    notasPorServico.set(n.servico, atual)
  }

  return (
    <>
      <div className="adm-inds">
        <Indicador rotulo="Receita bruta" valor={dinheiro(t.receitaBruta)} tom="ouro" detalhe={dre.periodo.rotulo} />
        <Indicador rotulo="Impostos" valor={dinheiro(impostos)} detalhe={`${percentual(bpDe(impostos, t.receitaBruta))} da receita · ISS, PIS, COFINS, IRPJ e CSLL`} tom={impostos ? 'atencao' : 'neutro'} />
        <Indicador
          rotulo="Tarifas do Mercado Pago"
          valor={dinheiro(gateway)}
          detalhe={brutoGateway ? `${percentual(bpDe(tarifaGateway, brutoGateway))} do que passou pelo MP` : 'nenhum pagamento no período'}
        />
        <Indicador rotulo="Custos e despesas" valor={dinheiro(custos)} detalhe={`${percentual(bpDe(custos, t.receitaBruta))} da receita`} />
        <Indicador rotulo="Resultado líquido" valor={dinheiro(t.resultadoLiquido)} tom={t.resultadoLiquido < 0 ? 'alerta' : 'ok'} detalhe={`margem ${percentual(dre.analise.margemLiquidaBp)}`} />
        <Indicador
          rotulo="Custo fixo mensal"
          valor={dinheiro(recorrentes.custoFixoMensal)}
          detalhe={`${dinheiro(recorrentes.custoFixoAnual)} por ano · recorrentes`}
          href={`/admin/resultados/controle?aba=recorrentes${sufixo}`}
        />
      </div>

      {dre.pendencias.length ? (
        <div className="note adm-secao">
          <span>
            <b>Pendências da DRE:</b> {dre.pendencias.join(' · ')}. Os impostos dessas linhas ficam zerados até o contador preencher a alíquota na aba{' '}
            <Link href="/admin/resultados/contabil?aba=aliquotas">Contábil → Alíquotas</Link>.
          </span>
        </div>
      ) : null}

      <div className="adm-zonas">
        <div className="adm-zona-principal">
          <Secao
            id="ctrl-cascata"
            titulo="Do faturamento ao resultado"
            descricao="De cada R$ 100 que entraram, quanto foi para impostos, para o Mercado Pago e para os custos da empresa — e quanto sobrou."
          >
            {t.receitaBruta > 0 ? (
              <Cascata passos={cascata(dre)} />
            ) : (
              <Vazio titulo="Nenhuma receita neste período.">A cascata aparece quando houver comissão, custódia paga, tarifa ou outra receita no livro-razão.</Vazio>
            )}
          </Secao>

          <Secao id="ctrl-receitas" titulo="Receitas por tipo" descricao="Cada linha de receita da DRE e o peso dela no total.">
            <BarrasNomeadas fatias={receitasPorTipo(dre)} rotulo="Receitas por tipo" vazio={<b>Nenhuma receita neste período.</b>} />
            {t.freteRepassado > 0 ? (
              <p className="adm-fraco adm-acima-10">
                Frete pago pelos clientes e repassado aos Correios: {dinheiro(t.freteRepassado)} — despesa do cliente, fora do resultado (contador, 23/10/2026).
              </p>
            ) : null}
          </Secao>

          <div className="adm-grade-larga">
            <Secao id="ctrl-contas" titulo="Custos por conta" descricao="As despesas da DRE, inclusive as tarifas do Mercado Pago (4.1.07).">
              <BarrasNomeadas fatias={despesasPorConta(dre)} rotulo="Custos por conta contábil" tom="saida" vazio={<b>Nenhum custo lançado neste período.</b>} />
            </Secao>
            <Secao id="ctrl-setores" titulo="Custos por setor" descricao="Só os custos lançados (manuais e recorrentes); a tarifa do Mercado Pago não tem setor.">
              <BarrasNomeadas
                fatias={custosPorSetor(dados.lancamentos, dados.setores)}
                rotulo="Custos por setor"
                tom="saida"
                vazio={
                  <>
                    <b>Nenhum custo com setor neste período.</b>
                    Cadastre os custos na aba <Link href={`/admin/resultados/controle?aba=recorrentes${sufixo}`}>Custos e receitas recorrentes</Link>.
                  </>
                }
              />
            </Secao>
          </div>
        </div>

        <aside className="adm-zona-lateral" aria-label="Taxas, impostos, notas e próximos vencimentos">
          <Secao id="ctrl-impostos" titulo="Impostos do período" descricao="Valores da DRE, com a alíquota que o contador cadastrou.">
            <dl className="adm-lista-def adm-lista-def-detalhe">
              {impostosDetalhe.map(([nome, valor, regra]) => (
                <div key={nome} className="adm-lista-def-linha">
                  <dt>
                    {nome}
                    <small>{regra}</small>
                  </dt>
                  <dd>{dinheiro(valor)}</dd>
                </div>
              ))}
              <div className="adm-lista-def-linha adm-lista-def-total">
                <dt>Total de impostos</dt>
                <dd>{dinheiro(impostos)}</dd>
              </div>
            </dl>
          </Secao>

          <Secao id="ctrl-gateway" titulo="Tarifas do Mercado Pago" descricao="Lidas de cada pagamento aprovado (bruto − líquido).">
            {dados.tarifas.length ? (
              <dl className="adm-lista-def adm-lista-def-detalhe">
                {dados.tarifas.map((x) => (
                  <div key={x.metodo} className="adm-lista-def-linha">
                    <dt>
                      {MEIO[x.metodo] ?? x.metodo}
                      <small>
                        {numero(x.pagamentos)} pagamento(s) · {percentual(bpDe(x.tarifa, x.bruto))} de {dinheiro(x.bruto)}
                      </small>
                    </dt>
                    <dd>{dinheiro(x.tarifa)}</dd>
                  </div>
                ))}
                <div className="adm-lista-def-linha adm-lista-def-total">
                  <dt>Total</dt>
                  <dd>{dinheiro(tarifaGateway)}</dd>
                </div>
              </dl>
            ) : (
              <p className="adm-fraco">{dados.semBanco ? 'Sem banco, não há pagamentos gravados.' : 'Nenhum pagamento aprovado no período.'}</p>
            )}
            <details className="adm-detalhes adm-acima-10">
              <summary>O que ainda não entra nesta conta</summary>
              <div className="adm-detalhes-corpo">
                <ul className="adm-lista">
                  <li>Renovação mensal da assinatura de custódia no cartão (só o 1º débito é conciliado).</li>
                  <li>Custo de envio dos saques por Pix (Payouts) e saques pagos por fora.</li>
                  <li>Estornos e contestações (chargebacks) feitos no painel do Mercado Pago.</li>
                </ul>
                <p className="adm-fraco">Fonte: docs/fiscal-contabil/TAXAS_MERCADO_PAGO.md, lacunas 1 e 2. Até serem corrigidas, lance esses valores como custo manual.</p>
              </div>
            </details>
          </Secao>

          <Secao
            id="ctrl-notas"
            titulo="Notas fiscais do período"
            acoes={
              <Link href="/admin/resultados/fiscal" className="btn btn-outline">
                Abrir notas
              </Link>
            }
          >
            {notasPorServico.size ? (
              <dl className="adm-lista-def adm-lista-def-detalhe">
                {[...notasPorServico.entries()].map(([servico, n]) => (
                  <div key={servico} className="adm-lista-def-linha">
                    <dt>
                      {ROTULO_DO_SERVICO[servico as keyof typeof ROTULO_DO_SERVICO] ?? servico}
                      <small>
                        {numero(n.autorizadas)} autorizada(s){n.outras ? ` · ${numero(n.outras)} na fila ou com erro` : ''}
                      </small>
                    </dt>
                    <dd>{dinheiro(n.valor)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="adm-fraco">Nenhuma NFS-e com fato neste período.</p>
            )}
          </Secao>

          <Secao id="ctrl-proximos" titulo="Próximos 30 dias" descricao="O que os recorrentes vão lançar.">
            {recorrentes.proximos30.itens.length ? (
              <>
                <ol className="adm-linha-tempo">
                  {recorrentes.proximos30.itens.slice(0, 12).map((i) => (
                    <li key={`${i.id}-${i.dia}`}>
                      <span className="adm-linha-tempo-quando">{data(Date.parse(`${i.dia}T15:00:00Z`))}</span>
                      <span>
                        {i.descricao} · <b>{i.tipo === 'custo' ? '−' : '+'}{dinheiro(i.valor)}</b>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="adm-fraco adm-acima-10">
                  Custos {dinheiro(recorrentes.proximos30.custos)} · receitas {dinheiro(recorrentes.proximos30.receitas)}
                </p>
              </>
            ) : (
              <p className="adm-fraco">Nada vence nos próximos 30 dias.</p>
            )}
          </Secao>
        </aside>
      </div>
    </>
  )
}

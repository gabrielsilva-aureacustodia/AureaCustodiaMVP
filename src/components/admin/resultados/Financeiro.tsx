/**
 * A aba Financeiro da Central de Resultados: cartões do período, receita por linha, a
 * DRE e o fluxo mês a mês (plano do Admin, seção 1.6).
 *
 * Sem 'use client': a página (Server Component) carrega tudo com a permissão conferida e
 * desenha isto no servidor. Só o seletor de período e o botão de conferir o livro-razão
 * são de cliente.
 *
 * Exportar leva ao MESMO endereço que o Google Sheets e o contador usam
 * (`/api/relatorios/<nome>.csv|xlsx`), com o período escolhido — tela e arquivo são a
 * mesma função no servidor. O botão só aparece com `resultados.exportar`, e a rota
 * confere de novo.
 */

import type { ReactNode } from 'react'

import { consultaDoPeriodo, type PeriodoEscolhido } from '@/domain/admin/periodo'
import type { DadosFinanceiro } from '@/server/admin/resultados'
import { verificarLedgerNoPainel } from '@/server/actions/admin/contabil'

import { AvisoSemBanco, Cartao, Indisponivel } from '../Blocos'
import { BotaoAcao } from '../BotaoAcao'
import { SeletorPeriodo } from '../SeletorPeriodo'
import { dinheiro, nomeDoMes, numero } from '../formatos'
import { TabelaDre } from './TabelaDre'

export function Financeiro({
  dados,
  periodo,
  podeExportar,
}: {
  dados: DadosFinanceiro
  periodo: PeriodoEscolhido
  podeExportar: boolean
}): ReactNode {
  const { dre, resumo, recebimentos } = dados
  const q = consultaDoPeriodo(periodo)
  const receitaPorLinha = dre.linhas.filter((l) => l.codigo.startsWith('3.1.'))
  const pendencias = dre.pendencias

  return (
    <>
      {dados.semBanco ? <AvisoSemBanco>A DRE fica zerada até o banco entrar.</AvisoSemBanco> : null}

      <div className="panel adm-secao">
        <div className="adm-acoes" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <SeletorPeriodo ano={periodo.ano} mes={periodo.mes} trimestre={periodo.trimestre} />
          {podeExportar ? (
            <div className="adm-acoes">
              <a className="btn btn-outline adm-btn-compacto" href={`/api/relatorios/dre.csv?${q}`} data-uso="financeiro:exportar-dre-csv">
                DRE em CSV
              </a>
              <a className="btn btn-outline adm-btn-compacto" href={`/api/relatorios/dre.xlsx?${q}`} data-uso="financeiro:exportar-dre-xlsx">
                DRE em XLSX
              </a>
              <a className="btn btn-gold adm-btn-compacto" href={`/api/relatorios/tudo.xlsx?${q}`} data-uso="financeiro:exportar-tudo">
                Pasta completa
              </a>
            </div>
          ) : null}
        </div>
      </div>

      {!dados.cadeiaOk ? (
        <div className="note adm-secao" role="alert">
          <span>
            <b>A cadeia de hashes do livro-razão não confere.</b> Algum lançamento foi alterado por fora do sistema. Use
            &ldquo;Conferir o livro-razão&rdquo; abaixo para ver onde.
          </span>
        </div>
      ) : null}

      <div className="adm-grade">
        <Cartao rotulo="Receita bruta" valor={dinheiro(dre.totais.receitaBruta)} detalhe={dre.periodo.rotulo} />
        <Cartao
          rotulo="Resultado líquido"
          valor={dinheiro(dre.totais.resultadoLiquido)}
          tom={dre.totais.resultadoLiquido < 0 ? 'alerta' : 'normal'}
          detalhe={pendencias.some((p) => /alíquota|presunção/i.test(p)) ? 'impostos com alíquota pendente' : undefined}
        />
        <Cartao
          rotulo="Comissões arrecadadas"
          valor={dinheiro(dre.totais.receitaComissoes)}
          detalhe={`${numero(dre.analise.numNegociacoes)} negociação(ões)`}
        />
        <Cartao
          rotulo="Custódia faturada"
          valor={dinheiro(resumo.custodiaFaturada.valor)}
          detalhe={`${numero(resumo.custodiaFaturada.faturas)} fatura(s) · ${dinheiro(resumo.custodiaFaturada.pago)} pago`}
        />
        <Cartao
          rotulo="Saques pagos"
          valor={dinheiro(resumo.saquesPagos.valorLiquido)}
          detalhe={`${numero(resumo.saquesPagos.quantidade)} saque(s) · tarifas ${dinheiro(resumo.saquesPagos.tarifas)} · ${numero(resumo.saquesPendentes.quantidade)} a pagar`}
        />
        <Cartao
          rotulo="Depósitos"
          valor={dinheiro(resumo.depositos.valor)}
          detalhe={`${numero(resumo.depositos.quantidade)} depósito(s) · ${dinheiro(resumo.depositos.peloGateway.valor)} confirmado(s) pelo gateway`}
        />
        {recebimentos ? (
          <Cartao
            rotulo="Recebimentos do Mercado Pago"
            valor={dinheiro(recebimentos.liquido ?? recebimentos.bruto)}
            detalhe={`${numero(recebimentos.linhas)} pagamento(s) · bruto ${dinheiro(recebimentos.bruto)} · tarifa ${dinheiro(recebimentos.tarifa)}`}
          />
        ) : (
          <Indisponivel
            titulo="Recebimentos do Mercado Pago"
            quando="Disponível depois da B3: é quando cada pagamento passa a separar bruto, tarifa e líquido."
          />
        )}
      </div>

      {pendencias.length ? (
        <div className="note adm-secao">
          <span>
            <b>Pendências da DRE:</b> {pendencias.join(' · ')}
          </span>
        </div>
      ) : null}

      <div className="adm-grade-larga">
        <div className="panel">
          <h3>Receita por linha</h3>
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th className="adm-num">Valor</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {receitaPorLinha.map((l) => (
                  <tr key={l.codigo}>
                    <td>{l.descricao}</td>
                    <td className="adm-num">{dinheiro(l.valor)}</td>
                    <td className="adm-fraco">{l.observacao ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h3>Fluxo mês a mês</h3>
          {resumo.fluxoMensal.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="adm-num">Depósitos</th>
                    <th className="adm-num">Saques</th>
                    <th className="adm-num">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.fluxoMensal.map((m) => (
                    <tr key={m.mes}>
                      <td>{nomeDoMes(m.mes)}</td>
                      <td className="adm-num">{dinheiro(m.depositos)}</td>
                      <td className="adm-num">{dinheiro(m.saques)}</td>
                      <td className="adm-num" title={`comissões ${dinheiro(m.comissoes)} · custódia paga ${dinheiro(m.custodiaPaga)} · tarifas ${dinheiro(m.tarifas)}`}>
                        {dinheiro(m.receita)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Nenhuma movimentação no livro-razão neste período.</div>
          )}
          <p className="adm-fraco" style={{ marginTop: 10 }}>
            Receita = comissões + custódia paga + tarifas de saque e de retirada, lidas do livro-razão.
          </p>
        </div>
      </div>

      <div className="panel adm-secao">
        <h3>DRE — {dre.periodo.rotulo}</h3>
        <TabelaDre linhas={dre.linhas} />
        <div className="adm-acoes" style={{ marginTop: 14 }}>
          <BotaoAcao acao={verificarLedgerNoPainel} usoNome="financeiro:conferir-livro-razao">
            Conferir o livro-razão
          </BotaoAcao>
        </div>
      </div>
    </>
  )
}

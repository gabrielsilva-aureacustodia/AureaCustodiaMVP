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
 *
 * Rodada 2 (25/10/2026): barra de período e exportação no topo; indicadores; em duas zonas, a
 * receita mês a mês (gráfico + tabela) e a DRE à esquerda, a receita por linha à direita. A coluna
 * "Detalhe" da receita por linha foi para baixo do nome da linha (mesmo texto).
 */

import type { ReactNode } from 'react'

import { consultaDoPeriodo, type PeriodoEscolhido } from '@/domain/admin/periodo'
import type { DadosFinanceiro } from '@/server/admin/resultados'
import { verificarLedgerNoPainel } from '@/server/actions/admin/contabil'

import { AvisoSemBanco, Indisponivel } from '../Blocos'
import { BotaoAcao } from '../BotaoAcao'
import { SeletorPeriodo } from '../SeletorPeriodo'
import { dinheiro, nomeDoMes, numero } from '../formatos'
import { Indicador, Secao, Vazio, TabelaRolavel } from '../Pecas'
import { GraficoMensal, type PontoMensal } from './GraficoMensal'
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
  const pontos: PontoMensal[] = resumo.fluxoMensal.map((m) => ({
    chave: m.mes,
    rotulo: nomeDoMes(m.mes).slice(0, 3),
    rotuloLongo: nomeDoMes(m.mes),
    valor: m.receita,
    texto: dinheiro(m.receita),
    detalhe: `comissões ${dinheiro(m.comissoes)} · custódia ${dinheiro(m.custodiaPaga)} · tarifas ${dinheiro(m.tarifas)}`,
  }))

  return (
    <>
      {dados.semBanco ? <AvisoSemBanco>A DRE fica zerada até o banco entrar.</AvisoSemBanco> : null}

      {/* Barra da página: o período à esquerda e as exportações à direita, fora de cartão — são
          ferramentas da página inteira, não um bloco de conteúdo (rodada 2, 25/10/2026). */}
      <div className="adm-ferramentas">
        <SeletorPeriodo ano={periodo.ano} mes={periodo.mes} trimestre={periodo.trimestre} />
        {podeExportar ? (
          <div className="adm-acoes">
            <a className="btn btn-outline adm-btn-compacto" href={`/api/relatorios/dre.csv?${q}`} data-uso="financeiro:exportar-dre-csv">
              DRE em CSV
            </a>
            <a className="btn btn-outline adm-btn-compacto" href={`/api/relatorios/dre.xlsx?${q}`} data-uso="financeiro:exportar-dre-xlsx">
              DRE em XLSX
            </a>
            <a className="btn btn-outline adm-btn-compacto" href={`/api/relatorios/tudo.xlsx?${q}`} data-uso="financeiro:exportar-tudo">
              Pasta completa (XLSX)
            </a>
          </div>
        ) : null}
      </div>

      {!dados.cadeiaOk ? (
        <div className="note adm-secao" role="alert">
          <span>
            <b>A cadeia de hashes do livro-razão não confere.</b> Algum lançamento foi alterado por fora do sistema. Use
            &ldquo;Conferir o livro-razão&rdquo; na DRE para ver onde.
          </span>
        </div>
      ) : null}

      <div className="adm-inds">
        <Indicador rotulo="Receita bruta" valor={dinheiro(dre.totais.receitaBruta)} detalhe={dre.periodo.rotulo} tom="ouro" />
        <Indicador
          rotulo="Resultado líquido"
          valor={dinheiro(dre.totais.resultadoLiquido)}
          tom={dre.totais.resultadoLiquido < 0 ? 'alerta' : 'neutro'}
          detalhe={pendencias.some((p) => /alíquota|presunção/i.test(p)) ? 'impostos com alíquota pendente' : undefined}
        />
        <Indicador rotulo="Comissões arrecadadas" valor={dinheiro(dre.totais.receitaComissoes)} detalhe={`${numero(dre.analise.numNegociacoes)} negociação(ões)`} />
        <Indicador
          rotulo="Custódia faturada"
          valor={dinheiro(resumo.custodiaFaturada.valor)}
          detalhe={`${numero(resumo.custodiaFaturada.faturas)} fatura(s) · ${dinheiro(resumo.custodiaFaturada.pago)} pago`}
        />
        <Indicador
          rotulo="Saques pagos"
          valor={dinheiro(resumo.saquesPagos.valorLiquido)}
          detalhe={`${numero(resumo.saquesPagos.quantidade)} saque(s) · tarifas ${dinheiro(resumo.saquesPagos.tarifas)} · ${numero(resumo.saquesPendentes.quantidade)} a pagar`}
          href={resumo.saquesPendentes.quantidade ? '/admin/saques' : undefined}
          tom={resumo.saquesPendentes.quantidade ? 'atencao' : 'neutro'}
        />
        <Indicador
          rotulo="Depósitos"
          valor={dinheiro(resumo.depositos.valor)}
          detalhe={`${numero(resumo.depositos.quantidade)} depósito(s) · ${dinheiro(resumo.depositos.peloGateway.valor)} confirmado(s) pelo gateway`}
        />
        {recebimentos ? (
          <Indicador
            rotulo="Recebimentos do Mercado Pago"
            valor={dinheiro(recebimentos.liquido ?? recebimentos.bruto)}
            detalhe={`${numero(recebimentos.linhas)} pagamento(s) · bruto ${dinheiro(recebimentos.bruto)} · tarifa ${dinheiro(recebimentos.tarifa)}`}
          />
        ) : (
          <Indisponivel titulo="Recebimentos do Mercado Pago" quando="Disponível depois da B3: é quando cada pagamento passa a separar bruto, tarifa e líquido." />
        )}
      </div>

      {pendencias.length ? (
        <div className="note adm-secao">
          <span>
            <b>Pendências da DRE:</b> {pendencias.join(' · ')}
          </span>
        </div>
      ) : null}

      <div className="adm-zonas">
        <div className="adm-zona-principal">
          <Secao id="fin-fluxo" titulo="Receita mês a mês" descricao="Comissões + custódia paga + tarifas de saque e de retirada, lidas do livro-razão. Passe o mouse (ou o foco) numa coluna para ver a composição.">
            {pontos.length ? (
              <>
                <GraficoMensal titulo="Receita por mês" pontos={pontos} />
                <TabelaRolavel rotulo="Fluxo mês a mês: depósitos, saques e receita">
                  <table className="audit-table">
                    <caption className="adm-sr">Fluxo mês a mês: depósitos, saques e receita</caption>
                    <thead>
                      <tr>
                        <th scope="col">Mês</th>
                        <th scope="col" className="adm-num">Depósitos</th>
                        <th scope="col" className="adm-num">Saques</th>
                        <th scope="col" className="adm-num">Receita</th>
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
                </TabelaRolavel>
              </>
            ) : (
              <Vazio titulo="Nenhuma movimentação no livro-razão neste período.">Troque o período acima, ou espere a primeira negociação, fatura paga ou saque.</Vazio>
            )}
          </Secao>

          <Secao
            id="fin-dre"
            titulo={`DRE — ${dre.periodo.rotulo}`}
            descricao="Alíquotas vêm dos parâmetros contábeis preenchidos pelo contador; nada de imposto está escrito no código."
            acoes={
              <BotaoAcao acao={verificarLedgerNoPainel} usoNome="financeiro:conferir-livro-razao">
                Conferir o livro-razão
              </BotaoAcao>
            }
          >
            <TabelaDre linhas={dre.linhas} />
          </Secao>
        </div>

        <aside className="adm-zona-lateral" aria-label="Receita por linha">
          <Secao id="fin-linhas" titulo="Receita por linha" descricao={dre.periodo.rotulo}>
            <TabelaRolavel rotulo="Receita por linha no período">
              <table className="audit-table">
                <caption className="adm-sr">Receita por linha no período</caption>
                <thead>
                  <tr>
                    <th scope="col">Linha</th>
                    <th scope="col" className="adm-num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {receitaPorLinha.map((l) => (
                    <tr key={l.codigo}>
                      <td>
                        {l.descricao}
                        {l.observacao ? <div className="adm-fraco">{l.observacao}</div> : null}
                      </td>
                      <td className="adm-num">{dinheiro(l.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelaRolavel>
          </Secao>
        </aside>
      </div>
    </>
  )
}

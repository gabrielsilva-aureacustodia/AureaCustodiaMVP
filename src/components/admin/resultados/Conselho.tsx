/**
 * A aba "KPIs do conselho" — os 5 números prioritários do slide 3.1 (T5, 22/11/2026), cada um com uma frase
 * de "o que é" para o Rogério ler sem jargão.
 *
 * Nada é calculado aqui: tudo vem pronto de `montarKpisDoConselho` (src/domain/kpis.ts), testado sem banco.
 * REGRA DA TELA (a do arquivo de domínio): sem fonte aparece "—" com o motivo, nunca zero.
 *
 * Sem 'use client': desenhado no servidor; só o seletor de período é de cliente.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import { DIAS_PARA_CHURN, LTV_HORIZONTE_MESES } from '@/domain/kpis'
import type { DadosConselho } from '@/server/admin/kpis-conselho'

import { AvisoSemBanco, Cartao } from '../Blocos'
import { SeletorPeriodo } from '../SeletorPeriodo'
import { dinheiro, duracao, numero, percentual } from '../formatos'

function diaBr(dia: string): string {
  const [a, m, d] = dia.split('-')
  return `${d}/${m}/${a}`
}

function meses(n: number | null): string {
  return n === null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses`
}

export function Conselho({ dados, periodo }: { dados: DadosConselho; periodo: PeriodoEscolhido }): ReactNode {
  const { kpis, semBanco } = dados
  const { cacPayback: c, margemPorMoeda: m, conversao: v, inadimplenciaChurn: i, liquidez: l } = kpis

  return (
    <>
      {semBanco ? <AvisoSemBanco>Sem banco não há data de cadastro, gasto informado nem histórico da fila: esses números ficam em “—”.</AvisoSemBanco> : null}
      <div className="adm-ferramentas">
        <SeletorPeriodo ano={periodo.ano} mes={periodo.mes} trimestre={periodo.trimestre} manter={{ aba: 'conselho' }} />
      </div>
      <div className="adm-secao">
        <p className="adm-fraco">
          Os cinco números que o conselho pediu, do período {periodo.periodo.rotulo} ({diaBr(dados.de)} a {diaBr(dados.ate)}, dias de Brasília). Onde está “—”, o
          dado ainda não existe ou ninguém o informou: nada é inventado. Contas da equipe e de teste não entram. Isto não é a contabilidade: o resultado oficial
          é o da DRE.
        </p>
      </div>

      {/* ---------- 1 ---------- */}
      <h2 className="adm-titulo-secao" id="cn-cac">1. CAC × tempo para se pagar (payback)</h2>
      <p className="adm-fraco">Quanto custa trazer um cliente e em quantos meses tudo o que ele paga (custódia e comissão) devolve esse dinheiro.</p>
      <div className="adm-grade">
        <Cartao rotulo="CAC do período" valor={dinheiro(c.cac)} detalhe={c.gasto === null ? 'sem dado: ninguém lançou o gasto de marketing destes dias' : `${dinheiro(c.gasto)} ÷ ${numero(c.ativados)} cliente(s) ativado(s)`} />
        <Cartao rotulo="Clientes pagantes" valor={numero(c.clientesPagantes)} detalhe="já pagaram alguma fatura de custódia" />
        <Cartao
          rotulo="Custódia por cliente, por mês"
          valor={dinheiro(c.custodiaMensalPorCliente)}
          detalhe={c.custodiaMensalPorCliente === null ? 'sem dado: ainda não há cliente pagante' : `${numero(c.moedasDosPagantes)} moeda(s) dos pagantes × ${dinheiro(c.custodiaPorMoedaCents)} ÷ ${numero(c.clientesPagantes)}`}
        />
        <Cartao rotulo="Comissão por cliente, por mês" valor={dinheiro(c.comissaoMensalPorCliente)} detalhe="comissão do período levada a 30 dias ÷ pagantes" />
        <Cartao rotulo="Receita por cliente, por mês" valor={dinheiro(c.receitaMensalPorCliente)} detalhe="custódia + comissão" />
        <Cartao rotulo="Payback" valor={meses(c.paybackMeses)} detalhe="CAC ÷ receita mensal por cliente" />
        <Cartao rotulo={`LTV em ${LTV_HORIZONTE_MESES} meses (provisório)`} valor={dinheiro(c.ltv)} detalhe={`receita mensal × ${LTV_HORIZONTE_MESES}: horizonte ainda não definido`} />
        <Cartao rotulo="LTV ÷ CAC" valor={c.ltvSobreCacBp === null ? '—' : `${(c.ltvSobreCacBp / 10000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×`} detalhe="quantas vezes o cliente paga o que custou" />
      </div>
      <p className="adm-fraco adm-mt10">
        O gasto vem da aba “Gasto de marketing” (o orçamento combinado de R$ 3.600,00 por mês é lançado lá como “Serviço”): enquanto ninguém lança, CAC e payback
        ficam em “—”. Cliente ativado = fez a 1ª transação.
      </p>

      {/* ---------- 2 ---------- */}
      <h2 className="adm-titulo-secao" id="cn-margem">2. Margem por moeda captada</h2>
      <p className="adm-fraco">
        Para cada moeda que entrou na custódia no período: o que ela já gerou de custódia paga e de comissão. Não há custo logístico: o cliente paga o frete.
      </p>
      <div className="adm-grade">
        <Cartao rotulo="Moedas captadas" valor={numero(m.moedasCaptadas)} detalhe="aprovadas na análise no período" />
        <Cartao rotulo="Custódia já paga por elas" valor={dinheiro(m.receitaDeCustodia)} detalhe="faturas pagas, só a parte dessas moedas" />
        <Cartao
          rotulo="Comissão das negociações delas"
          valor={dinheiro(m.comissaoDasMoedas)}
          detalhe={m.comissaoDasMoedas === null ? 'sem dado: só há negociação antiga, que não guardou o código da moeda' : 'comprador + vendedor'}
        />
        <Cartao rotulo="Receita total delas" valor={dinheiro(m.receitaTotal)} />
        <Cartao rotulo="Receita por moeda captada" valor={dinheiro(m.receitaPorMoeda)} tom={m.receitaPorMoeda === null ? 'normal' : 'positivo'} detalhe="custódia + comissão ÷ moedas captadas" />
      </div>
      <p className="adm-fraco adm-mt10">
        A negociação passou a guardar o código da moeda em 22/11/2026.
        {m.negociacoesSemCodigo ? ` ${numero(m.negociacoesSemCodigo)} negociação(ões) anteriores não têm o código e ficam fora da comissão.` : ''} É receita, não
        lucro contábil: o resultado oficial é o da DRE.
      </p>

      {/* ---------- 3 ---------- */}
      <h2 className="adm-titulo-secao" id="cn-conversao">3. Conversão de clientes pagantes</h2>
      <p className="adm-fraco">Dos que se cadastraram no período, quantos confiaram e de fato pagaram. Pagante é quem pagou custódia: depositar moeda sem pagar ainda não conta.</p>
      <div className="adm-grade">
        <Cartao rotulo="Novos cadastros" valor={numero(v.cadastros)} detalhe={v.cadastros === null ? 'sem dado: sem banco não há data de cadastro' : 'contas criadas no período'} />
        <Cartao rotulo="Já fizeram a 1ª transação" valor={numero(v.ativados)} detalhe={`${percentual(v.cadastroParaAtivacaoBp)} dos cadastros`} />
        <Cartao rotulo="Já depositaram moeda" valor={numero(v.depositaramMoeda)} detalhe={`${percentual(v.cadastroParaMoedaBp)} dos cadastros · moeda aprovada na análise`} />
        <Cartao rotulo="Clientes pagantes" valor={numero(v.pagantes)} detalhe="pagaram custódia" />
        <Cartao rotulo="Cadastro → pagante" valor={percentual(v.cadastroParaPaganteBp)} tom="positivo" detalhe="pagantes ÷ cadastros" />
        <Cartao rotulo="Pagantes que já negociaram" valor={numero(v.pagantesQueNegociaram)} detalhe="compraram ou venderam" />
      </div>

      {/* ---------- 4 ---------- */}
      <h2 className="adm-titulo-secao" id="cn-churn">4. Inadimplência e saída de clientes (churn)</h2>
      <p className="adm-fraco">Quem não paga a custódia mensal e quem deixou de usar o Real Olímpico.</p>
      <div className="adm-grade">
        <Cartao
          rotulo="Inadimplência"
          valor={percentual(i.taxaInadimplenciaBp)}
          tom={i.taxaInadimplenciaBp ? 'alerta' : 'normal'}
          detalhe={i.valorEmitido ? `${dinheiro(i.valorAtrasado)} atrasados de ${dinheiro(i.valorEmitido)} cobrados no período` : 'nenhuma fatura emitida no período'}
        />
        <Cartao rotulo="Contas inadimplentes agora" valor={numero(i.contasInadimplentes)} />
        <Cartao rotulo="Churn — total" valor={numero(i.churn.total)} tom={i.churn.total ? 'alerta' : 'normal'} detalhe={`${percentual(i.churn.totalBp)} de ${numero(i.churn.base)} cliente(s) · cada um contado uma vez`} />
        <Cartao rotulo="Saíram por retirada" valor={numero(i.churn.retirada)} detalhe="pediram as moedas no período e não guardam mais nenhuma" />
        <Cartao rotulo={`Inativos há mais de ${DIAS_PARA_CHURN} dias`} valor={numero(i.churn.inatividade)} detalhe="sem usar a plataforma (só quem tem acesso registrado)" />
        <Cartao rotulo={`Custódia não paga há mais de ${DIAS_PARA_CHURN} dias`} valor={numero(i.churn.custodiaNaoPaga)} detalhe="fatura vencida e em aberto" />
        <Cartao rotulo="Custódia recorrente por mês" valor={dinheiro(i.receitaRecorrenteMensal)} detalhe="moedas em custódia × preço, se todas estivessem pagas" />
      </div>
      <p className="adm-fraco adm-mt10">
        Um cliente pode ter mais de um motivo; no total ele conta uma vez. Inatividade e custódia não paga olham o dia de hoje; a retirada olha o período escolhido.
        Moeda vendida no mercado continua na custódia e não é saída.
      </p>

      {/* ---------- 5 ---------- */}
      <h2 className="adm-titulo-secao" id="cn-liquidez">5. Liquidez interna e volume negociado (GMV)</h2>
      <p className="adm-fraco">Quanto circulou no mercado e se a moeda anunciada realmente vende.</p>
      <div className="adm-grade">
        <Cartao rotulo="GMV do período" valor={dinheiro(l.gmv)} detalhe={`${numero(l.negociacoes)} negociação(ões) · ${numero(l.moedasNegociadas)} moeda(s)`} />
        <Cartao rotulo="Comissão do período" valor={dinheiro(l.comissao)} detalhe="comprador + vendedor" />
        <Cartao rotulo="Ofertas de venda abertas" valor={numero(l.ofertasDeVendaAbertas)} detalhe={`${percentual(l.moedasAnunciadasBp)} das moedas em custódia estão anunciadas`} />
        <Cartao rotulo="Giro" valor={percentual(l.giroBp)} detalhe="vendidas no período ÷ (vendidas + ainda anunciadas hoje)" />
        {l.historico ? (
          <>
            <Cartao rotulo="Anúncios que venderam" valor={percentual(l.historico.taxaDeVendaBp)} detalhe={`${numero(l.historico.executadas)} de ${numero(l.historico.publicadas)} publicados no período`} />
            <Cartao rotulo="Tempo até a venda" valor={duracao(l.historico.tempoAteVenda.mediaMs)} detalhe={`média de ${numero(l.historico.tempoAteVenda.amostras)} venda(s)`} />
          </>
        ) : (
          <Cartao rotulo="Anúncios que venderam" valor="—" detalhe="sem histórico da fila neste banco" />
        )}
      </div>

      {/* ---------- premissas ---------- */}
      <h2 className="adm-titulo-secao" id="cn-premissas">Premissas usadas</h2>
      <div className="panel">
        <ul className="adm-fraco">
          <li><b>Custo logístico:</b> nenhum, o cliente paga o frete (decisão do Gabriel, 22/11/2026).</li>
          <li><b>Payback e LTV:</b> contam custódia e comissão, todo o dinheiro que o cliente gera (decisão do Gabriel).</li>
          <li><b>Horizonte do LTV:</b> {LTV_HORIZONTE_MESES} meses, <b>provisório</b>: ainda sem resposta.</li>
          <li><b>Cliente pagante:</b> quem pagou custódia; depositar moeda sem pagar não conta (decisão do Gabriel).</li>
          <li><b>Churn:</b> retirada, ou mais de {DIAS_PARA_CHURN} dias sem usar a plataforma, ou custódia não paga há mais de {DIAS_PARA_CHURN} dias (decisão do Gabriel).</li>
          <li><b>Gasto e visitas de marketing:</b> digitados na aba “Gasto de marketing”; a leitura automática da Meta ainda não foi decidida.</li>
        </ul>
      </div>
    </>
  )
}

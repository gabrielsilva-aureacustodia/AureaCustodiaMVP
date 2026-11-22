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
import { LTV_HORIZONTE_MESES } from '@/domain/kpis'
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
      <p className="adm-fraco">Quanto custa trazer um cliente e em quantos meses a custódia dele devolve esse dinheiro.</p>
      <div className="adm-grade">
        <Cartao rotulo="CAC do período" valor={dinheiro(c.cac)} detalhe={c.gasto === null ? 'sem gasto de marketing informado nestes dias' : `${dinheiro(c.gasto)} ÷ ${numero(c.ativados)} cliente(s) ativado(s)`} />
        <Cartao
          rotulo="Custódia por cliente, por mês"
          valor={dinheiro(c.receitaMensalPorCliente)}
          detalhe={c.receitaMensalPorCliente === null ? 'ninguém guarda moeda ainda' : `${numero(c.moedasEmCustodia)} moeda(s) ÷ ${numero(c.clientesComMoeda)} cliente(s) × ${dinheiro(c.custodiaPorMoedaCents)}`}
        />
        <Cartao rotulo="Payback" valor={meses(c.paybackMeses)} detalhe="CAC ÷ custódia mensal por cliente" />
        <Cartao rotulo={`LTV em ${LTV_HORIZONTE_MESES} meses`} valor={dinheiro(c.ltv)} detalhe={`custódia mensal × ${LTV_HORIZONTE_MESES} (premissa de leitura)`} />
        <Cartao rotulo="LTV ÷ CAC" valor={c.ltvSobreCacBp === null ? '—' : `${(c.ltvSobreCacBp / 10000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×`} detalhe="quantas vezes o cliente paga o que custou" />
      </div>
      <p className="adm-fraco adm-mt10">
        O gasto vem da aba “Gasto de marketing” (o orçamento combinado de R$ 3.600,00 por mês é lançado lá como “Serviço”). Cliente ativado = fez a 1ª transação.
        A receita considera só a custódia e o preço de hoje; comissões de negociação não entram aqui.
      </p>

      {/* ---------- 2 ---------- */}
      <h2 className="adm-titulo-secao" id="cn-margem">2. Margem por moeda captada</h2>
      <p className="adm-fraco">Para cada moeda que entrou na custódia no período: o que ela já pagou de custódia menos o que custou trazê-la (Correios).</p>
      <div className="adm-grade">
        <Cartao rotulo="Moedas captadas" valor={numero(m.moedasCaptadas)} detalhe={`${numero(m.moedasCaptadasPostais)} chegaram por envio postal`} />
        <Cartao rotulo="Custódia já paga por elas" valor={dinheiro(m.receitaDeCustodia)} detalhe="faturas pagas, só a parte dessas moedas" />
        <Cartao rotulo="Custo logístico por moeda" valor={dinheiro(m.custoLogisticoPorMoeda)} detalhe="digitado em Configuração; vale por envio postal" />
        <Cartao rotulo="Margem por moeda" valor={dinheiro(m.margemPorMoeda)} tom={m.margemPorMoeda === null ? 'normal' : m.margemPorMoeda < 0 ? 'alerta' : 'positivo'} detalhe={m.margemPorMoeda === null ? 'sem moeda captada no período' : 'custódia paga − custo logístico'} />
        <Cartao rotulo="Margem total do período" valor={dinheiro(m.margemTotal)} />
        <Cartao rotulo="Comissão por moeda negociada" valor={dinheiro(m.comissaoMediaPorMoedaNegociada)} detalhe="à parte: a negociação não diz de qual moeda captada veio" />
      </div>
      <p className="adm-fraco adm-mt10">
        O custo dos Correios (cerca de R$ 25,00 por moeda) não está fixo no sistema: o contrato novo está em avaliação, então o valor é editável em{' '}
        <Link href="/admin/configuracao">Configuração</Link> (“Custo logístico por moeda captada”). A custódia de moedas recém-captadas ainda é pequena, por isso a margem
        melhora a cada mês pago.
      </p>

      {/* ---------- 3 ---------- */}
      <h2 className="adm-titulo-secao" id="cn-conversao">3. Conversão de clientes pagantes</h2>
      <p className="adm-fraco">Dos que se cadastraram no período, quantos confiaram e de fato depositaram moeda.</p>
      <div className="adm-grade">
        <Cartao rotulo="Novos cadastros" valor={numero(v.cadastros)} detalhe={v.cadastros === null ? 'sem banco: não há data de cadastro' : 'contas criadas no período'} />
        <Cartao rotulo="Já fizeram a 1ª transação" valor={numero(v.ativados)} detalhe={`${percentual(v.cadastroParaAtivacaoBp)} dos cadastros`} />
        <Cartao rotulo="Já depositaram moeda" valor={numero(v.depositaramMoeda)} detalhe="moeda aprovada na análise, até hoje" />
        <Cartao rotulo="Cadastro → moeda depositada" valor={percentual(v.cadastroParaMoedaBp)} tom="positivo" detalhe="depositaram ÷ cadastros" />
        <Cartao rotulo="Já pagaram custódia" valor={numero(v.pagaramCustodia)} detalhe="dos que depositaram moeda" />
      </div>

      {/* ---------- 4 ---------- */}
      <h2 className="adm-titulo-secao" id="cn-churn">4. Inadimplência e saída de clientes (churn)</h2>
      <p className="adm-fraco">Quem não paga a custódia mensal e quem pede as moedas de volta.</p>
      <div className="adm-grade">
        <Cartao
          rotulo="Inadimplência"
          valor={percentual(i.taxaInadimplenciaBp)}
          tom={i.taxaInadimplenciaBp ? 'alerta' : 'normal'}
          detalhe={i.valorEmitido ? `${dinheiro(i.valorAtrasado)} atrasados de ${dinheiro(i.valorEmitido)} cobrados no período` : 'nenhuma fatura emitida no período'}
        />
        <Cartao rotulo="Contas inadimplentes agora" valor={numero(i.contasInadimplentes)} />
        <Cartao rotulo="Moedas retiradas" valor={numero(i.moedasRetiradas)} detalhe="pedidos de retirada não cancelados no período" />
        <Cartao rotulo="Churn de moedas" valor={percentual(i.churnDeMoedasBp)} detalhe="retiradas ÷ moedas que estavam na custódia no começo do período (estimativa)" />
        <Cartao rotulo="Clientes que saíram" valor={numero(i.clientesQueSairam)} detalhe={`${percentual(i.churnDeClientesBp)} · retiraram e não guardam mais moeda`} />
        <Cartao rotulo="Custódia recorrente por mês" valor={dinheiro(i.receitaRecorrenteMensal)} detalhe="moedas em custódia × preço, se todas estivessem pagas" />
      </div>
      <p className="adm-fraco adm-mt10">
        O sistema não guarda a data em que o cliente “deixa de ser cliente”, então a saída é medida pelo pedido de retirada. Moeda vendida no mercado continua na
        custódia (muda de dono) e não conta como saída.
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
      <h2 className="adm-titulo-secao" id="cn-premissas">Premissas usadas (padrão provisório, aguardando confirmação)</h2>
      <div className="panel">
        <ul className="adm-fraco">
          <li><b>Custo logístico:</b> {dinheiro(m.custoLogisticoPorMoeda)} por moeda de envio postal (editável em <Link href="/admin/configuracao">Configuração</Link>).</li>
          <li><b>Payback e LTV:</b> só custódia, preço de hoje; LTV = {LTV_HORIZONTE_MESES} meses de custódia, sem desconto e sem churn.</li>
          <li><b>Cliente pagante:</b> quem teve ao menos uma moeda aprovada na análise (e, à parte, quem já pagou uma fatura de custódia).</li>
          <li><b>Churn:</b> pedido de retirada não cancelado dentro do período; venda no mercado não conta.</li>
          <li><b>Margem:</b> sem comissão (a negociação não registra a moeda) e sem imposto.</li>
        </ul>
      </div>
    </>
  )
}

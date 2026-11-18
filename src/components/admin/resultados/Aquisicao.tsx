/**
 * A aba "Aquisição e atendimento" dos KPIs — os números que o conselho pediu (slide "3.1 Cronograma, Números
 * e Metrificação"): CAC diário e semanal, funil de cadastro, análise por canal e atendimento.
 *
 * Nada é calculado aqui: tudo vem pronto de `montarKpisDeAquisicao` (src/domain/kpis.ts), testado sem banco.
 * REGRA DA TELA: o que não tem fonte aparece como "—" ou como "Indisponível" com o motivo — nunca como zero. Zero
 * diria "não houve", e o certo é dizer que ninguém informou (gasto, visitas) ou que o dado não existe (origem do
 * cadastro).
 *
 * Sem 'use client': desenhado no servidor; só o seletor de período é de cliente.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import { ROTULO_NATUREZA, rotuloDoCanal } from '@/domain/kpis'
import type { DadosAquisicao } from '@/server/admin/resultados'

import { AvisoSemBanco, Cartao, Indisponivel } from '../Blocos'
import { SeletorPeriodo } from '../SeletorPeriodo'
import { dinheiro, duracao, numero, percentual } from '../formatos'
import { TabelaRolavel } from '@/components/admin/Pecas'

function diaBr(dia: string): string {
  const [a, m, d] = dia.split('-')
  return `${d}/${m}/${a}`
}

export function Aquisicao({ dados, periodo }: { dados: DadosAquisicao; periodo: PeriodoEscolhido }): ReactNode {
  const { kpis, semBanco, migracaoPendente, atendimentoLiberado } = dados
  const { porJanela, funil, gastoPorCanal, gastoPorNatureza, atendimento } = kpis
  const semGastoNenhum = porJanela.every((j) => j.gasto === null)

  return (
    <>
      {semBanco ? (
        <AvisoSemBanco>Sem banco não há data de cadastro, gasto informado nem casos: esses números ficam em “—”.</AvisoSemBanco>
      ) : null}
      {migracaoPendente ? (
        <p className="note adm-secao">
          <span>O banco ainda não tem a tabela do gasto de marketing (migration 057). Rode npm run db:migrate — até lá, o CAC fica em “—”.</span>
        </p>
      ) : null}

      <div className="adm-ferramentas">
        <SeletorPeriodo ano={periodo.ano} mes={periodo.mes} trimestre={periodo.trimestre} manter={{ aba: 'aquisicao' }} />
      </div>
      <div className="adm-secao">
        <p className="adm-fraco">
          O quadro do CAC é sempre de agora (hoje, 7 dias, mês até hoje). Funil, gasto por canal e atendimento são do período ({periodo.periodo.rotulo}).
          Os dias são os de Brasília. Contas da equipe e de teste não entram em cadastro nem em ativação.
        </p>
      </div>

      {/* ---------- CAC ---------- */}
      <h2 className="adm-titulo-secao" id="aq-cac">Custo para conquistar um cliente (CAC)</h2>
      <div className="adm-grade">
        {porJanela.map((j) => (
          <Cartao
            key={j.rotulo}
            rotulo={`CAC — ${j.rotulo.toLowerCase()}`}
            valor={dinheiro(j.cac)}
            detalhe={
              j.gasto === null
                ? 'sem gasto informado nestes dias'
                : `${dinheiro(j.gasto)} ÷ ${numero(j.ativados)} cliente(s) ativado(s)${j.aproximado ? ' · estimado' : ''}`
            }
          />
        ))}
      </div>
      <div className="panel adm-mt12">
        <h3>Do cadastro à 1ª transação, por janela</h3>
        <TabelaRolavel rotulo="CAC, cadastros e ativados por janela de dias">
          <table className="audit-table">
            <caption className="adm-sr">CAC, cadastros e ativados por janela de dias</caption>
            <thead>
              <tr>
                <th scope="col">Janela</th>
                <th scope="col" className="adm-num">Cadastros</th>
                <th scope="col" className="adm-num">Ativados</th>
                <th scope="col" className="adm-num">Gasto</th>
                <th scope="col" className="adm-num">CAC</th>
                <th scope="col" className="adm-num">CAC só da mídia</th>
                <th scope="col" className="adm-num">Custo por cadastro</th>
              </tr>
            </thead>
            <tbody>
              {porJanela.map((j) => (
                <tr key={j.rotulo}>
                  <td>
                    {j.rotulo}
                    <span className="adm-fraco"> · {j.de === j.ate ? diaBr(j.de) : `${diaBr(j.de)} a ${diaBr(j.ate)}`}</span>
                  </td>
                  <td className="adm-num">{numero(j.cadastros)}</td>
                  <td className="adm-num">{numero(j.ativados)}</td>
                  <td className="adm-num">
                    {dinheiro(j.gasto)}
                    {j.aproximado ? <span className="adm-fraco"> (estimado)</span> : null}
                  </td>
                  <td className="adm-num">{dinheiro(j.cac)}</td>
                  <td className="adm-num">{dinheiro(j.cacMidia)}</td>
                  <td className="adm-num">{dinheiro(j.custoPorCadastro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelaRolavel>
        <p className="adm-fraco adm-mt10">
          <b>CAC</b> = gasto informado nos dias ÷ clientes ativados nos dias. <b>Ativado</b> = fez a 1ª transação: a primeira entrada de dinheiro
          confirmada (Pix ou cartão), compra ou venda. <b>CAC só da mídia</b> deixa de fora a mensalidade do serviço de marketing. O gasto de um
          intervalo maior que a janela é dividido em partes iguais pelos dias e aparece como “estimado”.
          {semGastoNenhum ? (
            <>
              {' '}
              <b>Nenhum gasto foi informado para estes dias:</b> o CAC fica em “—” até alguém lançar na aba “Gasto de marketing”.
            </>
          ) : null}
        </p>
      </div>

      {/* ---------- funil ---------- */}
      <h2 className="adm-titulo-secao" id="aq-funil">Funil do período: visita → cadastro → 1ª transação</h2>
      <div className="adm-grade">
        <Cartao
          rotulo="Visitas ao site"
          valor={numero(funil.visitas)}
          detalhe={funil.visitas === null ? 'ninguém informou as visitas do período' : funil.visitasEstimadas ? 'informadas pela equipe · estimado' : 'informadas pela equipe'}
        />
        <Cartao rotulo="Novos cadastros" valor={numero(funil.cadastros)} detalhe={funil.cadastros === null ? 'sem banco: não há data de cadastro' : 'contas criadas no período'} />
        <Cartao rotulo="Visita → cadastro" valor={percentual(funil.visitaParaCadastroBp)} detalhe="cadastros ÷ visitas" />
        <Cartao
          rotulo="Cadastrados que já transacionaram"
          valor={numero(funil.ativadosDosCadastrados)}
          detalhe="dos cadastros do período, até hoje"
        />
        <Cartao rotulo="Cadastro → 1ª transação" valor={percentual(funil.cadastroParaAtivacaoBp)} detalhe="ativados ÷ cadastros" />
      </div>
      <p className="adm-fraco adm-mt10">
        O Pixel e a API de Conversões da Meta só enviam o cadastro à Meta: o site não lê de volta. As visitas vêm do gerenciador de anúncios e são
        digitadas na aba “Gasto de marketing”.
      </p>

      {/* ---------- gasto por canal e origem ---------- */}
      <h2 className="adm-titulo-secao" id="aq-gasto">Gasto por canal: digital × analógico</h2>
      <div className="adm-grade">
        <Cartao rotulo={ROTULO_NATUREZA.digital} valor={dinheiro(gastoPorNatureza.digital)} detalhe="Meta, Google e outros canais digitais" />
        <Cartao rotulo={ROTULO_NATUREZA.analogico} valor={dinheiro(gastoPorNatureza.analogico)} detalhe="eventos, material impresso e outros" />
        <Cartao rotulo={ROTULO_NATUREZA.geral} valor={dinheiro(gastoPorNatureza.geral)} detalhe="mensalidade do serviço de marketing" />
      </div>
      <div className="adm-grade-larga">
        <div className="panel">
          <h3>Gasto informado no período, por canal</h3>
          {gastoPorCanal.length ? (
            <TabelaRolavel rotulo="Gasto de marketing por canal no período">
              <table className="audit-table">
                <caption className="adm-sr">Gasto de marketing por canal no período</caption>
                <thead>
                  <tr>
                    <th scope="col">Canal</th>
                    <th scope="col">Natureza</th>
                    <th scope="col" className="adm-num">Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastoPorCanal.map((g) => (
                    <tr key={g.canal}>
                      <td>{rotuloDoCanal(g.canal)}</td>
                      <td>{ROTULO_NATUREZA[g.natureza]}</td>
                      <td className="adm-num">{dinheiro(g.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelaRolavel>
          ) : (
            <div className="empty">Nenhum gasto informado para o período.</div>
          )}
          {kpis.gastoAproximado ? <p className="adm-fraco adm-mt10">Há entradas que cobrem mais dias que o período: o valor mostrado é uma parte delas, estimada pelos dias.</p> : null}
        </div>
        <div className="panel">
          <h3>Origem do cadastro</h3>
          <Indisponivel
            titulo="Analógico × digital"
            quando="Depende de um campo de origem no cadastro (de onde o cliente veio), que o site ainda não tem. A proposta está em docs/kpis/PROPOSTA_DE_KPIS.md. Até lá, só o gasto separa os dois lados."
          />
        </div>
      </div>

      {/* ---------- atendimento ---------- */}
      <h2 className="adm-titulo-secao" id="aq-atendimento">Atendimento</h2>
      {!atendimentoLiberado ? (
        <div className="empty">Os números do atendimento pedem a permissão de ver o atendimento (cs.ver), que esta conta não tem.</div>
      ) : atendimento === null ? (
        <Indisponivel
          titulo="Casos de atendimento"
          quando={semBanco ? 'Sem banco não há casos de atendimento.' : 'Não foi possível ler os casos agora. Confira se a migration 048 foi aplicada e tente de novo.'}
        />
      ) : (
        <>
          <div className="adm-grade">
            <Cartao rotulo="Esperando a equipe" valor={numero(atendimento.abertosAgora)} tom={atendimento.abertosAgora ? 'alerta' : 'normal'} detalhe="casos abertos agora, de qualquer data" />
            <Cartao rotulo="Em andamento" valor={numero(atendimento.emAndamentoAgora)} detalhe="a equipe já respondeu" />
            <Cartao rotulo="Casos criados no período" valor={numero(atendimento.criadosNoPeriodo)} detalhe={`${numero(atendimento.semRespostaDaEquipe)} ainda sem resposta da equipe`} />
            <Cartao rotulo="Resolvidos no período" valor={numero(atendimento.resolvidosNoPeriodo)} />
            <Cartao
              rotulo="Tempo até a 1ª resposta"
              valor={duracao(atendimento.tempoAtePrimeiraResposta.mediaMs)}
              detalhe={`média de ${numero(atendimento.tempoAtePrimeiraResposta.amostras)} caso(s) criados no período`}
            />
          </div>
          <p className="adm-fraco adm-mt10">
            Os casos são os do botão “Atendimento” do cliente, em <Link href="/admin/casos">Casos</Link>. A caixa do WhatsApp (<Link href="/admin/cs">Atendimento</Link>)
            ainda não entra nestes números.
          </p>
        </>
      )}
    </>
  )
}

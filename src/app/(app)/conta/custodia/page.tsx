'use client'

/**
 * Minha conta › Minha custódia — a página de detalhes do serviço de guarda.
 *
 * O QUE ELA RESPONDE, E POR QUE FALTAVA (25/09/2026)
 * --------------------------------------------------
 * "Não temos uma seção onde o usuário pode facilmente ver tudo nos seus planos
 * de custódia." Antes desta tela, a custódia do cliente estava repartida entre
 * o aviso de débito (que some quando está tudo pago), a aba de Faturas (uma
 * tabela de cobranças, sem a conta do mês) e nada mais. Faltavam as três
 * perguntas: quanto custa por mês, quando vence a próxima, e o que já paguei.
 *
 * O extrato é a lista de faturas PAGAS, com data, forma e quantas moedas cada
 * uma cobriu. É o comprovante que o cliente procura quando quer conferir o
 * histórico — e a origem de cada fatura está escrita em português, porque a
 * pergunta que ele faz olhando o extrato é "por que fui cobrado isto aqui?".
 *
 * CANCELAR O PLANO NÃO ENCERRA A GUARDA, e isso está dito na tela em vez de
 * escondido num termo. A moeda continua no armazém; o que para é a cobrança
 * automática no cartão. Quem quer encerrar a custódia de verdade pede a
 * retirada física — o caminho está no próprio aviso.
 */

import Link from 'next/link'
import { useState, type ReactNode } from 'react'

import { fimDaCoberturaDaFatura } from '@/domain/custody'
import { resumoDaCustodia, rotuloDaOrigem, lotesDaFatura } from '@/domain/custodia-do-cliente'
import { fdate } from '@/domain/dates'
import { brl } from '@/domain/money'
import type { PlanoCustodia } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { cancelarMinhaAssinaturaCustodia } from '@/server/actions/plano-custodia'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { Selo } from '@/components/ui/Selo'
import { ProximasCobrancas } from '@/components/custody/ProximasCobrancas'

const FORMA: Record<string, string> = {
  saldo: 'Saldo em conta',
  pix: 'Pix',
  cartao: 'Cartão de crédito',
}

/**
 * O cartão de um plano, com o botão de cancelar.
 *
 * A confirmação é no próprio lugar, sem modal: o primeiro clique troca o rótulo
 * e explica o que vai acontecer, o segundo executa. Modal empurraria o aviso de
 * "a guarda continua" para uma caixa que a pessoa fecha no automático.
 */
function CartaoDoPlano({ plano }: { plano: PlanoCustodia }): ReactNode {
  const { run } = useApp()
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const ativo = plano.status === 'vigente' || plano.status === 'aguardando_pagamento'
  // <Selo> do Brandbook (§9.4): o estado do plano é sempre TEXTO; a cor só reforça.
  const selo =
    plano.status === 'vigente'
      ? { tom: 'sucesso' as const, txt: 'Vigente' }
      : plano.status === 'aguardando_pagamento'
        ? { tom: 'aviso' as const, txt: 'Aguardando pagamento' }
        : { tom: 'neutro' as const, txt: plano.status === 'encerrado' ? 'Encerrado' : 'Cancelado' }

  return (
    <div className="panel plano">
      <div className="plano-cab">
        <div>
          <h4>Plano Mensal de Custódia</h4>
          <div className="plano-id">
            {plano.id} · Envio {plano.protocoloEnvio}
          </div>
        </div>
        <Selo tom={selo.tom}>{selo.txt}</Selo>
      </div>

      <div className="summary-box">
        <div className="sr">
          <span className="k">Moedas cobertas</span>
          <span className="v">
            {plano.moedaIds.length > 0
              ? `${plano.moedaIds.length} — ${plano.moedaIds.join(', ')}`
              : 'Aguardando validação física'}
          </span>
        </div>
        <div className="sr">
          <span className="k">Valor</span>
          <span className="v">{brl(plano.valorTotalCents)} / mês</span>
        </div>
        <div className="sr">
          <span className="k">Início da vigência</span>
          <span className="v">{plano.inicioCompetencia}</span>
        </div>
        <div className="sr">
          <span className="k">Pago até</span>
          <span className="v">{plano.pagoAteCompetencia ?? 'Aguardando pagamento'}</span>
        </div>
        <div className="sr">
          <span className="k">Cobrança automática no cartão</span>
          <span className="v">{plano.assinaturaId ? 'Ativa' : 'Não'}</span>
        </div>
        {plano.estornadoCents > 0 && (
          <div className="sr">
            <span className="k">Estorno por moedas recusadas</span>
            <span className="v v-verde">{brl(plano.estornadoCents)}</span>
          </div>
        )}
      </div>

      {/* Ação que desfaz algo fica num bloco à parte, com confirmação em duas etapas (tópico 35
          passo 1). A primeira etapa continua sendo o botão contornado de antes. */}
      {ativo &&
        (confirmando ? (
          <div className="zona-perigo" role="group" aria-label={`Confirmar o cancelamento do plano ${plano.id}`}>
            <p>
              Cancelar encerra a cobrança automática deste plano. <b>Suas moedas continuam na
              custódia</b> e a guarda continua sendo cobrada mês a mês, por fatura, pelo mesmo
              preço. Para encerrar a guarda, peça a <Link href="/retirada">retirada física</Link> das moedas.
            </p>
            <div className="acoes">
              <button type="button" className="btn btn-outline" disabled={ocupado} onClick={() => setConfirmando(false)}>
                Manter plano<span className="sr-only"> {plano.id}</span>
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={ocupado}
                onClick={async () => {
                  setOcupado(true)
                  try {
                    const r = await run(() => cancelarMinhaAssinaturaCustodia(plano.id))
                    if (r.ok) setConfirmando(false)
                  } finally {
                    setOcupado(false)
                  }
                }}
              >
                {ocupado ? 'Cancelando…' : 'Confirmar cancelamento'}
                <span className="sr-only"> do plano {plano.id}</span>
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-outline plano-cancelar" onClick={() => setConfirmando(true)}>
            Cancelar assinatura deste plano<span className="sr-only"> ({plano.id})</span>
          </button>
        ))}
    </div>
  )
}

/** "guarda até …" e os lotes de uma fatura, debaixo da competência e da origem. */
function Sub({ children }: { children: ReactNode }): ReactNode {
  return <div className="cel-sub">{children}</div>
}

export default function MinhaCustodiaPage(): ReactNode {
  const { state, session, taxas } = useApp()
  const meusCoins = state.users[session]?.coins ?? []
  const r = resumoDaCustodia(state, session, taxas.custodiaMensalPorMoeda)

  return (
    <>
      <Link href="/conta" className="back-link">
        ← Voltar para Minha conta
      </Link>

      {/* Página longa no celular: atalhos para as três seções (tópico 35 passo 4). */}
      <nav className="nesta-pagina" aria-label="Nesta página">
        <ul>
          <li>
            <a className="chip" href="#custodia-resumo">
              Resumo
            </a>
          </li>
          <li>
            <a className="chip" href="#custodia-planos">
              Planos
            </a>
          </li>
          <li>
            <a className="chip" href="#custodia-extrato">
              Extrato pago
            </a>
          </li>
        </ul>
      </nav>

      {/* ---------------- o mês corrente ---------------- */}
      <div className="panel" id="custodia-resumo">
        <h3>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          Resumo da custódia
        </h3>

        <div className="summary-box">
          <div className="sr">
            <span className="k">Moedas sob guarda</span>
            <span className="v">{r.moedasGuardadas}</span>
          </div>
          <div className="sr">
            <span className="k">Preço por moeda</span>
            <span className="v">{brl(r.porMoedaCents)} / mês</span>
          </div>
          <div className="sr">
            <span className="k">Mensalidade do acervo</span>
            <span className="v">{brl(r.mensalidadeCents)} / mês</span>
          </div>
          {/* A COBERTURA VEM ANTES DO PRAZO, e as duas ficam com nome próprio.
              Uma fatura emitida no dia 25 tem prazo de pagamento até o dia 5 do
              mês seguinte e cobre a guarda só até o dia 30 — as duas datas na
              mesma coluna faziam a custódia parecer expirar dez dias depois de
              ser paga. */}
          <div className="sr">
            <span className="k">Guarda paga até</span>
            <span className="v">{r.cobertaAte ? fdate(r.cobertaAte) : 'Nenhum ciclo quitado'}</span>
          </div>
          {r.proximoVencimento && (
            <div className="sr">
              <span className="k">Prazo para pagar</span>
              <span className="v">{`${fdate(r.proximoVencimento)} — ${brl(r.emAbertoCents)}`}</span>
            </div>
          )}
          {/* Uma linha por data, com quantas moedas (26/10/2026): o ciclo é de cada moeda. */}
          {r.cobrancasPorData.length > 0 ? (
            <ProximasCobrancas grupos={r.cobrancasPorData} />
          ) : (
            <div className="sr">
              <span className="k">Próxima cobrança</span>
              <span className="v">Sem moedas sob guarda</span>
            </div>
          )}
          <div className="sr">
            <span className="k">Já pago em custódia</span>
            <span className="v">{brl(r.totalPagoCents)}</span>
          </div>
        </div>

        {r.emAberto.length > 0 && (
          <Link href="/conta/faturas" className="btn btn-gold btn-link-cheio">
            Pagar {brl(r.emAbertoCents)} em aberto
          </Link>
        )}

        <p className="panel-rodape">
          A guarda de cada moeda custa {brl(r.porMoedaCents)} por mês, sem prazo mínimo, e é
          contada a partir do dia em que a moeda foi aceita: ela renova todo mês nesse mesmo dia.
          Moeda vendida ou retirada deixa de ser cobrada no próximo ciclo.
        </p>
      </div>

      {/* ---------------- planos ---------------- */}
      <section className="secao-planos" id="custodia-planos" aria-labelledby="custodia-planos-t">
        <h2 id="custodia-planos-t" className="secao-titulo">
          Planos de custódia
        </h2>
        {r.planosAtivos.length === 0 && r.planosEncerrados.length === 0 ? (
          <div className="panel">
            <EstadoVazio
              titulo="Você não tem plano de custódia contratado."
            >
              Suas moedas continuam guardadas e cobradas mês a mês pela tarifa de{' '}
              {brl(r.porMoedaCents)} por moeda. O plano é contratado durante o envio de novas
              moedas para a custódia.
            </EstadoVazio>
          </div>
        ) : (
          <div className="grade-planos">
            {[...r.planosAtivos, ...r.planosEncerrados].map((p) => (
              <CartaoDoPlano key={p.id} plano={p} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- extrato ---------------- */}
      <div className="panel" id="custodia-extrato">
        <h3>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M9 10h7M9 13.5h7M9 17h4" />
          </svg>
          Extrato de pagamentos da custódia
        </h3>

        {r.pagas.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum pagamento de custódia registrado até agora."
          >
            Cada fatura paga aparece aqui, com a data, a forma de pagamento e as moedas que ela cobriu.
          </EstadoVazio>
        ) : (
          <div className="tabela-fixa" tabIndex={0} role="region" aria-label="Pagamentos de custódia (role para o lado no celular)">
            <table className="ro-tabela">
              <thead>
                <tr>
                  <th scope="col">Pago em</th>
                  <th scope="col">Competência</th>
                  <th scope="col">Referente a</th>
                  <th scope="col" className="num">
                    Moedas
                  </th>
                  <th scope="col">Forma</th>
                  <th scope="col" className="num">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.pagas.map((f) => (
                  <tr key={f.id}>
                    <th scope="row" className="nowrap">
                      {fdate(f.dataPagamento ?? f.dataEmissao)}
                    </th>
                    <td>
                      {f.competencia}
                      <Sub>guarda até {fdate(fimDaCoberturaDaFatura(f))}</Sub>
                    </td>
                    <td>
                      {rotuloDaOrigem(f.origem)}
                      {lotesDaFatura(meusCoins, f).length > 0 && (
                        <Sub>
                          {lotesDaFatura(meusCoins, f).length > 1 ? 'Lotes ' : 'Lote '}
                          {lotesDaFatura(meusCoins, f).join(', ')}
                        </Sub>
                      )}
                    </td>
                    <td className="num">{f.quantidadeMoedas}</td>
                    <td>{FORMA[f.formaPagamento ?? 'saldo'] ?? f.formaPagamento}</td>
                    <td className="num">{brl(f.valorCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={5}>
                    Total pago
                  </th>
                  <td className="num total">{brl(r.totalPagoCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {r.emAberto.length > 0 && (
          <>
            <h4 className="sub-titulo">Em aberto</h4>
            <div className="tabela-fixa" tabIndex={0} role="region" aria-label="Faturas em aberto (role para o lado no celular)">
              <table className="ro-tabela">
                <thead>
                  <tr>
                    <th scope="col">Prazo para pagar</th>
                    <th scope="col">Competência</th>
                    <th scope="col">Referente a</th>
                    <th scope="col" className="num">
                      Moedas
                    </th>
                    <th scope="col" className="num">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {r.emAberto.map((f) => (
                    <tr key={f.id}>
                      <th scope="row" className={f.dataVencimento < Date.now() ? 'nowrap imp-neg' : 'nowrap'}>
                        {fdate(f.dataVencimento)}
                      </th>
                      <td>
                        {f.competencia}
                        <Sub>guarda até {fdate(fimDaCoberturaDaFatura(f))}</Sub>
                      </td>
                      <td>
                        {rotuloDaOrigem(f.origem)}
                        {lotesDaFatura(meusCoins, f).length > 0 && (
                          <Sub>
                            {lotesDaFatura(meusCoins, f).length > 1 ? 'Lotes ' : 'Lote '}
                            {lotesDaFatura(meusCoins, f).join(', ')}
                          </Sub>
                        )}
                      </td>
                      <td className="num">{f.quantidadeMoedas}</td>
                      <td className="num">{brl(f.valorCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}

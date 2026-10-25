'use client'

/**
 * 2.2 — Auditoria de estoque custodiado.
 *
 * Port de aurea-mvp-teste.html, linhas 2456-2525 (`renderAudit` + `exportAuditXlsx`).
 * Migrada na AG3 para subpágina de Recibos (/recibos/auditoria).
 *
 * POR QUE ESTA PÁGINA É CLIENT COMPONENT
 * --------------------------------------
 * Ela é quase toda leitura e poderia ser servida do servidor — mas o botão
 * "Exportar auditoria completa" precisa de `import()` dinâmico, de `XLSX.writeFile`
 * (que só existe no navegador, porque quem baixa o arquivo é o navegador) e do
 * toast. Como um arquivo com 'use client' é inteiro do cliente, e o estado já
 * chega pronto pelo AppProvider (que o (app)/layout buscou no servidor), a página
 * inteira mora aqui e não há nenhuma busca extra de dados na hidratação.
 *
 * O título da tela NÃO é escrito aqui: no monolito cada render<Tela>() começava
 * com `pageTitle.innerHTML = ...`; neste port quem monta o cabeçalho é a Topbar,
 * derivando-o do pathname (ver components/shell/Topbar.tsx).
 */

import Link from 'next/link'
import { useCallback } from 'react'
import type { ReactNode } from 'react'

import { brl } from '@/domain/money'
import { fdate } from '@/domain/dates'
import { allCoinsFlat, coinStatusDigital, envioDateFor } from '@/domain/selectors'
import { useApp } from '@/components/providers/AppProvider'
import { useToast } from '@/components/ui/Toast'
import { Selo, type TomDoSelo } from '@/components/ui/Selo'
import type { AuditRow } from '@/lib/xlsx/audit-export'

/** Quantas moedas o painel "Últimas moedas enviadas" mostra (slice(0,8) do original). */
const ULTIMAS = 8

/**
 * Tom do selo do status digital, exatamente com a precedência do original
 * (linha 2468): verde para 'Disponível', ouro para 'Negociando' e neutro para
 * o resto — que hoje é só 'Alienado'.
 */
function tomDigital(status: string): TomDoSelo {
  if (status === 'Disponível') return 'sucesso'
  if (status === 'Negociando') return 'ouro'
  return 'neutro'
}

export default function AuditoriaPage(): ReactNode {
  const { state } = useApp()
  const toast = useToast()

  // Inventário global do sistema, já ordenado por código do ativo crescente.
  const flat = allCoinsFlat(state)
  const totalCust = flat.length
  const recibosAtivos = flat.filter(({ coin }) => coin.recibo.status === 'Ativo').length

  // Métricas financeiras e de esteira de recebimento
  const totalSaldo = Object.values(state.users).reduce((acc, u) => acc + (u.balance || 0), 0)
  // Receita de custódia = faturas mensais emitidas. Até 11/09/2026 vinha de
  // `custodyCharges`, o mecanismo antigo.
  const totalTaxas = (state.faturasCustodia ?? []).reduce(
    (acc, f) => acc + (f.status === 'cancelada' ? 0 : f.valorCents),
    0,
  )
  const totalComissoes = state.trades.reduce((acc, t) => acc + (t.fee || 0), 0)
  const totalReceita = totalTaxas + totalComissoes
  const enviosEmTransito = state.envios.filter((e) => e.etapaAtual === 'Envio postado').length
  const enviosNaCentral = state.envios.filter(
    (e) => e.etapaAtual !== 'Envio postado' && e.etapaAtual !== 'Protocolo gerado' && e.etapaAtual !== 'Recibo emitido',
  ).length

  // As mais recentes primeiro. O original ordenava uma CÓPIA (slice()) em ordem
  // decrescente de código e pegava as 8 primeiras — o código do ativo é
  // sequencial, então ordenar por ele é ordenar por data de emissão.
  const ultimas = flat
    .slice()
    .sort((a, b) => (a.coin.id < b.coin.id ? 1 : -1))
    .slice(0, ULTIMAS)

  const exportar = useCallback(async () => {
    // As linhas saem de allCoinsFlat NA ORDEM CRESCENTE de código, como no MVP:
    // exportAuditXlsx recebe a lista já montada e já ordenada, não reordena nada.
    // E, por regra de negócio, NENHUMA coluna de proprietário entra aqui — é a
    // promessa que a nota logo abaixo do botão faz ao usuário.
    const rows: AuditRow[] = allCoinsFlat(state).map(({ coin }) => ({
      Codigo_Moeda: coin.id,
      Tipo_Moeda: coin.tipoMoeda,
      Data_Envio: envioDateFor(state, coin),
      Data_Avaliacao: coin.recibo.dataEmissao,
    }))

    try {
      // Import dinâmico: a biblioteca 'xlsx' é grande e só interessa a quem clica
      // no botão. No monolito o papel disto era a tag <script> da CDN, e o
      // `if(!window.XLSX)` da linha 2512 é o que hoje vira este catch.
      const { exportAuditXlsx } = await import('@/lib/xlsx/audit-export')
      await exportAuditXlsx(rows)
      // O módulo de exportação não avisa ninguém: o toast é de quem chama, e o
      // texto (com a contagem entre parênteses) é o da linha 2524.
      toast('Planilha de auditoria exportada (' + rows.length + ' moedas).')
    } catch (err) {
      // A falha de carregamento chega como Error com o texto exato do MVP.
      toast(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o gerador de planilhas — verifique a conexão e recarregue a página.',
      )
    }
  }, [state, toast])

  return (
    <>
      <Link href="/recibos" className="back-link">
        ‹ Voltar para recibos
      </Link>

      <div className="cols-rev">
        <div className="coluna-pilha">
          {/* Painel de Conciliação Financeira Gateway x Ledger */}
          <section className="panel" aria-labelledby="aud-concil-t">
            <h3 id="aud-concil-t">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Conciliação Financeira & Esteira de Custódia
            </h3>

            <div className="kpis kpis-justos">
              <div className="kpi">
                <div className="lbl">Saldo em custódia</div>
                <div className="val ouro">{brl(totalSaldo)}</div>
              </div>
              <div className="kpi">
                <div className="lbl">Receita arrecadada</div>
                <div className="val">{brl(totalReceita)}</div>
              </div>
              <div className="kpi">
                <div className="lbl">Taxas de custódia</div>
                <div className="val">{brl(totalTaxas)}</div>
              </div>
              <div className="kpi">
                <div className="lbl">Comissões de mercado</div>
                <div className="val">{brl(totalComissoes)}</div>
              </div>
              <div className="kpi">
                <div className="lbl">Em trânsito postal (Correios)</div>
                <div className="val">{enviosEmTransito} pacote(s)</div>
              </div>
              <div className="kpi">
                <div className="lbl">Triagem na central</div>
                <div className="val">{enviosNaCentral} lote(s)</div>
              </div>
              <div className="kpi">
                <div className="lbl">Status da conciliação</div>
                <div className="val verde">✓ Conciliado 1:1</div>
              </div>
            </div>
          </section>

          <section className="panel" aria-label="Estoque do produto">
            <label className="field-lbl" htmlFor="aud-produto">
              Produto
            </label>
            {/* Seletor decorativo: o marketplace só tem um produto. Fica sem
                onChange de propósito — é exatamente o <select> inerte do
                original. Agora com <label> de verdade ligado a ele. */}
            <select id="aud-produto" className="tinput aud-produto">
              <option>Real Olímpico</option>
            </select>

            <div className="kpis kpis-justos">
              <div className="kpi">
                <div className="lbl">Total custodiado</div>
                <div className="val">{totalCust}</div>
              </div>
              <div className="kpi">
                <div className="lbl">Recibos ativos</div>
                <div className="val">{recibosAtivos}</div>
              </div>
              <div className="kpi">
                <div className="lbl">Retiradas em andamento</div>
                {/* Zero fixo, como no MVP: a retirada física é o bloco 4.3 e
                    ainda não existe. */}
                <div className="val">0</div>
              </div>
              <div className="kpi">
                <div className="lbl">Última auditoria</div>
                {/* "Hoje", literalmente: o original também carimbava Date.now().
                    suppressHydrationWarning cobre a única divergência possível
                    entre servidor e cliente — a virada da meia-noite entre uma
                    pintura e outra. */}
                <div className="val" suppressHydrationWarning>
                  {fdate(Date.now())}
                </div>
              </div>
            </div>
          </section>

          <div className="panel">
            <div className="panel-cab">
              <h3>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 3h9l4 4v14H6z" />
                  <path d="M9 11h7M9 15h7" />
                </svg>
                Últimas moedas enviadas
              </h3>
              <button className="btn btn-outline auto" type="button" onClick={() => void exportar()}>
                Exportar auditoria completa
              </button>
            </div>

            {/* .tabela-fixa: o código da moeda fica parado enquanto as outras colunas rolam. */}
            <div className="tabela-fixa">
              <table className="ro-tabela">
                <thead>
                  <tr>
                    <th scope="col">Código da moeda</th>
                    <th scope="col">Tipo de moeda</th>
                    <th scope="col">Status físico</th>
                    <th scope="col">Status digital</th>
                    <th scope="col">Data de entrada</th>
                    <th scope="col">Recibo</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimas.map(({ coin }) => {
                    // O status digital é derivado do estado (ofertas abertas
                    // viram 'Negociando'), então precisa do state como primeiro
                    // argumento. Calculado uma vez por linha: o original chamava
                    // a função três vezes na mesma <td>.
                    const digital = coinStatusDigital(state, coin)
                    return (
                      // A chave é o código do ativo — sequencial e único no sistema.
                      <tr key={coin.id}>
                        <th scope="row" className="nowrap">
                          {coin.id}
                        </th>
                        <td>{coin.tipoMoeda}</td>
                        <td>
                          <Selo tom={coin.statusFisico === 'Recebido' ? 'aviso' : 'sucesso'}>
                            {/* O `|| 'Armazenado'` é do original: protege registros
                                antigos que nasceram sem o campo. */}
                            {coin.statusFisico || 'Armazenado'}
                          </Selo>
                        </td>
                        <td>
                          <Selo tom={tomDigital(digital)}>{digital}</Selo>
                        </td>
                        <td className="nowrap">{coin.entrada}</td>
                        <td className="nowrap">{coin.recibo.codigo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="note">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16.5v.5" />
              </svg>
              A planilha exportada contém código, tipo de moeda e datas de envio e avaliação de todo
              o estoque — sem dados de proprietário.
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Integridade da custódia
            </h3>
            {/* Os quatro selos são fixos no MVP — ainda não há conferência real
                por trás deles. Portados como estão; o ✓ virou o selo "Conferido", que se lê sem cor e sem leitor de tela. */}
            <div className="sec-row">
              <span className="k">Registro fotográfico</span>
              <Selo tom="sucesso">Conferido</Selo>
            </div>
            <div className="sec-row">
              <span className="k">Lacre interno</span>
              <Selo tom="sucesso">Conferido</Selo>
            </div>
            <div className="sec-row">
              <span className="k">Recibo emitido</span>
              <Selo tom="sucesso">Conferido</Selo>
            </div>
            <div className="sec-row">
              <span className="k">Disponível para retirada</span>
              <Selo tom="sucesso">Conferido</Selo>
            </div>
            <div className="note">
              Todas as moedas exibidas nesta auditoria passaram por conferência física e vinculação
              documental.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

/**
 * 2.2 — Auditoria de estoque custodiado.
 *
 * Port de aurea-mvp-teste.html, linhas 2456-2525 (`renderAudit` + `exportAuditXlsx`).
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

import { fdate } from '@/domain/dates'
import { allCoinsFlat, coinStatusDigital, envioDateFor } from '@/domain/selectors'
import { useApp } from '@/components/providers/AppProvider'
import { useToast } from '@/components/ui/Toast'
import type { AuditRow } from '@/lib/xlsx/audit-export'

/** Quantas moedas o painel "Últimas moedas enviadas" mostra (slice(0,8) do original). */
const ULTIMAS = 8

/**
 * Classe da pill do status digital, exatamente com a precedência do original
 * (linha 2468): verde para 'Disponível', amarelo para 'Negociando' e neutro para
 * o resto — que hoje é só 'Alienado'.
 */
function pillDigital(status: string): string {
  if (status === 'Disponível') return 'pill g'
  if (status === 'Negociando') return 'pill y'
  return 'pill n'
}

export default function AuditoriaPage(): ReactNode {
  const { state } = useApp()
  const toast = useToast()

  // Inventário global do sistema, já ordenado por código do ativo crescente.
  const flat = allCoinsFlat(state)
  const totalCust = flat.length
  const recibosAtivos = flat.filter(({ coin }) => coin.nft.status === 'Ativo').length

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
      Codigo_Ativo: coin.id,
      Tipo_Moeda: coin.tipoMoeda,
      Data_Envio: envioDateFor(state, coin),
      Data_Avaliacao: coin.nft.dataEmissao,
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
      <Link href="/graficos" className="back-link">
        ‹ Voltar para mercado e auditoria
      </Link>

      <div className="cols-rev">
        <div>
          <div className="panel" style={{ marginBottom: 18 }}>
            <div className="field-lbl">Produto</div>
            {/* Seletor decorativo: o marketplace só tem um produto. Fica sem
                onChange de propósito — é exatamente o <select> inerte do
                original. O aria-label existe porque .field-lbl é uma <div> e não
                um <label>, então sem ele o campo não teria nome acessível. */}
            <select className="tinput" style={{ maxWidth: 300 }} aria-label="Produto">
              <option>Real Olímpico</option>
            </select>

            <div className="stats four" style={{ marginTop: 14 }}>
              <div className="stat">
                <div>
                  <div className="lbl">Total custodiado</div>
                  <div className="val">{totalCust}</div>
                </div>
              </div>
              <div className="stat">
                <div>
                  <div className="lbl">Recibos ativos</div>
                  <div className="val">{recibosAtivos}</div>
                </div>
              </div>
              <div className="stat">
                <div>
                  <div className="lbl">Retiradas em andamento</div>
                  {/* Zero fixo, como no MVP: a retirada física é o bloco 4.3 e
                      ainda não existe. */}
                  <div className="val">0</div>
                </div>
              </div>
              <div className="stat">
                <div>
                  <div className="lbl">Última auditoria</div>
                  {/* "Hoje", literalmente: o original também carimbava Date.now().
                      suppressHydrationWarning cobre a única divergência possível
                      entre servidor e cliente — a virada da meia-noite entre uma
                      pintura e outra. */}
                  <div className="val small" suppressHydrationWarning>
                    {fdate(Date.now())}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>
              <svg viewBox="0 0 24 24">
                <path d="M6 3h9l4 4v14H6z" />
                <path d="M9 11h7M9 15h7" />
              </svg>
              Últimas moedas enviadas
            </h3>

            {/* .table-scroll dá o rolamento horizontal no celular; a tabela
                mantém min-width:520px dentro dele (reports.css). */}
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Código do ativo</th>
                    <th>Tipo de moeda</th>
                    <th>Status físico</th>
                    <th>Status digital</th>
                    <th>Data de entrada</th>
                    <th>Recibo NFT</th>
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
                        <td>
                          <b>{coin.id}</b>
                        </td>
                        <td>{coin.tipoMoeda}</td>
                        <td>
                          <span className={coin.statusFisico === 'Recebido' ? 'pill y' : 'pill g'}>
                            {/* O `|| 'Armazenado'` é do original: protege registros
                                antigos que nasceram sem o campo. */}
                            {coin.statusFisico || 'Armazenado'}
                          </span>
                        </td>
                        <td>
                          <span className={pillDigital(digital)}>{digital}</span>
                        </td>
                        <td>{coin.entrada}</td>
                        <td>{coin.nft.codigo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <button
              className="btn btn-gold"
              type="button"
              style={{ marginTop: 16 }}
              onClick={() => void exportar()}
            >
              Exportar auditoria completa
            </button>

            <div className="note">
              <svg viewBox="0 0 24 24">
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
              <svg viewBox="0 0 24 24">
                <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Integridade da custódia
            </h3>
            {/* Os quatro selos são fixos no MVP — ainda não há conferência real
                por trás deles. Portados como estão. */}
            <div className="sec-row">
              <span className="k">Registro fotográfico</span>
              <span className="pill g">✓</span>
            </div>
            <div className="sec-row">
              <span className="k">Lacre interno</span>
              <span className="pill g">✓</span>
            </div>
            <div className="sec-row">
              <span className="k">Recibo emitido</span>
              <span className="pill g">✓</span>
            </div>
            <div className="sec-row">
              <span className="k">Disponível para retirada</span>
              <span className="pill g">✓</span>
            </div>
            <div className="note" style={{ marginTop: 12 }}>
              Todos os ativos exibidos nesta auditoria passaram por conferência física e vinculação
              documental.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

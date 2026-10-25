'use client'

/**
 * 3.3 EXTRATO DA CONTA — tela NOVA. Não há equivalente no monolito.
 *
 * NÃO CONFUNDIR COM A AUDITORIA (2.0). A auditoria é pública, cobre o estoque
 * de TODAS as contas e — por regra escrita na própria tela — não leva dado de
 * proprietário. Esta aqui é o oposto: uma conta só, a de quem está logado, com
 * dinheiro, contraparte e comissão à vista. São dois documentos com propósitos
 * diferentes, e é por isso que cada um tem seu exportador.
 *
 * CLIENT COMPONENT porque a lista precisa acompanhar o ciclo de sincronização
 * de 10s: uma venda casada em outra aba entra no extrato sozinha, sem recarga.
 *
 * O título ('Extrato da conta') é montado pela Topbar a partir da rota, como em
 * todas as telas deste port — ver a nota no topo de components/shell/Topbar.
 */

import Link from 'next/link'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { brl } from '@/domain/money'
import { statementTotals, userStatement } from '@/domain/statement'
import type { StatementKind } from '@/domain/statement'
import { useApp } from '@/components/providers/AppProvider'
import { useToast } from '@/components/ui/Toast'
import { EstadoVazio } from '@/components/ui/EstadoVazio'

/**
 * Filtros da tela. 'Tudo' primeiro porque é o padrão; os demais na mesma ordem
 * em que as linhas costumam aparecer na vida da conta.
 */
const FILTROS: ReadonlyArray<{ chave: 'Tudo' | StatementKind; rotulo: string }> = [
  { chave: 'Tudo', rotulo: 'Tudo' },
  { chave: 'Depósito', rotulo: 'Depósitos' },
  { chave: 'Saque', rotulo: 'Saques' },
  { chave: 'Compra', rotulo: 'Compras' },
  { chave: 'Venda', rotulo: 'Vendas' },
  { chave: 'Envio para custódia', rotulo: 'Envios' },
  { chave: 'Taxa de custódia', rotulo: 'Custódia' },
]

/** Texto da falha de exportação — o mesmo padrão dos outros exportadores. */
const FALHA_EXPORT = 'Não foi possível gerar o arquivo. Tente novamente.'

export default function ExtratoPage(): ReactNode {
  const { state, session, me } = useApp()
  const toast = useToast()

  const [filtro, setFiltro] = useState<'Tudo' | StatementKind>('Tudo')
  const [exportando, setExportando] = useState(false)

  // Ordem crescente (mais antigo primeiro) é a que o domínio devolve e a que o
  // arquivo exportado leva — extrato se soma de cima para baixo. A TELA inverte
  // porque quem abre quer ver primeiro o que acabou de acontecer.
  const linhas = userStatement(state, session)
  const totais = statementTotals(linhas)
  const visiveis = (filtro === 'Tudo' ? linhas : linhas.filter((l) => l.kind === filtro))
    .slice()
    .reverse()

  /**
   * Sufixo do nome do arquivo: o e-mail sem o domínio, limpo de tudo que não
   * seja letra, número, hífen ou underline. Sem essa limpeza, um e-mail com
   * ponto ou acento produziria um nome de arquivo que alguns sistemas recusam.
   */
  const sufixo = session.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '') || 'conta'

  async function exportar(formato: 'csv' | 'xlsx'): Promise<void> {
    // O extrato exportado leva SEMPRE tudo, nunca o filtro da tela: um arquivo
    // que parece completo mas traz só as compras é pior que nenhum arquivo.
    if (!linhas.length) {
      toast('Não há movimentações para exportar nesta conta ainda.')
      return
    }

    setExportando(true)
    try {
      // Import dinâmico: o SheetJS é grande e não pode pesar no carregamento de
      // uma tela que muita gente vai só olhar. O CSV vem no mesmo módulo porque
      // separá-los renderia dois pedaços para economizar poucas linhas.
      const mod = await import('@/lib/export/statement-export')
      if (formato === 'csv') {
        mod.exportStatementCsv(linhas, sufixo)
        toast(`Extrato exportado em CSV (${linhas.length} movimentação(ões)).`)
      } else {
        await mod.exportStatementXlsx(linhas, totais, sufixo)
        toast(`Extrato exportado em XLSX (${linhas.length} movimentação(ões)).`)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : FALHA_EXPORT)
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <Link href="/conta" className="back-link">
        ‹ Voltar para minha conta
      </Link>

      {/* Totais acima da tabela, como o "Money in / Money out" dos extratos de referência
          (BENCHMARK.md §1.5). Os mesmos quatro números de antes. */}
      <section className="kpis" aria-label="Resumo da conta">
        <div className="kpi">
          <div className="lbl">Saldo atual</div>
          <div className="val ouro">{brl(me.balance)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Total depositado</div>
          <div className="val">{brl(totais.depositado)}</div>
        </div>
        <div className="kpi">
          <div className="lbl">Comprado / vendido</div>
          <div className="val">
            {totais.compradoQtd} / {totais.vendidoQtd}
          </div>
        </div>
        <div className="kpi">
          <div className="lbl">Comissões pagas</div>
          <div className="val">{brl(totais.taxasPagas)}</div>
        </div>
      </section>

      <div className="panel">
        <div className="panel-cab">
          <h3>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 3h9l4 4v14H6z" />
              <path d="M9 11h7M9 15h7" />
            </svg>
            Movimentações da conta
          </h3>
          {/* Exportar fica no cabeçalho, à direita (Mercury "Export all"): é ação sobre a lista
              inteira, não sobre o filtro — a nota abaixo da tabela diz isso. */}
          <div className="acoes">
            <button type="button" className="btn btn-outline" disabled={exportando} onClick={() => void exportar('csv')}>
              Exportar CSV
            </button>
            <button type="button" className="btn btn-outline" disabled={exportando} onClick={() => void exportar('xlsx')}>
              Exportar planilha XLSX
            </button>
          </div>
        </div>

        <div className="chips extrato-filtros" role="group" aria-label="Filtrar movimentações por tipo">
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              type="button"
              className="chip"
              aria-pressed={filtro === f.chave}
              onClick={() => setFiltro(f.chave)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        {visiveis.length ? (
          <>
            <p className="contagem">
              {visiveis.length} movimentação(ões){filtro !== FILTROS[0].chave ? ' neste filtro' : ''}
            </p>
            {/* .tabela-fixa (shell.css): a data, que identifica a linha, fica parada enquanto as
                outras sete colunas rolam no celular. */}
            <div className="tabela-fixa" tabIndex={0} role="region" aria-label="Movimentações da conta (role para o lado no celular)">
              <table className="ro-tabela">
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Moeda</th>
                    <th scope="col">Descrição</th>
                    <th scope="col" className="num">
                      Qtd.
                    </th>
                    <th scope="col" className="num">
                      Valor unit.
                    </th>
                    <th scope="col" className="num">
                      Taxa
                    </th>
                    <th scope="col" className="num">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l, i) => (
                    // A chave junta data, tipo e posição: duas linhas podem
                    // compartilhar o instante (um casamento gera compra e venda no
                    // mesmo `Date.now()`), então a data sozinha não é única.
                    <tr key={`${l.date}-${l.kind}-${i}`}>
                      <th scope="row" className="nowrap">
                        {l.dateBR}
                      </th>
                      <td>{l.kind}</td>
                      <td>{l.tipoMoeda}</td>
                      <td>{l.descricao}</td>
                      <td className="num">{l.quantidade ?? '—'}</td>
                      <td className="num">{l.valorUnitario === null ? '—' : brl(l.valorUnitario)}</td>
                      <td className="num">{l.taxa === null ? '—' : brl(l.taxa)}</td>
                      {/* Verde entra, vermelho sai, cinza não mexeu no saldo. É a
                          leitura mais rápida possível de um extrato — e o sinal (+/−)
                          diz o mesmo sem depender da cor. */}
                      <td className={l.impacto > 0 ? 'num imp-pos' : l.impacto < 0 ? 'num imp-neg' : 'num imp-zero'}>
                        {l.impacto > 0 ? '+' : ''}
                        {brl(l.impacto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EstadoVazio
            titulo={linhas.length ? 'Nenhuma movimentação deste tipo nesta conta.' : 'Esta conta ainda não tem movimentações. Deposite, compre ou venda para o extrato começar.'}
            ilustracao="semItens"
            acao={
              linhas.length ? (
                <button type="button" className="btn btn-outline" onClick={() => setFiltro(FILTROS[0].chave)}>
                  Ver todas as movimentações
                </button>
              ) : null
            }
          />
        )}

        <div className="note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
          O arquivo exportado traz sempre o extrato completo, independentemente do filtro selecionado
          acima. A comissão de negociação é cobrada de quem compra e de quem vende, pelos valores da{' '}
          <Link href="/taxas">Tabela de Taxas</Link> vigente, e aparece na coluna Taxa das linhas de
          compra e de venda.
        </div>

        {/* Notas informativas sobre faturas de custódia e comissões vigentes. */}
        <div className="note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
          Cada fatura de custódia é uma linha, com o mês de referência, a quantidade de moedas e o
          valor. A fatura paga com o saldo da conta aparece como saída; a fatura em aberto, ou paga
          por Pix ou cartão, não mexe no saldo. Faturas e planos ficam em{' '}
          <Link href="/conta/faturas">Minha conta › Faturas de custódia</Link>.
        </div>
      </div>
    </>
  )
}

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

/**
 * Filtros da tela. 'Tudo' primeiro porque é o padrão; os demais na mesma ordem
 * em que as linhas costumam aparecer na vida da conta.
 */
const FILTROS: ReadonlyArray<{ chave: 'Tudo' | StatementKind; rotulo: string }> = [
  { chave: 'Tudo', rotulo: 'Tudo' },
  { chave: 'Depósito', rotulo: 'Depósitos' },
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

      <div className="stats four" style={{ margin: '14px 0 18px' }}>
        <div className="stat">
          <div>
            <div className="lbl">Saldo atual</div>
            <div className="val small">{brl(me.balance)}</div>
          </div>
        </div>
        <div className="stat">
          <div>
            <div className="lbl">Total depositado</div>
            <div className="val small">{brl(totais.depositado)}</div>
          </div>
        </div>
        <div className="stat">
          <div>
            <div className="lbl">Comprado / vendido</div>
            <div className="val small">
              {totais.compradoQtd} / {totais.vendidoQtd}
            </div>
          </div>
        </div>
        <div className="stat">
          <div>
            <div className="lbl">Comissões pagas</div>
            <div className="val small">{brl(totais.taxasPagas)}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>
          <svg viewBox="0 0 24 24">
            <path d="M6 3h9l4 4v14H6z" />
            <path d="M9 11h7M9 15h7" />
          </svg>
          Movimentações da conta
        </h3>

        <div className="filter-row" style={{ marginBottom: 14 }}>
          {FILTROS.map((f) => (
            <button
              key={f.chave}
              type="button"
              className={filtro === f.chave ? 'btn btn-gold' : 'btn btn-outline'}
              style={{ padding: '8px 14px', fontSize: 12.5, width: 'auto' }}
              onClick={() => setFiltro(f.chave)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        {visiveis.length ? (
          // .table-scroll (base.css) é o que faz a tabela rolar sozinha no
          // celular em vez de empurrar a página inteira para o lado.
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Moeda</th>
                  <th>Descrição</th>
                  <th>Qtd.</th>
                  <th>Valor unit.</th>
                  <th>Taxa</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l, i) => (
                  // A chave junta data, tipo e posição: duas linhas podem
                  // compartilhar o instante (um casamento gera compra e venda no
                  // mesmo `Date.now()`), então a data sozinha não é única.
                  <tr key={`${l.date}-${l.kind}-${i}`}>
                    <td>{l.dateBR}</td>
                    <td>{l.kind}</td>
                    <td>{l.tipoMoeda}</td>
                    <td>{l.descricao}</td>
                    <td>{l.quantidade ?? '—'}</td>
                    <td>{l.valorUnitario === null ? '—' : brl(l.valorUnitario)}</td>
                    <td>{l.taxa === null ? '—' : brl(l.taxa)}</td>
                    {/* Verde entra, vermelho sai, cinza não mexeu no saldo. É a
                        leitura mais rápida possível de um extrato. */}
                    <td
                      style={{
                        color:
                          l.impacto > 0
                            ? 'var(--green)'
                            : l.impacto < 0
                              ? 'var(--red)'
                              : 'var(--text-muted)',
                        fontWeight: l.impacto === 0 ? 400 : 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.impacto > 0 ? '+' : ''}
                      {brl(l.impacto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            {linhas.length
              ? 'Nenhuma movimentação deste tipo nesta conta.'
              : 'Esta conta ainda não tem movimentações. Deposite, compre ou venda para o extrato começar.'}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: 'auto' }}
            disabled={exportando}
            onClick={() => void exportar('csv')}
          >
            Exportar CSV
          </button>
          <button
            type="button"
            className="btn btn-gold"
            style={{ width: 'auto' }}
            disabled={exportando}
            onClick={() => void exportar('xlsx')}
          >
            Exportar planilha XLSX
          </button>
        </div>

        <div className="note" style={{ marginTop: 14 }}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
          O arquivo exportado traz sempre o extrato completo, independentemente do filtro
          selecionado acima. A comissão de 0,5% + R$ 1,00 por moeda é retida do vendedor, por isso
          só aparece nas linhas de venda.
        </div>

        {/* Duas limitações reais do MVP, escritas onde importam. Sem elas, o
            extrato parece incompleto ou errado a quem for conferir. */}
        <div className="note" style={{ marginTop: 8 }}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
          Neste ambiente de teste, a taxa de custódia é registrada mas não é debitada do saldo, e a
          plataforma guarda apenas a cobrança vigente — não há histórico de cobranças anteriores. O
          saldo inicial da conta de demonstração também não aparece como depósito.
        </div>
      </div>
    </>
  )
}

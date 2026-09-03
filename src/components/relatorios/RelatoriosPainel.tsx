'use client'

/**
 * O painel de relatórios — a única tela que fala de dinheiro da EMPRESA, e
 * não da conta de quem está logado (módulos M4 e M7).
 *
 * COMO OS DADOS CHEGAM
 * --------------------
 * Nada aqui vem do AppProvider: ledger, DRE e trilha não vivem no AppState.
 * Cada aba busca o próprio relatório em `/api/relatorios/<nome>` (JSON), com
 * o período escolhido no topo; a mesma URL com `.csv` ou `.xlsx` é o que os
 * botões de exportação abrem. Tela e arquivo mostram exatamente a mesma
 * tabela porque são a mesma função no servidor.
 *
 * COMO OS DADOS SAEM
 * ------------------
 * Pelas Server Actions de `@/server/actions/contabil`, via `run()` do
 * AppProvider — que mostra o toast e relê o estado. Depois de cada escrita a
 * aba é recarregada, porque o que mudou está no banco, não no AppState.
 *
 * Estilo: só classes do monolito (.panel, .stats, .audit-table, .btn, .tinput,
 * .pill, .note, .chart-tab) e estilo inline pontual. Nenhuma folha nova.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { CATALOGO_PARAMETROS, PLANO_DE_CONTAS } from '@/domain/dre'
import { brl, parsePrice } from '@/domain/money'
import { useApp } from '@/components/providers/AppProvider'
import { useToast } from '@/components/ui/Toast'
import {
  definirParametroContabil,
  estornarLancamentoManual,
  registrarLancamentoManual,
  sincronizarGoogleSheets,
  verificarIntegridadeLedger,
} from '@/server/actions/contabil'

/* ---------- tipos espelhados da API (o servidor é a fonte; aqui só a forma) ---------- */

type Celula = string | number | boolean | null

interface Relatorio {
  nome: string
  titulo: string
  geradoEm: number
  periodo: string | null
  colunas: string[]
  linhas: Array<Record<string, Celula>>
  observacoes: string[]
}

type Aba = 'dre' | 'analise' | 'ledger' | 'auditoria' | 'extratos' | 'lancamentos' | 'parametros' | 'integracao'

const ABAS: ReadonlyArray<{ chave: Aba; rotulo: string; relatorio: string }> = [
  { chave: 'dre', rotulo: 'DRE', relatorio: 'dre' },
  { chave: 'analise', rotulo: 'Análise', relatorio: 'analise' },
  { chave: 'ledger', rotulo: 'Livro-razão', relatorio: 'ledger' },
  { chave: 'auditoria', rotulo: 'Auditoria', relatorio: 'auditoria' },
  { chave: 'extratos', rotulo: 'Extratos', relatorio: 'extratos' },
  { chave: 'lancamentos', rotulo: 'Lançamentos', relatorio: 'lancamentos-manuais' },
  { chave: 'parametros', rotulo: 'Alíquotas', relatorio: 'parametros' },
  { chave: 'integracao', rotulo: 'Integração', relatorio: 'exportacoes' },
]

/** Colunas que carregam dinheiro em reais: formatadas como BRL na tela. */
const COLUNA_MONETARIA = /valor|saldo|preco|comissao|taxa|impacto|variacao|volume|receita|bruto|anual|mercado|estimado/i

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

interface Props {
  semBanco: boolean
  sheetsFaltando: string[]
  tokenConfigurado: boolean
}

export function RelatoriosPainel({ semBanco, sheetsFaltando, tokenConfigurado }: Props): ReactNode {
  const { run } = useApp()
  const toast = useToast()

  const hoje = new Date()
  const [ano, setAno] = useState(String(hoje.getFullYear()))
  const [mes, setMes] = useState('')
  const [trimestre, setTrimestre] = useState('')
  const [recortar, setRecortar] = useState(false)
  const [aba, setAba] = useState<Aba>('dre')

  const [relatorio, setRelatorio] = useState<Relatorio | null>(null)
  const [dre, setDre] = useState<Relatorio | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [versao, setVersao] = useState(0)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (ano) p.set('ano', ano)
    if (mes) p.set('mes', mes)
    else if (trimestre) p.set('trimestre', trimestre)
    if (recortar) p.set('recortar', '1')
    return p.toString()
  }, [ano, mes, trimestre, recortar])

  const nomeRelatorio = ABAS.find((a) => a.chave === aba)?.relatorio ?? 'dre'

  const buscar = useCallback(async (nome: string): Promise<Relatorio | null> => {
    const r = await fetch(`/api/relatorios/${nome}?${query}`, { cache: 'no-store' })
    if (!r.ok) return null
    return (await r.json()) as Relatorio
  }, [query])

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    void (async () => {
      try {
        const [atual, cabecalho] = await Promise.all([buscar(nomeRelatorio), nomeRelatorio === 'dre' ? null : buscar('dre')])
        if (!vivo) return
        setRelatorio(atual)
        setDre(nomeRelatorio === 'dre' ? atual : cabecalho)
      } catch {
        if (vivo) toast('Não foi possível carregar o relatório.')
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [buscar, nomeRelatorio, versao, toast])

  const recarregar = (): void => setVersao((v) => v + 1)

  /* ---- indicadores do topo, lidos da DRE ---- */
  const valorDre = (codigo: string): number | null => {
    const l = dre?.linhas.find((x) => x.Codigo === codigo)
    return l && typeof l.Valor === 'number' ? l.Valor : null
  }
  const receitaBruta = valorDre('3')
  const resultado = valorDre('9')
  const negociacoes = dre?.linhas.find((x) => x.Codigo === '3.1.01')?.Observacao ?? ''
  const pendencias = (dre?.observacoes ?? []).filter((o) => /não configurad|ajuste|conta desconhecida/i.test(o))

  const exportar = (nome: string, formato: 'csv' | 'xlsx'): void => {
    window.location.assign(`/api/relatorios/${nome}.${formato}?${query}`)
  }

  return (
    <>
      {semBanco ? (
        <div className="note" style={{ marginBottom: 14 }}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
          Este ambiente está sem POSTGRES_URL: o estado vem da memória e não há ledger, trilha nem
          lançamentos. Os relatórios de estoque, contas e negociações funcionam; os contábeis ficam
          vazios até o banco entrar.
        </div>
      ) : null}

      {/* ---------- período ---------- */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="filter-row" style={{ gap: 10, alignItems: 'flex-end' }}>
          <div className="field" style={{ marginBottom: 0, width: 110 }}>
            <label htmlFor="rel-ano">Ano</label>
            <input id="rel-ano" className="tinput" inputMode="numeric" value={ano} onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>
          <div className="field" style={{ marginBottom: 0, width: 170 }}>
            <label htmlFor="rel-mes">Mês</label>
            <select id="rel-mes" className="tinput" value={mes} onChange={(e) => { setMes(e.target.value); if (e.target.value) setTrimestre('') }}>
              <option value="">Ano inteiro</option>
              {MESES.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, width: 160 }}>
            <label htmlFor="rel-tri">Trimestre</label>
            <select id="rel-tri" className="tinput" value={trimestre} disabled={mes !== ''} onChange={(e) => setTrimestre(e.target.value)}>
              <option value="">—</option>
              <option value="1">1º trimestre</option>
              <option value="2">2º trimestre</option>
              <option value="3">3º trimestre</option>
              <option value="4">4º trimestre</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, fontSize: 13 }}>
            <input type="checkbox" checked={recortar} onChange={(e) => setRecortar(e.target.checked)} />
            Recortar livro, auditoria e extratos pelo período
          </label>
        </div>
      </div>

      {/* ---------- indicadores ---------- */}
      <div className="stats four" style={{ marginBottom: 18 }}>
        <Indicador rotulo="Receita bruta" valor={receitaBruta === null ? '—' : brl(Math.round(receitaBruta * 100))} />
        <Indicador rotulo="Resultado líquido" valor={resultado === null ? '—' : brl(Math.round(resultado * 100))} />
        <Indicador rotulo="Negociações" valor={negociacoes ? String(negociacoes).replace(/ negociaç.*$/, '') : '—'} />
        <Indicador rotulo="Período" valor={dre?.periodo ?? '—'} pequeno />
      </div>

      {/* ---------- abas ---------- */}
      <div className="panel">
        <div className="chart-tabs" role="tablist">
          {ABAS.map((a) => (
            <button
              key={a.chave}
              type="button"
              role="tab"
              aria-selected={aba === a.chave}
              className={aba === a.chave ? 'chart-tab on' : 'chart-tab'}
              style={{ minHeight: 44, background: aba === a.chave ? undefined : 'transparent' }}
              onClick={() => setAba(a.chave)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {pendencias.length && aba === 'dre' ? (
          <div className="note" style={{ marginBottom: 12 }}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.5" />
            </svg>
            <span>
              <b>Pendências do contador:</b> {pendencias.join(' · ')}
            </span>
          </div>
        ) : null}

        {carregando && !relatorio ? <div className="empty">Carregando…</div> : null}

        {relatorio && aba === 'dre' ? <TabelaDre r={relatorio} /> : null}
        {relatorio && (aba === 'analise' || aba === 'ledger' || aba === 'auditoria' || aba === 'extratos') ? (
          <TabelaGenerica r={relatorio} limite={300} />
        ) : null}
        {relatorio && aba === 'lancamentos' ? (
          <Lancamentos r={relatorio} aoMudar={recarregar} />
        ) : null}
        {relatorio && aba === 'parametros' ? <Parametros r={relatorio} aoMudar={recarregar} /> : null}
        {relatorio && aba === 'integracao' ? (
          <Integracao
            r={relatorio}
            query={query}
            sheetsFaltando={sheetsFaltando}
            tokenConfigurado={tokenConfigurado}
            aoMudar={recarregar}
          />
        ) : null}

        {relatorio && relatorio.observacoes.length ? (
          <div className="note" style={{ marginTop: 12 }}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16.5v.5" />
            </svg>
            <span>{relatorio.observacoes.join(' · ')}</span>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" style={{ width: 'auto' }} onClick={() => exportar(nomeRelatorio, 'csv')}>
            Exportar CSV
          </button>
          <button type="button" className="btn btn-outline" style={{ width: 'auto' }} onClick={() => exportar(nomeRelatorio, 'xlsx')}>
            Exportar XLSX
          </button>
          <button type="button" className="btn btn-gold" style={{ width: 'auto' }} onClick={() => exportar('tudo', 'xlsx')}>
            Pasta completa (todas as abas)
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: 'auto' }}
            onClick={() => void run(() => verificarIntegridadeLedger())}
          >
            Verificar integridade do ledger
          </button>
        </div>
      </div>
    </>
  )
}

/* ---------- peças ---------- */

function Indicador({ rotulo, valor, pequeno }: { rotulo: string; valor: string; pequeno?: boolean }): ReactNode {
  return (
    <div className="stat">
      <div>
        <div className="lbl">{rotulo}</div>
        <div className={pequeno ? 'val small' : 'val small'} style={pequeno ? { fontSize: 14 } : undefined}>
          {valor}
        </div>
      </div>
    </div>
  )
}

function formatarCelula(coluna: string, v: Celula): string {
  if (v === null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  if (typeof v === 'number') {
    if (COLUNA_MONETARIA.test(coluna)) return brl(Math.round(v * 100))
    return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')
  }
  return v
}

function TabelaDre({ r }: { r: Relatorio }): ReactNode {
  return (
    <div className="table-scroll">
      <table className="audit-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th style={{ textAlign: 'right' }}>Valor</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {r.linhas.map((l, i) => {
            const nivel = Number(l.Nivel ?? 2)
            const valor = typeof l.Valor === 'number' ? l.Valor : 0
            return (
              <tr key={`${String(l.Codigo)}-${i}`} style={nivel === 0 ? { fontWeight: 700 } : undefined}>
                <td>{String(l.Codigo)}</td>
                <td style={{ paddingLeft: 10 + nivel * 16, color: nivel === 0 ? 'var(--text-strong)' : undefined }}>
                  {String(l.Descricao).trim()}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: valor < 0 ? 'var(--red)' : nivel === 0 ? 'var(--text-strong)' : undefined }}>
                  {brl(Math.round(valor * 100))}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{String(l.Observacao ?? '')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TabelaGenerica({ r, limite }: { r: Relatorio; limite: number }): ReactNode {
  const [filtro, setFiltro] = useState('')
  const f = filtro.trim().toLowerCase()
  const linhas = f
    ? r.linhas.filter((l) => r.colunas.some((c) => String(l[c] ?? '').toLowerCase().includes(f)))
    : r.linhas
  const visiveis = linhas.slice(0, limite)
  if (!r.linhas.length) return <div className="empty">Nenhuma linha neste período.</div>
  return (
    <>
      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor={`filtro-${r.nome}`}>Filtrar</label>
        <input id={`filtro-${r.nome}`} className="tinput" placeholder="conta, tipo, descrição…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </div>
      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              {r.colunas.filter((c) => c !== 'Hash' && c !== 'Detalhes').map((c) => (
                <th key={c}>{c.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l, i) => (
              <tr key={i}>
                {r.colunas.filter((c) => c !== 'Hash' && c !== 'Detalhes').map((c) => (
                  <td key={c} style={typeof l[c] === 'number' ? { whiteSpace: 'nowrap', textAlign: 'right' } : undefined}>
                    {formatarCelula(c, l[c] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {linhas.length > limite ? (
        <div className="note">Mostrando {limite} de {linhas.length} linhas. O arquivo exportado leva todas.</div>
      ) : null}
    </>
  )
}

/* ---------- lançamentos manuais ---------- */

function Lancamentos({ r, aoMudar }: { r: Relatorio; aoMudar: () => void }): ReactNode {
  const { run } = useApp()
  const contas = PLANO_DE_CONTAS.filter((c) => !c.automatica)
  const hojeISO = new Date().toISOString().slice(0, 10)
  const [data, setData] = useState(hojeISO)
  const [conta, setConta] = useState(contas[0]?.codigo ?? '')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [estornando, setEstornando] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')

  async function salvar(): Promise<void> {
    setSalvando(true)
    const res = await run(() => registrarLancamentoManual(data, conta, descricao, parsePrice(valor)))
    setSalvando(false)
    if (res.ok) {
      setDescricao('')
      setValor('')
      aoMudar()
    }
  }

  async function estornar(id: number): Promise<void> {
    setSalvando(true)
    const res = await run(() => estornarLancamentoManual(id, motivo))
    setSalvando(false)
    if (res.ok) {
      setEstornando(null)
      setMotivo('')
      aoMudar()
    }
  }

  return (
    <>
      <div className="note" style={{ marginBottom: 12 }}>
        Despesas e receitas que não passam pela plataforma (aluguel, pessoal, seguro do acervo) entram
        aqui e vão direto para a DRE. Nada é apagado: o erro se corrige com estorno.
      </div>
      <div className="filter-row" style={{ gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
        <div className="field" style={{ marginBottom: 0, width: 160 }}>
          <label htmlFor="lan-data">Data</label>
          <input id="lan-data" type="date" className="tinput" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 260 }}>
          <label htmlFor="lan-conta">Conta</label>
          <select id="lan-conta" className="tinput" value={conta} onChange={(e) => setConta(e.target.value)}>
            {contas.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} · {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
          <label htmlFor="lan-desc">Descrição</label>
          <input id="lan-desc" className="tinput" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="ex.: aluguel do cofre — setembro" />
        </div>
        <div className="field" style={{ marginBottom: 0, width: 140 }}>
          <label htmlFor="lan-valor">Valor (R$)</label>
          <input id="lan-valor" className="tinput" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="1.500,00" />
        </div>
        <button type="button" className="btn btn-gold" style={{ width: 'auto' }} disabled={salvando} onClick={() => void salvar()}>
          Lançar
        </button>
      </div>

      {r.linhas.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Data</th>
                <th>Conta</th>
                <th>Descrição</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th>Por</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {r.linhas.map((l) => {
                const id = Number(l.Id)
                const situacao = String(l.Situacao)
                return (
                  <tr key={id} style={situacao !== 'vigente' ? { opacity: 0.6 } : undefined}>
                    <td>{id}</td>
                    <td>{String(l.Data)}</td>
                    <td>{String(l.Conta_Codigo)}</td>
                    <td>{String(l.Descricao)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{brl(Math.round(Number(l.Valor) * 100))}</td>
                    <td>{String(l.Criado_Por)}</td>
                    <td>
                      <span className={situacao === 'vigente' ? 'pill g' : 'pill n'}>{situacao}</span>
                    </td>
                    <td>
                      {situacao === 'vigente' ? (
                        estornando === id ? (
                          <span style={{ display: 'inline-flex', gap: 6 }}>
                            <input className="tinput" style={{ width: 180 }} placeholder="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                            <button type="button" className="btn btn-outline" style={{ width: 'auto', padding: '6px 12px' }} disabled={salvando} onClick={() => void estornar(id)}>
                              Confirmar
                            </button>
                            <button type="button" className="btn btn-outline" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => setEstornando(null)}>
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button type="button" className="btn btn-outline" style={{ width: 'auto', padding: '6px 12px' }} onClick={() => setEstornando(id)}>
                            Estornar
                          </button>
                        )
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nenhum lançamento manual ainda.</div>
      )}
    </>
  )
}

/* ---------- alíquotas ---------- */

function Parametros({ r, aoMudar }: { r: Relatorio; aoMudar: () => void }): ReactNode {
  const { run } = useApp()
  const [edicao, setEdicao] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<string | null>(null)

  const atual = (chave: string): { valor: number | null; legivel: string; por: string; em: string } => {
    const l = r.linhas.find((x) => x.Chave === chave)
    return {
      valor: l && typeof l.Valor === 'number' ? l.Valor : null,
      legivel: l ? String(l.Valor_Legivel) : 'não configurado',
      por: l ? String(l.Atualizado_Por ?? '') : '',
      em: l ? String(l.Atualizado_Em ?? '') : '',
    }
  }

  async function salvar(chave: string, unidade: 'bp' | 'centavos', limpar: boolean): Promise<void> {
    let valor: number | null = null
    if (!limpar) {
      const texto = (edicao[chave] ?? '').trim()
      if (unidade === 'bp') {
        // "32" ou "0,65" em percentual -> pontos-base inteiros
        const pct = parseFloat(texto.replace(',', '.'))
        valor = Number.isFinite(pct) ? Math.round(pct * 100) : Number.NaN
      } else {
        valor = parsePrice(texto)
      }
      if (!Number.isFinite(valor) || valor < 0) {
        valor = -1 // o servidor recusa com a mensagem certa
      }
    }
    setSalvando(chave)
    const res = await run(() => definirParametroContabil(chave, valor))
    setSalvando(null)
    if (res.ok) {
      setEdicao((e) => ({ ...e, [chave]: '' }))
      aoMudar()
    }
  }

  return (
    <>
      <div className="note" style={{ marginBottom: 12 }}>
        Nenhuma alíquota entra fixa no código. O que estiver vazio zera a linha correspondente da DRE
        e aparece como pendência. Percentual em por cento (32 ou 0,65); limites em reais.
      </div>
      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Parâmetro</th>
              <th>Valor atual</th>
              <th>Novo valor</th>
              <th />
              <th>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {CATALOGO_PARAMETROS.map((p) => {
              const a = atual(p.chave)
              return (
                <tr key={p.chave}>
                  <td>
                    <b>{p.rotulo}</b>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.descricao}</div>
                  </td>
                  <td>
                    <span className={a.valor === null ? 'pill y' : 'pill g'}>{a.legivel}</span>
                  </td>
                  <td>
                    <input
                      className="tinput"
                      style={{ width: 120 }}
                      inputMode="decimal"
                      placeholder={p.unidade === 'bp' ? '%' : 'R$'}
                      value={edicao[p.chave] ?? ''}
                      onChange={(e) => setEdicao((x) => ({ ...x, [p.chave]: e.target.value }))}
                    />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-gold" style={{ width: 'auto', padding: '6px 12px', marginRight: 6 }} disabled={salvando === p.chave} onClick={() => void salvar(p.chave, p.unidade, false)}>
                      Salvar
                    </button>
                    {a.valor !== null ? (
                      <button type="button" className="btn btn-outline" style={{ width: 'auto', padding: '6px 12px' }} disabled={salvando === p.chave} onClick={() => void salvar(p.chave, p.unidade, true)}>
                        Limpar
                      </button>
                    ) : null}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {a.em ? `${a.em} · ${a.por}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ---------- integração ---------- */

function Integracao({
  r,
  query,
  sheetsFaltando,
  tokenConfigurado,
  aoMudar,
}: {
  r: Relatorio
  query: string
  sheetsFaltando: string[]
  tokenConfigurado: boolean
  aoMudar: () => void
}): ReactNode {
  const { run } = useApp()
  const [origem, setOrigem] = useState('')
  const [enviando, setEnviando] = useState(false)
  useEffect(() => setOrigem(window.location.origin), [])

  const params = new URLSearchParams(query)
  async function enviar(): Promise<void> {
    setEnviando(true)
    const res = await run(() =>
      sincronizarGoogleSheets({ ano: params.get('ano'), mes: params.get('mes'), trimestre: params.get('trimestre') }),
    )
    setEnviando(false)
    if (res.ok) aoMudar()
  }

  const exemplo = `${origem || 'https://SEU-DOMINIO'}/api/relatorios/dre.csv?${query}${tokenConfigurado ? '&token=SEU_TOKEN' : ''}`

  return (
    <>
      <div className="sec-row">
        <span className="k">Google Sheets (push pela conta de serviço)</span>
        <span className={sheetsFaltando.length ? 'pill y' : 'pill g'}>
          {sheetsFaltando.length ? `faltam: ${sheetsFaltando.join(', ')}` : 'configurado'}
        </span>
      </div>
      <div className="sec-row">
        <span className="k">Token de integração (leitura por URL, Sheets e Excel)</span>
        <span className={tokenConfigurado ? 'pill g' : 'pill y'}>{tokenConfigurado ? 'configurado' : 'AUREA_RELATORIOS_TOKEN ausente'}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, margin: '14px 0', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-gold" style={{ width: 'auto' }} disabled={enviando || sheetsFaltando.length > 0} onClick={() => void enviar()}>
          Enviar ao Google Sheets agora
        </button>
      </div>

      <div className="note" style={{ display: 'block' }}>
        <b>Sem conta de serviço, o Sheets pode puxar sozinho.</b> Numa célula:
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '8px 0 0', fontSize: 12 }}>
          {`=IMPORTDATA("${exemplo}")`}
        </pre>
        Troque <code>dre</code> por <code>ledger</code>, <code>analise</code>, <code>negociacoes</code>,
        <code>extratos</code>, <code>estoque</code>, <code>contas</code>, <code>custodia</code> ou
        <code>auditoria</code>. No Excel: Dados → Da Web, com a mesma URL. O passo a passo está em
        <code> docs/INTEGRACAO_GOOGLE_SHEETS.md</code>.
      </div>

      <h3 style={{ marginTop: 18 }}>Registro de exportações</h3>
      <TabelaGenerica r={r} limite={100} />
    </>
  )
}

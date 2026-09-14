'use client'

/**
 * A aba Contábil da Central de Resultados: lançamentos manuais (criar e estornar),
 * alíquotas com o aviso de quais ainda estão nulas, plano de contas e o registro de
 * exportações com o envio ao Google Sheets (plano do Admin, seção 1.6).
 *
 * É o conteúdo das abas Análise, Lançamentos, Alíquotas e Integração da antiga tela
 * `/relatorios`, reorganizado — agora com a permissão do papel na frente de cada gesto:
 *  - lançar e estornar: `contabil.lancar`;
 *  - alíquota: `contabil.parametros`;
 *  - enviar ao Google Sheets: `resultados.exportar`.
 * Sem a permissão, o controle não aparece e a tabela fica só de leitura. A Server Action
 * confere de novo — é ela quem recusa de verdade.
 *
 * A aba escolhida mora na URL (`?aba=`), junto do período, para o link que se manda ao
 * contador abrir no lugar certo.
 */

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type { PeriodoEscolhido } from '@/domain/admin/periodo'
import { CATALOGO_PARAMETROS, type ContaContabil } from '@/domain/dre'
import { parsePrice } from '@/domain/money'
import type { LancamentoManualGravado, ParametroGravado, RegistroExportacao } from '@/server/db/repositories/contabil'
import {
  definirAliquotaNoPainel,
  enviarAoSheetsNoPainel,
  estornarManualNoPainel,
  lancarManualNoPainel,
} from '@/server/actions/admin/contabil'

import { useAdmin } from '../AdminProvider'
import { SeletorPeriodo } from '../SeletorPeriodo'
import { data, dataHora, dinheiro, numero } from '../formatos'

export type AbaContabil = 'lancamentos' | 'aliquotas' | 'contas' | 'exportacoes'

const ABAS: ReadonlyArray<{ chave: AbaContabil; rotulo: string }> = [
  { chave: 'lancamentos', rotulo: 'Lançamentos manuais' },
  { chave: 'aliquotas', rotulo: 'Alíquotas' },
  { chave: 'contas', rotulo: 'Plano de contas' },
  { chave: 'exportacoes', rotulo: 'Exportações e integração' },
]

const NATUREZA: Record<string, string> = { receita: 'Receita', deducao: 'Dedução', despesa: 'Despesa', imposto: 'Imposto' }

export interface PropsContabil {
  aba: AbaContabil
  periodo: PeriodoEscolhido
  semBanco: boolean
  contas: ContaContabil[]
  parametros: ParametroGravado[]
  lancamentos: LancamentoManualGravado[]
  exportacoes: Array<RegistroExportacao & { id: number }>
  sheetsFaltando: string[]
  tokenConfigurado: boolean
}

export function Contabil(props: PropsContabil): ReactNode {
  const router = useRouter()
  const pathname = usePathname()

  function irPara(aba: AbaContabil): void {
    const q = new URLSearchParams({ aba, ano: props.periodo.consulta.ano })
    if (props.periodo.consulta.mes) q.set('mes', props.periodo.consulta.mes)
    else if (props.periodo.consulta.trimestre) q.set('trimestre', props.periodo.consulta.trimestre)
    router.push(`${pathname}?${q.toString()}`)
  }

  return (
    <>
      {props.semBanco ? (
        <div className="note adm-secao">
          <span>
            Este ambiente está sem <code>POSTGRES_URL</code>: não há lançamentos, alíquotas nem registro de exportações. O
            plano de contas abaixo é o do código.
          </span>
        </div>
      ) : null}

      <div className="panel">
        <div className="adm-abas" role="tablist" aria-label="Seções do contábil">
          {ABAS.map((a) => (
            <button
              key={a.chave}
              type="button"
              role="tab"
              aria-selected={props.aba === a.chave}
              className={props.aba === a.chave ? 'chart-tab on' : 'chart-tab'}
              onClick={() => irPara(a.chave)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {props.aba === 'lancamentos' ? <Lancamentos contas={props.contas} lancamentos={props.lancamentos} /> : null}
        {props.aba === 'aliquotas' ? <Aliquotas parametros={props.parametros} semBanco={props.semBanco} /> : null}
        {props.aba === 'contas' ? <PlanoDeContas contas={props.contas} /> : null}
        {props.aba === 'exportacoes' ? <Exportacoes {...props} /> : null}
      </div>
    </>
  )
}

/* ---------- lançamentos manuais ---------- */

function Lancamentos({ contas, lancamentos }: { contas: ContaContabil[]; lancamentos: LancamentoManualGravado[] }): ReactNode {
  const { run, pode } = useAdmin()
  const manuais = contas.filter((c) => !c.automatica)
  const [dataISO, setDataISO] = useState('')
  const [conta, setConta] = useState(manuais[0]?.codigo ?? '')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [estornando, setEstornando] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')

  // A data de hoje só é preenchida no navegador: no servidor ela seria a de UTC.
  useEffect(() => {
    const hoje = new Date()
    setDataISO(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`)
  }, [])

  const estornados = new Set(lancamentos.filter((l) => l.estornaId !== null).map((l) => l.estornaId))
  const podeLancar = pode('contabil.lancar')

  async function lancar(): Promise<void> {
    setOcupado(true)
    const r = await run(() => lancarManualNoPainel(dataISO, conta, descricao, parsePrice(valor)))
    setOcupado(false)
    if (r.ok) {
      setDescricao('')
      setValor('')
    }
  }

  async function estornar(id: number): Promise<void> {
    setOcupado(true)
    const r = await run(() => estornarManualNoPainel(id, motivo))
    setOcupado(false)
    if (r.ok) {
      setEstornando(null)
      setMotivo('')
    }
  }

  return (
    <>
      <p className="adm-fraco adm-secao">
        Despesas e receitas que não passam pela plataforma — aluguel, pessoal, seguro do acervo — entram aqui e vão direto
        para a DRE. Nada é apagado: o erro se corrige com estorno.
      </p>

      {podeLancar ? (
        <div className="adm-form">
          <div className="field">
            <label htmlFor="lan-data">Data</label>
            <input id="lan-data" type="date" className="tinput" value={dataISO} onChange={(e) => setDataISO(e.target.value)} />
          </div>
          <div className="field adm-campo-largo">
            <label htmlFor="lan-conta">Conta</label>
            <select id="lan-conta" className="tinput" value={conta} onChange={(e) => setConta(e.target.value)}>
              {manuais.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.codigo} · {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="field adm-campo-largo">
            <label htmlFor="lan-desc">Descrição</label>
            <input id="lan-desc" className="tinput" value={descricao} maxLength={200} onChange={(e) => setDescricao(e.target.value)} placeholder="ex.: aluguel do cofre — setembro" />
          </div>
          <div className="field">
            <label htmlFor="lan-valor">Valor (R$)</label>
            <input id="lan-valor" className="tinput" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="1.500,00" />
          </div>
          <button type="button" className="btn btn-gold adm-btn-compacto" disabled={ocupado} onClick={() => void lancar()} data-uso="contabil:lancar">
            Lançar
          </button>
        </div>
      ) : (
        <p className="adm-fraco adm-secao">Seu papel vê os lançamentos, mas não lança nem estorna.</p>
      )}

      {lancamentos.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Conta</th>
                <th>Descrição</th>
                <th className="adm-num">Valor</th>
                <th>Por</th>
                <th>Situação</th>
                {podeLancar ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => {
                const situacao = l.estornaId !== null ? 'estorno' : estornados.has(l.id) ? 'estornado' : 'vigente'
                return (
                  <tr key={l.id} style={situacao !== 'vigente' ? { opacity: 0.65 } : undefined}>
                    <td>{l.id}</td>
                    <td>{data(l.data)}</td>
                    <td>{l.contaCodigo}</td>
                    <td>{l.descricao}</td>
                    <td className="adm-num">{dinheiro(l.valor)}</td>
                    <td className="adm-fraco">{l.criadoPor}</td>
                    <td>
                      <span className={situacao === 'vigente' ? 'pill g' : 'pill n'}>{situacao}</span>
                    </td>
                    {podeLancar ? (
                      <td>
                        {situacao === 'vigente' ? (
                          estornando === l.id ? (
                            <span className="adm-acoes">
                              <input className="tinput" style={{ width: 180, minHeight: 44, marginBottom: 0 }} placeholder="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo do estorno" />
                              <button type="button" className="btn btn-outline adm-btn-compacto" disabled={ocupado} onClick={() => void estornar(l.id)}>
                                Confirmar estorno
                              </button>
                              <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setEstornando(null)}>
                                Voltar
                              </button>
                            </span>
                          ) : (
                            <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setEstornando(l.id)}>
                              Estornar
                            </button>
                          )
                        ) : null}
                      </td>
                    ) : null}
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

function legivel(p: ParametroGravado): string {
  if (p.valor === null) return 'não configurado'
  return p.unidade === 'bp' ? `${(p.valor / 100).toLocaleString('pt-BR')}%` : dinheiro(p.valor)
}

function Aliquotas({ parametros, semBanco }: { parametros: ParametroGravado[]; semBanco: boolean }): ReactNode {
  const { run, pode } = useAdmin()
  const [edicao, setEdicao] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const podeEditar = pode('contabil.parametros')
  const porChave = new Map(parametros.map((p) => [p.chave, p]))
  const nulos = CATALOGO_PARAMETROS.filter((c) => (porChave.get(c.chave)?.valor ?? null) === null)

  async function salvar(chave: string, unidade: 'bp' | 'centavos', limpar: boolean): Promise<void> {
    let valor: number | null = null
    if (!limpar) {
      const texto = (edicao[chave] ?? '').trim()
      // "32" ou "0,65" em percentual vira pontos-base inteiros; limite em reais vira centavos.
      valor = unidade === 'bp' ? Math.round(parseFloat(texto.replace(',', '.')) * 100) : parsePrice(texto)
      if (!Number.isFinite(valor)) valor = -1 // o servidor recusa com a mensagem certa
    }
    setSalvando(chave)
    const r = await run(() => definirAliquotaNoPainel(chave, valor))
    setSalvando(null)
    if (r.ok) setEdicao((e) => ({ ...e, [chave]: '' }))
  }

  return (
    <>
      {!semBanco && nulos.length ? (
        <div className="note adm-secao">
          <span>
            <b>{nulos.length} de {CATALOGO_PARAMETROS.length} alíquotas ainda estão nulas</b> — {nulos.map((n) => n.rotulo).join(', ')}. A
            DRE zera essas linhas e declara a pendência até o contador preencher.
          </span>
        </div>
      ) : null}
      <p className="adm-fraco adm-secao">
        Nenhuma alíquota entra fixa no código. Percentual em por cento (32 ou 0,65); limite em reais.
      </p>
      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Parâmetro</th>
              <th>Valor atual</th>
              {podeEditar ? <th>Novo valor</th> : null}
              <th>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {CATALOGO_PARAMETROS.map((c) => {
              const p = porChave.get(c.chave)
              return (
                <tr key={c.chave}>
                  <td>
                    <b>{c.rotulo}</b>
                    <div className="adm-fraco">{c.descricao}</div>
                  </td>
                  <td>
                    <span className={p?.valor === null || !p ? 'pill y' : 'pill g'}>{p ? legivel(p) : 'não configurado'}</span>
                  </td>
                  {podeEditar ? (
                    <td>
                      <span className="adm-acoes">
                        <input
                          className="tinput"
                          style={{ width: 110, minHeight: 44, marginBottom: 0 }}
                          inputMode="decimal"
                          placeholder={c.unidade === 'bp' ? '%' : 'R$'}
                          aria-label={`Novo valor de ${c.rotulo}`}
                          value={edicao[c.chave] ?? ''}
                          onChange={(e) => setEdicao((x) => ({ ...x, [c.chave]: e.target.value }))}
                        />
                        <button type="button" className="btn btn-gold adm-btn-compacto" disabled={salvando === c.chave || semBanco} onClick={() => void salvar(c.chave, c.unidade, false)}>
                          Salvar
                        </button>
                        {p && p.valor !== null ? (
                          <button type="button" className="btn btn-outline adm-btn-compacto" disabled={salvando === c.chave} onClick={() => void salvar(c.chave, c.unidade, true)}>
                            Limpar
                          </button>
                        ) : null}
                      </span>
                    </td>
                  ) : null}
                  <td className="adm-fraco">{p?.atualizadoEm ? `${dataHora(p.atualizadoEm)} · ${p.atualizadoPor ?? ''}` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ---------- plano de contas ---------- */

function PlanoDeContas({ contas }: { contas: ContaContabil[] }): ReactNode {
  return (
    <>
      <p className="adm-fraco adm-secao">
        As contas automáticas são alimentadas pelo livro-razão; as manuais, pelos lançamentos desta tela. A lista vem do
        código (<code>src/domain/dre.ts</code>) e é a mesma que a DRE lê.
      </p>
      <div className="table-scroll">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Conta</th>
              <th>Natureza</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.codigo}>
                <td>{c.codigo}</td>
                <td>{c.nome}</td>
                <td>{NATUREZA[c.natureza] ?? c.natureza}</td>
                <td>
                  <span className={c.automatica ? 'pill g' : 'pill n'}>{c.automatica ? 'livro-razão' : 'lançamento manual'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ---------- exportações e integração ---------- */

function Exportacoes(props: PropsContabil): ReactNode {
  const { run, pode } = useAdmin()
  const [origem, setOrigem] = useState('')
  const [enviando, setEnviando] = useState(false)
  useEffect(() => setOrigem(window.location.origin), [])

  const q = new URLSearchParams({ ano: props.periodo.consulta.ano })
  if (props.periodo.consulta.mes) q.set('mes', props.periodo.consulta.mes)
  else if (props.periodo.consulta.trimestre) q.set('trimestre', props.periodo.consulta.trimestre)
  // `token` é o nome do parâmetro no contrato da API (docs/API_RELATORIOS.md); o valor
  // de exemplo diz o que colar ali.
  const exemplo = `${origem || 'https://SEU-DOMINIO'}/api/relatorios/dre.csv?${q.toString()}${props.tokenConfigurado ? '&token=SUA_CHAVE' : ''}`

  async function enviar(): Promise<void> {
    setEnviando(true)
    await run(() => enviarAoSheetsNoPainel(props.periodo.consulta))
    setEnviando(false)
  }

  return (
    <>
      <div className="adm-secao">
        <SeletorPeriodo ano={props.periodo.ano} mes={props.periodo.mes} trimestre={props.periodo.trimestre} manter={{ aba: 'exportacoes' }} />
      </div>
      <div className="sec-row">
        <span className="k">Google Sheets (envio pela conta de serviço)</span>
        <span className={props.sheetsFaltando.length ? 'pill y' : 'pill g'}>
          {props.sheetsFaltando.length ? `faltam: ${props.sheetsFaltando.join(', ')}` : 'configurado'}
        </span>
      </div>
      <div className="sec-row">
        <span className="k">Chave de leitura por endereço (Sheets e Excel)</span>
        <span className={props.tokenConfigurado ? 'pill g' : 'pill y'}>{props.tokenConfigurado ? 'configurada' : 'AUREA_RELATORIOS_TOKEN ausente'}</span>
      </div>

      {pode('resultados.exportar') ? (
        <div className="adm-acoes" style={{ margin: '14px 0' }}>
          <button type="button" className="btn btn-gold adm-btn-compacto" disabled={enviando || props.sheetsFaltando.length > 0} onClick={() => void enviar()} data-uso="contabil:enviar-sheets">
            Enviar ao Google Sheets agora
          </button>
        </div>
      ) : null}

      <div className="note adm-secao" style={{ display: 'block' }}>
        <b>Sem conta de serviço, a planilha pode puxar sozinha.</b> Numa célula:
        <pre className="adm-mono" style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{`=IMPORTDATA("${exemplo}")`}</pre>
        Troque <code>dre</code> por <code>ledger</code>, <code>analise</code>, <code>negociacoes</code>, <code>extratos</code>,{' '}
        <code>estoque</code>, <code>contas</code>, <code>custodia</code> ou <code>auditoria</code>. O passo a passo está em{' '}
        <code>docs/INTEGRACAO_GOOGLE_SHEETS.md</code>.
      </div>

      <h3>Registro de exportações</h3>
      {props.exportacoes.length ? (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Relatório</th>
                <th>Formato</th>
                <th>Destino</th>
                <th>Quem</th>
                <th className="adm-num">Linhas</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {props.exportacoes.map((e) => (
                <tr key={e.id}>
                  <td>{dataHora(e.createdAt)}</td>
                  <td>{e.relatorio}</td>
                  <td>{e.formato}</td>
                  <td>{e.destino}</td>
                  <td className="adm-fraco">{e.ator}</td>
                  <td className="adm-num">{numero(e.linhas)}</td>
                  <td>
                    <span className={e.ok ? 'pill g' : 'pill y'} title={e.detalhe ?? undefined}>
                      {e.ok ? 'ok' : 'falhou'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nenhuma exportação registrada ainda.</div>
      )}
    </>
  )
}

'use client'

/**
 * Custos e receitas recorrentes do controle financeiro (25/10/2026, migration 046).
 *
 * O formulário mostra, ANTES de salvar, o que vai acontecer: quantas ocorrências já venceram e
 * entram na DRE na hora, o peso por mês e a próxima data — o sócio não precisa saber o que é
 * "competência" para entender. As sugestões (HostGator, Claude, Fly.io, marketing…) só preenchem
 * descrição, fornecedor, conta e setor; o valor é sempre digitado.
 *
 * Quem decide é o servidor: cada botão chama uma Server Action de
 * src/server/actions/admin/financeiro.ts, que confere `contabil.lancar` por conta própria.
 * A regra das datas e da validação é a de src/domain/financeiro/controle.ts, a mesma do servidor.
 */

import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { ContaContabil } from '@/domain/dre'
import {
  PERIODICIDADES,
  ROTULO_PERIODICIDADE,
  contasDoTipo,
  ocorrenciasAte,
  proximaOcorrencia,
  valorMensalizado,
  type Periodicidade,
  type TipoRecorrente,
} from '@/domain/financeiro/controle'
import { parsePrice } from '@/domain/money'
import { alternarRecorrenteNoPainel, lancarVencidosNoPainel, salvarRecorrenteNoPainel } from '@/server/actions/admin/financeiro'
import type { RecorrenteGravado, Setor } from '@/server/db/repositories/financeiro'

import { useAdmin } from '../AdminProvider'
import { ConfirmarAcao } from '../ConfirmarAcao'
import { data, dinheiro, numero } from '../formatos'
import { Secao, Selo, TabelaRolavel, Vazio } from '../Pecas'

interface Rascunho {
  id: number | null
  tipo: TipoRecorrente
  descricao: string
  fornecedor: string
  valor: string
  periodicidade: Periodicidade
  inicio: string
  fim: string
  contaCodigo: string
  setorId: string
  observacao: string
}

/** Atalhos de preenchimento: os custos que o Gabriel citou e os de toda empresa digital. */
const SUGESTOES: ReadonlyArray<{ rotulo: string; tipo: TipoRecorrente; descricao: string; fornecedor: string; conta: string; setor: string; periodicidade: Periodicidade }> = [
  { rotulo: 'HostGator', tipo: 'custo', descricao: 'Hospedagem e domínio', fornecedor: 'HostGator', conta: '4.1.04', setor: 'Tecnologia', periodicidade: 'mensal' },
  { rotulo: 'Claude', tipo: 'custo', descricao: 'Assinatura do Claude', fornecedor: 'Anthropic', conta: '4.1.04', setor: 'Tecnologia', periodicidade: 'mensal' },
  { rotulo: 'Fly.io', tipo: 'custo', descricao: 'Servidores na nuvem', fornecedor: 'Fly.io', conta: '4.1.04', setor: 'Tecnologia', periodicidade: 'mensal' },
  { rotulo: 'Vercel', tipo: 'custo', descricao: 'Hospedagem do site', fornecedor: 'Vercel', conta: '4.1.04', setor: 'Tecnologia', periodicidade: 'mensal' },
  { rotulo: 'Supabase', tipo: 'custo', descricao: 'Banco de dados', fornecedor: 'Supabase', conta: '4.1.04', setor: 'Tecnologia', periodicidade: 'mensal' },
  { rotulo: 'Google Workspace', tipo: 'custo', descricao: 'E-mail corporativo', fornecedor: 'Google', conta: '4.1.04', setor: 'Administrativo', periodicidade: 'mensal' },
  { rotulo: 'Marketing', tipo: 'custo', descricao: 'Anúncios e campanhas', fornecedor: '', conta: '4.1.08', setor: 'Marketing', periodicidade: 'mensal' },
  { rotulo: 'Contador', tipo: 'custo', descricao: 'Honorários contábeis', fornecedor: '', conta: '4.1.02', setor: 'Jurídico e contábil', periodicidade: 'mensal' },
  { rotulo: 'Seguro do acervo', tipo: 'custo', descricao: 'Seguro das moedas em custódia', fornecedor: '', conta: '4.1.05', setor: 'Operação e logística', periodicidade: 'anual' },
  { rotulo: 'Outra receita', tipo: 'receita', descricao: '', fornecedor: '', conta: '3.1.99', setor: '', periodicidade: 'unica' },
]

function centavosParaTexto(c: number): string {
  return (c / 100).toFixed(2).replace('.', ',')
}

export function PainelRecorrentes({
  recorrentes,
  setores,
  contas,
  hoje,
  podeLancar,
  semBanco,
}: {
  recorrentes: readonly RecorrenteGravado[]
  setores: readonly Setor[]
  contas: readonly ContaContabil[]
  hoje: string
  podeLancar: boolean
  semBanco: boolean
}): ReactNode {
  const { run } = useAdmin()
  const vazio = (tipo: TipoRecorrente = 'custo'): Rascunho => ({
    id: null,
    tipo,
    descricao: '',
    fornecedor: '',
    valor: '',
    periodicidade: 'mensal',
    inicio: hoje,
    fim: '',
    contaCodigo: contasDoTipo(contas, tipo)[0]?.codigo ?? '',
    setorId: '',
    observacao: '',
  })
  const [r, setR] = useState<Rascunho>(vazio())
  const [aberto, setAberto] = useState(false)
  const formulario = useRef<HTMLDivElement>(null)
  const setoresAtivos = setores.filter((s) => s.ativo)
  const nomeSetor = new Map(setores.map((s) => [s.id, s.nome]))
  const nomeConta = new Map(contas.map((c) => [c.codigo, c.nome]))

  const centavos = parsePrice(r.valor)
  const vencidas = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.inicio)) return []
    const todas = ocorrenciasAte({ inicio: r.inicio, fim: r.fim || null, periodicidade: r.periodicidade }, hoje)
    const ja = r.id === null ? 0 : (recorrentes.find((x) => x.id === r.id)?.lancados ?? 0)
    return todas.slice(ja)
  }, [r.inicio, r.fim, r.periodicidade, r.id, hoje, recorrentes])
  const proxima = /^\d{4}-\d{2}-\d{2}$/.test(r.inicio) ? proximaOcorrencia({ inicio: r.inicio, fim: r.fim || null, periodicidade: r.periodicidade, ativo: true }, hoje) : null

  const pendentes = recorrentes
    .filter((x) => x.ativo)
    .reduce((t, x) => t + Math.max(0, ocorrenciasAte(x, hoje).length - x.lancados), 0)

  function abrir(novo: Rascunho): void {
    setR(novo)
    setAberto(true)
    requestAnimationFrame(() => formulario.current?.scrollIntoView({ block: 'start' }))
  }

  function editar(x: RecorrenteGravado): void {
    abrir({
      id: x.id,
      tipo: x.tipo,
      descricao: x.descricao,
      fornecedor: x.fornecedor ?? '',
      valor: centavosParaTexto(x.valor),
      periodicidade: x.periodicidade,
      inicio: x.inicio,
      fim: x.fim ?? '',
      contaCodigo: x.contaCodigo,
      setorId: x.setorId === null ? '' : String(x.setorId),
      observacao: x.observacao ?? '',
    })
  }

  function sugerir(s: (typeof SUGESTOES)[number]): void {
    const setor = setoresAtivos.find((x) => x.nome.toLowerCase() === s.setor.toLowerCase())
    abrir({ ...vazio(s.tipo), descricao: s.descricao, fornecedor: s.fornecedor, contaCodigo: s.conta, setorId: setor ? String(setor.id) : '', periodicidade: s.periodicidade })
  }

  async function salvar(): Promise<void> {
    const res = await run(() =>
      salvarRecorrenteNoPainel(r.id, {
        tipo: r.tipo,
        descricao: r.descricao,
        fornecedor: r.fornecedor,
        contaCodigo: r.contaCodigo,
        setorId: r.setorId ? Number(r.setorId) : null,
        valorCents: centavos,
        periodicidade: r.periodicidade,
        inicio: r.inicio,
        fim: r.fim,
        observacao: r.observacao,
      }),
    )
    if (res.ok) {
      setAberto(false)
      setR(vazio())
    }
  }

  const grupos: Array<[TipoRecorrente, string]> = [
    ['custo', 'Custos'],
    ['receita', 'Receitas'],
  ]

  return (
    <>
      {podeLancar && !semBanco ? (
        <Secao
          id="rec-novo"
          titulo={r.id === null ? 'Novo custo ou receita' : `Editar: ${r.descricao || 'lançamento'}`}
          descricao="Comece por uma sugestão ou pelo formulário. Cada vez que vencer, o valor entra sozinho na DRE, na conta escolhida."
          acoes={
            pendentes > 0 ? (
              <ConfirmarAcao
                rotulo={`Lançar o que venceu (${numero(pendentes)})`}
                objeto={`lançar ${numero(pendentes)} ocorrência(s) vencida(s) na DRE`}
                detalhe="O job diário faria isso hoje de madrugada; aqui é para não esperar."
                aoConfirmar={() => run(() => lancarVencidosNoPainel())}
              />
            ) : undefined
          }
        >
          <div className="adm-sugestoes" role="group" aria-label="Sugestões para preencher">
            {SUGESTOES.map((s) => (
              <button key={s.rotulo} type="button" className="adm-etiqueta adm-etiqueta-botao" onClick={() => sugerir(s)}>
                + {s.rotulo}
              </button>
            ))}
            {!aberto ? (
              <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => abrir(vazio())}>
                Em branco
              </button>
            ) : null}
          </div>

          {aberto ? (
            <div ref={formulario} className="adm-form-financeiro">
              <form onSubmit={(e) => e.preventDefault()} autoComplete="off">
                <fieldset className="adm-tipo-lancamento">
                  <legend>É um</legend>
                  {(['custo', 'receita'] as const).map((tipo) => (
                    <label key={tipo} className="adm-check">
                      <input
                        type="radio"
                        name="tipo"
                        value={tipo}
                        checked={r.tipo === tipo}
                        onChange={() => setR({ ...r, tipo, contaCodigo: contasDoTipo(contas, tipo)[0]?.codigo ?? '' })}
                      />
                      {tipo === 'custo' ? 'Custo (dinheiro que sai)' : 'Receita (dinheiro que entra fora da plataforma)'}
                    </label>
                  ))}
                </fieldset>
                <div className="adm-form">
                  <div className="field adm-campo-largo">
                    <label htmlFor="rec-descricao">O que é</label>
                    <input id="rec-descricao" className="tinput" value={r.descricao} onChange={(e) => setR({ ...r, descricao: e.target.value })} placeholder="ex.: Hospedagem do site" maxLength={120} />
                  </div>
                  <div className="field">
                    <label htmlFor="rec-fornecedor">Fornecedor (opcional)</label>
                    <input id="rec-fornecedor" className="tinput" value={r.fornecedor} onChange={(e) => setR({ ...r, fornecedor: e.target.value })} placeholder="ex.: HostGator" maxLength={80} />
                  </div>
                  <div className="field">
                    <label htmlFor="rec-valor">Valor de cada vez (R$)</label>
                    <input id="rec-valor" className="tinput" inputMode="decimal" value={r.valor} onChange={(e) => setR({ ...r, valor: e.target.value })} placeholder="0,00" />
                  </div>
                </div>
                <div className="adm-form">
                  <div className="field">
                    <label htmlFor="rec-periodicidade">Com que frequência</label>
                    <select id="rec-periodicidade" className="tinput" value={r.periodicidade} onChange={(e) => setR({ ...r, periodicidade: e.target.value as Periodicidade })}>
                      {PERIODICIDADES.map((p) => (
                        <option key={p} value={p}>
                          {ROTULO_PERIODICIDADE[p]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="rec-inicio">{r.periodicidade === 'unica' ? 'Data' : 'Primeira vez em'}</label>
                    <input id="rec-inicio" className="tinput" type="date" value={r.inicio} onChange={(e) => setR({ ...r, inicio: e.target.value })} />
                  </div>
                  {r.periodicidade !== 'unica' ? (
                    <div className="field">
                      <label htmlFor="rec-fim">Até (opcional)</label>
                      <input id="rec-fim" className="tinput" type="date" value={r.fim} min={r.inicio} onChange={(e) => setR({ ...r, fim: e.target.value })} />
                    </div>
                  ) : null}
                </div>
                <div className="adm-form">
                  <div className="field adm-campo-largo">
                    <label htmlFor="rec-conta">Conta da DRE</label>
                    <select id="rec-conta" className="tinput" value={r.contaCodigo} onChange={(e) => setR({ ...r, contaCodigo: e.target.value })}>
                      {contasDoTipo(contas, r.tipo).map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.codigo} · {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="rec-setor">Setor</label>
                    <select id="rec-setor" className="tinput" value={r.setorId} onChange={(e) => setR({ ...r, setorId: e.target.value })}>
                      <option value="">Sem setor</option>
                      {setoresAtivos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="rec-obs">Observação (opcional)</label>
                  <input id="rec-obs" className="tinput" value={r.observacao} onChange={(e) => setR({ ...r, observacao: e.target.value })} maxLength={300} placeholder="ex.: contrato anual, renova em março" />
                </div>

                <p className="adm-previa" aria-live="polite">
                  {centavos > 0 ? (
                    <>
                      <b>{dinheiro(centavos)}</b> {ROTULO_PERIODICIDADE[r.periodicidade].toLowerCase()}
                      {r.periodicidade !== 'unica' ? <> · pesa {dinheiro(valorMensalizado({ valor: centavos, periodicidade: r.periodicidade }))} por mês</> : null}
                      {vencidas.length ? (
                        <>
                          {' '}
                          · <b>{numero(vencidas.length)} vez(es) já venceram</b> e entram na DRE ao salvar
                        </>
                      ) : null}
                      {proxima ? <> · próxima em {data(Date.parse(`${proxima}T15:00:00Z`))}</> : null}
                    </>
                  ) : (
                    'Preencha o valor para ver quanto pesa por mês e o que entra na DRE.'
                  )}
                </p>

                <div className="adm-acoes">
                  <ConfirmarAcao
                    rotulo={r.id === null ? 'Salvar' : 'Salvar alterações'}
                    objeto={`${r.id === null ? 'salvar' : 'alterar'} ${r.tipo === 'custo' ? 'o custo' : 'a receita'} "${r.descricao || '…'}" de ${dinheiro(centavos)}`}
                    detalhe={
                      vencidas.length
                        ? `${numero(vencidas.length)} lançamento(s) vencido(s) — ${dinheiro(vencidas.length * centavos)} — entram na DRE agora; os próximos entram sozinhos no dia.`
                        : 'Os lançamentos entram sozinhos na DRE em cada vencimento.'
                    }
                    aoConfirmar={salvar}
                    variante="gold"
                    desabilitado={centavos <= 0 || r.descricao.trim().length < 3}
                  />
                  <button type="button" className="btn btn-ghost adm-btn-compacto" onClick={() => setAberto(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </Secao>
      ) : null}

      {grupos.map(([tipo, titulo]) => {
        const lista = recorrentes.filter((x) => x.tipo === tipo)
        return (
          <Secao
            key={tipo}
            id={`rec-${tipo}`}
            titulo={titulo}
            descricao={
              tipo === 'custo'
                ? `Custo fixo mensal: ${dinheiro(lista.filter((x) => x.ativo && (!x.fim || x.fim >= hoje)).reduce((t, x) => t + valorMensalizado(x), 0))}`
                : 'Receitas fora da plataforma (consultoria, parceria…), na conta 3.1.99.'
            }
          >
            {lista.length ? (
              <TabelaRolavel rotulo={`${titulo} recorrentes: valor, frequência, setor, próxima data e ações`}>
                <table className="audit-table">
                  <caption className="adm-sr">{titulo} recorrentes: valor, frequência, setor, próxima data e ações</caption>
                  <thead>
                    <tr>
                      <th scope="col">O que é</th>
                      <th scope="col" className="adm-num">Valor</th>
                      <th scope="col">Frequência</th>
                      <th scope="col">Setor e conta</th>
                      <th scope="col">Próxima</th>
                      <th scope="col">Lançados</th>
                      {podeLancar ? (
                        <th scope="col">
                          <span className="adm-sr">Ações</span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((x) => {
                      const prox = proximaOcorrencia(x, hoje)
                      return (
                        <tr key={x.id} className={x.ativo ? undefined : 'adm-linha-apagada'}>
                          <td>
                            <b>{x.descricao}</b>
                            {x.fornecedor ? <div className="adm-fraco">{x.fornecedor}</div> : null}
                            {!x.ativo ? <Selo>Desativado</Selo> : x.fim && x.fim < hoje ? <Selo>Encerrado</Selo> : null}
                          </td>
                          <td className="adm-num">
                            {dinheiro(x.valor)}
                            {x.periodicidade !== 'mensal' && x.periodicidade !== 'unica' ? <div className="adm-fraco">{dinheiro(valorMensalizado(x))}/mês</div> : null}
                          </td>
                          <td>
                            {ROTULO_PERIODICIDADE[x.periodicidade]}
                            <div className="adm-fraco">
                              desde {data(Date.parse(`${x.inicio}T15:00:00Z`))}
                              {x.fim ? ` até ${data(Date.parse(`${x.fim}T15:00:00Z`))}` : ''}
                            </div>
                          </td>
                          <td>
                            {x.setorId !== null ? (nomeSetor.get(x.setorId) ?? '—') : 'Sem setor'}
                            <div className="adm-fraco">
                              {x.contaCodigo} · {nomeConta.get(x.contaCodigo) ?? ''}
                            </div>
                          </td>
                          <td>{prox ? data(Date.parse(`${prox}T15:00:00Z`)) : '—'}</td>
                          <td>
                            {numero(x.lancados)}
                            {x.lancados ? <div className="adm-fraco">{dinheiro(x.lancados * x.valor)} no total</div> : null}
                          </td>
                          {podeLancar ? (
                            <td>
                              <div className="adm-acoes-linha">
                                <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => editar(x)}>
                                  Editar<span className="adm-sr"> {x.descricao}</span>
                                </button>
                                {x.ativo ? (
                                  <ConfirmarAcao
                                    rotulo="Desativar"
                                    objeto={`desativar "${x.descricao}"`}
                                    detalhe="Nada mais é lançado dele. O que já foi lançado continua na DRE (para desfazer um mês, estorne o lançamento na aba Contábil)."
                                    aoConfirmar={() => run(() => alternarRecorrenteNoPainel(x.id, false))}
                                    perigo
                                  />
                                ) : (
                                  <ConfirmarAcao
                                    rotulo="Reativar"
                                    objeto={`reativar "${x.descricao}"`}
                                    detalhe="As vezes que venceram enquanto estava desativado também entram na DRE agora."
                                    aoConfirmar={() => run(() => alternarRecorrenteNoPainel(x.id, true))}
                                  />
                                )}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </TabelaRolavel>
            ) : (
              <Vazio titulo={tipo === 'custo' ? 'Nenhum custo cadastrado ainda.' : 'Nenhuma receita cadastrada.'}>
                {tipo === 'custo' ? 'Use as sugestões acima — HostGator, Claude, Fly.io, marketing — e informe o valor.' : 'Use "+ Outra receita" acima.'}
              </Vazio>
            )}
          </Secao>
        )
      })}
    </>
  )
}

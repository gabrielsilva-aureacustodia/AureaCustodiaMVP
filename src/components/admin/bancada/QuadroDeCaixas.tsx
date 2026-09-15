'use client'

/**
 * As caixas do cofre e quem ocupa cada posição (plano do Admin, 3.7), abaixo da bancada.
 *
 * O quadro mostra também a caixa que só existe no texto de alguma análise — é assim que "EB 01"
 * digitado no lugar de "EB-001" aparece para alguém corrigir o cadastro, em vez de ficar escondido.
 * Cadastrar a caixa não reescreve análise nenhuma: o texto gravado entra no hash.
 */

import Link from 'next/link'
import { useState } from 'react'
import type { ReactNode } from 'react'

import type { OcupacaoDaCaixa } from '@/domain/admin/caixas'
import { salvarCaixaNoPainel } from '@/server/actions/admin/bancada'
import { useToast } from '@/components/ui/Toast'

import { numero } from '../formatos'

interface Rascunho {
  codigo: string
  rotulo: string
  local: string
  capacidade: string
  ativa: boolean
}

const EM_BRANCO: Rascunho = { codigo: '', rotulo: '', local: '', capacidade: '', ativa: true }

function FormCaixa({ inicial, criando, aoTerminar }: { inicial: Rascunho; criando: boolean; aoTerminar(): void }): ReactNode {
  const toast = useToast()
  const [r, setR] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  return (
    <form
      className="adm-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setSalvando(true)
        const res = await salvarCaixaNoPainel({ ...r, capacidade: r.capacidade }, criando).catch(() => ({ ok: false, error: 'Sem resposta do servidor.', message: undefined }))
        setSalvando(false)
        const msg = res.ok ? res.message : res.error
        if (msg) toast(msg)
        if (res.ok) {
          if (criando) setR(EM_BRANCO)
          aoTerminar()
        }
      }}
    >
      <label className="field">
        <span>Código</span>
        <input className="tinput" value={r.codigo} disabled={!criando} placeholder="EB-001" onChange={(e) => setR({ ...r, codigo: e.target.value })} />
      </label>
      <label className="field">
        <span>Rótulo</span>
        <input className="tinput" value={r.rotulo} placeholder="Bandeira · caixa 1" onChange={(e) => setR({ ...r, rotulo: e.target.value })} />
      </label>
      <label className="field">
        <span>Local</span>
        <input className="tinput" value={r.local} placeholder="Cofre, prateleira A" onChange={(e) => setR({ ...r, local: e.target.value })} />
      </label>
      <label className="field">
        <span>Posições</span>
        <input className="tinput" inputMode="numeric" value={r.capacidade} placeholder="40" onChange={(e) => setR({ ...r, capacidade: e.target.value })} />
      </label>
      {!criando ? (
        <label className="adm-check">
          <input type="checkbox" checked={r.ativa} onChange={(e) => setR({ ...r, ativa: e.target.checked })} />
          Em uso
        </label>
      ) : null}
      <div className="adm-acoes">
        <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={salvando}>
          {salvando ? 'Salvando…' : criando ? 'Cadastrar caixa' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

export function QuadroDeCaixas({
  caixas,
  cadastradas,
  podeEditar,
  aoSalvar,
}: {
  caixas: OcupacaoDaCaixa[]
  cadastradas: boolean
  podeEditar: boolean
  aoSalvar(): void
}): ReactNode {
  const [editando, setEditando] = useState<string | null>(null)

  return (
    <section className="panel adm-bancada-caixas" aria-label="Caixas do cofre">
      <h3>Caixas do cofre</h3>
      {!cadastradas ? (
        <p className="note">
          O cadastro de caixas precisa do banco com a migration 025. Enquanto isso, o quadro mostra só as caixas digitadas nas análises.
        </p>
      ) : null}

      {caixas.length === 0 ? (
        <p className="empty">Nenhuma caixa cadastrada nem registrada em análise.</p>
      ) : (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Caixa</th>
                <th>Local</th>
                <th className="adm-num">Ocupação</th>
                <th>Moedas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {caixas.map((c) => (
                <tr key={c.codigo}>
                  <td>
                    <b>{c.codigo}</b>
                    <div className="adm-fraco">{c.rotulo}</div>
                    {!c.cadastrada ? <span className="pill y">só na análise</span> : !c.ativa ? <span className="pill n">fora de uso</span> : null}
                  </td>
                  <td>{c.local || <span className="adm-fraco">—</span>}</td>
                  <td className="adm-num">
                    <span className={c.cheia ? 'adm-negativo' : undefined}>
                      {numero(c.moedas.length)}
                      {c.capacidade !== null ? ` / ${numero(c.capacidade)}` : ''}
                    </span>
                    {c.semPosicao > 0 ? <div className="adm-fraco">{numero(c.semPosicao)} sem posição</div> : null}
                  </td>
                  <td>
                    {c.moedas.length ? (
                      <details className="adm-detalhes" style={{ marginBottom: 0 }}>
                        <summary>{c.moedas.length === 1 ? '1 moeda' : `${numero(c.moedas.length)} moedas`}</summary>
                        <div className="adm-detalhes-corpo">
                          <ul className="adm-lista">
                            {c.moedas.map((o) => (
                              <li key={o.codigoMoeda}>
                                {o.posicao !== null ? `pos. ${o.posicao}` : 'sem posição'} · <Link href={`/admin/moedas/${encodeURIComponent(o.codigoMoeda)}`}>{o.codigoMoeda}</Link>
                                <span className="adm-fraco"> · {o.dono}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    ) : (
                      <span className="adm-fraco">vazia</span>
                    )}
                  </td>
                  <td>
                    {podeEditar && cadastradas && c.cadastrada ? (
                      <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setEditando(editando === c.codigo ? null : c.codigo)}>
                        {editando === c.codigo ? 'Fechar' : 'Editar'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando ? (
        (() => {
          const c = caixas.find((x) => x.codigo === editando)
          return c ? (
            <>
              <div className="adm-subtitulo">Editar {c.codigo}</div>
              <FormCaixa
                key={c.codigo}
                criando={false}
                inicial={{ codigo: c.codigo, rotulo: c.rotulo, local: c.local, capacidade: c.capacidade === null ? '' : String(c.capacidade), ativa: c.ativa }}
                aoTerminar={() => {
                  setEditando(null)
                  aoSalvar()
                }}
              />
            </>
          ) : null
        })()
      ) : null}

      {podeEditar && cadastradas ? (
        <>
          <div className="adm-subtitulo">Cadastrar caixa</div>
          <FormCaixa criando inicial={EM_BRANCO} aoTerminar={aoSalvar} />
        </>
      ) : null}
    </section>
  )
}

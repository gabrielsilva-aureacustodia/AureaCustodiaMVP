'use client'

/**
 * Os setores do controle financeiro, editáveis no painel (decisão do Gabriel, 25/10/2026).
 * Setor não se apaga — custos antigos apontam para ele —, se desativa: some das opções de
 * cadastro e continua nos relatórios. A Server Action confere `contabil.lancar`.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import { salvarSetorNoPainel } from '@/server/actions/admin/financeiro'
import type { Setor } from '@/server/db/repositories/financeiro'

import { useAdmin } from '../AdminProvider'
import { dinheiro } from '../formatos'
import { Secao, Selo } from '../Pecas'

function LinhaDoSetor({ setor, total, podeEditar }: { setor: Setor; total: number; podeEditar: boolean }): ReactNode {
  const { run } = useAdmin()
  const [nome, setNome] = useState(setor.nome)
  const [editando, setEditando] = useState(false)
  return (
    <li className={setor.ativo ? 'adm-setor' : 'adm-setor adm-linha-apagada'}>
      {editando ? (
        <form
          className="adm-campo-inline"
          onSubmit={async (e) => {
            e.preventDefault()
            const r = await run(() => salvarSetorNoPainel(setor.id, nome, setor.ativo))
            if (r.ok) setEditando(false)
          }}
        >
          <label htmlFor={`setor-${setor.id}`} className="adm-sr">
            Novo nome de {setor.nome}
          </label>
          <input id={`setor-${setor.id}`} className="tinput" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} autoComplete="off" />
          <button type="submit" className="btn btn-gold adm-btn-compacto">
            Salvar nome
          </button>
          <button type="button" className="btn btn-ghost adm-btn-compacto" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <>
          <span className="adm-setor-nome">
            <b>{setor.nome}</b> {!setor.ativo ? <Selo>Desativado</Selo> : null}
          </span>
          <span className="adm-fraco">{total ? `${dinheiro(total)} no período` : 'nenhum custo no período'}</span>
          {podeEditar ? (
            <span className="adm-acoes-linha">
              <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => setEditando(true)}>
                Renomear<span className="adm-sr"> {setor.nome}</span>
              </button>
              <button type="button" className="btn btn-outline adm-btn-compacto" onClick={() => void run(() => salvarSetorNoPainel(setor.id, setor.nome, !setor.ativo))}>
                {setor.ativo ? 'Desativar' : 'Reativar'}
                <span className="adm-sr"> {setor.nome}</span>
              </button>
            </span>
          ) : null}
        </>
      )}
    </li>
  )
}

export function PainelSetores({ setores, totais, podeEditar }: { setores: readonly Setor[]; totais: Record<number, number>; podeEditar: boolean }): ReactNode {
  const { run } = useAdmin()
  const [novo, setNovo] = useState('')
  return (
    <Secao id="setores" titulo="Setores" descricao="Agrupam os custos para ver quanto cada área da empresa gasta. Desativar tira o setor das opções de cadastro, sem mexer no que já foi lançado.">
      {podeEditar ? (
        <form
          className="adm-form"
          onSubmit={async (e) => {
            e.preventDefault()
            const r = await run(() => salvarSetorNoPainel(null, novo, true))
            if (r.ok) setNovo('')
          }}
        >
          <div className="field adm-campo-largo">
            <label htmlFor="setor-novo">Novo setor</label>
            <input id="setor-novo" className="tinput" value={novo} onChange={(e) => setNovo(e.target.value)} maxLength={40} placeholder="ex.: Infraestrutura em nuvem" autoComplete="off" />
          </div>
          <button type="submit" className="btn btn-gold adm-btn-compacto" disabled={novo.trim().length < 2}>
            Criar setor
          </button>
        </form>
      ) : null}
      <ul className="adm-setores">
        {setores.map((s) => (
          <LinhaDoSetor key={s.id} setor={s} total={totais[s.id] ?? 0} podeEditar={podeEditar} />
        ))}
      </ul>
    </Secao>
  )
}

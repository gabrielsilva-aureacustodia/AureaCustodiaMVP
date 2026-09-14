/**
 * A tabela da lista de usuários. Cada linha leva à ficha completa.
 *
 * Recebe as linhas já filtradas por `filtrarUsuarios` (src/domain/admin/usuarios.ts): nenhuma
 * regra aqui. Sem 'use client'.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { formatarCpf } from '@/domain/cadastro'
import type { LinhaUsuario } from '@/domain/admin/usuarios'

import { data, dataHora, dinheiro, numero } from '../formatos'

export function TabelaDeUsuarios({ linhas, total }: { linhas: readonly LinhaUsuario[]; total: number }): ReactNode {
  return (
    <>
      <p className="adm-fraco" aria-live="polite">
        {linhas.length === total ? `${numero(total)} contas.` : `${numero(linhas.length)} de ${numero(total)} contas.`}
      </p>
      {linhas.length === 0 ? (
        <div className="empty">Nenhuma conta com este filtro.</div>
      ) : (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Conta</th>
                <th>CPF</th>
                <th className="adm-num">Saldo</th>
                <th className="adm-num">Moedas</th>
                <th>Situação</th>
                <th>Criada em</th>
                <th>Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.email}>
                  <td>
                    <Link href={`/admin/usuarios/${encodeURIComponent(l.email)}`} data-uso="usuarios-abrir-ficha">
                      <b>{l.nome}</b>
                    </Link>
                    <div className="adm-fraco">{l.email}</div>
                  </td>
                  <td className="adm-mono">{l.cpf ? formatarCpf(l.cpf) : '—'}</td>
                  <td className="adm-num">{dinheiro(l.saldo)}</td>
                  <td className="adm-num">{numero(l.moedas)}</td>
                  <td>
                    <span className="adm-etiquetas">
                      <span className={l.comCadastro ? 'pill g' : 'pill n'}>{l.comCadastro ? 'Cadastro completo' : 'Sem cadastro'}</span>
                      {l.inadimplente ? <span className="pill adm-pill-vermelho">Inadimplente</span> : null}
                      {!l.ativa ? <span className="pill adm-pill-vermelho">Desativada</span> : null}
                    </span>
                  </td>
                  <td>{data(l.criadoEm)}</td>
                  <td>{dataHora(l.ultimoAcesso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

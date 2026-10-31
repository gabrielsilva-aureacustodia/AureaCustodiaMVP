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
import { Selo, TabelaRolavel } from '../Pecas'

export function TabelaDeUsuarios({ linhas, total }: { linhas: readonly LinhaUsuario[]; total: number }): ReactNode {
  return (
    <>
      <p className="adm-fraco" aria-live="polite">
        {linhas.length === total ? `${numero(total)} contas.` : `${numero(linhas.length)} de ${numero(total)} contas.`}
      </p>
      {linhas.length === 0 ? (
        <div className="adm-vazio">
          {total === 0 ? (
            <>
              <b>Nenhuma conta ainda.</b>
              Uma conta aparece aqui quando alguém se cadastra no site ou a equipe cria pelo botão “Criar conta”.
            </>
          ) : (
            <>
              <b>Nenhuma conta com este filtro.</b>
              Afrouxe a busca ou use “Limpar filtros” acima.
            </>
          )}
        </div>
      ) : (
        <TabelaRolavel rotulo="Contas de clientes: CPF, saldo, moedas e situação">
          <table className="audit-table">
            <caption className="adm-sr">Contas de clientes: CPF, saldo, moedas e situação</caption>
            <thead>
              <tr>
                <th scope="col">Conta</th>
                <th scope="col">CPF</th>
                <th scope="col" className="adm-num">Saldo</th>
                <th scope="col" className="adm-num">Moedas</th>
                <th scope="col">Situação</th>
                <th scope="col">Criada em</th>
                <th scope="col">Último acesso</th>
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
                      <Selo tom={l.comCadastro ? 'ok' : 'neutro'}>{l.comCadastro ? 'Cadastro completo' : 'Sem cadastro'}</Selo>
                      {l.inadimplente ? <Selo tom="alerta">Inadimplente</Selo> : null}
                      {!l.ativa ? <Selo tom="alerta">Desativada</Selo> : null}
                    </span>
                  </td>
                  <td>{data(l.criadoEm)}</td>
                  <td>{dataHora(l.ultimoAcesso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelaRolavel>
      )}
    </>
  )
}

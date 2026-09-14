/**
 * A aba Atividade da ficha: os dois últimos acessos, o registro de uso (páginas abertas e
 * gestos marcados) e a trilha de auditoria de tudo que envolve a conta — o que ela fez e o
 * que a equipe fez nela. Sem 'use client'.
 */

import type { ReactNode } from 'react'

import type { AbaAtividade as DadosAbaAtividade } from '@/server/admin/ficha'

import { dataHora } from '../formatos'

export function AbaAtividade({ dados, semBanco }: { dados: DadosAbaAtividade; semBanco: boolean }): ReactNode {
  return (
    <>
      <dl className="adm-pares">
        <div>
          <dt>Último acesso</dt>
          <dd>{dataHora(dados.ultimoAcesso)}</dd>
        </div>
        <div>
          <dt>Acesso anterior</dt>
          <dd>{dataHora(dados.acessoAnterior)}</dd>
        </div>
      </dl>

      <details className="adm-detalhes" open>
        <summary>Trilha de auditoria da conta</summary>
        <div className="adm-detalhes-corpo">
          {dados.trilha === null ? (
            <p className="adm-fraco">{semBanco ? 'A trilha existe só com banco configurado.' : 'Trilha indisponível agora.'}</p>
          ) : dados.trilha.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Quem</th>
                    <th>Ação</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.trilha.map((t) => (
                    <tr key={t.id}>
                      <td>{dataHora(t.createdAt)}</td>
                      <td>{t.ator}</td>
                      <td className="adm-mono">{t.acao}</td>
                      <td className="adm-mono adm-fraco">{JSON.stringify(t.detalhes).slice(0, 180)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-fraco">Nada na trilha envolvendo esta conta.</p>
          )}
        </div>
      </details>

      <details className="adm-detalhes">
        <summary>Registro de uso</summary>
        <div className="adm-detalhes-corpo">
          {dados.uso === null ? (
            <p className="adm-fraco">{semBanco ? 'O registro de uso existe só com banco configurado.' : 'Registro de uso indisponível agora.'}</p>
          ) : dados.uso.length ? (
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Tipo</th>
                    <th>Página</th>
                    <th>Gesto</th>
                    <th>Aparelho</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.uso.map((e, i) => (
                    <tr key={`${e.createdAt}-${i}`}>
                      <td>{dataHora(e.createdAt)}</td>
                      <td>{e.tipo === 'pagina' ? 'Página' : 'Ação'}</td>
                      <td className="adm-mono">{e.rota ?? '—'}</td>
                      <td>{e.alvo ?? '—'}</td>
                      <td>{e.plataforma ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="adm-fraco">Nenhum registro de uso desta conta.</p>
          )}
        </div>
      </details>
    </>
  )
}

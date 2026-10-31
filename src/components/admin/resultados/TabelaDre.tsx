/**
 * A DRE em tabela — linha a linha, com o grupo em destaque e a observação de cada
 * linha (alíquota aplicada, "não configurado", quantas negociações).
 *
 * Recebe a `Dre` já montada por `montarDre` (src/domain/dre.ts): nenhuma conta é feita
 * aqui. Sem 'use client': é desenhada pelo Server Component da página.
 */

import type { ReactNode } from 'react'

import type { LinhaDre } from '@/domain/dre'

import { dinheiro } from '../formatos'
import { TabelaRolavel } from '@/components/admin/Pecas'

export function TabelaDre({ linhas }: { linhas: readonly LinhaDre[] }): ReactNode {
  return (
    <TabelaRolavel rotulo="Demonstração do resultado (DRE) do período">
      <table className="audit-table">
        <caption className="adm-sr">Demonstração do resultado (DRE) do período</caption>
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Descrição</th>
            <th scope="col" className="adm-num">Valor</th>
            <th scope="col">Observação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={`${l.codigo}-${i}`} className={l.nivel === 0 ? 'adm-linha-total' : undefined}>
              <td>{l.codigo}</td>
              <td style={{ paddingLeft: 10 + l.nivel * 16 }}>{l.descricao}</td>
              <td className={l.valor < 0 ? 'adm-num adm-negativo' : 'adm-num'}>{dinheiro(l.valor)}</td>
              <td className="adm-fraco">{l.observacao ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaRolavel>
  )
}

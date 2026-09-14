'use client'

/**
 * O controle de período da Central de Resultados: ano, mês ou trimestre.
 *
 * O PERÍODO MORA NA URL (`?ano=&mes=&trimestre=`), não no estado do componente. A
 * página é um Server Component que lê os parâmetros e carrega os dados daquele
 * período; trocar aqui é só navegar. Ganha-se de graça o link que se manda ao
 * contador ("a DRE de agosto") e o "voltar" do navegador.
 *
 * Mês tem precedência sobre trimestre, como em `periodoDaConsulta`
 * (src/server/relatorios/dados.ts) — a regra que as rotas de exportação também usam.
 */

import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** A plataforma começa a gravar em 2026: anos anteriores não têm dado nenhum. */
const PRIMEIRO_ANO = 2026

interface Props {
  ano: number
  mes: number | null
  trimestre: number | null
  /** Outros parâmetros da página que precisam sobreviver à troca (a aba, um filtro). */
  manter?: Record<string, string>
}

export function SeletorPeriodo({ ano, mes, trimestre, manter = {} }: Props): ReactNode {
  const router = useRouter()
  const pathname = usePathname()
  const anoAtual = new Date().getFullYear()
  const anos: number[] = []
  for (let a = Math.min(PRIMEIRO_ANO, ano); a <= Math.max(anoAtual, ano); a++) anos.push(a)

  function ir(novo: { ano?: number; mes?: number | null; trimestre?: number | null }): void {
    const p = new URLSearchParams(manter)
    p.set('ano', String(novo.ano ?? ano))
    const m = 'mes' in novo ? novo.mes : mes
    const t = 'trimestre' in novo ? novo.trimestre : trimestre
    if (m) p.set('mes', String(m))
    else if (t) p.set('trimestre', String(t))
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="adm-filtros" role="group" aria-label="Período">
      <div className="field">
        <label htmlFor="periodo-ano">Ano</label>
        <select id="periodo-ano" className="tinput" value={ano} onChange={(e) => ir({ ano: Number(e.target.value) })}>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="periodo-mes">Mês</label>
        <select
          id="periodo-mes"
          className="tinput"
          value={mes ?? ''}
          onChange={(e) => ir({ mes: e.target.value ? Number(e.target.value) : null, trimestre: null })}
        >
          <option value="">Ano inteiro</option>
          {MESES.map((nome, i) => (
            <option key={nome} value={i + 1}>
              {nome}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="periodo-tri">Trimestre</label>
        <select
          id="periodo-tri"
          className="tinput"
          value={mes ? '' : trimestre ?? ''}
          disabled={mes !== null}
          onChange={(e) => ir({ trimestre: e.target.value ? Number(e.target.value) : null, mes: null })}
        >
          <option value="">—</option>
          <option value="1">1º trimestre</option>
          <option value="2">2º trimestre</option>
          <option value="3">3º trimestre</option>
          <option value="4">4º trimestre</option>
        </select>
      </div>
    </div>
  )
}

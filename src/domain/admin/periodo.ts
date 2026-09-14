/**
 * O período da Central de Resultados, lido dos parâmetros da URL.
 *
 * A MESMA REGRA de `periodoDaConsulta` (src/server/relatorios/dados.ts), que é quem as
 * rotas de exportação usam: `ano` entre 2000 e 2100 (padrão, o ano corrente); `mes`
 * de 1 a 12 recorta o mês; sem mês, `trimestre` de 1 a 4; sem nenhum dos dois, o ano
 * inteiro. Valor fora da faixa é ignorado, não corrigido.
 *
 * Existe em versão pura porque a página precisa de três coisas que aquela função não
 * devolve: o que ficou selecionado (para o controle da tela), os parâmetros já limpos
 * (para montar o link de exportação do MESMO período) e o relógio por parâmetro (para
 * o teste não depender do dia em que roda).
 */

import { periodoAnual, periodoMensal, periodoTrimestral, type Periodo } from '@/domain/dre'
import type { Timestamp } from '@/domain/types'

export type ParametrosDaUrl = Record<string, string | string[] | undefined>

export interface PeriodoEscolhido {
  ano: number
  mes: number | null
  trimestre: number | null
  periodo: Periodo
  /** Os parâmetros normalizados, prontos para `?ano=&mes=&trimestre=`. */
  consulta: { ano: string; mes: string | null; trimestre: string | null }
}

/** O primeiro valor de um parâmetro que pode vir repetido (`?ano=2026&ano=2025`). */
export function primeiroValor(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

function inteiroNaFaixa(v: string | null, min: number, max: number): number | null {
  if (!v || !/^\d+$/.test(v.trim())) return null
  const n = Number(v.trim())
  return n >= min && n <= max ? n : null
}

export function lerPeriodo(params: ParametrosDaUrl, agora: Timestamp): PeriodoEscolhido {
  const ano = inteiroNaFaixa(primeiroValor(params.ano), 2000, 2100) ?? new Date(agora).getFullYear()
  const mes = inteiroNaFaixa(primeiroValor(params.mes), 1, 12)
  const trimestre = mes ? null : inteiroNaFaixa(primeiroValor(params.trimestre), 1, 4)
  const periodo = mes ? periodoMensal(ano, mes) : trimestre ? periodoTrimestral(ano, trimestre) : periodoAnual(ano)
  return {
    ano,
    mes,
    trimestre,
    periodo,
    consulta: { ano: String(ano), mes: mes ? String(mes) : null, trimestre: trimestre ? String(trimestre) : null },
  }
}

/** `ano=2026&mes=8` — o sufixo de URL de exportação do período escolhido. */
export function consultaDoPeriodo(p: PeriodoEscolhido): string {
  const q = new URLSearchParams({ ano: p.consulta.ano })
  if (p.consulta.mes) q.set('mes', p.consulta.mes)
  else if (p.consulta.trimestre) q.set('trimestre', p.consulta.trimestre)
  return q.toString()
}

/**
 * Dias úteis e feriados nacionais do Brasil (QA Davi B06, 22/11/2026).
 *
 * Por que existe: a tela do saque dizia "D+3 úteis (previsão: 23/11)" pedindo numa sexta que era feriado
 * (Consciência Negra, 20/11/2026) — somava 3 dias CORRIDOS. O 3º dia útil era quarta, 25/11.
 *
 * Só feriados NACIONAIS (lei federal): fixos + móveis (Carnaval, Sexta-feira Santa, Corpus Christi, a
 * partir da Páscoa). Feriado estadual/municipal e ponto facultativo não entram — decisão fiscal/de
 * prazo é do Gabriel. Consciência Negra (20/11) é nacional desde a Lei 14.759/2023.
 * Puro: sem I/O. O dia é o de Brasília (UTC-3, sem horário de verão desde 2019).
 */

const MS_DIA = 86_400_000
const OFFSET_BRASILIA_MS = -3 * 3_600_000

/** Data civil de Brasília de um instante. mes 1-12. */
export function dataDeBrasilia(ts: number): { ano: number; mes: number; dia: number; diaSemana: number } {
  const d = new Date(ts + OFFSET_BRASILIA_MS)
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), diaSemana: d.getUTCDay() }
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher), como [mes, dia]. */
function pascoa(ano: number): [number, number] {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return [mes, dia]
}

/** Chave 'AAAA-MM-DD' de uma data civil (somando `deslocamento` dias, se houver). */
function chave(ano: number, mes: number, dia: number, deslocamento = 0): string {
  const t = Date.UTC(ano, mes - 1, dia) + deslocamento * MS_DIA
  return new Date(t).toISOString().slice(0, 10)
}

/** Feriados nacionais do ano, como conjunto de 'AAAA-MM-DD'. */
export function feriadosNacionais(ano: number): Set<string> {
  const [mp, dp] = pascoa(ano)
  const fixos: Array<[number, number]> = [
    [1, 1], // Confraternização Universal
    [4, 21], // Tiradentes
    [5, 1], // Dia do Trabalho
    [9, 7], // Independência
    [10, 12], // Nossa Senhora Aparecida
    [11, 2], // Finados
    [11, 15], // Proclamação da República
    [11, 20], // Consciência Negra
    [12, 25], // Natal
  ]
  const s = new Set<string>(fixos.map(([m, d]) => chave(ano, m, d)))
  s.add(chave(ano, mp, dp, -48)) // Segunda de Carnaval (ponto facultativo federal, feriado bancário)
  s.add(chave(ano, mp, dp, -47)) // Terça de Carnaval
  s.add(chave(ano, mp, dp, -2)) // Sexta-feira Santa
  s.add(chave(ano, mp, dp, 60)) // Corpus Christi
  return s
}

/** É dia útil (segunda a sexta, fora feriado nacional) no calendário de Brasília? */
export function ehDiaUtil(ts: number): boolean {
  const { ano, mes, dia, diaSemana } = dataDeBrasilia(ts)
  if (diaSemana === 0 || diaSemana === 6) return false
  return !feriadosNacionais(ano).has(chave(ano, mes, dia))
}

/**
 * Instante do `n`-ésimo dia útil depois do dia de `inicio` (o dia do pedido não conta).
 * Mantém a hora do pedido, só desloca os dias.
 */
export function somarDiasUteis(inicio: number, n: number): number {
  let ts = inicio
  let restantes = Math.max(0, Math.floor(n))
  while (restantes > 0) {
    ts += MS_DIA
    if (ehDiaUtil(ts)) restantes--
  }
  return ts
}

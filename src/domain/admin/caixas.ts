/**
 * As caixas físicas do cofre e quem ocupa cada posição (frente C, C3 — plano do Admin, 3.7).
 *
 * ATÉ AQUI A CAIXA ERA TEXTO SOLTO. `caixa` e `posicao` são digitados na bancada e gravados na
 * análise, sem conferência nenhuma (RA-22). Com `aurea.caixas` (migration 025) o painel passa a
 * saber quais caixas existem e a mostrar a ocupação real — e a bancada web recusa a posição que
 * já tem moeda. Isso é validação de dado: caixa não cadastrada continua aceita, e a análise
 * continua podendo ser fechada sem caixa.
 *
 * DE ONDE VEM A OCUPAÇÃO. Não há tabela de "moeda na posição": a verdade é a análise que aprovou a
 * moeda (append-only), cruzada com a moeda que ainda existe e com a retirada física. A moeda sai
 * da posição quando a retirada é postada ou entregue — antes disso ela continua no cofre, mesmo
 * com o recibo já extinto na confirmação do pagamento.
 *
 * A COMPARAÇÃO IGNORA FORMATO. "EB 001", "eb-001" e "EB-001" são a mesma caixa para a ocupação.
 * O texto gravado na análise não é reescrito — ele entra no hash e é o que o operador escreveu —;
 * só a bancada web troca o digitado pelo código cadastrado quando os dois batem.
 *
 * Regra pura: sem I/O, sem relógio.
 */

import type { AppState, Retirada } from '@/domain/types'

/** Estados em que a moeda já saiu fisicamente da caixa. */
const SAIU_DO_COFRE: ReadonlyArray<Retirada['status']> = ['postada', 'entregue']

export interface CaixaCadastrada {
  codigo: string
  rotulo: string
  local: string
  /** Quantas posições a caixa tem. `null` = não informado. */
  capacidade: number | null
  ativa: boolean
  criadoEm: number
}

/** "EB 001" → "EB001". A chave de comparação, nunca o texto exibido. */
export function chaveDeCaixa(texto: string): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * O texto que a bancada web grava: o código cadastrado quando o digitado bate com ele, senão o
 * digitado sem espaço nas pontas. `null` para campo vazio.
 */
export function codigoDeCaixaParaGravar(digitado: string | null, caixas: readonly Pick<CaixaCadastrada, 'codigo'>[]): string | null {
  const t = (digitado ?? '').trim()
  if (!t) return null
  const chave = chaveDeCaixa(t)
  return caixas.find((c) => chaveDeCaixa(c.codigo) === chave)?.codigo ?? t
}

export interface EntradaCaixa {
  codigo: string
  rotulo: string
  local: string
  capacidade: string | number | null
  ativa: boolean
}

export type CaixaValidada = Omit<CaixaCadastrada, 'criadoEm'>

/** Código de caixa: letras, dígitos, hífen e espaço, até 40 caracteres, com ao menos um alfanumérico. */
export function validarCaixa(e: EntradaCaixa): { ok: true; caixa: CaixaValidada } | { ok: false; erro: string } {
  const codigo = String(e?.codigo ?? '').trim()
  if (!codigo || codigo.length > 40 || !/^[A-Za-z0-9 -]+$/.test(codigo) || chaveDeCaixa(codigo) === '') {
    return { ok: false, erro: 'O código da caixa usa letras, números e hífen, até 40 caracteres — por exemplo, EB-001.' }
  }
  const rotulo = String(e?.rotulo ?? '').trim()
  if (rotulo.length > 80) return { ok: false, erro: 'O rótulo tem no máximo 80 caracteres.' }
  const local = String(e?.local ?? '').trim()
  if (local.length > 120) return { ok: false, erro: 'O local tem no máximo 120 caracteres.' }

  let capacidade: number | null = null
  const bruta = e?.capacidade
  if (bruta !== null && bruta !== undefined && String(bruta).trim() !== '') {
    const n = Number(String(bruta).trim())
    if (!Number.isInteger(n) || n < 1 || n > 10000) return { ok: false, erro: 'A capacidade é um número inteiro de posições, de 1 a 10.000.' }
    capacidade = n
  }
  return { ok: true, caixa: { codigo, rotulo, local, capacidade, ativa: e?.ativa !== false } }
}

/** Uma moeda que está numa posição do cofre. */
export interface Ocupante {
  caixa: string
  posicao: number | null
  codigoMoeda: string
  tipoMoeda: string
  dono: string
  /** Protocolo da análise que colocou a moeda ali. */
  analise: string
}

/**
 * Quem está em cada posição agora. Uma linha por moeda que ainda está no cofre e tem caixa
 * registrada na análise que a aprovou (a última, se um dia houver reanálise).
 */
export function ocupantesDoCofre(state: Pick<AppState, 'users' | 'analises'> & { retiradas?: Retirada[] }): Ocupante[] {
  const donoDaMoeda = new Map<string, string>()
  for (const [email, u] of Object.entries(state.users)) for (const c of u.coins) donoDaMoeda.set(c.id, email)

  const saiu = new Set((state.retiradas ?? []).filter((r) => SAIU_DO_COFRE.includes(r.status)).map((r) => r.coinId))

  const ultimaAnalise = new Map<string, AppState['analises'][number]>()
  for (const a of state.analises) {
    if (a.veredito === 'aprovada' && a.codigoMoeda) ultimaAnalise.set(a.codigoMoeda, a)
  }

  const ocupantes: Ocupante[] = []
  for (const [codigo, a] of ultimaAnalise) {
    if (!a.caixa) continue
    const dono = donoDaMoeda.get(codigo)
    if (!dono || saiu.has(codigo)) continue
    ocupantes.push({ caixa: a.caixa, posicao: a.posicao, codigoMoeda: codigo, tipoMoeda: a.tipoMoeda, dono, analise: a.protocolo })
  }
  return ocupantes.sort((x, y) => chaveDeCaixa(x.caixa).localeCompare(chaveDeCaixa(y.caixa)) || (x.posicao ?? 0) - (y.posicao ?? 0))
}

export function ocupanteDaPosicao(ocupantes: readonly Ocupante[], caixa: string, posicao: number): Ocupante | null {
  const chave = chaveDeCaixa(caixa)
  return ocupantes.find((o) => o.posicao === posicao && chaveDeCaixa(o.caixa) === chave) ?? null
}

/** As mensagens de recusa para vereditos que apontam posição já ocupada por outra moeda. */
export function posicoesJaOcupadas(
  vereditos: ReadonlyArray<{ veredito: string; caixa: string | null; posicao: number | null }>,
  ocupantes: readonly Ocupante[],
): string[] {
  const erros: string[] = []
  vereditos.forEach((v, i) => {
    if (v.veredito !== 'aprovada' || !v.caixa || v.posicao === null) return
    const o = ocupanteDaPosicao(ocupantes, v.caixa, v.posicao)
    if (o) erros.push(`Moeda ${i + 1}: a posição ${v.posicao} da caixa ${v.caixa} já está ocupada pela moeda ${o.codigoMoeda}.`)
  })
  return erros
}

export interface OcupacaoDaCaixa {
  codigo: string
  rotulo: string
  local: string
  capacidade: number | null
  ativa: boolean
  /** false = aparece em análise, mas não está em `aurea.caixas`. */
  cadastrada: boolean
  moedas: Ocupante[]
  /** Moedas sem posição numerada nesta caixa. */
  semPosicao: number
  /** true quando há capacidade e o número de moedas chegou nela ou passou. */
  cheia: boolean
}

/**
 * O quadro de ocupação: toda caixa cadastrada, mais toda caixa que só existe no texto das
 * análises — é assim que um erro de digitação aparece na tela em vez de ficar escondido.
 */
export function ocupacaoDasCaixas(caixas: readonly CaixaCadastrada[], ocupantes: readonly Ocupante[]): OcupacaoDaCaixa[] {
  const porChave = new Map<string, OcupacaoDaCaixa>()
  for (const c of caixas) {
    porChave.set(chaveDeCaixa(c.codigo), { ...c, cadastrada: true, moedas: [], semPosicao: 0, cheia: false })
  }
  for (const o of ocupantes) {
    const chave = chaveDeCaixa(o.caixa)
    let linha = porChave.get(chave)
    if (!linha) {
      linha = { codigo: o.caixa, rotulo: '', local: '', capacidade: null, ativa: true, cadastrada: false, moedas: [], semPosicao: 0, cheia: false }
      porChave.set(chave, linha)
    }
    linha.moedas.push(o)
    if (o.posicao === null) linha.semPosicao += 1
  }
  const linhas = [...porChave.values()]
  for (const l of linhas) l.cheia = l.capacidade !== null && l.moedas.length >= l.capacidade
  return linhas.sort((a, b) => Number(b.cadastrada) - Number(a.cadastrada) || chaveDeCaixa(a.codigo).localeCompare(chaveDeCaixa(b.codigo)))
}

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
  /**
   * O tipo de moeda que a caixa guarda ('Entrega da Bandeira Olímpica', 'Direitos Humanos'…).
   * `null` = aceita qualquer tipo. Migration 040 (05/10/2026): a Bandeira foi cadastrada na caixa
   * dos Direitos Humanos porque nada dizia de que tipo era cada caixa.
   */
  tipoMoeda?: string | null
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
  tipoMoeda?: string | null
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
  const tipoBruto = String(e?.tipoMoeda ?? '').trim()
  if (tipoBruto.length > 80) return { ok: false, erro: 'O tipo de moeda tem no máximo 80 caracteres.' }
  const tipoMoeda = tipoBruto === '' ? null : tipoBruto
  return { ok: true, caixa: { codigo, rotulo, local, capacidade, ativa: e?.ativa !== false, tipoMoeda } }
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
  /** O tipo que a caixa guarda; ausente ou `null` = qualquer. */
  tipoMoeda?: string | null
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
      linha = { codigo: o.caixa, rotulo: '', local: '', capacidade: null, ativa: true, tipoMoeda: null, cadastrada: false, moedas: [], semPosicao: 0, cheia: false }
      porChave.set(chave, linha)
    }
    linha.moedas.push(o)
    if (o.posicao === null) linha.semPosicao += 1
  }
  const linhas = [...porChave.values()]
  for (const l of linhas) l.cheia = l.capacidade !== null && l.moedas.length >= l.capacidade
  return linhas.sort((a, b) => Number(b.cadastrada) - Number(a.cadastrada) || chaveDeCaixa(a.codigo).localeCompare(chaveDeCaixa(b.codigo)))
}

/** A caixa guarda este tipo de moeda? Sem tipo definido, guarda qualquer um. */
export function caixaAceitaTipo(caixa: { tipoMoeda?: string | null }, tipoMoeda: string): boolean {
  return !caixa.tipoMoeda || caixa.tipoMoeda === tipoMoeda
}

function extrairNumero(str: string): number {
  const match = str.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

/**
 * Retorna a caixa corrente para pré-seleção na bancada:
 * aquela onde a última moeda foi guardada, enquanto houver vaga.
 * Se cheia (ou inativa), passa para a próxima caixa cadastrada e ativa (EB-001 lotada → EB-002).
 */
export function caixaCorrente(caixas: readonly OcupacaoDaCaixa[], tipoMoeda?: string): string {
  const cadastradasAtivas = caixas.filter((c) => c.cadastrada && c.ativa && (!tipoMoeda || caixaAceitaTipo(c, tipoMoeda)))
  if (cadastradasAtivas.length === 0) {
    return caixas[0]?.codigo ?? ''
  }

  const todosOcupantes: Ocupante[] = []
  for (const c of caixas) {
    for (const m of c.moedas) {
      todosOcupantes.push(m)
    }
  }

  if (todosOcupantes.length === 0) {
    const primeiraComVaga = cadastradasAtivas.find((c) => !c.cheia)
    return (primeiraComVaga ?? cadastradasAtivas[0]).codigo
  }

  let ultimo = todosOcupantes[0]
  let maiorNum = extrairNumero(ultimo.codigoMoeda) || extrairNumero(ultimo.analise)

  for (let i = 1; i < todosOcupantes.length; i++) {
    const o = todosOcupantes[i]
    const num = extrairNumero(o.codigoMoeda) || extrairNumero(o.analise)
    if (num > maiorNum) {
      maiorNum = num
      ultimo = o
    }
  }

  const chaveUltima = chaveDeCaixa(ultimo.caixa)
  const caixaDaUltima = caixas.find((c) => chaveDeCaixa(c.codigo) === chaveUltima)

  if (caixaDaUltima && caixaDaUltima.cadastrada && caixaDaUltima.ativa && !caixaDaUltima.cheia) {
    return caixaDaUltima.codigo
  }

  const idx = cadastradasAtivas.findIndex((c) => chaveDeCaixa(c.codigo) === chaveUltima)
  if (idx >= 0) {
    for (let i = idx + 1; i < cadastradasAtivas.length; i++) {
      if (!cadastradasAtivas[i].cheia) return cadastradasAtivas[i].codigo
    }
    for (let i = 0; i < idx; i++) {
      if (!cadastradasAtivas[i].cheia) return cadastradasAtivas[i].codigo
    }
    return cadastradasAtivas[idx].codigo
  }

  const comVaga = cadastradasAtivas.find((c) => !c.cheia)
  return (comVaga ?? cadastradasAtivas[0]).codigo
}

/**
 * As próximas posições vagas da caixa selecionada para uma sequência de moedas.
 * Se a caixa já tem 50 moedas, a próxima é 51, e 20 moedas saem 51, 52... 70.
 * Respeita tanto posições numéricas ocupadas quanto posições marcadas para ignorar (ex.: editadas à mão).
 */
export function proximasPosicoesDaCaixa(
  caixa: OcupacaoDaCaixa | undefined,
  quantidade: number,
  ignorar: ReadonlySet<number> = new Set(),
): number[] {
  if (quantidade <= 0) return []

  const ocupadas = new Set<number>()
  for (const m of caixa?.moedas ?? []) {
    if (typeof m.posicao === 'number' && m.posicao > 0) {
      ocupadas.add(m.posicao)
    }
  }

  const count = caixa?.moedas.length ?? 0
  const maxOcupada = ocupadas.size > 0 ? Math.max(...ocupadas) : 0
  let candidata = Math.max(count, maxOcupada) + 1

  const resultado: number[] = []
  for (let i = 0; i < quantidade; i++) {
    while (ocupadas.has(candidata) || ignorar.has(candidata)) {
      candidata++
    }
    resultado.push(candidata)
    ocupadas.add(candidata)
    candidata++
  }

  return resultado
}


export interface Lugar {
  caixa: string
  posicao: number
}

/**
 * Onde cada moeda nova vai ficar — a regra que a capacidade e o tipo da caixa passam a ter (05/10/2026).
 *
 * O PROBLEMA QUE ISTO FECHA. A caixa tinha capacidade e a bancada só a exibia: o Rogério registrou mais
 * de 100 moedas na EB-001, e a Bandeira entrou na caixa dos Direitos Humanos, sem que nada barrasse.
 * Agora quem grava a análise pede os lugares aqui, e a moeda NÃO é recusada por a caixa estar cheia —
 * ela é MOVIDA para a próxima caixa do mesmo tipo com vaga, que é o que o operador faria à mão.
 *
 * COMO ESCOLHE. Entre as caixas cadastradas, ativas e que aceitam o tipo (`tipoMoeda` nulo aceita
 * qualquer), começa pela `preferida` — a que o operador digitou ou a caixa inicial do cadastro — e
 * segue pela ordem do código (EB-001, EB-002…). Em cada caixa usa as menores posições livres de 1
 * até a capacidade; a caixa sem capacidade informada não enche.
 *
 * `lugares: null` quer dizer que NÃO há caixa cadastrada para o tipo: quem chamou mantém o que foi
 * digitado, como sempre foi — a regra só passa a valer quando há onde guardar. Se há caixa e nenhuma
 * tem vaga, devolve o erro com o que fazer.
 */
export function alocarNasCaixas(
  caixas: readonly CaixaCadastrada[],
  ocupantes: readonly Ocupante[],
  tipoMoeda: string,
  quantidade: number,
  preferida: string | null,
): { ok: true; lugares: Lugar[] | null } | { ok: false; erro: string } {
  const elegiveis = caixas.filter((c) => c.ativa && caixaAceitaTipo(c, tipoMoeda))
  if (elegiveis.length === 0) return { ok: true, lugares: null }

  const chavePreferida = preferida ? chaveDeCaixa(preferida) : ''
  const ordenadas = [...elegiveis].sort(
    (a, b) =>
      Number(chaveDeCaixa(b.codigo) === chavePreferida) - Number(chaveDeCaixa(a.codigo) === chavePreferida) ||
      chaveDeCaixa(a.codigo).localeCompare(chaveDeCaixa(b.codigo)),
  )

  const lugares: Lugar[] = []
  for (const c of ordenadas) {
    if (lugares.length >= quantidade) break
    const chave = chaveDeCaixa(c.codigo)
    const nela = ocupantes.filter((o) => chaveDeCaixa(o.caixa) === chave)
    const ocupadas = new Set(nela.map((o) => o.posicao).filter((p): p is number => typeof p === 'number' && p > 0))
    const vagas = c.capacidade === null ? Infinity : Math.max(0, c.capacidade - nela.length)

    let candidata = 1
    let usadas = 0
    while (lugares.length < quantidade && usadas < vagas) {
      while (ocupadas.has(candidata)) candidata++
      if (c.capacidade !== null && candidata > c.capacidade) break
      lugares.push({ caixa: c.codigo, posicao: candidata })
      ocupadas.add(candidata)
      candidata++
      usadas++
    }
  }

  if (lugares.length < quantidade) {
    return {
      ok: false,
      erro: `Não há vaga para ${quantidade - lugares.length} moeda(s) de ${tipoMoeda}: as caixas desse tipo estão cheias. Cadastre outra em Bancada › Caixas e tente de novo.`,
    }
  }
  return { ok: true, lugares }
}

export type Colocacao = { ok: true; caixa: string | null; posicao: number | null; movida: boolean } | { ok: false; erro: string }

/**
 * Decide onde UMA moeda fica, a partir do que o operador digitou.
 *
 * O digitado vale quando a caixa existe, está ativa, aceita o tipo, tem vaga e a posição escolhida
 * está livre e dentro da capacidade. Senão a moeda é MOVIDA: `alocarNasCaixas` acha a próxima caixa do
 * tipo com vaga, preferindo a digitada. Sem nenhuma caixa cadastrada para o tipo, o digitado fica como
 * está — a regra só existe onde há onde guardar.
 *
 * Soma a moeda aos `ocupantes` (que o chamador passa como cópia de trabalho), para que a próxima
 * moeda do mesmo lote já enxergue o lugar tomado.
 */
export function colocarMoeda(
  caixas: readonly CaixaCadastrada[],
  ocupantes: Ocupante[],
  moeda: { codigoMoeda: string; tipoMoeda: string; analise: string },
  digitado: { caixa: string | null; posicao: number | null },
  preferida: string | null,
): Colocacao {
  const digitada = (digitado.caixa ?? '').trim() || null
  const elegiveis = caixas.filter((c) => c.ativa && caixaAceitaTipo(c, moeda.tipoMoeda))
  const registrar = (caixa: string, posicao: number | null): void => {
    ocupantes.push({ caixa, posicao, codigoMoeda: moeda.codigoMoeda, tipoMoeda: moeda.tipoMoeda, dono: '', analise: moeda.analise })
  }

  if (elegiveis.length === 0) {
    if (digitada) registrar(digitada, digitado.posicao)
    return { ok: true, caixa: digitada, posicao: digitado.posicao, movida: false }
  }

  if (digitada) {
    const chave = chaveDeCaixa(digitada)
    const escolhida = elegiveis.find((c) => chaveDeCaixa(c.codigo) === chave)
    const nela = ocupantes.filter((o) => chaveDeCaixa(o.caixa) === chave)
    const posicao = digitado.posicao
    const cabe = escolhida !== undefined && (escolhida.capacidade === null || nela.length < escolhida.capacidade)
    const posicaoServe =
      posicao !== null &&
      Number.isInteger(posicao) &&
      posicao >= 1 &&
      (escolhida?.capacidade == null || posicao <= escolhida.capacidade) &&
      !nela.some((o) => o.posicao === posicao)
    if (escolhida && cabe && posicaoServe) {
      registrar(escolhida.codigo, posicao)
      return { ok: true, caixa: escolhida.codigo, posicao, movida: false }
    }
  }

  const alvo = alocarNasCaixas(caixas, ocupantes, moeda.tipoMoeda, 1, digitada ?? preferida)
  if (!alvo.ok) return alvo
  const lugar = alvo.lugares![0]!
  registrar(lugar.caixa, lugar.posicao)
  const pedida = digitada ?? preferida
  return { ok: true, caixa: lugar.caixa, posicao: lugar.posicao, movida: pedida !== null && chaveDeCaixa(lugar.caixa) !== chaveDeCaixa(pedida) }
}

/**
 * O retrato da custódia de UMA conta, do jeito que o dono precisa ver.
 *
 * POR QUE ISTO É REGRA DE DOMÍNIO E NÃO CONTA FEITA NA TELA
 * ---------------------------------------------------------
 * Até 25/09/2026 as informações de custódia do cliente existiam, mas espalhadas:
 * o aviso de débito somava faturas em aberto por um critério, a aba de Faturas
 * listava por outro, e nenhuma das duas respondia as três perguntas que o
 * Gabriel apontou como faltando — quanto eu pago por mês, quando vence o
 * próximo, e o que eu já paguei até aqui.
 *
 * Três telas passaram a fazer essas contas (Recibos, Minha conta e a página de
 * detalhes). Repetir a soma em três lugares é como os cartões de plano
 * divergiram entre si em 21/09 — um com selo, outro sem, na mesma tela. Então a
 * conta é uma só, aqui, pura e testável.
 *
 * O PREÇO MENSAL É O DO ACERVO, NÃO O DO PLANO
 * --------------------------------------------
 * A mensalidade estimada multiplica o número de moedas guardadas pela tarifa
 * vigente, e não a soma dos planos contratados. É o número certo porque a
 * cobrança funciona assim: moeda sem plano paga o ciclo mensal pela mesma
 * tarifa. Quem olhasse só os planos veria R$ 2,00 tendo 11 moedas guardadas.
 */

import { custodiaImpedeNegociar } from '@/domain/bloqueio-por-debito'
import { guardaPagaAteDaMoeda, proximaCobrancaDaMoeda } from '@/domain/cobranca-de-entrada'
import { competenciaAtual, fimDaCoberturaDaFatura, fimDaCompetencia } from '@/domain/custody'
import { CUSTODIA_MENSAL_POR_MOEDA_CENTS } from '@/domain/fees'
import type {
  AppState,
  Cents,
  Coin,
  FaturaCustodia,
  PlanoCustodia,
  Timestamp,
  UserEmail,
} from '@/domain/types'

/**
 * Uma linha de "Próximas cobranças": as moedas que renovam no MESMO dia, cobradas juntas (26/10/2026).
 *
 * O ciclo é de cada moeda (src/domain/ciclo-custodia.ts), então uma conta tem várias datas de cobrança no
 * mês. Até 26/10 a tela mostrava uma data só — a mais próxima —, e o Rogério, que tinha acabado de pagar a
 * custódia de 130 moedas, viu "próxima cobrança 28/10" sem saber que era de UMA moeda. Agora cada data
 * diz quantas moedas e quanto.
 */
export interface CobrancaDoGrupo {
  /** O dia da cobrança (00:00 de Brasília). */
  em: Timestamp
  /** Quantas moedas renovam nesse dia. */
  moedas: number
  /** Quanto vai ser cobrado, pela tarifa vigente. */
  valorCents: Cents
  /** Quantas delas estão travadas para negociar agora, por custódia não paga. */
  travadas: number
}

export interface ResumoDaCustodia {
  /** Moedas sob guarda com recibo vivo — as que pagam custódia. */
  moedasGuardadas: number
  /** Tarifa por moeda, por mês, da Tabela de Taxas vigente. */
  porMoedaCents: Cents
  /** O que a conta paga por mês pelo acervo de hoje. */
  mensalidadeCents: Cents
  /** Competência que a conta está pagando agora ('AAAA-MM'). */
  competencia: string
  /**
   * Quando a conta é cobrada de novo: o aniversário de ciclo mais próximo entre
   * as moedas sob guarda (src/domain/ciclo-custodia.ts). `null` sem moeda.
   */
  proximaCobrancaEm: Timestamp | null
  /** Uma linha por data de cobrança, da mais próxima para a mais distante. Vazio sem moeda. */
  cobrancasPorData: CobrancaDoGrupo[]
  /** Faturas ainda não pagas nem canceladas, da mais antiga para a mais nova. */
  emAberto: FaturaCustodia[]
  /** Soma das faturas em aberto. */
  emAbertoCents: Cents
  /** Vencimento mais próximo entre as faturas em aberto; `null` quando não há nenhuma. */
  proximoVencimento: Timestamp | null
  /** Há fatura vencida — é o que bloqueia venda e retirada. */
  vencida: boolean
  /**
   * Até que competência a guarda está PAGA — `null` se nunca foi.
   *
   * É a resposta de "até quando estou coberto", e não tem nada a ver com o
   * `dataVencimento` da fatura, que é o prazo para pagar. As duas datas se
   * cruzam de um jeito que confunde: uma fatura emitida no dia 25 pode ter
   * prazo até o dia 5 do mês seguinte e cobrir a guarda só até o dia 30.
   */
  pagaAteCompetencia: string | null
  /**
   * O último instante coberto pelo que já foi pago; `null` quando nada foi. Vem
   * da `coberturaAte` da fatura (o fim do ciclo da moeda) e, nas faturas
   * anteriores a 02/10/2026, do fim do mês da competência.
   */
  cobertaAte: Timestamp | null
  /** Faturas pagas, da mais recente para a mais antiga. É o extrato. */
  pagas: FaturaCustodia[]
  /** Tudo o que a conta já pagou de custódia. */
  totalPagoCents: Cents
  /** Planos que ainda cobram: vigentes e os que esperam o primeiro pagamento. */
  planosAtivos: PlanoCustodia[]
  /** Planos cancelados ou encerrados — ficam no histórico, não somem. */
  planosEncerrados: PlanoCustodia[]
}

function faturasDaConta(state: AppState, email: UserEmail): FaturaCustodia[] {
  return (state.faturasCustodia ?? []).filter((f) => f.userEmail === email)
}

export function resumoDaCustodia(
  state: AppState,
  email: UserEmail,
  porMoedaCents: Cents = CUSTODIA_MENSAL_POR_MOEDA_CENTS,
  agora: Timestamp = Date.now(),
): ResumoDaCustodia {
  const user = state.users[email]
  const moedasGuardadas = (user?.coins ?? []).filter((c) => c.recibo?.status !== 'Extinto').length

  const faturas = faturasDaConta(state, email)
  const emAberto = faturas
    .filter((f) => f.status !== 'paga' && f.status !== 'cancelada')
    .sort((a, b) => a.dataVencimento - b.dataVencimento)
  const pagas = faturas
    .filter((f) => f.status === 'paga')
    .sort((a, b) => (b.dataPagamento ?? b.dataEmissao) - (a.dataPagamento ?? a.dataEmissao))

  const planos = (state.planosCustodia ?? []).filter((p) => p.userEmail === email)
  const competencia = competenciaAtual(agora)

  // O que já foi pago de mais adiantado: fatura liquidada ou plano vigente com
  // `pagoAteCompetencia` escrito. A cobertura em instante vem da própria fatura.
  let pagaAteCompetencia: string | null = null
  let cobertaAte: Timestamp | null = null
  for (const f of pagas) {
    if (!pagaAteCompetencia || f.competencia > pagaAteCompetencia) pagaAteCompetencia = f.competencia
    const fim = fimDaCoberturaDaFatura(f)
    if (cobertaAte === null || fim > cobertaAte) cobertaAte = fim
  }
  for (const p of planos) {
    if (p.status !== 'vigente' || !p.pagoAteCompetencia) continue
    if (!pagaAteCompetencia || p.pagoAteCompetencia > pagaAteCompetencia) {
      pagaAteCompetencia = p.pagoAteCompetencia
    }
    const fim = fimDaCompetencia(p.pagoAteCompetencia)
    if (cobertaAte === null || fim > cobertaAte) cobertaAte = fim
  }

  // Por moeda, com a mesma pergunta do cron: o que já foi cobrado (inclusive pela regra antiga, em
  // 01/10) conta, então a próxima cobrança não é só o aniversário.
  const moedasVivas = (user?.coins ?? []).filter((c) => c.recibo?.status !== 'Extinto')
  const proximas = moedasVivas.map((c) => proximaCobrancaDaMoeda(state, c, agora))
  const coberturas = moedasVivas
    .map((c) => guardaPagaAteDaMoeda(state, c, agora))
    .filter((t): t is Timestamp => t !== null)
  // Com moedas, a cobertura da conta é a MENOR entre as moedas pagas: é quando a primeira lapsa.
  if (coberturas.length > 0) cobertaAte = Math.min(...coberturas)

  return {
    moedasGuardadas,
    porMoedaCents,
    mensalidadeCents: moedasGuardadas * porMoedaCents,
    competencia,
    proximaCobrancaEm: proximas.length > 0 ? Math.min(...proximas) : null,
    cobrancasPorData: agruparPorData(state, moedasVivas, proximas, porMoedaCents, agora),
    emAberto,
    emAbertoCents: emAberto.reduce((soma, f) => soma + f.valorCents, 0),
    proximoVencimento: emAberto.length > 0 ? emAberto[0]!.dataVencimento : null,
    // Status 'atrasada' OU vencimento no passado: o status só vira 'atrasada'
    // quando alguma rotina passa pela fatura, e entre a virada do prazo e essa
    // passagem a tela mostraria "em dia" uma fatura que já bloqueia a venda.
    vencida: emAberto.some((f) => f.status === 'atrasada' || f.dataVencimento < agora),
    pagaAteCompetencia,
    cobertaAte,
    pagas,
    totalPagoCents: pagas.reduce((soma, f) => soma + f.valorCents, 0),
    planosAtivos: planos
      .filter((p) => p.status === 'vigente' || p.status === 'aguardando_pagamento')
      .sort((a, b) => b.criadoEm - a.criadoEm),
    planosEncerrados: planos
      .filter((p) => p.status === 'cancelado' || p.status === 'encerrado')
      .sort((a, b) => b.criadoEm - a.criadoEm),
  }
}

/**
 * Os lotes (envio ou cadastro) de que a fatura cobra a guarda — "RO-ENV-0003", "RO-DIR-0004".
 *
 * Cada lote é uma custódia própria, com data própria, e o extrato precisa dizer de qual é a linha
 * (pedido do Gabriel, 05/10/2026). Moeda que já saiu da conta não aparece: o lote dela não é mais
 * assunto de quem lê.
 */
export function lotesDaFatura(coins: readonly Coin[], fatura: Pick<FaturaCustodia, 'moedaIds'>): string[] {
  const doDono = new Map(coins.map((c) => [c.id, c.protocolo]))
  const lotes = new Set<string>()
  for (const id of fatura.moedaIds ?? []) {
    const lote = doDono.get(id)
    if (lote) lotes.add(lote)
  }
  return [...lotes].sort()
}

/**
 * O rótulo humano da origem da fatura, para o extrato.
 *
 * O cliente não tem por que saber o que é 'ciclo_mensal' — e a diferença entre
 * as origens é justamente o que responde "por que fui cobrado isto aqui?".
 */
export function rotuloDaOrigem(origem: FaturaCustodia['origem']): string {
  switch (origem) {
    case 'contratacao':
      return 'Contratação do plano'
    case 'renovacao_anual':
      return 'Renovação do plano'
    case 'entrada_no_acervo':
      return 'Entrada de moeda na custódia'
    case 'compra':
      return 'Custódia do 1º mês, paga na compra'
    default:
      return 'Mensalidade de custódia'
  }
}

/** As moedas agrupadas pelo dia da próxima cobrança — a lista de "Próximas cobranças". */
function agruparPorData(
  state: AppState,
  moedas: readonly Coin[],
  proximas: readonly Timestamp[],
  porMoedaCents: Cents,
  agora: Timestamp,
): CobrancaDoGrupo[] {
  const porDia = new Map<Timestamp, CobrancaDoGrupo>()
  moedas.forEach((c, i) => {
    const em = proximas[i]!
    const g = porDia.get(em) ?? { em, moedas: 0, valorCents: 0, travadas: 0 }
    g.moedas++
    g.valorCents += porMoedaCents
    if (custodiaImpedeNegociar(state, c.id, agora)) g.travadas++
    porDia.set(em, g)
  })
  return [...porDia.values()].sort((a, b) => a.em - b.em)
}

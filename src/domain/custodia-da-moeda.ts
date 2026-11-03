/**
 * A custódia de UMA moeda — a regra única (03/11/2026).
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * De setembro a novembro de 2026 a cobrança de custódia errou de um jeito novo quase toda semana, e a
 * causa era sempre a mesma: havia DOIS modelos de cobrança vivos ao mesmo tempo — o "plano" contado por
 * mês do calendário (`pagoAteCompetencia`, renovado por um cron no dia 1º) e o ciclo de cada moeda,
 * contado do dia em que ela foi aceita —, e CINCO funções diferentes respondendo "até quando esta moeda
 * está paga?". Cada correção mexia numa delas e deixava as outras.
 *
 * O caso que encerrou isso: o Sidnei Pena pagou em 27/10 a custódia do envio RO-ENV-0019, a moeda
 * RO-000182 foi aceita em 30/10, e em 03/11 ela tinha três respostas ao mesmo tempo — a trava dizia
 * "pago até 31/10" (o plano por mês do calendário), a tela dizia 29/11 e a próxima cobrança dizia 30/12.
 * A moeda travou em 01/11, e no mesmo dia o cron emitiu uma "renovação do plano" que não devia existir.
 *
 * Em 03/11/2026 o Gabriel mandou zerar as regras e refazer. Este arquivo é a regra inteira; o plano por mês
 * do calendário, a renovação do dia 1º e as contas por competência saíram do código.
 *
 * A REGRA, EM QUATRO FRASES (explicável ao Rogério)
 * -------------------------------------------------
 *  1. Cada moeda tem UMA data: "paga até". É o fim da cobertura mais adiantada entre as faturas PAGAS de
 *     quem guarda a moeda agora. Nada mais conta: nem plano, nem mês do calendário, nem fatura em aberto.
 *  2. A moeda fica livre para negociar até as 23:59 do dia da cobrança seguinte (o dia depois do "paga
 *     até"); a partir daí, só pagando. Moeda nunca paga não negocia.
 *  3. A cobrança seguinte é sempre o dia seguinte ao "paga até" — que é o aniversário do dia em que a moeda
 *     entrou na guarda (ou foi comprada).
 *  4. O cron emite fatura só para o ciclo em curso da moeda que ainda não está COBRADO: nem pago, nem com
 *     fatura em aberto do dono atual cobrindo-o.
 *
 * Toda tela, trava e rotina pergunta por aqui. Se precisar de outra resposta para "até quando está paga",
 * a resposta está errada.
 *
 * Regra pura, sem I/O.
 */

import { cicloDaMoeda, inicioDoDiaBrasilia, type CicloDaMoeda } from '@/domain/ciclo-custodia'
import { DIAS_CARENCIA_BLOQUEIO } from '@/domain/custody'
import type { AppState, Coin, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Quem guarda a moeda AGORA, e desde quando.
 *
 * `desde` só existe para moeda que já trocou de dono (`transferido`): é o início do dia da compra, e
 * fatura de antes disso é de outro período de guarda (de outro dono, ou do mesmo dono antes de vender e
 * recomprar). Moeda que nunca foi vendida é do mesmo dono desde o início: `desde` é zero.
 */
export function donoAtualDaMoeda(
  state: AppState,
  coinId: string,
): { email: UserEmail; desde: Timestamp } | null {
  for (const [email, u] of Object.entries(state.users)) {
    const coin = u.coins.find((c) => c.id === coinId)
    if (!coin) continue
    return { email, desde: coin.transferido ? (inicioDoDiaBrasilia(coin.entrada) ?? 0) : 0 }
  }
  return null
}

/**
 * A fatura é de quem guarda a moeda agora, dentro do período de guarda dele?
 *
 * Emitida OU paga dentro do período: a moeda comprada antes de 21/10/2026 recomeça o ciclo no dia do
 * primeiro pagamento do dono novo (`recomecarCicloNoPrimeiroPagamento`), e esse dia vira o `desde`. A
 * fatura que ele recebeu antes e pagou depois é dele, e é ela que abre o período.
 *
 * A custódia que o dono anterior pagou NÃO vale para o dono novo (Gabriel, 21/10/2026): toda moeda tem a
 * custódia do titular atual paga, inclusive a comprada.
 */
export function faturaDoGuardadoAtual(
  f: Pick<FaturaCustodia, 'userEmail' | 'dataEmissao'> & { dataPagamento?: Timestamp | null },
  dono: { email: UserEmail; desde: Timestamp },
): boolean {
  return f.userEmail === dono.email && Math.max(f.dataEmissao, f.dataPagamento ?? 0) >= dono.desde
}

/** As faturas não canceladas do dono atual que cobram a guarda desta moeda. */
function faturasDoDonoAtual(state: AppState, coinId: string): FaturaCustodia[] {
  const dono = donoAtualDaMoeda(state, coinId)
  if (!dono) return []
  return (state.faturasCustodia ?? []).filter(
    (f) => f.status !== 'cancelada' && (f.moedaIds ?? []).includes(coinId) && faturaDoGuardadoAtual(f, dono),
  )
}

/** A maior cobertura entre as faturas — `null` quando nenhuma tem cobertura gravada. */
function maiorCobertura(faturas: readonly FaturaCustodia[]): Timestamp | null {
  let maior: Timestamp | null = null
  for (const f of faturas) {
    // Fatura sem `coberturaAte` não cobre período nenhum: é a do pagamento antecipado do envio ainda sem
    // moeda (ganha a cobertura quando as moedas são aceitas) ou registro anterior a 02/10/2026.
    if (f.coberturaAte == null) continue
    if (maior === null || f.coberturaAte > maior) maior = f.coberturaAte
  }
  return maior
}

/**
 * Até quando a guarda desta moeda está PAGA — o último instante coberto —, ou `null` se nunca foi.
 *
 * É A data da moeda. Fatura em aberto não cobre nada: é só uma conta a pagar.
 */
export function custodiaPagaAte(state: AppState, coinId: string): Timestamp | null {
  return maiorCobertura(faturasDoDonoAtual(state, coinId).filter((f) => f.status === 'paga'))
}

/**
 * Até quando a guarda desta moeda já está COBRADA — paga, ou com fatura do dono atual esperando
 * pagamento. É o que impede o cron de emitir a mesma conta duas vezes.
 */
export function custodiaCobradaAte(state: AppState, coinId: string): Timestamp | null {
  return maiorCobertura(faturasDoDonoAtual(state, coinId))
}

/**
 * O instante depois do qual a moeda paga até `pagaAte` trava para negociar: 00:00 do dia seguinte ao da
 * cobrança.
 *
 * O ciclo seguinte começa no instante depois de `pagaAte` (00:00 do dia da cobrança); a moeda segue livre
 * até as 23:59 desse dia (`DIAS_CARENCIA_BLOQUEIO`, decisão do Gabriel de 27/09/2026) e trava depois.
 */
export function travaDaCustodiaEm(pagaAte: Timestamp): Timestamp {
  return pagaAte + 1 + DIAS_CARENCIA_BLOQUEIO * DIA_MS
}

/**
 * A custódia desta moeda IMPEDE negociá-la agora? — a única pergunta que todo ponto de venda faz.
 *
 * Moeda nunca paga não negocia, ainda que a fatura esteja dentro do prazo (Gabriel, 12/10/2026, depois que
 * o Sidnei vendeu uma moeda 7 minutos depois de ela ser aceita, sem pagar). Moeda paga negocia até o fim do
 * dia da cobrança seguinte. Pergunta-se pela cobertura PAGA, e não por fatura vencida: se o cron falhar e
 * não emitir a fatura, a moeda ainda trava quando a cobertura acaba, em vez de negociar de graça.
 */
export function custodiaImpedeNegociar(
  state: AppState,
  coinId: string,
  agora: Timestamp = Date.now(),
): boolean {
  const pagaAte = custodiaPagaAte(state, coinId)
  if (pagaAte === null) return true
  return agora > travaDaCustodiaEm(pagaAte)
}

/** O ciclo já está cobrado — pago ou com fatura aberta do dono atual que vai até o fim dele? */
export function cicloJaCobrado(state: AppState, coinId: string, ciclo: CicloDaMoeda): boolean {
  const cobradaAte = custodiaCobradaAte(state, coinId)
  return cobradaAte !== null && cobradaAte >= ciclo.fim - 1
}

/**
 * Quando esta moeda é cobrada de novo — a data que a tela mostra e a que o cron obedece.
 *
 * Se o ciclo em curso ainda não está cobrado, a cobrança já é devida e a data devolvida é o começo dele
 * (hoje ou antes): o cron emite a fatura. Senão, é o começo do primeiro ciclo ainda não cobrado.
 */
export function proximaCobrancaDaMoeda(state: AppState, coin: Coin, agora: Timestamp = Date.now()): Timestamp {
  let ciclo = cicloDaMoeda(coin.entrada, agora)
  // O teto é só uma guarda contra laço infinito: seriam 50 anos de ciclos pagos.
  for (let i = 0; i < 600; i++) {
    if (!cicloJaCobrado(state, coin.id, ciclo)) return ciclo.inicio
    ciclo = cicloDaMoeda(coin.entrada, ciclo.fim)
  }
  return ciclo.inicio
}

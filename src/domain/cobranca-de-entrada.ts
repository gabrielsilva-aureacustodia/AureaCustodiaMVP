/**
 * A cobrança de custódia, moeda a moeda, no ritmo do ciclo de cada uma.
 *
 * DUAS PORTAS, UMA REGRA
 * ----------------------
 * A fatura de custódia nasce de dois jeitos, e os dois passam por
 * `emitirFaturasDosCiclos`:
 *
 *   1. na ENTRADA — a moeda acabou de ser aceita (cadastro direto, cadastro sem
 *      envio, ou envio cuja análise fechou): `cobrarEntradaNoAcervo`;
 *   2. na RENOVAÇÃO — o aniversário do ciclo da moeda chegou: o cron diário de
 *      faturamento (src/server/custodia/faturamento.ts).
 *
 * O ciclo de cada moeda começa no dia em que ela foi aceita e se renova todo mês
 * no mesmo dia — ver src/domain/ciclo-custodia.ts. Até 02/10/2026 a renovação
 * era um cron no dia 1º que cobrava o acervo inteiro de uma vez, e quem pagou em
 * 25/09 foi cobrado de novo em 01/10.
 *
 * POR QUE A ENTRADA TEM COBRANÇA PRÓPRIA (25/09/2026)
 * ---------------------------------------------------
 * Moeda registrada pelo painel nasce guardada, sem plano e sem fatura. No banco
 * de 25/09/2026 eram 28 moedas nessa situação, nenhuma cobrada, e por isso
 * nenhuma notificava nada ao dono. A guarda começa quando a moeda entra no
 * armazém, então a cobrança também começa ali.
 *
 * O QUE ESTA REGRA NÃO FAZ
 * ------------------------
 * Não cobra moeda cujo ciclo já está resolvido: paga, ou com fatura aberta do
 * mesmo ciclo ou de um ciclo mais novo. É o caso da moeda comprada no
 * marketplace — o ciclo dela já foi quitado pelo vendedor, e cobrar o comprador
 * de novo seria cobrar duas vezes pela mesma guarda. Do ciclo seguinte em
 * diante, cobra o dono novo, que é o certo.
 *
 * "Um ciclo mais novo" importa na transição de 02/10/2026: as faturas de
 * 01/10, emitidas pela regra antiga, valem como a cobrança do mês e não podem
 * ser cobradas de novo só porque o aniversário da moeda cai depois.
 */

import { cicloDaMoeda, dataBrasilia, type CicloDaMoeda } from '@/domain/ciclo-custodia'
import { moedasFaturaveis } from '@/domain/custody'
import { CUSTODIA_MENSAL_POR_MOEDA_CENTS } from '@/domain/fees'
import { moedasCobertas, type TabelaDeTaxasPlano } from '@/domain/plano-custodia'
import { custodiaPagaAteCompetencia } from '@/domain/bloqueio-por-debito'
import type { AppState, Coin, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'

/**
 * A moeda já tem a guarda deste ciclo resolvida — paga ou cobrada?
 *
 * Duas fontes: `custodiaPagaAteCompetencia`, que responde até quando está PAGA
 * (por plano vigente ou por fatura liquidada), e as faturas em aberto, que
 * respondem se já existe boleto emitido esperando pagamento. A fatura em aberto
 * vale se for deste ciclo OU de um mais novo (competência maior ou igual).
 */
export function custodiaResolvidaNaCompetencia(
  state: AppState,
  coinId: string,
  competencia: string,
): boolean {
  const pagaAte = custodiaPagaAteCompetencia(state, coinId)
  if (pagaAte && pagaAte >= competencia) return true

  return (state.faturasCustodia ?? []).some(
    (f) =>
      f.competencia >= competencia &&
      f.status !== 'cancelada' &&
      (f.moedaIds ?? []).includes(coinId),
  )
}

/**
 * Quando esta moeda é cobrada de novo — a data que a tela mostra como "próxima
 * cobrança".
 *
 * Responde com a MESMA pergunta do cron (`custodiaResolvidaNaCompetencia`), e
 * não só pelo aniversário: quem foi cobrado em 01/10 pela regra antiga já tem o
 * ciclo de outubro resolvido, então a moeda aceita em 21/09 só é cobrada de novo
 * em 21/11, e não em 21/10. Mostrar 21/10 enquanto o cron cobra 21/11 foi o
 * defeito que o Gabriel apontou em 03/10/2026.
 *
 * Se o ciclo em curso ainda NÃO está resolvido, a cobrança já é devida e a data
 * devolvida é a do começo dele (hoje ou antes) — o cron emite a fatura.
 */
export function proximaCobrancaDaMoeda(state: AppState, coin: Coin, agora: Timestamp = Date.now()): Timestamp {
  let ciclo = cicloDaMoeda(coin.entrada, agora)
  // O teto é só uma guarda contra laço infinito: seriam 50 anos de ciclos pagos.
  for (let i = 0; i < 600; i++) {
    if (!custodiaResolvidaNaCompetencia(state, coin.id, ciclo.competencia)) return ciclo.inicio
    ciclo = cicloDaMoeda(coin.entrada, ciclo.fim)
  }
  return ciclo.inicio
}

/**
 * Até quando a guarda desta moeda está PAGA — o último instante coberto —, ou
 * `null` se nunca foi paga. Só conta pagamento: fatura em aberto não cobre nada.
 *
 * É a competência paga mais adiantada, levada ao fim do ciclo da moeda: paga a
 * competência 2026-10 de uma moeda aceita em 21/09, a guarda vai até 20/11, que
 * é quando o ciclo de outubro termina.
 */
export function guardaPagaAteDaMoeda(state: AppState, coin: Coin, agora: Timestamp = Date.now()): Timestamp | null {
  const pagaAte = custodiaPagaAteCompetencia(state, coin.id)
  if (!pagaAte) return null

  let ciclo = cicloDaMoeda(coin.entrada, agora)
  for (let i = 0; i < 600 && ciclo.competencia <= pagaAte; i++) {
    ciclo = cicloDaMoeda(coin.entrada, ciclo.fim)
  }
  return ciclo.inicio - 1
}

/**
 * Emite as faturas dos ciclos que estão devidos para as moedas da conta.
 *
 * Muta o estado: acrescenta as faturas a `state.faturasCustodia` e, quando o
 * cliente tem saldo, debita e marca cada uma como paga — exatamente o que o
 * ciclo sempre fez. Devolve as faturas criadas (vazio quando não havia o que
 * cobrar).
 *
 * Moedas de ciclos diferentes viram faturas diferentes: a fatura tem uma
 * competência e um fim de cobertura só. Moedas aceitas no mesmo dia andam
 * juntas na mesma fatura.
 *
 * `moedaIds` restringe a emissão a essas moedas (a entrada); sem ele, todas as
 * moedas sob guarda da conta são consideradas (o cron).
 *
 * Roda dentro do `mutateState` de quem chama: a moeda e a cobrança dela nascem
 * na mesma transação. Registrar a moeda e falhar a cobrança em seguida deixaria
 * acervo sem custódia.
 */
export function emitirFaturasDosCiclos(
  state: AppState,
  userEmail: UserEmail,
  origem: 'entrada_no_acervo' | 'ciclo_mensal',
  taxas: TabelaDeTaxasPlano | undefined,
  agora: Timestamp = Date.now(),
  moedaIds?: readonly string[],
): FaturaCustodia[] {
  const user = state.users[userEmail]
  if (!user) return []

  state.faturasCustodia = state.faturasCustodia ?? []
  const planos = (state.planosCustodia ?? []).filter((p) => p.userEmail === userEmail)
  const cobertasPorCompetencia = new Map<string, Set<string>>()

  const grupos = new Map<string, { ciclo: CicloDaMoeda; ids: string[] }>()
  for (const moeda of moedasFaturaveis(user)) {
    if (moedaIds && !moedaIds.includes(moeda.id)) continue

    const ciclo = cicloDaMoeda(moeda.entrada, agora)

    let cobertas = cobertasPorCompetencia.get(ciclo.competencia)
    if (!cobertas) {
      cobertas = moedasCobertas(planos, ciclo.competencia)
      cobertasPorCompetencia.set(ciclo.competencia, cobertas)
    }
    if (cobertas.has(moeda.id)) continue
    if (custodiaResolvidaNaCompetencia(state, moeda.id, ciclo.competencia)) continue

    const chave = `${ciclo.competencia}#${ciclo.fim}`
    const grupo = grupos.get(chave)
    if (grupo) grupo.ids.push(moeda.id)
    else grupos.set(chave, { ciclo, ids: [moeda.id] })
  }

  const porMoeda = taxas?.custodiaMensalPorMoeda ?? CUSTODIA_MENSAL_POR_MOEDA_CENTS
  const sufixo = userEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const criadas: FaturaCustodia[] = []

  for (const { ciclo, ids } of grupos.values()) {
    const valorCents = porMoeda * ids.length
    // `ENT` no id da entrada, para ela não colidir com a do ciclo do mesmo mês,
    // que usa o mesmo carimbo de tempo quando as duas nascem no mesmo ms. O dia
    // do ciclo separa as faturas de moedas de aniversários diferentes.
    const marca = origem === 'entrada_no_acervo' ? 'ENT-' : ''
    const dia = dataBrasilia(ciclo.inicio).slice(0, 2)
    const fatura: FaturaCustodia = {
      id: `FAT-${ciclo.competencia}-${sufixo}-${marca}D${dia}-${agora}`,
      userEmail,
      competencia: ciclo.competencia,
      quantidadeMoedas: ids.length,
      moedaIds: [...ids],
      valorCents,
      status: 'pendente',
      dataEmissao: agora,
      // O vencimento é o próximo aniversário (00:00 de Brasília): `faturaBloqueia`
      // soma um dia de carência, então a moeda só trava depois das 23:59 desse dia.
      dataVencimento: ciclo.fim,
      coberturaAte: ciclo.fim - 1,
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
      planoId: null,
      origem,
    }

    // Débito automático quando há saldo, a mesma regra do ciclo mensal: quem tem
    // dinheiro na conta não precisa de um boleto para R$ 2,00, e a moeda já sai
    // liberada para anunciar.
    if (user.balance >= valorCents) {
      user.balance -= valorCents
      fatura.status = 'paga'
      fatura.dataPagamento = agora
      fatura.formaPagamento = 'saldo'
    }

    state.faturasCustodia.push(fatura)
    criadas.push(fatura)
  }

  return criadas
}

/**
 * Emite a fatura de entrada das moedas que acabaram de chegar ao acervo.
 *
 * É `emitirFaturasDosCiclos` restrita às moedas novas. Devolve a primeira
 * fatura criada, ou `null` quando não havia o que cobrar — moeda aceita hoje
 * está sempre no primeiro ciclo, então na prática é uma fatura só.
 */
export function cobrarEntradaNoAcervo(
  state: AppState,
  userEmail: UserEmail,
  moedaIds: readonly string[],
  taxas?: TabelaDeTaxasPlano,
  agora: Timestamp = Date.now(),
): FaturaCustodia | null {
  return emitirFaturasDosCiclos(state, userEmail, 'entrada_no_acervo', taxas, agora, moedaIds)[0] ?? null
}

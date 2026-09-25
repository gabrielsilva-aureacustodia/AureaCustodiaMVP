/**
 * A custódia é cobrada no INSTANTE em que a moeda entra no acervo.
 *
 * POR QUE ISTO EXISTE (25/09/2026)
 * --------------------------------
 * Até aqui só havia dois jeitos de uma moeda gerar cobrança de guarda:
 *
 *   1. o cliente contratar o plano na tela de Envios (`origem: 'contratacao'`);
 *   2. o ciclo mensal passar por cima do acervo na virada da competência
 *      (`origem: 'ciclo_mensal'`).
 *
 * Moeda registrada pelo painel — cadastro direto ou cadastro sem envio — não
 * passa por nenhum dos dois. Ela nasce guardada, sem plano e sem fatura, e fica
 * assim até o dia 1º. No banco de 25/09/2026 eram 28 moedas nessa situação: as
 * 6 de Direitos Humanos do Rogério, as 11 da Rozâne, as 10 do Alexandre e 1 da
 * Peggê. Nenhuma delas tinha sido cobrada, e por isso nenhuma delas notificava
 * nada ao dono — o que de fora parece "a Direitos Humanos não foi homologada
 * para custódia", quando na verdade o tipo nunca teve nada a ver com o assunto:
 * todas essas moedas entraram pelo cadastro direto.
 *
 * A guarda começa quando a moeda entra no armazém, então a cobrança também
 * começa ali. Esperar a virada do mês dava até 30 dias de guarda de graça e,
 * desde a trava de 23/09, deixava a moeda presa: sem prova de pagamento ela não
 * pode ser anunciada, e sem fatura não havia o que pagar para destravar.
 *
 * O QUE ESTA REGRA NÃO FAZ
 * ------------------------
 * Não cobra moeda que já está paga no mês corrente. É o caso da moeda comprada
 * no marketplace: a competência dela já foi quitada pelo vendedor, e cobrar o
 * comprador de novo seria cobrar duas vezes pela mesma guarda. Do mês seguinte
 * em diante o ciclo cobra o dono novo, que é o certo.
 *
 * Também não cobra duas vezes a mesma entrada: moeda que já figura em fatura em
 * aberto desta competência fica de fora.
 */

import { calcularVencimentoFatura, competenciaAtual, DIAS_TOLERANCIA_FATURA } from '@/domain/custody'
import { CUSTODIA_MENSAL_POR_MOEDA_CENTS } from '@/domain/fees'
import type { TabelaDeTaxasPlano } from '@/domain/plano-custodia'
import { custodiaPagaAteCompetencia } from '@/domain/bloqueio-por-debito'
import type { AppState, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'

/**
 * A moeda já tem a guarda desta competência resolvida — paga ou cobrada?
 *
 * Duas fontes: `custodiaPagaAteCompetencia`, que responde até quando está PAGA
 * (por plano vigente ou por fatura liquidada), e as faturas em aberto, que
 * respondem se já existe boleto emitido esperando pagamento.
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
      f.competencia === competencia &&
      f.status !== 'cancelada' &&
      (f.moedaIds ?? []).includes(coinId),
  )
}

/**
 * Emite a fatura de entrada das moedas que acabaram de chegar ao acervo.
 *
 * Muta o estado: acrescenta a fatura a `state.faturasCustodia` e, quando o
 * cliente tem saldo, debita e marca como paga — exatamente o que o ciclo mensal
 * já faz. Devolve a fatura criada, ou `null` quando não havia o que cobrar.
 *
 * Roda dentro do `mutateState` de quem registra a moeda, e não depois, para que
 * a moeda e a cobrança dela nasçam na mesma transação. Registrar a moeda e
 * falhar a cobrança em seguida deixaria acervo sem custódia — o buraco que esta
 * função existe para fechar.
 */
export function cobrarEntradaNoAcervo(
  state: AppState,
  userEmail: UserEmail,
  moedaIds: readonly string[],
  taxas?: TabelaDeTaxasPlano,
  agora: Timestamp = Date.now(),
): FaturaCustodia | null {
  const user = state.users[userEmail]
  if (!user) return null

  const competencia = competenciaAtual(agora)
  state.faturasCustodia = state.faturasCustodia ?? []

  const aCobrar = moedaIds.filter((id) => !custodiaResolvidaNaCompetencia(state, id, competencia))
  if (aCobrar.length === 0) return null

  const porMoeda = taxas?.custodiaMensalPorMoeda ?? CUSTODIA_MENSAL_POR_MOEDA_CENTS
  const valorCents = porMoeda * aCobrar.length
  const sufixo = userEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)

  const fatura: FaturaCustodia = {
    // `ENT` no id para a fatura de entrada não colidir com a do ciclo do mesmo
    // mês, que usa o mesmo carimbo de tempo quando as duas nascem no mesmo ms.
    id: `FAT-${competencia}-${sufixo}-ENT-${agora}`,
    userEmail,
    competencia,
    quantidadeMoedas: aCobrar.length,
    moedaIds: [...aCobrar],
    valorCents,
    status: 'pendente',
    dataEmissao: agora,
    dataVencimento: calcularVencimentoFatura(agora, DIAS_TOLERANCIA_FATURA),
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
    planoId: null,
    origem: 'entrada_no_acervo',
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
  return fatura
}

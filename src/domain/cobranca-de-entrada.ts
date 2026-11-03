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
 * no mesmo dia — ver src/domain/ciclo-custodia.ts. NÃO EXISTE COBRANÇA NO DIA 1º:
 * até 02/10/2026 um cron cobrava o acervo inteiro por mês do calendário, e até
 * 03/11/2026 o "plano" de custódia ainda era renovado no dia 1º — foi o que cobrou
 * o Sidnei e o Rogério em 01/11. Os dois saíram do código.
 *
 * QUANDO NÃO COBRA
 * ----------------
 * A moeda cujo ciclo em curso já está COBRADO para o dono atual — pago, ou com
 * fatura em aberto dele até o fim do ciclo — não ganha fatura nova. A pergunta é
 * a da regra única (`cicloJaCobrado`, em src/domain/custodia-da-moeda.ts). Isso
 * cobre de uma vez:
 *  - a moeda comprada, que nasce com o primeiro mês pago na própria compra
 *    (`src/domain/custodia-da-compra.ts`);
 *  - a moeda de envio pago antecipadamente, cuja fatura de contratação é ligada
 *    a ela no aceite (`alimentarPlanoNaAnalise`) e cobre o primeiro ciclo dela;
 *  - o cron rodando duas vezes no mesmo dia.
 *
 * POR QUE A ENTRADA TEM COBRANÇA PRÓPRIA (25/09/2026)
 * ---------------------------------------------------
 * Moeda registrada pelo painel nasce guardada, sem plano e sem fatura. No banco
 * de 25/09/2026 eram 28 moedas nessa situação, nenhuma cobrada. A guarda começa
 * quando a moeda entra no armazém, então a cobrança também começa ali.
 */

import { cicloDaMoeda, dataBrasilia, type CicloDaMoeda } from '@/domain/ciclo-custodia'
import { cicloJaCobrado } from '@/domain/custodia-da-moeda'
import { moedasFaturaveis } from '@/domain/custody'
import { CUSTODIA_MENSAL_POR_MOEDA_CENTS } from '@/domain/fees'
import type { TabelaDeTaxasPlano } from '@/domain/plano-custodia'
import { quitarFatura } from '@/domain/quitar-fatura'
import type { AppState, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'

/**
 * Emite as faturas dos ciclos que estão devidos para as moedas da conta.
 *
 * Muta o estado: acrescenta as faturas a `state.faturasCustodia` e, quando o
 * cliente tem saldo, debita e paga cada uma (`quitarFatura`). Devolve as faturas
 * criadas (vazio quando não havia o que cobrar).
 *
 * Moedas de ciclos diferentes viram faturas diferentes: a fatura tem uma
 * competência e um fim de cobertura só. E moedas de LOTES diferentes — outro
 * envio, outro cadastro — também: cada lote é uma custódia própria, com seu
 * valor, seu pagamento e sua data (pedido do Gabriel, 05/10/2026). Só moedas do
 * mesmo lote com o mesmo aniversário andam juntas na mesma fatura.
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

  const grupos = new Map<string, { ciclo: CicloDaMoeda; ids: string[] }>()
  for (const moeda of moedasFaturaveis(user)) {
    if (moedaIds && !moedaIds.includes(moeda.id)) continue

    const ciclo = cicloDaMoeda(moeda.entrada, agora)
    if (cicloJaCobrado(state, moeda.id, ciclo)) continue

    // Uma fatura por LOTE (envio ou cadastro) em cada ciclo: moedas de lotes diferentes são custódias
    // diferentes, mesmo quando o aniversário cai no mesmo dia (05/10/2026).
    const chave = `${ciclo.competencia}#${ciclo.fim}#${moeda.protocolo ?? ''}`
    const grupo = grupos.get(chave)
    if (grupo) grupo.ids.push(moeda.id)
    else grupos.set(chave, { ciclo, ids: [moeda.id] })
  }

  const porMoeda = taxas?.custodiaMensalPorMoeda ?? CUSTODIA_MENSAL_POR_MOEDA_CENTS
  const sufixo = userEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const criadas: FaturaCustodia[] = []
  const idsUsados = new Set(state.faturasCustodia.map((f) => f.id))

  for (const { ciclo, ids } of grupos.values()) {
    const valorCents = porMoeda * ids.length
    // `ENT` no id da entrada, para ela não colidir com a do ciclo do mesmo mês,
    // que usa o mesmo carimbo de tempo quando as duas nascem no mesmo ms. O dia
    // do ciclo separa as faturas de moedas de aniversários diferentes.
    const marca = origem === 'entrada_no_acervo' ? 'ENT-' : ''
    const dia = dataBrasilia(ciclo.inicio).slice(0, 2)
    // Dois lotes do mesmo ciclo nascem no mesmo milissegundo: o sufixo numérico os distingue.
    const base = `FAT-${ciclo.competencia}-${sufixo}-${marca}D${dia}-${agora}`
    let id = base
    for (let n = 2; idsUsados.has(id); n++) id = `${base}-${n}`
    idsUsados.add(id)
    const fatura: FaturaCustodia = {
      id,
      userEmail,
      competencia: ciclo.competencia,
      quantidadeMoedas: ids.length,
      moedaIds: [...ids],
      valorCents,
      status: 'pendente',
      dataEmissao: agora,
      // O vencimento é o próximo aniversário (00:00 de Brasília): `faturaBloqueia`
      // soma um dia de carência, então a conta só fica em pendência depois das 23:59 desse dia.
      dataVencimento: ciclo.fim,
      coberturaAte: ciclo.fim - 1,
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
      planoId: null,
      origem,
    }
    state.faturasCustodia.push(fatura)

    // Débito automático quando há saldo: quem tem dinheiro na conta não precisa
    // de um boleto para R$ 2,00, e a moeda já sai liberada para anunciar.
    if (user.balance >= valorCents) {
      user.balance -= valorCents
      quitarFatura(state, fatura, 'saldo', agora)
    }

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

/**
 * Pagar uma fatura de custódia — o único jeito de uma fatura virar paga (03/11/2026).
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * Até 03/11/2026 seis lugares marcavam fatura como paga, cada um com o seu pedaço de regra: o débito
 * automático do cron, o botão "pagar com saldo" (duas cópias, uma da conta e outra do painel), a
 * conciliação do Pix, a do cartão recorrente e a renovação do plano. Uma cópia recomeçava o ciclo da moeda
 * comprada antes de 21/10, outra não; uma estendia o plano por mês do calendário, outra não. É o mesmo
 * defeito que a regra única de `custodia-da-moeda.ts` encerra, do lado do pagamento.
 *
 * O que pagar faz, e nada além disso:
 *  1. a fatura passa a paga, com a hora e a forma do pagamento;
 *  2. a moeda comprada antes de 21/10/2026 recomeça o ciclo no dia do pagamento (Gabriel, 26/10/2026);
 *  3. o pagamento antecipado do envio (fatura com plano) põe o plano em vigor — registro para a tela; a
 *     cobertura das moedas vem da própria fatura, ligada a elas quando são aceitas.
 *
 * Quem tira o dinheiro de onde é quem chama: do saldo (`pagarFaturaComSaldoNoEstado`), do Pix ou do cartão
 * que o gateway confirmou. O ledger, a NFS-e e a trilha de auditoria derivam da transição para paga, na
 * mesma transação.
 *
 * Regra pura, sem I/O.
 */

import { recomecarCicloNoPrimeiroPagamento } from '@/domain/custodia-da-compra'
import { brl } from '@/domain/money'
import type { ActionResult, AppState, FaturaCustodia, FormaPagamentoFatura, Timestamp, UserEmail } from '@/domain/types'

export function quitarFatura(
  state: AppState,
  fatura: FaturaCustodia,
  forma: FormaPagamentoFatura,
  agora: Timestamp,
  referenciaExterna: string | null = null,
): void {
  fatura.status = 'paga'
  fatura.dataPagamento = agora
  fatura.formaPagamento = forma
  if (referenciaExterna) fatura.paymentIntentId = referenciaExterna

  // Moeda comprada antes de 21/10 sem custódia do dono novo: o ciclo recomeça hoje (26/10/2026).
  recomecarCicloNoPrimeiroPagamento(state, fatura, agora)

  if (fatura.planoId) {
    const plano = (state.planosCustodia ?? []).find((p) => p.id === fatura.planoId)
    if (plano && plano.status !== 'cancelado') {
      plano.status = 'vigente'
      plano.pagoAteCompetencia = fatura.competencia
      plano.formaPagamento = forma
      if (referenciaExterna) plano.paymentIntentRef = referenciaExterna
      plano.atualizadoEm = agora
    }
  }
}

/**
 * Devolve ao saldo uma fatura de custódia PAGA que não devia ter sido cobrada, e a cancela (03/11/2026).
 *
 * Existe pelo caso da "renovação de plano" de 01/11/2026, que debitou R$ 2,00 do Rogério por um envio sem
 * moeda nenhuma; o Gabriel mandou devolver e cancelar a nota. Na mesma transação, o ledger lança o
 * `estorno` (derivar.ts) e a NFS-e da fatura é marcada para cancelamento (`cancelamentosDeNfse`). É
 * decisão de cobrança: só a equipe, com ordem do Gabriel, chama isto.
 */
export function estornarFaturaPaga(state: AppState, faturaId: string): ActionResult<{ fatura: FaturaCustodia }> {
  const fatura = (state.faturasCustodia ?? []).find((f) => f.id === faturaId)
  if (!fatura) return { ok: false, error: 'Fatura de custódia não encontrada.' }
  if (fatura.status !== 'paga') return { ok: false, error: 'Só fatura paga tem o que estornar.' }
  const dono = state.users[fatura.userEmail]
  if (!dono) return { ok: false, error: 'O titular da fatura não existe mais.' }

  dono.balance += fatura.valorCents
  fatura.status = 'cancelada'
  return { ok: true, data: { fatura } }
}

/**
 * Paga a fatura com o saldo em conta, dentro da transação de quem chama. É o corpo do botão "pagar com
 * saldo", da conta do cliente e do painel.
 */
export function pagarFaturaComSaldoNoEstado(
  state: AppState,
  email: UserEmail,
  faturaId: string,
  agora: Timestamp,
): ActionResult<{ fatura: FaturaCustodia }> {
  const u = state.users[email]
  if (!u) return { ok: false, error: 'Usuário não encontrado.' }

  const fatura = (state.faturasCustodia ?? []).find((f) => f.id === faturaId)
  if (!fatura) return { ok: false, error: 'Fatura de custódia não encontrada.' }
  if (fatura.userEmail !== email) return { ok: false, error: 'Esta fatura pertence a outro usuário.' }
  if (fatura.status === 'paga') return { ok: false, error: 'Esta fatura já foi paga.' }
  if (fatura.status === 'cancelada') return { ok: false, error: 'Esta fatura foi cancelada.' }
  if (u.balance < fatura.valorCents) {
    return {
      ok: false,
      error: `Saldo insuficiente para quitar a fatura (saldo: ${brl(u.balance)}, fatura: ${brl(fatura.valorCents)}).`,
    }
  }

  u.balance -= fatura.valorCents
  quitarFatura(state, fatura, 'saldo', agora)
  return { ok: true, data: { fatura } }
}

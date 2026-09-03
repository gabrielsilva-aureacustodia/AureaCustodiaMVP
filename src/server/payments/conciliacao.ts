/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Aqui o dinheiro entra no saldo. É o passo 7 do fluxo do M5, e o único lugar
 * da plataforma em que um pagamento externo vira crédito interno.
 * ==========================================================================*/

import 'server-only'

import { brl } from '@/domain/money'
import { consultarPagamentoMercadoPago } from '@/lib/payments'
import { mutateState } from '@/server/state'

import { repositorioIntencoes } from './repositorios'

export interface ResultadoConciliacao {
  creditado: boolean
  motivo: string
  externalReference?: string
  valorCents?: number
  userEmail?: string
}

/**
 * Confere um pagamento no gateway e credita o saldo, uma única vez.
 *
 * A ORDEM DAS TRAVAS É A REGRA, NÃO O ESTILO
 * ------------------------------------------
 *  1. **O status vem do gateway, nunca do webhook.** O corpo da notificação diz
 *     apenas "algo aconteceu com o pagamento X"; quem afirma que ele foi
 *     aprovado é a consulta autenticada à API. Confiar no payload seria aceitar
 *     que qualquer pessoa com a URL do webhook se credite.
 *  2. **O valor é conferido contra a intenção.** Se o que o gateway cobrou não
 *     bate com o que a plataforma pediu, o depósito é recusado e o motivo fica
 *     gravado. Creditar o valor do gateway sem conferir permitiria pagar R$ 1,00
 *     numa cobrança de R$ 1.000,00 e receber os mil.
 *  3. **A intenção é reivindicada antes do crédito**, com um UPDATE que só
 *     encontra `pendente` uma vez. É o que impede duas entregas simultâneas do
 *     mesmo evento de creditarem duas vezes — a idempotência do evento protege
 *     o caso comum, esta trava protege o caso simultâneo.
 *  4. Só então `mutateState` soma ao saldo, exatamente como o `deposit()`
 *     simulado sempre fez.
 *
 * Se o crédito falhar depois da reivindicação, a intenção volta para `pendente`:
 * caso contrário ela ficaria travada em `creditando` para sempre, e o cliente
 * teria pago sem receber.
 */
export async function conciliarPagamento(paymentId: string): Promise<ResultadoConciliacao> {
  const detalhes = await consultarPagamentoMercadoPago(paymentId)

  if (detalhes.status !== 'approved') {
    return { creditado: false, motivo: `pagamento com status "${detalhes.status}"` }
  }

  const ref = detalhes.externalReference
  if (!ref) {
    return { creditado: false, motivo: 'pagamento sem referência externa' }
  }

  const intencoes = repositorioIntencoes()
  const intencao = await intencoes.buscar(ref)
  if (!intencao) {
    return { creditado: false, motivo: `nenhuma intenção de depósito para ${ref}`, externalReference: ref }
  }

  if (intencao.valor !== detalhes.valorCents) {
    const motivo = `valor divergente: cobrado ${brl(detalhes.valorCents)}, esperado ${brl(intencao.valor)}`
    await intencoes.recusar(ref, motivo)
    return { creditado: false, motivo, externalReference: ref }
  }

  const reivindicada = await intencoes.reivindicar(ref)
  if (!reivindicada) {
    return {
      creditado: false,
      motivo: `intenção ${ref} já estava com status "${intencao.status}"`,
      externalReference: ref,
    }
  }

  try {
    await mutateState((s) => {
      const u = s.users[reivindicada.userEmail]
      // A conta some do estado quando o ambiente recomeça do seed. Sem esta
      // guarda, o crédito estouraria um TypeError no meio da transação.
      if (!u) throw new Error(`Usuário ${reivindicada.userEmail} não existe no estado.`)
      u.balance += reivindicada.valor
      s.deposits.push({
        userEmail: reivindicada.userEmail,
        valor: reivindicada.valor,
        date: Date.now(),
      })
    })
  } catch (erro) {
    await intencoes.devolverParaPendente(ref)
    throw erro
  }

  await intencoes.concluir(ref, paymentId)
  return {
    creditado: true,
    motivo: 'creditado',
    externalReference: ref,
    valorCents: reivindicada.valor,
    userEmail: reivindicada.userEmail,
  }
}

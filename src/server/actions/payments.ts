'use server'

/**
 * Depósito com o Mercado Pago — a porta que a tela usa para pedir uma cobrança.
 *
 * O QUE ESTA AÇÃO FAZ, E O QUE ELA DELIBERADAMENTE NÃO FAZ
 * --------------------------------------------------------
 * Ela grava a INTENÇÃO de depósito e pede a cobrança ao gateway. **Ela não
 * encosta no saldo.** Quem credita é a conciliação do webhook
 * (`src/server/payments/conciliacao.ts`), depois de o Mercado Pago confirmar o
 * pagamento.
 *
 * Isso não é preciosismo: o cliente pode fechar o navegador antes de voltar
 * para a tela, e o depósito dele não pode depender disso. E o caminho de volta
 * (a tela de retorno) é uma URL que qualquer pessoa consegue abrir — creditar
 * ali seria dar saldo a quem digitasse o endereço.
 *
 * SANDBOX (RA-01). Enquanto não houver parecer jurídico, o token usado é o de
 * teste e, sem token nenhum, `src/lib/payments/` responde com um simulador
 * determinístico. Em nenhuma dessas situações há dinheiro real.
 */

import { randomUUID } from 'node:crypto'

import { DEPOSITO_MAX } from '@/domain/constants'
import { brl } from '@/domain/money'
import type { ActionResult, Cents } from '@/domain/types'
import { criarPixDeposito, criarPreferenciaDeposito } from '@/lib/payments'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'
import { repositorioIntencoes } from '@/server/payments/repositorios'
import type { DepositoIniciado, MetodoDeposito } from '@/server/payments/tipos'

const SESSAO_EXPIRADA = 'Sessão expirada.'
const FALHA_GATEWAY = 'Não foi possível abrir a cobrança agora. Tente novamente.'

/**
 * Abre uma cobrança e devolve o que a tela precisa mostrar.
 *
 * As validações repetem as do `deposit()` simulado — inteiro, positivo, teto de
 * `DEPOSITO_MAX` — porque uma Server Action é um endpoint HTTP e o formulário é
 * só a porta educada. `Number.isFinite` antes de qualquer conta: `NaN` e
 * `Infinity` chegam se alguém quiser mandá-los.
 */
export async function iniciarDeposito(
  valorCents: Cents,
  metodo: MetodoDeposito,
): Promise<ActionResult<DepositoIniciado>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  const valor = Number.isFinite(valorCents) ? Math.floor(valorCents) : 0
  if (valor <= 0) return { ok: false, error: 'Informe um valor de depósito válido.' }
  if (valor > DEPOSITO_MAX) {
    return { ok: false, error: `O depósito máximo por operação é ${brl(DEPOSITO_MAX)}.` }
  }
  if (metodo !== 'pix' && metodo !== 'checkout_pro') {
    return { ok: false, error: 'Forma de pagamento desconhecida.' }
  }

  // A conta precisa existir no estado: a intenção tem chave estrangeira para
  // `aurea.users`, e uma sessão antiga pode apontar para um usuário que sumiu.
  const state = await getState()
  if (!state.users[email]) return { ok: false, error: SESSAO_EXPIRADA }

  // A referência é gerada pela plataforma e é o ÚNICO vínculo confiável entre a
  // cobrança e a conta a creditar. O e-mail do pagador no gateway não serve:
  // outra pessoa pode pagar, ou a mesma pessoa pode usar outra conta lá.
  const externalReference = `DEP-${randomUUID()}`
  const agora = Date.now()

  const intencoes = repositorioIntencoes()
  await intencoes.criar({
    externalReference,
    userEmail: email,
    valor,
    metodo,
    status: 'pendente',
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  try {
    if (metodo === 'pix') {
      const pix = await criarPixDeposito({ userEmail: email, valorCents: valor, externalReference })
      await intencoes.anotarPagamento(externalReference, pix.paymentId)
      return {
        ok: true,
        data: {
          metodo,
          externalReference,
          valorCents: valor,
          qrCode: pix.qrCode,
          qrCodeBase64: pix.qrCodeBase64,
        },
      }
    }

    const pref = await criarPreferenciaDeposito({
      userEmail: email,
      valorCents: valor,
      externalReference,
    })
    return {
      ok: true,
      data: {
        metodo,
        externalReference,
        valorCents: valor,
        // O ponto de sandbox é o certo enquanto o RA-01 não estiver pago: é
        // para lá que o token de teste sabe levar.
        initPoint: pref.sandboxInitPoint || pref.initPoint,
      },
    }
  } catch {
    // A intenção fica gravada como recusada em vez de sumir: sem isso, uma
    // sequência de falhas do gateway não deixaria rastro nenhum para diagnóstico.
    await intencoes.recusar(externalReference, 'falha ao abrir a cobrança no gateway')
    return { ok: false, error: FALHA_GATEWAY }
  }
}

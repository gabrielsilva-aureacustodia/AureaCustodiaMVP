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

import { temCadastroCompleto } from '@/domain/cadastro'
import { DEPOSITO_MAX } from '@/domain/constants'
import { brl } from '@/domain/money'
import type { ActionResult, Cents } from '@/domain/types'
import { criarPixDeposito, criarPreferenciaDeposito, isMercadoPagoSandbox } from '@/lib/payments'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'
import { repositorioIntencoes } from '@/server/payments/repositorios'
import type {
  CompraDiretaIniciada,
  DepositoIniciado,
  MetodoDeposito,
} from '@/server/payments/tipos'

const SESSAO_EXPIRADA = 'Sessão expirada.'
const FALHA_GATEWAY = 'Não foi possível abrir a cobrança agora. Tente novamente.'

/**
 * Para onde mandar o navegador no Checkout Pro.
 *
 * Em sandbox o Mercado Pago devolve dois endereços e só o de sandbox aceita os
 * cartões de teste; em produção o `sandbox_init_point` pode vir vazio. O
 * fallback cobre os dois casos sem a tela precisar saber de nada.
 *
 * Até 11/09/2026 as duas ações escolhiam sandbox SEMPRE, ignorando o ambiente,
 * por causa do RA-01. O RA-01 foi encerrado por decisão do Gabriel na mesma
 * data, e quem manda voltou a ser `MP_SANDBOX`.
 */
function pontoDeCheckout(pref: { initPoint: string; sandboxInitPoint: string }): string {
  return isMercadoPagoSandbox()
    ? pref.sandboxInitPoint || pref.initPoint
    : pref.initPoint || pref.sandboxInitPoint
}

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
    tipoOperacao: 'deposito',
    metadata: null,
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
          simulado: pix.simulado === true,
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
        initPoint: pontoDeCheckout(pref),
        simulado: pref.simulado === true,
      },
    }
  } catch {
    // A intenção fica gravada como recusada em vez de sumir: sem isso, uma
    // sequência de falhas do gateway não deixaria rastro nenhum para diagnóstico.
    await intencoes.recusar(externalReference, 'falha ao abrir a cobrança no gateway')
    return { ok: false, error: FALHA_GATEWAY }
  }
}

/**
 * Abre uma cobrança no gateway para compra direta de um lote do marketplace.
 *
 * Gabriel: "ou ele pode usar o que está na conta dele ou pode comprar por fora" —
 * dinheiro que não fica parado na conta da Áurea reduz fricção e passivo.
 *
 * Trava de cadastro (bloco 6): exige cadastro formal completo confirmado no primeiro
 * movimento financeiro.
 *
 * Referência externa gerada com prefixo 'CMP-' para a conciliação distinguir
 * contabilmente compra direta de depósito comum.
 */
export async function iniciarCompraDireta(
  lotId: string,
  qtyPedida: number,
  metodo: MetodoDeposito,
): Promise<ActionResult<CompraDiretaIniciada>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  if (metodo !== 'pix' && metodo !== 'checkout_pro') {
    return { ok: false, error: 'Forma de pagamento desconhecida.' }
  }

  const state = await getState()
  const user = state.users[email]
  if (!user) return { ok: false, error: SESSAO_EXPIRADA }

  if (!temCadastroCompleto(user)) {
    return {
      ok: false,
      error: 'É necessário completar o cadastro formal antes de realizar uma compra direta.',
    }
  }

  const offers = state.sellOffers.filter((o) => o.lotId === lotId)
  if (!offers.length) return { ok: false, error: 'Este anúncio não está mais disponível.' }

  const sellerId = offers[0].seller
  if (sellerId === email) {
    return { ok: false, error: 'Você não pode comprar do seu próprio anúncio.' }
  }

  const seller = state.users[sellerId]
  if (!seller) return { ok: false, error: 'Este anúncio não está mais disponível.' }

  const qty = Math.min(
    Math.max(Number.isFinite(qtyPedida) ? Math.floor(qtyPedida) : 1, 1),
    offers.length,
  )
  const price = offers[0].price
  const valorTotal = price * qty
  const tipoMoeda = offers[0].tipoMoeda

  if (valorTotal <= 0) return { ok: false, error: 'Valor da compra inválido.' }
  if (valorTotal > DEPOSITO_MAX) {
    return { ok: false, error: `O valor máximo por operação é ${brl(DEPOSITO_MAX)}.` }
  }

  const externalReference = `CMP-${randomUUID()}`
  const agora = Date.now()

  const intencoes = repositorioIntencoes()
  await intencoes.criar({
    externalReference,
    userEmail: email,
    valor: valorTotal,
    metodo,
    status: 'pendente',
    tipoOperacao: 'compra_direta',
    metadata: {
      lotId,
      qty,
      tipoMoeda,
      sellerEmail: sellerId,
      unitPrice: price,
    },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  try {
    if (metodo === 'pix') {
      const pix = await criarPixDeposito({
        userEmail: email,
        valorCents: valorTotal,
        externalReference,
      })
      await intencoes.anotarPagamento(externalReference, pix.paymentId)
      return {
        ok: true,
        data: {
          metodo,
          externalReference,
          valorCents: valorTotal,
          lotId,
          qty,
          tipoMoeda,
          qrCode: pix.qrCode,
          qrCodeBase64: pix.qrCodeBase64,
          simulado: pix.simulado === true,
        },
      }
    }

    const pref = await criarPreferenciaDeposito({
      userEmail: email,
      valorCents: valorTotal,
      externalReference,
    })
    return {
      ok: true,
      data: {
        metodo,
        externalReference,
        valorCents: valorTotal,
        lotId,
        qty,
        tipoMoeda,
        initPoint: pontoDeCheckout(pref),
        simulado: pref.simulado === true,
      },
    }
  } catch {
    await intencoes.recusar(externalReference, 'falha ao abrir a cobrança no gateway')
    return { ok: false, error: FALHA_GATEWAY }
  }
}

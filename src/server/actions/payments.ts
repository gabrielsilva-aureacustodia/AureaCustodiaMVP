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
 * SANDBOX POR PADRÃO (RA-01, encerrado em 11/09/2026). Sem `MP_SANDBOX="false"`, o
 * token usado é o de teste e, sem token nenhum, `src/lib/payments/` responde com um
 * simulador determinístico — sem dinheiro real. Com `MP_SANDBOX="false"` e o token de
 * produção, a cobrança é de verdade; não há parecer a esperar.
 */

import { randomUUID } from 'node:crypto'

import { temCadastroCompleto } from '@/domain/cadastro'
import {
  CHAVE_PIX_DEPOSITO,
  FAVORECIDO_PIX_DEPOSITO,
  valorDoDepositoPix,
} from '@/domain/deposito-pix'
import { custoDeCompraPorMoeda } from '@/domain/fees'
import { brl } from '@/domain/money'
import type { ActionResult, Cents } from '@/domain/types'
import { criarPixDeposito, criarPreferenciaDeposito, isMercadoPagoSandbox } from '@/lib/payments'
import { carregarRegrasDoMercado } from '@/server/config/carregar'
import { getSessionEmail } from '@/server/session'
import { getState } from '@/server/state'
import { contaComPendenciaNoEstado, MENSAGEM_ANUNCIO_PAUSADO } from '@/domain/bloqueio-por-debito'
import { contaBloqueavel } from '@/server/custodia/isencao-da-equipe'
import { repositorioIntencoes } from '@/server/payments/repositorios'
import type {
  CompraDiretaIniciada,
  DepositoIniciado,
  DepositoPixDireto,
  MetodoDeposito,
  StatusCobrancaInfo,
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
  // Teto da configuração do painel (C3); sem banco, o DEPOSITO_MAX do código.
  const { depositoMaxCents } = await carregarRegrasDoMercado()
  if (valor > depositoMaxCents) {
    return { ok: false, error: `O depósito máximo por operação é ${brl(depositoMaxCents)}.` }
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
 * Registra uma solicitação de depósito por PIX DIRETO na conta da empresa.
 *
 * É esta que a tela usa desde 21/09/2026. A `iniciarDeposito` acima continua
 * inteira e testada, mas CONGELADA: nenhuma tela a chama. Decisão do Gabriel —
 * o Mercado Pago cobra percentual sobre cada entrada, e depósito não é venda,
 * é o cliente pondo o próprio dinheiro na própria conta. Mandar o Pix direto
 * para a chave da empresa economiza essa taxa inteira. Quando a integração
 * voltar a valer a pena, o caminho já está pronto e é só a tela voltar a
 * chamá-lo.
 *
 * NÃO CREDITA SALDO, E ISSO É A FUNCIONALIDADE.
 * -------------------------------------------
 * Pix direto não tem webhook: o sistema não fica sabendo que o dinheiro entrou.
 * O que esta ação grava é uma INTENÇÃO pendente — o mesmo registro que a
 * cobrança de gateway grava —, e o saldo só sobe quando alguém da equipe
 * confere o extrato bancário e lança o ajuste em /admin/usuarios. Creditar aqui
 * seria reabrir o buraco que o `deposit()` simulado tinha: qualquer pessoa
 * declarando um Pix que nunca aconteceu e sacando dinheiro que não existe.
 *
 * Depósito NÃO tem taxa: o cliente transfere o que pediu e recebe de saldo o
 * mesmo valor. A tarifa fixa de R$ 5,00 da Tabela de Taxas é do saque.
 */
export async function solicitarDepositoPix(
  valorCents: Cents,
): Promise<ActionResult<DepositoPixDireto>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  // As mesmas validações da cobrança por gateway, pelo mesmo motivo: uma Server
  // Action é um endpoint HTTP e o formulário é só a porta educada.
  const valor = valorDoDepositoPix(valorCents)
  if (valor <= 0) return { ok: false, error: 'Informe um valor de depósito válido.' }

  // Teto da configuração do painel (C3); sem banco, o DEPOSITO_MAX do código.
  const { depositoMaxCents } = await carregarRegrasDoMercado()
  if (valor > depositoMaxCents) {
    return { ok: false, error: `O depósito máximo por operação é ${brl(depositoMaxCents)}.` }
  }

  // A conta precisa existir no estado: a intenção tem chave estrangeira para
  // `aurea.users`, e uma sessão antiga pode apontar para um usuário que sumiu.
  const state = await getState()
  if (!state.users[email]) return { ok: false, error: SESSAO_EXPIRADA }

  const referencia = `DEP-${randomUUID()}`
  const agora = Date.now()

  // `valor` é o que a equipe vai lançar no saldo e é também o que o cliente
  // transfere: depósito não tem taxa.
  await repositorioIntencoes().criar({
    externalReference: referencia,
    userEmail: email,
    valor,
    metodo: 'pix',
    status: 'pendente',
    tipoOperacao: 'deposito',
    metadata: {
      pixDireto: true,
      chavePix: CHAVE_PIX_DEPOSITO,
    },
    paymentId: null,
    motivoRecusa: null,
    createdAt: agora,
    updatedAt: agora,
  })

  return {
    ok: true,
    data: {
      referencia,
      chavePix: CHAVE_PIX_DEPOSITO,
      favorecido: FAVORECIDO_PIX_DEPOSITO,
      valorCents: valor,
    },
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
 * O TOTAL COBRADO É O DA TELA (E8, RA-24). O gateway cobra `custoDeCompraPorMoeda × qty` — preço
 * mais a comissão de compra da Tabela de Taxas vigente —, e não só o preço do lote. Antes da E8 o
 * comprador via a comissão no "Total a pagar" e o Pix cobrava menos, o que deixava o livro-razão
 * fechar com um `ajuste` a cada compra direta.
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

  if ((await contaBloqueavel(sellerId)) && contaComPendenciaNoEstado(state, sellerId, Date.now())) {
    return { ok: false, error: MENSAGEM_ANUNCIO_PAUSADO }
  }

  const qty = Math.min(
    Math.max(Number.isFinite(qtyPedida) ? Math.floor(qtyPedida) : 1, 1),
    offers.length,
  )
  const price = offers[0].price
  const tipoMoeda = offers[0].tipoMoeda

  // Uma leitura só da configuração vigente: o teto do depósito e a Tabela de Taxas saem da mesma
  // chamada. Sem banco, ou com falha na leitura, vale o padrão do código (RA-47).
  const { depositoMaxCents, taxas } = await carregarRegrasDoMercado()

  // O Pix e o cartão cobram o mesmo total que o modal de /mercado mostra: preço mais a comissão de
  // compra da Tabela de Taxas vigente (RA-24). A comissão fica congelada na intenção, porque o valor
  // cobrado não muda depois de a cobrança abrir; a conciliação lê de lá, e não da tabela da aprovação.
  const comissaoCompradorPorMoeda = custoDeCompraPorMoeda(price, taxas) - price
  const valorTotal = custoDeCompraPorMoeda(price, taxas) * qty

  if (valorTotal <= 0) return { ok: false, error: 'Valor da compra inválido.' }
  if (valorTotal > depositoMaxCents) {
    return { ok: false, error: `O valor máximo por operação é ${brl(depositoMaxCents)}.` }
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
      comissaoCompradorPorMoeda,
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

/**
 * Consulta o status de uma cobrança pelo externalReference (B1.6).
 *
 * Utilizado pelo PainelPagamento para polling a cada 5s até a confirmação
 * via webhook ou recusa do gateway.
 *
 * Exige sessão autenticada e garante que apenas o dono da intenção pode consultá-la.
 */
export async function consultarStatusCobranca(
  externalReference: string,
): Promise<ActionResult<StatusCobrancaInfo>> {
  const email = await getSessionEmail()
  if (!email) return { ok: false, error: SESSAO_EXPIRADA }

  if (!externalReference || typeof externalReference !== 'string') {
    return { ok: false, error: 'Referência de cobrança inválida.' }
  }

  const intencoes = repositorioIntencoes()
  const intencao = await intencoes.buscar(externalReference)

  if (!intencao) {
    return { ok: false, error: 'Cobrança não encontrada.' }
  }

  // Segurança: apenas o dono da intenção pode consultar seu status
  if (intencao.userEmail !== email) {
    return { ok: false, error: 'Acesso não autorizado a esta cobrança.' }
  }

  if (intencao.status === 'creditado') {
    return {
      ok: true,
      data: {
        status: 'creditado',
      },
    }
  }

  if (intencao.status === 'recusado') {
    return {
      ok: true,
      data: {
        status: 'recusado',
        motivo: intencao.motivoRecusa || 'Cobrança recusada.',
      },
    }
  }

  return {
    ok: true,
    data: {
      status: 'pendente',
    },
  }
}


/**
 * O primeiro mês de custódia, cobrado NO MESMO PAGAMENTO do frete do envio (frente B, 17/11/2026).
 *
 * O PEDIDO (Rogério, 11/11/2026): "cobrar o primeiro mês de custódia junto com o pagamento do envio". Até aqui o
 * cliente fazia dois pagamentos — o do plano, no passo 3 do wizard (com a saída "pagar depois"), e o do frete, no
 * passo 4 — e a moeda podia chegar ao cofre sem o mês pago. A decisão D4 é: o mês é OBRIGATÓRIO e entra no mesmo
 * pagamento do frete, por saldo, Pix ou cartão.
 *
 * O QUE ESTE ARQUIVO NÃO INVENTA
 * ------------------------------
 * Nada de modelo de dados novo. O mês de um envio continua sendo o par que já existia desde o B2.4: um
 * `PlanoCustodia` (que carrega o protocolo em `protocoloEnvio`) e a fatura `origem: 'contratacao'` ligada a ele
 * por `planoId`. O que muda é QUEM a paga e QUANDO: a fatura nasce no pagamento do frete e é quitada junto com
 * ele, pelo caminho único `quitarFatura`. No aceite da moeda, `alimentarPlanoNaAnalise` liga a fatura às moedas
 * aceitas e devolve o mês das recusadas — esse trecho não mudou.
 *
 * O CONTRATO COM A FRENTE H (cancelamento de envio): tudo o que um envio gerou se acha pelo protocolo.
 * `faturasDoEnvio(state, protocolo)` devolve toda fatura de custódia ligada ao protocolo, em qualquer estado, e
 * `primeiroMesDoEnvio` devolve o par ativo. Estornar o mês de um envio cancelado ou vencido é decisão de cobrança
 * (e fiscal, porque a nota do mês é cancelada junto) e fica com quem cancela o envio — este arquivo só garante que
 * dá para achá-lo.
 *
 * O PREÇO É SEMPRE DA TABELA VIGENTE (`custodiaMensalPorMoeda`), lida por quem chama e passada em `taxas`. Nenhum
 * número fixo mora aqui.
 *
 * Regra pura, sem I/O.
 */

import { nextPlanoCode } from '@/domain/codes'
import { calcularVencimentoFatura, competenciaAtual, DIAS_TOLERANCIA_FATURA } from '@/domain/custody'
import { valorDoPlano, type TabelaDeTaxasPlano } from '@/domain/plano-custodia'
import type { AppState, Cents, Envio, FaturaCustodia, PlanoCustodia, Timestamp } from '@/domain/types'

export interface PrimeiroMesDoEnvio {
  plano: PlanoCustodia
  /** `undefined` só em dado antigo: plano sem a fatura de contratação. */
  fatura: FaturaCustodia | undefined
}

/**
 * O par plano + fatura de contratação ATIVO do envio, ou `null` se o envio ainda não tem o mês.
 * Plano cancelado e fatura cancelada não contam: é o que está valendo.
 */
export function primeiroMesDoEnvio(state: AppState, protocolo: string): PrimeiroMesDoEnvio | null {
  const plano = (state.planosCustodia ?? []).find((p) => p.protocoloEnvio === protocolo && p.status !== 'cancelado')
  if (!plano) return null
  const fatura = (state.faturasCustodia ?? []).find(
    (f) => f.planoId === plano.id && f.origem === 'contratacao' && f.status !== 'cancelada',
  )
  return { plano, fatura }
}

/**
 * TODA fatura de custódia que nasceu de um envio, em qualquer estado (paga, pendente, cancelada) — o caminho
 * que a frente H usa para achar o que um envio cobrou. A ligação é protocolo → plano (`protocoloEnvio`) → fatura
 * (`planoId`).
 */
export function faturasDoEnvio(state: AppState, protocolo: string): FaturaCustodia[] {
  const planos = new Set(
    (state.planosCustodia ?? []).filter((p) => p.protocoloEnvio === protocolo).map((p) => p.id),
  )
  return (state.faturasCustodia ?? []).filter((f) => f.planoId != null && planos.has(f.planoId))
}

/**
 * Quanto do primeiro mês ainda falta pagar neste envio: quantidade × custódia da tabela vigente, ou ZERO quando a
 * fatura de contratação já está paga (envio do fluxo antigo, em que o plano era pago à parte — não se cobra duas
 * vezes). Só lê; não cria nada.
 */
export function primeiroMesAPagar(state: AppState, envio: Envio, taxas: TabelaDeTaxasPlano): Cents {
  if (primeiroMesDoEnvio(state, envio.protocolo)?.fatura?.status === 'paga') return 0
  return valorDoPlano('mensal', Math.max(1, envio.quantidade || 1), taxas).total
}

/**
 * Garante o plano e a fatura de contratação do envio, e devolve os dois. IDEMPOTENTE: com o par já existindo,
 * não cria outro.
 *
 * Fatura ainda em aberto é REPRECIFICADA pela tabela vigente: o cliente que abriu o passo ontem e paga hoje, com
 * o preço da custódia mudado no painel, paga o preço de hoje — o mesmo valor que a tela mostrou ao cotar. Fatura
 * paga nunca se mexe.
 *
 * Roda dentro do `mutateState` de quem chama: o plano nasce na mesma transação do pagamento que o quita.
 */
export function garantirPrimeiroMesDoEnvio(
  state: AppState,
  envio: Envio,
  taxas: TabelaDeTaxasPlano,
  agora: Timestamp = Date.now(),
): { plano: PlanoCustodia; fatura: FaturaCustodia } {
  state.planosCustodia = state.planosCustodia ?? []
  state.faturasCustodia = state.faturasCustodia ?? []

  const quantidade = Math.max(1, envio.quantidade || 1)
  const { porMoeda, total } = valorDoPlano('mensal', quantidade, taxas)

  let plano = state.planosCustodia.find((p) => p.protocoloEnvio === envio.protocolo && p.status !== 'cancelado')
  if (!plano) {
    plano = {
      id: nextPlanoCode(state.seq),
      userEmail: envio.userEmail,
      protocoloEnvio: envio.protocolo,
      modalidade: 'mensal',
      quantidadeContratada: quantidade,
      moedaIds: [],
      valorPorMoedaCents: porMoeda,
      valorTotalCents: total,
      parcelasMax: 1,
      inicioCompetencia: competenciaAtual(agora),
      pagoAteCompetencia: null,
      status: 'aguardando_pagamento',
      formaPagamento: null,
      paymentIntentRef: null,
      assinaturaId: null,
      estornadoCents: 0,
      criadoEm: agora,
      atualizadoEm: agora,
    }
    state.planosCustodia.push(plano)
  }

  let fatura = state.faturasCustodia.find(
    (f) => f.planoId === plano.id && f.origem === 'contratacao' && f.status !== 'cancelada',
  )
  if (!fatura) {
    const competencia = competenciaAtual(agora)
    const sufixo = envio.userEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
    fatura = {
      id: `FAT-${competencia}-${sufixo}-${agora}`,
      userEmail: envio.userEmail,
      competencia,
      quantidadeMoedas: quantidade,
      moedaIds: [],
      valorCents: total,
      status: 'pendente',
      dataEmissao: agora,
      dataVencimento: calcularVencimentoFatura(agora, DIAS_TOLERANCIA_FATURA),
      dataPagamento: null,
      formaPagamento: null,
      paymentIntentId: null,
      planoId: plano.id,
      origem: 'contratacao',
    }
    state.faturasCustodia.push(fatura)
  } else if (fatura.status !== 'paga' && fatura.valorCents !== total) {
    fatura.valorCents = total
    plano.valorPorMoedaCents = porMoeda
    plano.valorTotalCents = total
    plano.atualizadoEm = agora
  }

  return { plano, fatura }
}

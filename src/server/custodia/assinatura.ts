import 'server-only'

/**
 * Serviço de ciclo de vida e sincronização de assinaturas recorrentes de custódia.
 *
 * Regras:
 * - A assinatura acompanha a quantidade de moedas sob guarda do cliente.
 * - Comprou mais uma moeda: valor sobe R$ 2,00/mês.
 * - Vendeu/retirou moeda: valor desce R$ 2,00/mês.
 * - Zero moedas sob guarda: cancelamento imediato no Mercado Pago (PUT /preapproval/{id} status: 'cancelled').
 * - Em caso de falha de comunicação com o gateway, a transação local NÃO é revertida;
 *   o erro é logado detalhadamente para conciliação/suporte.
 */

import { moedasFaturaveis } from '@/domain/custody'
import { TAXAS_PADRAO, type TabelaDeTaxas } from '@/domain/fees'
import type { UserEmail } from '@/domain/types'
import {
  atualizarAssinaturaRecorrente,
  cancelarAssinaturaRecorrente,
} from '@/lib/payments'
import { getState, mutateState } from '@/server/state'

export async function sincronizarAssinaturaCustodia(
  userEmail: UserEmail,
  taxas: TabelaDeTaxas = TAXAS_PADRAO,
): Promise<{ sincronizado: boolean; motivo?: string }> {
  if (!userEmail) return { sincronizado: false, motivo: 'email_invalido' }

  const state = await getState()
  const user = state.users[userEmail]
  if (!user) return { sincronizado: false, motivo: 'usuario_nao_encontrado' }

  // Localiza plano do usuário com assinatura ativa no gateway
  const planos = state.planosCustodia || []
  const planoComAssinatura = planos.find(
    (p) =>
      p.userEmail === userEmail &&
      Boolean(p.assinaturaId) &&
      (p.status === 'vigente' || p.status === 'aguardando_pagamento'),
  )

  if (!planoComAssinatura || !planoComAssinatura.assinaturaId) {
    // Cliente não paga por cartão recorrente
    return { sincronizado: false, motivo: 'sem_assinatura_ativa' }
  }

  const assinaturaId = planoComAssinatura.assinaturaId
  const moedasAtivas = moedasFaturaveis(user)
  const qtdMoedas = moedasAtivas.length
  const taxaMensal = taxas.custodiaMensalPorMoeda ?? TAXAS_PADRAO.custodiaMensalPorMoeda

  // Caso 1: Cliente não possui mais moedas sob custódia -> Cancelar assinatura
  if (qtdMoedas === 0) {
    console.info(
      `[sincronizarAssinaturaCustodia] Cancelando assinatura ${assinaturaId} de ${userEmail} (0 moedas).`,
    )
    const res = await cancelarAssinaturaRecorrente(assinaturaId)

    if (res.ok) {
      await mutateState((s) => {
        const p = (s.planosCustodia || []).find((x) => x.id === planoComAssinatura.id)
        if (p) {
          p.status = 'encerrado'
          p.moedaIds = []
          p.atualizadoEm = Date.now()
        }
      })
      console.info(
        `[sincronizarAssinaturaCustodia] Assinatura ${assinaturaId} de ${userEmail} cancelada com sucesso.`,
      )
      return { sincronizado: true, motivo: 'assinatura_cancelada' }
    } else {
      console.error(
        `[sincronizarAssinaturaCustodia] FALHA ao cancelar assinatura ${assinaturaId} de ${userEmail}: ${res.error}. Requer conferência no painel.`,
      )
      return { sincronizado: false, motivo: `falha_cancelamento: ${res.error}` }
    }
  }

  // Caso 2: Quantidade de moedas mudou -> Atualizar valor da assinatura
  const novoValorCents = qtdMoedas * taxaMensal

  if (novoValorCents !== planoComAssinatura.valorTotalCents) {
    console.info(
      `[sincronizarAssinaturaCustodia] Ajustando assinatura ${assinaturaId} de ${userEmail}: de ${planoComAssinatura.valorTotalCents} para ${novoValorCents} cents (${qtdMoedas} moedas).`,
    )
    const res = await atualizarAssinaturaRecorrente(assinaturaId, novoValorCents)

    if (res.ok) {
      await mutateState((s) => {
        const p = (s.planosCustodia || []).find((x) => x.id === planoComAssinatura.id)
        if (p) {
          p.quantidadeContratada = qtdMoedas
          p.valorTotalCents = novoValorCents
          p.moedaIds = moedasAtivas.map((c) => c.id)
          p.atualizadoEm = Date.now()
        }
      })
      console.info(
        `[sincronizarAssinaturaCustodia] Assinatura ${assinaturaId} atualizada com sucesso.`,
      )
      return { sincronizado: true, motivo: 'assinatura_atualizada' }
    } else {
      console.error(
        `[sincronizarAssinaturaCustodia] FALHA ao atualizar assinatura ${assinaturaId} de ${userEmail} para ${novoValorCents} cents: ${res.error}.`,
      )
      return { sincronizado: false, motivo: `falha_atualizacao: ${res.error}` }
    }
  }

  return { sincronizado: true, motivo: 'valor_inalterado' }
}

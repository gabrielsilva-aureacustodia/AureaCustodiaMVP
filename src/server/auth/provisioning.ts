/* ============================================================================
 * CRIAÇÃO DA CONTA APÓS AUTENTICAÇÃO — somente servidor.
 *
 * O Supabase prova a identidade; esta função cria a conta apenas depois dessa
 * prova. O navegador nunca escolhe saldo nem acervo.
 *
 * A CONTA NASCE ZERADA, E ISSO NÃO É DETALHE. Até 20/09/2026 este módulo dava
 * R$ 5.000,00 de saldo e 6 moedas fictícias a QUALQUER pessoa que se
 * cadastrasse. Enquanto o site era um ambiente de teste fechado isso era a
 * demonstração funcionando; publicado no domínio oficial, com o gateway de
 * pagamento fora do sandbox, virou uma porta aberta — bastava criar uma conta
 * para anunciar moeda que não existe, formar preço com dinheiro que ninguém
 * depositou e pedir saque contra a conta real da empresa no Mercado Pago.
 *
 * Saldo só entra por depósito confirmado, e moeda só entra por envio físico
 * analisado na bancada. Quem quiser repor a demonstração faz isso pelo painel,
 * conta a conta, com a permissão correspondente — nunca por padrão no cadastro.
 * ==========================================================================*/

import 'server-only'

import type { Cents, User } from '@/domain/types'
import { mutateState } from '@/server/state'

/**
 * Saldo com que uma conta nova nasce: ZERO.
 *
 * A constante continua existindo, em vez de o valor ir direto no objeto, porque
 * `criarUsuarioNoPainel` (src/server/actions/admin/usuarios.ts) a repassa para a
 * criação manual — assim o padrão é um só e não há dois lugares para esquecer.
 */
export const SALDO_INICIAL: Cents = 0

/** Moedas com que uma conta nova nasce: NENHUMA. Moeda entra por custódia real. */
export const MOEDAS_INICIAIS = 0

export interface ProvisioningResult {
  created: boolean
  email: string
}

function nomeDaConta(nome: string | undefined, email: string): string {
  const normalizado = nome?.trim()
  if (normalizado && normalizado.length >= 2) return normalizado
  return email.split('@')[0] || 'Conta Real Olímpico'
}

/**
 * Cria a conta de uma identidade já confirmada. A operação é idempotente: duas
 * chegadas do callback atualizam o acesso da mesma conta.
 */
export async function provisionAuthenticatedUser(
  email: string,
  nome?: string,
): Promise<ProvisioningResult> {
  const normalized = email.trim().toLowerCase()

  const { result } = await mutateState<ProvisioningResult>((state) => {
    const existing = state.users[normalized]
    if (existing) {
      existing.prevAccess = existing.lastAccess
      existing.lastAccess = Date.now()
      return { created: false, email: normalized }
    }

    const user: User = {
      name: nomeDaConta(nome, normalized),
      balance: SALDO_INICIAL,
      coins: [],
      lastAccess: Date.now(),
    }
    state.users[normalized] = user

    return { created: true, email: normalized }
  })

  return result
}

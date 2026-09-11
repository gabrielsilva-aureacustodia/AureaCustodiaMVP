import 'server-only'

/**
 * Serviço de faturamento mensal de custódia e controle de inadimplência (Sessão B-5 / Bloco 8).
 *
 * Regras protegidas (Decisão D-3, 10/09/2026 e Cláusulas 3 e 4 dos Termos):
 * - R$ 2,00 por moeda guardada por mês.
 * - Ciclo mensal com tolerância de 10 dias para pagamento.
 * - Cobrança automática no saldo disponível caso o cliente possua saldo suficiente.
 * - Caso não haja saldo, fatura fica pendente para liquidação externa (Pix/cartão).
 * - Faturas vencidas ativam o status de inadimplência do usuário (`inadimplente = true`),
 *   o que bloqueia retiradas físicas e transferências.
 */

import { competenciaAtual, gerarFaturaParaUsuario, isInadimplente, verificarStatusFatura } from '@/domain/custody'
import type { ActionResult, FaturaCustodia, Timestamp, UserEmail } from '@/domain/types'
import { mutateState } from '@/server/state'

export interface RelatorioCicloFaturamento {
  competencia: string
  totalProcessados: number
  faturasGeradas: number
  faturasLiquidadasComSaldo: number
  faturasPendentes: number
  usuariosInadimplentes: number
}

/**
 * Executa o ciclo mensal de faturamento para todos os usuários com moedas ativas sob guarda.
 * Chamado pelo cron mensal (`/api/cron/faturamento`) ou manualmente por rotina administrativa.
 */
export async function processarCicloFaturamento(
  competenciaAlvo?: string,
  relogioReferencia?: Timestamp,
): Promise<RelatorioCicloFaturamento> {
  const agora = relogioReferencia ?? Date.now()
  const competencia = competenciaAlvo ?? competenciaAtual(agora)

  const { result } = await mutateState<RelatorioCicloFaturamento>((s) => {
    s.faturasCustodia = s.faturasCustodia ?? []
    const faturasExistentes = new Map<string, FaturaCustodia>()
    for (const f of s.faturasCustodia) {
      faturasExistentes.set(`${f.userEmail}#${f.competencia}`, f)
    }

    let faturasGeradas = 0
    let faturasLiquidadasComSaldo = 0
    let faturasPendentes = 0
    let usuariosInadimplentes = 0
    let totalProcessados = 0

    // 1. Geração de faturas e tentativa de débito automático em saldo
    for (const [email, user] of Object.entries(s.users)) {
      totalProcessados++
      const chave = `${email}#${competencia}`
      const fatura = faturasExistentes.get(chave)

      if (!fatura) {
        const novaFatura = gerarFaturaParaUsuario(user, email, competencia, agora)
        if (novaFatura) {
          faturasGeradas++
          // Débito automático se houver saldo suficiente
          if (user.balance >= novaFatura.valorCents) {
            user.balance -= novaFatura.valorCents
            novaFatura.status = 'paga'
            novaFatura.dataPagamento = agora
            novaFatura.formaPagamento = 'saldo'
            faturasLiquidadasComSaldo++
          } else {
            novaFatura.status = 'pendente'
            faturasPendentes++
          }
          s.faturasCustodia.push(novaFatura)
          faturasExistentes.set(chave, novaFatura)
        }
      }

      // 2. Atualização de status das faturas deste usuário e conferência de inadimplência
      const faturasDoUsuario = s.faturasCustodia.filter((f) => f.userEmail === email)
      for (const f of faturasDoUsuario) {
        f.status = verificarStatusFatura(f, agora)
      }

      const inadimplente = isInadimplente(user, faturasDoUsuario, agora)
      user.inadimplente = inadimplente
      if (inadimplente) {
        usuariosInadimplentes++
      }
    }

    return {
      competencia,
      totalProcessados,
      faturasGeradas,
      faturasLiquidadasComSaldo,
      faturasPendentes,
      usuariosInadimplentes,
    }
  })

  return result
}

/**
 * Liquida uma fatura de custódia pendente debitando o valor do saldo em conta do usuário.
 */
export async function pagarFaturaCustodiaComSaldo(
  faturaId: string,
  userEmail: UserEmail,
): Promise<ActionResult<{ fatura: FaturaCustodia }>> {
  try {
    const { result } = await mutateState<ActionResult<{ fatura: FaturaCustodia }>>((s) => {
      const u = s.users[userEmail]
      if (!u) {
        return { ok: false, error: 'Usuário não encontrado.' }
      }

      s.faturasCustodia = s.faturasCustodia ?? []
      const fatura = s.faturasCustodia.find((f) => f.id === faturaId)
      if (!fatura) {
        return { ok: false, error: 'Fatura de custódia não encontrada.' }
      }

      if (fatura.userEmail !== userEmail) {
        return { ok: false, error: 'Esta fatura pertence a outro usuário.' }
      }

      if (fatura.status === 'paga') {
        return { ok: false, error: 'Esta fatura já foi paga.' }
      }

      if (fatura.status === 'cancelada') {
        return { ok: false, error: 'Esta fatura foi cancelada.' }
      }

      if (u.balance < fatura.valorCents) {
        return {
          ok: false,
          error: `Saldo insuficiente para quitar a fatura (saldo: ${(u.balance / 100).toFixed(2)}, fatura: ${(fatura.valorCents / 100).toFixed(2)}).`,
        }
      }

      const agora = Date.now()
      u.balance -= fatura.valorCents
      fatura.status = 'paga'
      fatura.dataPagamento = agora
      fatura.formaPagamento = 'saldo'

      // Reavalia status de inadimplência do usuário
      const faturasRestantes = s.faturasCustodia.filter((f) => f.userEmail === userEmail)
      u.inadimplente = isInadimplente(u, faturasRestantes, agora)

      return { ok: true, data: { fatura } }
    })

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao processar pagamento com saldo.'
    return { ok: false, error: msg }
  }
}

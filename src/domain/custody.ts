/**
 * Módulo de domínio para o faturamento mensal de custódia e verificação de inadimplência.
 *
 * Regras de negócio protegidas (Decisão D-3, 10/09/2026 e Cláusulas 3 e 4 dos Termos):
 * - R$ 2,00 por moeda sob guarda por mês.
 * - Ciclo mensal de faturamento com vencimento em 10 dias de tolerância.
 * - Usuário com fatura pendente vencida torna-se inadimplente, bloqueando transferências e retiradas.
 */

import { custodiaMensalPorMoeda } from '@/domain/fees'
import type { FaturaCustodia, StatusFatura, Timestamp, User, UserEmail } from '@/domain/types'

/** Dias padrão de tolerância para vencimento da fatura mensal. */
export const DIAS_TOLERANCIA_FATURA = 10

/**
 * Retorna a competência no formato 'AAAA-MM'.
 */
export function competenciaAtual(data?: Date | number | string): string {
  const d = data !== undefined ? new Date(data) : new Date()
  const ano = d.getUTCFullYear()
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

/**
 * Calcula a data de vencimento da fatura com base na data de emissão e nos dias de tolerância.
 */
export function calcularVencimentoFatura(
  dataEmissao: Timestamp,
  diasTolerancia: number = DIAS_TOLERANCIA_FATURA
): Timestamp {
  return dataEmissao + diasTolerancia * 24 * 60 * 60 * 1000
}

/**
 * Gera uma fatura mensal de custódia para um usuário com base no seu acervo de moedas.
 * Retorna null caso o usuário não possua moedas ativas sob guarda.
 */
export function gerarFaturaParaUsuario(
  user: User,
  userEmail: UserEmail,
  competencia: string,
  agora: Timestamp = Date.now()
): FaturaCustodia | null {
  const moedasAtivas = (user.coins || []).filter((c) => !c.transferido)
  const quantidade = moedasAtivas.length

  if (quantidade <= 0) {
    return null
  }

  const valorCents = custodiaMensalPorMoeda(quantidade)
  const sanitizeEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const id = `FAT-${competencia}-${sanitizeEmail}-${agora}`

  return {
    id,
    userEmail,
    competencia,
    quantidadeMoedas: quantidade,
    moedaIds: moedasAtivas.map((c) => c.id),
    valorCents,
    status: 'pendente',
    dataEmissao: agora,
    dataVencimento: calcularVencimentoFatura(agora, DIAS_TOLERANCIA_FATURA),
    dataPagamento: null,
    formaPagamento: null,
    paymentIntentId: null,
  }
}

/**
 * Verifica se a fatura está atrasada com base no relógio de referência.
 */
export function verificarStatusFatura(
  fatura: FaturaCustodia,
  agora: Timestamp = Date.now()
): StatusFatura {
  if (fatura.status === 'paga' || fatura.status === 'cancelada') {
    return fatura.status
  }
  if (agora > fatura.dataVencimento) {
    return 'atrasada'
  }
  return fatura.status
}

/**
 * Avalia se o usuário está inadimplente.
 * Retorna true se a flag user.inadimplente estiver ativa ou se houver qualquer fatura
 * pendente vencida (status 'atrasada' ou pendente com dataVencimento < agora).
 */
export function isInadimplente(
  user: User,
  faturasDoUsuario?: FaturaCustodia[],
  agora: Timestamp = Date.now()
): boolean {
  if (faturasDoUsuario === undefined) {
    return Boolean(user.inadimplente)
  }

  return faturasDoUsuario.some((f) => {
    if (f.status === 'paga' || f.status === 'cancelada') {
      return false
    }
    return f.status === 'atrasada' || agora > f.dataVencimento
  })
}

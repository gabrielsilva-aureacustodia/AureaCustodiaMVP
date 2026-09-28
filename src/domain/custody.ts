/**
 * Módulo de domínio para o faturamento mensal de custódia e verificação de inadimplência.
 *
 * Regras de negócio protegidas (Decisão D-3, 10/09/2026 e Cláusulas 3 e 4 dos Termos):
 * - R$ 2,00 por moeda sob guarda por mês.
 * - Ciclo mensal de faturamento com vencimento em 10 dias de tolerância.
 * - Usuário com fatura pendente vencida torna-se inadimplente, bloqueando transferências e retiradas.
 */

import { custodiaMensalPorMoeda } from '@/domain/fees'
import type { Coin, FaturaCustodia, StatusFatura, Timestamp, User, UserEmail } from '@/domain/types'

/**
 * Prazo para pagar a fatura de custódia: 30 dias da emissão (27/09/2026).
 *
 * Era 10, e dez dias é curto demais para uma cobrança de R$ 2,00 por moeda que
 * chega sem aviso prévio — quem viaja duas semanas voltava com a conta
 * bloqueada. Trinta dias dá ao cliente o ciclo inteiro para pagar o ciclo.
 */
export const DIAS_TOLERANCIA_FATURA = 30

/**
 * A carência ENTRE vencer e bloquear: 1 dia (decisão do Gabriel, 27/09/2026).
 *
 * "Só deve travar a custódia 1 dia depois de não pagar a data da custódia."
 *
 * A distinção importa mais do que parece. Uma fatura em aberto dentro do prazo
 * NÃO é dívida: é uma conta a vencer, e travar venda e retirada por causa dela
 * é punir quem não fez nada de errado. Antes disto, a fatura nascia e no mesmo
 * instante a moeda saía do livro de ofertas — inclusive a fatura que o próprio
 * sistema acabara de emitir, sem o cliente ter tido um segundo para pagar.
 *
 * Quem responde "isto bloqueia?" é `faturaBloqueia`, e é ela que todas as
 * travas consultam. `verificarStatusFatura` continua marcando 'atrasada' no dia
 * seguinte ao vencimento, porque o rótulo é sobre o fato (está atrasada) e o
 * bloqueio é sobre a consequência (ainda não bloqueia).
 */
export const DIAS_CARENCIA_BLOQUEIO = 1

/**
 * Esta fatura já autoriza bloquear venda, retirada e anúncio?
 *
 * Só depois de vencida E passada a carência. Fatura paga ou cancelada nunca
 * bloqueia; fatura em aberto dentro do prazo também não.
 */
export function faturaBloqueia(
  fatura: Pick<FaturaCustodia, 'status' | 'dataVencimento'>,
  agora: Timestamp = Date.now(),
): boolean {
  if (fatura.status === 'paga' || fatura.status === 'cancelada') return false
  return agora > fatura.dataVencimento + DIAS_CARENCIA_BLOQUEIO * 24 * 60 * 60 * 1000
}

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
 * O último instante da competência — até quando a guarda paga está coberta.
 *
 * NÃO CONFUNDIR COM `dataVencimento` DA FATURA, e a confusão é fácil: aquela é
 * o PRAZO PARA PAGAR (emissão + 10 dias de tolerância), e some de utilidade no
 * instante em que a fatura é quitada. Esta é a COBERTURA: o que o dinheiro
 * comprou.
 *
 * As duas datas caem em ordens diferentes de propósito. Uma fatura emitida no
 * dia 25 vence para pagamento no dia 5 do mês seguinte, mas cobre a guarda só
 * até o dia 30 — o prazo de pagamento é uma cortesia, não mês de guarda a
 * mais. Mostrar o prazo numa coluna chamada "Vencimento", ao lado de uma
 * fatura já paga, fazia parecer que a custódia expirava ali.
 */
export function fimDaCompetencia(competencia: string): Timestamp {
  const [ano, mes] = competencia.split('-').map(Number)
  if (!ano || !mes) return 0
  // Dia 0 do mês SEGUINTE é o último dia deste, e o Date resolve a virada de
  // ano sozinho (mês 12 vira mês 0 do ano seguinte).
  //
  // MEIO-DIA, e não 23:59:59.999: quem exibe esta data usa o fuso local, e
  // 23:59 UTC cai no dia seguinte em qualquer fuso a leste de Greenwich. O
  // meio-dia cai no mesmo dia em todos eles, e continua antes de qualquer
  // prazo de pagamento emitido neste mês.
  return Date.UTC(ano, mes, 0, 12)
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
 * Moedas que pagam custódia: todas sob guarda com recibo que não foi extinto.
 * (Passo B2.1 — moedas adquiridas no marketplace continuam sob guarda e são faturadas;
 * moedas retiradas fisicamente com recibo Extinto deixam de ser faturadas).
 */
export function moedasFaturaveis(user: User): Coin[] {
  return (user.coins || []).filter((c) => c.recibo?.status !== 'Extinto')
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
  const moedasAtivas = moedasFaturaveis(user)
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
 * Avalia se o usuário está inadimplente — no sentido que BLOQUEIA.
 *
 * Desde 27/09/2026 a conta só entra aqui um dia depois de a fatura vencer
 * (`faturaBloqueia`). Antes bastava a fatura existir em aberto e já vencida no
 * mesmo instante; como esta função alimenta o bloqueio de venda e de retirada,
 * o cliente era travado sem ter tido prazo real para pagar.
 */
export function isInadimplente(
  user: User,
  faturasDoUsuario?: FaturaCustodia[],
  agora: Timestamp = Date.now()
): boolean {
  if (faturasDoUsuario === undefined) {
    return Boolean(user.inadimplente)
  }

  return faturasDoUsuario.some((f) => faturaBloqueia(f, agora))
}

/**
 * Diz POR QUE um lançamento `ajuste` do livro-razão existe (21/10/2026).
 *
 * O livro-razão é append-only e encadeado por hash: um lançamento gravado não se reescreve. O `ajuste` nasce
 * com um texto genérico ("Variação de saldo não explicada por negociação, depósito ou abertura"), porque a
 * rede de segurança do ledger só sabe que o saldo mudou — não por quê. Mas quando foi uma pessoa da equipe,
 * pelo painel (ajuste de saldo, regularização de custódia…), o MOTIVO foi gravado na trilha de auditoria, no
 * mesmo instante. Foi o que o Gabriel apontou no caso do Gerais: o livro-razão da ficha mostrava dois
 * "ajustes" sem explicação, e a explicação existia.
 *
 * Esta regra liga um ao outro SEM mexer no ledger: o ajuste é explicado pela ação do painel que afetou a mesma
 * conta, na mesma janela de tempo (a trilha e o ledger nascem na mesma operação, com milissegundos de
 * diferença). A ação mais próxima no tempo vence.
 *
 * Regra pura, sem I/O.
 */

/** O pedaço da trilha de auditoria de que a regra precisa. */
export interface EntradaDeTrilhaParaAjuste {
  createdAt: number
  acao: string
  usuariosAfetados: readonly string[]
  detalhes: Record<string, unknown>
}

/** Janela entre o lançamento e a ação do painel que o explica. Ação e ledger nascem juntos; 15 s sobram. */
export const JANELA_DA_EXPLICACAO_MS = 15_000

/**
 * A anotação explícita: o único jeito de explicar, DEPOIS, um lançamento que já foi gravado. O livro-razão é
 * encadeado por hash e não se reescreve (corrige-se com lançamento inverso, nunca editando), então a equipe
 * acrescenta à trilha uma linha que aponta para o lançamento pelo número e diz o que aconteceu.
 */
export const ACAO_DE_ANOTACAO = 'admin.financeiro.explicar_lancamento'

/**
 * O texto que a tela mostra no lugar do genérico, ou `null` quando nada na trilha explica o ajuste.
 *
 * Duas fontes, a anotação primeiro: (1) a anotação explícita, que aponta para o lançamento pelo `id` e vale em
 * qualquer data; (2) a ação do painel que nasceu junto com o ajuste.
 */
export function explicarAjuste(
  ajuste: { id?: number; userEmail: string; createdAt: number },
  trilha: readonly EntradaDeTrilhaParaAjuste[],
): string | null {
  if (ajuste.id !== undefined) {
    // A mais recente das anotações vence: a equipe pode corrigir o texto anotando de novo.
    const anotacoes = trilha
      .filter((t) => t.acao === ACAO_DE_ANOTACAO && t.detalhes.lancamentoId === ajuste.id && typeof t.detalhes.motivo === 'string' && t.detalhes.motivo.trim())
      .sort((a, b) => b.createdAt - a.createdAt)
    if (anotacoes[0]) return (anotacoes[0].detalhes.motivo as string).trim()
  }

  let melhor: { distancia: number; texto: string } | null = null
  for (const t of trilha) {
    // Só ação da EQUIPE: o resto da trilha (negociação, depósito…) não é motivo de ajuste.
    if (!t.acao.startsWith('admin.')) continue
    if (!t.usuariosAfetados.includes(ajuste.userEmail)) continue
    const motivo = typeof t.detalhes.motivo === 'string' ? t.detalhes.motivo.trim() : ''
    if (!motivo) continue
    const distancia = Math.abs(t.createdAt - ajuste.createdAt)
    if (distancia > JANELA_DA_EXPLICACAO_MS) continue
    if (!melhor || distancia < melhor.distancia) melhor = { distancia, texto: motivo }
  }
  return melhor?.texto ?? null
}

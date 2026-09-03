/**
 * O ciclo carregar -> mutar -> gravar sobre tabelas, com a MESMA semântica que
 * `state.ts` sempre ofereceu: `fn` recebe o AppState, muta no lugar, devolve um
 * resultado, e a gravação acontece quando ela retorna.
 *
 * Este módulo é parametrizado pelo `Executor` — quem abre a transação — em vez
 * de importar o cliente `pg` direto. É o que permite à suíte de testes rodar
 * exatamente este código contra um Postgres embutido (db.test.ts) e ao
 * `state.ts` rodá-lo contra o Supabase. Sem `server-only` pelo mesmo motivo:
 * aqui não há credencial, só a orquestração.
 *
 * O QUE MUDOU EM RELAÇÃO AO BLOB, E O QUE NÃO MUDOU
 * -------------------------------------------------
 *  - Não mudou: uma transação, uma trava, `fn` roda no meio, commit no fim.
 *    Duas compras simultâneas da mesma oferta continuam entrando em fila; a
 *    segunda revalida contra o estado que a primeira gravou e recebe a recusa
 *    ('Este anúncio não está mais disponível.'), não uma cobrança dupla.
 *  - Mudou: a gravação é do DIFF, não do documento inteiro. Uma compra grava
 *    duas linhas de usuário, uma de moeda, uma de negociação e apaga uma
 *    oferta — em vez de reescrever um JSON de 100 KB.
 *  - Mudou: a semeadura. O blob semeava quando `get` devolvia null; aqui, quando
 *    a tabela de usuários está vazia. O gatilho é diferente, o efeito é o mesmo:
 *    banco recém-migrado sobe com as 7 contas na primeira requisição.
 *  - Mudou (M4, 03/09/2026): a MESMA transação grava o ledger e a trilha de
 *    auditoria, derivados do diff (ver derivar.ts). Não existe saldo alterado
 *    sem lançamento: ou os dois commitam, ou nenhum.
 */

import { seedState } from '@/domain/seed'
import type { AppState } from '@/domain/types'

import { derivarLancamentos, resumirParaAuditoria } from './derivar'
import { normalizarTrade } from './diff'
import { registrarAuditoria } from './repositories/auditoria'
import { inserirLancamentos, ultimoHash } from './repositories/ledger'
import { carregarEstado, estaVazio, persistirEstado } from './repositories/state'
import type { Executor } from './sql'

/**
 * Leitura. Transação somente leitura com instantâneo consistente, sem trava —
 * o polling de 10 s de todas as contas não pode enfileirar atrás das escritas.
 * Banco vazio cai na semeadura, que passa pela trava para que duas primeiras
 * requisições simultâneas não semeiem duas vezes.
 */
export async function lerEstado(executar: Executor): Promise<AppState> {
  const state = await executar((tx) => carregarEstado(tx), { somenteLeitura: true })
  if (!estaVazio(state)) return state
  return (await mutarEstado(executar, (s) => s, { ator: 'sistema' })).state
}

export interface ContextoMutacao {
  /** Quem está fazendo: e-mail da sessão, 'sistema', 'webhook:…', 'cron:…'. */
  ator: string
}

/**
 * Escrita. A ordem dentro da transação é a garantia:
 *   1. trava (`seq` FOR UPDATE) — quem chegar depois espera aqui;
 *   2. carrega o estado JÁ com o commit de quem passou antes;
 *   3. `fn` muta uma cópia;
 *   4. grava a diferença entre o carregado e a cópia;
 *   5. deriva e grava o ledger e a linha de auditoria (M4);
 *   6. commit — e a trava solta.
 */
export async function mutarEstado<T>(
  executar: Executor,
  fn: (state: AppState) => T | Promise<T>,
  contexto: ContextoMutacao = { ator: 'sistema' },
): Promise<{ state: AppState; result: T }> {
  return executar(async (tx) => {
    const antes = await carregarEstado(tx, { travar: true })
    const semeadura = estaVazio(antes)
    // `structuredClone` em vez de mutar `antes`: o planejador de diff precisa
    // dos dois retratos. Num banco vazio o "depois" nasce do seed, e o diff
    // contra o retrato vazio vira a semeadura inteira em INSERTs.
    const state = semeadura ? seedState() : structuredClone(antes)
    const result = await fn(state)
    const ops = await persistirEstado(tx, antes, state)
    congelarComissoes(state, antes.trades.length)

    // Nada gravado (recusa, leitura disfarçada de mutação): nem ledger nem
    // auditoria. Uma trilha cheia de "nada aconteceu" esconde o que aconteceu.
    if (ops.length > 0) {
      const agora = Date.now()
      const hashAnterior = await ultimoHash(tx)
      const { lancamentos, ajustes } = derivarLancamentos({ antes, depois: state, ops, semeadura, agora, hashAnterior })
      await inserirLancamentos(tx, lancamentos)
      if (ajustes.length) {
        console.warn(
          `[aurea] ledger: ${ajustes.length} ajuste(s) gravado(s) — saldo alterado sem negociação, depósito ou abertura: ` +
            ajustes.map((a) => `${a.email} (${a.diferenca})`).join(', '),
        )
      }
      const resumo = resumirParaAuditoria(ops, semeadura, ajustes)
      await registrarAuditoria(tx, {
        createdAt: agora,
        ator: contexto.ator,
        acao: resumo.acao,
        entidade: null,
        entidadeId: null,
        usuariosAfetados: resumo.usuariosAfetados,
        detalhes: { ...resumo.detalhes, lancamentos: lancamentos.length },
      })
    }

    return { state, result }
  })
}

/**
 * As negociações novas ganham a comissão congelada TAMBÉM no objeto devolvido,
 * não só na linha gravada. Sem isto, o estado que a Server Action recebe de
 * volta (e a primeira leitura de um banco recém-semeado) teria Trades sem
 * `fee`, e a leitura seguinte os traria com — o mesmo dado com duas caras,
 * dependendo de quem perguntou. Achado pelo teste de ida e volta.
 *
 * Roda ANTES da derivação do ledger: o lançamento de comissão lê `t.fee`.
 */
function congelarComissoes(state: AppState, aPartirDe: number): void {
  for (const t of state.trades.slice(aPartirDe)) {
    if (t.fee === undefined) t.fee = normalizarTrade(t).fee
  }
}

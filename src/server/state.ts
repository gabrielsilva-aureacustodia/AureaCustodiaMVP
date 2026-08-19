/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Não importe este arquivo (nem nada de @/server/*) de um Client Component.
 * Ele conversa com Postgres/Redis e carrega segredos de ambiente; puxá-lo para
 * o bundle do navegador vazaria credenciais.
 *
 * O idiomático seria `import 'server-only'` no topo, que quebra o build ao
 * primeiro import indevido — mas o pacote não está no package.json e a
 * instalação está fora do escopo desta fase. Até lá, este aviso é a barreira.
 * ==========================================================================*/

import { STORE_KEY } from '@/domain/constants'
import { seedState } from '@/domain/seed'
import type { AppState } from '@/domain/types'

import { getStore } from './store'

/**
 * Substitui o par loadState/saveState do MVP (aurea-mvp-teste.html, 905-916).
 *
 * A diferença que importa não é o backend, é o desaparecimento da global: lá,
 * `state` ficava numa variável de módulo e toda função a lia direto. Aqui o
 * estado é carregado por requisição e passa por parâmetro para as funções puras
 * de @/domain — nenhum módulo servidor guarda AppState entre chamadas, porque
 * em serverless duas requisições podem cair em processos diferentes e uma
 * cópia em memória viraria dado velho na hora.
 */

/**
 * Preenche campos que um documento gravado por uma versão anterior do formato
 * pode não ter.
 *
 * Hoje só `deposits`, que nasceu na v6. A troca de STORE_KEY já garante que o
 * banco de produção comece limpo, então esta função nunca deveria ter trabalho
 * — ela existe para o caso de alguém apontar AUREA_STORE_KEY de volta para uma
 * chave antiga, em que `state.deposits.push()` estouraria um TypeError no meio
 * de uma transação de escrita.
 *
 * MUTA o estado recebido, de propósito: quem chama está prestes a devolvê-lo
 * para a camada de persistência, e um objeto novo perderia a identidade que o
 * `mutate` do store espera.
 */
function garantirFormato(state: AppState): AppState {
  if (!Array.isArray(state.deposits)) state.deposits = []
  return state
}

/**
 * Lê o estado. Na primeira execução — banco vazio — semeia com `seedState()` e
 * grava, exatamente como o `loadState` original fazia quando window.storage
 * não devolvia nada.
 */
export async function getState(): Promise<AppState> {
  const store = getStore()

  const current = await store.get<AppState>(STORE_KEY)
  if (current) return garantirFormato(current)

  // A semeadura passa por `mutate` e não por um `set` solto: no Postgres isso
  // a coloca dentro da transação com trava, então duas requisições que chegam
  // juntas num banco vazio não geram dois seeds concorrentes (a segunda vê o
  // estado da primeira e o devolve intacto).
  const { state } = await store.mutate<AppState, AppState>(
    STORE_KEY,
    (cur) => cur ?? seedState(),
    (s) => s,
  )
  return state
}

/**
 * Ciclo completo carregar -> mutar -> salvar do original, agora atômico no
 * backend que suporta atomicidade.
 *
 * `fn` recebe o estado e pode mutá-lo NO LUGAR, do mesmo jeito que as funções
 * do MVP mexiam na global — a gravação acontece depois que ela retorna. O que
 * `fn` devolver vira o `result`, que é como as rotas de API montam a mensagem
 * do toast sem precisar reler o estado.
 */
export async function mutateState<T>(
  fn: (state: AppState) => T | Promise<T>,
): Promise<{ state: AppState; result: T }> {
  const store = getStore()

  // O contrato do store separa "mutar" de "extrair o retorno", então o valor
  // produzido por `fn` é guardado aqui e entregue pelo `pick`. A caixa existe
  // para distinguir "ainda não rodou" de "rodou e devolveu undefined".
  let captured: { value: T } | null = null

  return store.mutate<T, AppState>(
    STORE_KEY,
    async (current) => {
      const state = garantirFormato(current ?? seedState())
      captured = { value: await fn(state) }
      return state
    },
    () => {
      if (!captured) {
        throw new Error('mutateState: o mutator não chegou a executar')
      }
      return captured.value
    },
  )
}

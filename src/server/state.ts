/* ============================================================================
 * ATENÇÃO — MÓDULO EXCLUSIVO DE SERVIDOR.
 *
 * Não importe este arquivo (nem nada de @/server/*) de um Client Component.
 * Ele conversa com Postgres/Redis e carrega segredos de ambiente; puxá-lo para
 * o bundle do navegador vazaria credenciais.
 *
 * A barreira é o `import 'server-only'` abaixo: qualquer import indevido a
 * partir de um Client Component QUEBRA O BUILD, com mensagem apontando o
 * arquivo culpado. Não é mais só este aviso — é o compilador.
 * ==========================================================================*/

import 'server-only'

import { STORE_KEY } from '@/domain/constants'
import { seedState } from '@/domain/seed'
import type { AppState } from '@/domain/types'

import { bancoConfigurado, executarNoBanco } from './db/client'
import { lerEstado, mutarEstado } from './db/estado'
import { getStore } from './store'

/**
 * DOIS MOTORES, UMA FACHADA — o contrato das frentes paralelas
 * -------------------------------------------------------------
 * `getState()` e `mutateState()` têm a assinatura congelada: é o que permite
 * às frentes A (login) e C (pagamentos) escreverem código hoje que continua
 * valendo depois da migração. O que muda é POR BAIXO:
 *
 *  - com `POSTGRES_URL` (ou `DATABASE_URL`), o estado vive em TABELAS no
 *    schema `aurea` do Supabase — ver ./db/. É o módulo M1 entregue;
 *  - sem ela, vale o caminho antigo do blob JSON em ./store/ (Redis ou
 *    memória), para `npm run dev` funcionar sem infraestrutura e para a
 *    produção não cair enquanto a variável não estiver na Vercel.
 *
 * O adaptador de blob em ./store/postgres.ts fica sem uso quando o banco está
 * configurado — a pasta inteira sai no fim do M1, quando a produção tiver
 * rodado sobre tabelas (passo 9 do plano). Até lá, é a rede de segurança.
 */

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
 * Normaliza um documento gravado por uma versão anterior do formato de estado.
 *
 * A troca de STORE_KEY já garante que o banco de produção comece limpo, então
 * esta função nunca deveria ter trabalho — ela existe para o caso de alguém
 * apontar AUREA_STORE_KEY de volta para uma chave antiga (o cenário do item
 * CD-01 de docs/diario/CRITICAL_DEBUGS.md). Duas proteções:
 *
 *  - `deposits` ausente (nasceu na v6) viraria TypeError no primeiro
 *    `state.deposits.push()`, no meio de uma transação de escrita;
 *  - ordem de v5 sem `tipoMoeda` é DESCARTADA do livro. Sem isso, duas ordens
 *    antigas casariam entre si no motor — `undefined === undefined` é
 *    verdadeiro — e os mercados voltariam a se misturar sem erro e sem aviso.
 *    Descartar é a resposta certa porque uma ordem sem tipo não tem livro a
 *    que pertencer; o dono a republica em segundos.
 *
 * MUTA o estado recebido, de propósito: quem chama está prestes a devolvê-lo
 * para a camada de persistência, e um objeto novo perderia a identidade que o
 * `mutate` do store espera.
 */
function garantirFormato(state: AppState): AppState {
  if (!Array.isArray(state.deposits)) state.deposits = []

  const antes = state.sellOffers.length + state.buyOrders.length
  state.sellOffers = state.sellOffers.filter((o) => typeof o.tipoMoeda === 'string')
  state.buyOrders = state.buyOrders.filter((b) => typeof b.tipoMoeda === 'string')
  const descartadas = antes - state.sellOffers.length - state.buyOrders.length
  if (descartadas > 0) {
    console.warn(
      `[aurea] ${descartadas} ordem(ns) sem tipoMoeda descartada(s) do livro — ` +
        'documento gravado por formato anterior à v6 (ver CD-01).',
    )
  }

  return state
}

/**
 * Lê o estado. Na primeira execução — banco vazio — semeia com `seedState()` e
 * grava, exatamente como o `loadState` original fazia quando window.storage
 * não devolvia nada.
 */
export async function getState(): Promise<AppState> {
  if (bancoConfigurado()) return lerEstado(executarNoBanco)

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
  if (bancoConfigurado()) return mutarEstado(executarNoBanco, fn)

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

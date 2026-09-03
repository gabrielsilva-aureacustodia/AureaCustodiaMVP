'use client'

/**
 * Estado da aplicação no cliente — substitui as globais `state` e `session` do
 * monolito (aurea-mvp-teste.html, linhas 895-899) e o ciclo de sincronização de
 * 10s (linhas 1094-1105).
 *
 * O MODELO DE MUTAÇÃO DO ORIGINAL, TRADUZIDO
 * ------------------------------------------
 * Toda ação do MVP tinha a mesma forma:
 *
 *     await loadState();   // relê o banco compartilhado
 *     ...muta o estado...  // regra de negócio
 *     await saveState();   // grava
 *     toast('...');        // avisa
 *     render();            // redesenha
 *
 * Aqui a regra de negócio migrou para o servidor (server actions), e o que
 * sobra no cliente é `run()`: dispara a ação, mostra o toast com a mensagem que
 * ela devolveu e refaz a leitura do estado. A ordem é a mesma; o que mudou é que
 * o navegador deixou de ser dono da regra — ele não decide mais se você tem
 * saldo, se a moeda é sua ou se a oferta ainda existe.
 *
 * SINCRONIZAÇÃO ENTRE CONTAS
 * --------------------------
 * Sete usuários dividem um único estado; cada aba precisa enxergar o que as
 * outras fizeram. O original resolvia com setInterval de SYNC_MS relendo o
 * banco e comparando JSON.stringify antes de redesenhar. Este port faz o mesmo
 * contra GET /api/state, com duas diferenças:
 *
 *  - a comparação de JSON evita o setState quando nada mudou, o que aqui poupa
 *    uma árvore inteira de re-render (no original poupava o `render()`);
 *  - o relógio para quando a aba está oculta e volta ao reaparecer. O original
 *    não fazia isso e ficava batendo no storage com a aba em segundo plano.
 *    Não muda comportamento nenhum: ao voltar, a primeira coisa que acontece é
 *    uma leitura imediata.
 */

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { SYNC_MS } from '@/domain/constants'
import type { ActionResult, AppState, User, UserEmail } from '@/domain/types'
import { useToast } from '@/components/ui/Toast'

interface AppCtx {
  /** O estado inteiro, do jeito que o servidor devolveu na última leitura. */
  state: AppState
  /** E-mail da sessão. Vem do cookie assinado, não de nada digitado no cliente. */
  session: UserEmail
  /** Atalho para state.users[session] — o "u" que o monolito calculava em toda tela. */
  me: User
  /**
   * true quando a sessão é de administrador (sócio ou contador): decide se o
   * menu mostra "Relatórios". Vem do servidor, pelo (app)/layout — a regra
   * mora em src/server/relatorios/acesso.ts e o cliente só a recebe pronta.
   */
  admin: boolean
  /** Relê GET /api/state e atualiza, se mudou. */
  refresh(): Promise<void>
  /** Executa a server action, mostra o toast e relê o estado. Ver nota do topo. */
  run<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>>
}

/**
 * Mensagem de falha de gravação do MVP (linha 915). É reaproveitada aqui para o
 * caso em que a própria chamada da server action não completa — rede caiu, a
 * função serverless expirou, a resposta veio quebrada. Do ponto de vista de quem
 * está usando, é o mesmo evento: a operação não foi salva.
 */
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

const Ctx = createContext<AppCtx | null>(null)

export function useApp(): AppCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp() precisa estar dentro de <AppProvider>.')
  return ctx
}

interface Props {
  /** Estado buscado no servidor pelo (app)/layout — a primeira pintura já vem cheia. */
  initialState: AppState
  session: UserEmail
  /** Decidido no servidor. Padrão false: ninguém vira administrador por omissão. */
  admin?: boolean
  children: ReactNode
}

export function AppProvider({ initialState, session, admin = false, children }: Props): ReactNode {
  const router = useRouter()
  const toast = useToast()

  const [state, setState] = useState<AppState>(initialState)

  /**
   * Serialização do último estado aplicado. É o equivalente do
   * `const before = JSON.stringify(state)` do startSync original (linha 1099) —
   * guardado num ref, e não no estado, porque mudá-lo não pode disparar render.
   */
  const ultimoJson = useRef<string>(JSON.stringify(initialState))

  const aplicar = useCallback((proximo: AppState) => {
    const json = JSON.stringify(proximo)
    // Igual ao anterior: nada a fazer. O original chamava updateHeader() neste
    // ramo porque o cabeçalho era DOM manual; aqui ele já reflete `state`.
    if (json === ultimoJson.current) return
    ultimoJson.current = json
    setState(proximo)
  }, [])

  const refresh = useCallback(async () => {
    try {
      // cache:'no-store' no cliente, no-store no servidor e force-dynamic na
      // rota: os três precisam concordar, senão o polling fica lendo a mesma
      // resposta congelada pelo CDN e a sincronização entre contas some.
      const r = await fetch('/api/state', { cache: 'no-store' })

      // Sessão caiu (cookie expirou, segredo rotacionado): volta ao login em vez
      // de continuar mostrando dados de um usuário que já não está autenticado.
      if (r.status === 401) {
        router.replace('/')
        return
      }
      if (!r.ok) return

      const body = (await r.json()) as { state: AppState }
      if (body && body.state) aplicar(body.state)
    } catch {
      // Falha de rede numa leitura de fundo não merece toast: o estado que já
      // está na tela continua válido e a próxima volta do ciclo tenta de novo.
    }
  }, [router, aplicar])

  const run = useCallback(
    // A vírgula em <T,> não é engano: sem ela o TypeScript lê o <T> como abertura
    // de JSX dentro de um arquivo .tsx.
    async <T,>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> => {
      let res: ActionResult<T>
      try {
        res = await fn()
      } catch {
        // Server action que nem chega a responder. Sem este catch a promessa
        // rejeitada some no vazio e a interface fica muda — o usuário clica,
        // nada acontece e não há explicação.
        res = { ok: false, error: FALHA_GRAVACAO }
        toast(FALHA_GRAVACAO)
        return res
      }

      // Mesma precedência do original: sucesso mostra `message`, falha mostra
      // `error`. Ação que não devolve texto nenhum não abre toast (é o caso do
      // login e do logout, que trocam de tela em vez de avisar).
      const msg = res.ok ? res.message : res.error
      if (msg) toast(msg)

      // A releitura acontece mesmo quando a ação falha: a recusa pode ter vindo
      // justamente porque o estado do servidor mudou por baixo (a oferta que
      // você tentou comprar acabou de ser comprada por outro), e nesse caso a
      // tela precisa passar a mostrar a realidade nova.
      await refresh()
      return res
    },
    [toast, refresh],
  )

  /* ---------- ciclo de sincronização (SYNC_MS = 10s) ---------- */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const parar = (): void => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
    const comecar = (): void => {
      if (timer === null) timer = setInterval(() => void refresh(), SYNC_MS)
    }
    const aoTrocarVisibilidade = (): void => {
      if (document.hidden) {
        parar()
        return
      }
      // Voltar para a aba é o momento em que o estado mais provavelmente está
      // velho — lê na hora, sem esperar os 10s do próximo ciclo.
      void refresh()
      comecar()
    }

    if (!document.hidden) comecar()
    document.addEventListener('visibilitychange', aoTrocarVisibilidade)
    return () => {
      parar()
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade)
    }
  }, [refresh])

  /**
   * `me` nunca é undefined na prática: o (app)/layout já derrubou para o login
   * quem não existe em state.users, e a sessão vem de cookie assinado. O acesso
   * direto mantém o tipo User, que é o que todas as telas esperam.
   */
  const me = state.users[session]

  const value = useMemo<AppCtx>(
    () => ({ state, session, me, admin, refresh, run }),
    [state, session, me, admin, refresh, run],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

'use client'

/**
 * O contexto do painel administrativo: o membro, a pergunta "posso?" e o `run()` das
 * ações (plano do Admin, seção 1.4).
 *
 * POR QUE NÃO É O AppProvider. O `AppProvider` do app carrega o `AppState` inteiro e o
 * relê a cada 10 segundos. O painel lê ledger, trilha, papéis e indicadores — nada
 * disso está no `AppState` —, e pendurar o admin ali faria toda tela administrativa
 * arrastar o estado do marketplace sem usar. Aqui os dados vêm dos Server Components
 * de cada página, e depois de uma ação o `run()` pede ao roteador que os refaça.
 *
 * O MEMBRO CHEGA PRONTO DO SERVIDOR (layout do painel). O cliente não resolve papel
 * nem permissão: `pode()` só lê a lista que o servidor mandou, para esconder o que o
 * papel não alcança. Quem recusa de verdade é a Server Action.
 */

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

import type { ChavePermissao, MembroAdmin } from '@/domain/admin/permissoes'
import type { ActionResult } from '@/domain/types'
import { useToast } from '@/components/ui/Toast'

interface AdminCtx {
  membro: MembroAdmin
  pode(chave: ChavePermissao): boolean
  /** Executa a Server Action, mostra o toast e refaz os dados da página. */
  run<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>>
}

/** Mesma mensagem do app para a ação que nem chega a responder. */
const FALHA_GRAVACAO = 'Falha ao salvar dados. Tente novamente.'

const Ctx = createContext<AdminCtx | null>(null)

export function useAdmin(): AdminCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAdmin() precisa estar dentro de <AdminProvider>.')
  return ctx
}

export function AdminProvider({ membro, children }: { membro: MembroAdmin; children: ReactNode }): ReactNode {
  const router = useRouter()
  const toast = useToast()

  const pode = useCallback((chave: ChavePermissao) => membro.permissoes.includes(chave), [membro])

  const run = useCallback(
    async <T,>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> => {
      let res: ActionResult<T>
      try {
        res = await fn()
      } catch {
        toast(FALHA_GRAVACAO)
        return { ok: false, error: FALHA_GRAVACAO }
      }
      const msg = res.ok ? res.message : res.error
      if (msg) toast(msg)
      // Refaz os Server Components da rota: o que mudou está no banco, e é de lá que
      // a página lê. Mesmo na falha — a recusa pode ter vindo de um dado que mudou.
      router.refresh()
      return res
    },
    [router, toast],
  )

  const value = useMemo<AdminCtx>(() => ({ membro, pode, run }), [membro, pode, run])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

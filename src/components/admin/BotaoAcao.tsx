'use client'

/**
 * Um botão que dispara uma Server Action do painel pelo `run()` do `AdminProvider`:
 * mostra o toast, refaz os dados da página e fica desabilitado enquanto espera.
 *
 * Existe para as páginas do painel poderem ser Server Components e ainda assim ter
 * um botão de ação — o Server Component passa a Server Action como propriedade, que é
 * uma referência serializável que o Next sabe entregar ao cliente.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import type { ActionResult } from '@/domain/types'

import { useAdmin } from './AdminProvider'

export function BotaoAcao({
  acao,
  children,
  variante = 'outline',
  usoNome,
}: {
  acao: () => Promise<ActionResult<unknown>>
  children: ReactNode
  variante?: 'outline' | 'gold'
  /** Nome para o registro de uso (`data-uso`). */
  usoNome?: string
}): ReactNode {
  const { run } = useAdmin()
  const [ocupado, setOcupado] = useState(false)
  return (
    <button
      type="button"
      className={`btn ${variante === 'gold' ? 'btn-gold' : 'btn-outline'} adm-btn-compacto`}
      disabled={ocupado}
      data-uso={usoNome}
      onClick={async () => {
        setOcupado(true)
        await run(acao)
        setOcupado(false)
      }}
    >
      {children}
    </button>
  )
}

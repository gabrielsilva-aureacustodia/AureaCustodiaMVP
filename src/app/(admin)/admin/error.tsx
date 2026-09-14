'use client'

/**
 * A fronteira de erro das telas do painel.
 *
 * Uma tela que não consegue carregar — banco instável, migration ainda não aplicada
 * logo depois de um deploy — mostra esta caixa DENTRO do casco do painel, com o menu
 * funcionando, em vez da página de erro genérica que derruba tudo. O detalhe técnico
 * vai para o log do servidor; aqui fica o que a pessoa pode fazer.
 */

import Link from 'next/link'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

export default function ErroDoPainel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): ReactNode {
  useEffect(() => {
    console.error('[admin] falha ao carregar a tela:', error)
  }, [error])

  return (
    <div className="panel adm-aviso" role="alert">
      <h3>Não foi possível carregar esta tela agora</h3>
      <p>
        O painel continua de pé — o problema foi ao buscar os dados desta área. Tente de novo; se persistir, confira se a
        publicação mais recente teve as migrations aplicadas (<code>npm run db:check</code>).
      </p>
      {error.digest ? <p className="adm-nota-tecnica">Código para o log: {error.digest}</p> : null}
      <div className="adm-acoes">
        <button type="button" className="btn btn-gold" onClick={reset}>
          Tentar de novo
        </button>
        <Link href="/admin" className="btn btn-outline">
          Voltar ao painel
        </Link>
      </div>
    </div>
  )
}

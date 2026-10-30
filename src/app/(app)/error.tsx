'use client'

/**
 * A fronteira de erro das telas do cliente (30/10/2026, polimento — lente "estados").
 *
 * Até aqui só o painel (`(admin)/admin/error.tsx`) tinha esta caixa: uma tela do cliente que
 * falhasse ao carregar caía na página de erro genérica do Next, sem menu e sem saída. Aqui a
 * falha aparece DENTRO do casco, com o menu funcionando. Dentro do `(app)` o layout só chega
 * até aqui com a sessão já conferida, então "Voltar ao início" sempre abre.
 *
 * O texto é para o cliente (sem "banco", "servidor" ou código); o detalhe técnico vai para o
 * console e o `digest` ajuda a equipe a achar a linha no log.
 */

import Link from 'next/link'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

export default function ErroDaTela({ error, reset }: { error: Error & { digest?: string }; reset: () => void }): ReactNode {
  useEffect(() => {
    console.error('[app] falha ao carregar a tela:', error)
  }, [error])

  return (
    <div className="panel" role="alert">
      <h3>Não foi possível abrir esta tela agora</h3>
      <p>
        O Real Olímpico continua funcionando — só esta tela não carregou. Nenhuma operação foi feita por causa disso.
        Tente de novo; se continuar, fale com o atendimento.
      </p>
      {error.digest ? <p className="u-sutil">Código para o atendimento: {error.digest}</p> : null}
      <div className="acoes">
        <button type="button" className="btn btn-gold" onClick={reset}>
          Tentar de novo
        </button>
        <Link href="/inicio" className="btn btn-outline">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}

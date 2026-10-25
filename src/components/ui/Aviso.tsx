/**
 * Aviso em bloco (Brandbook §9.5): o recado que precisa ficar NA tela, ao lado
 * da ação — custódia a pagar, depósito simulado, prazo de saque. O toast some
 * em 3,6 s; o aviso fica.
 *
 * `role="alert"` só no tom de perigo: anunciar todo aviso informativo como
 * alerta faria o leitor de tela interromper a pessoa a cada página.
 * Server Component.
 */

import type { ReactNode } from 'react'

export type TomDoAviso = 'info' | 'sucesso' | 'aviso' | 'perigo'

/* Ícones de traço, desenhados aqui para não puxar biblioteca de ícones de
   cliente (ver doc 35 do aprendizado_frontend: ícone em RSC hidratava). */
const ICONES: Record<TomDoAviso, ReactNode> = {
  info: <path d="M12 16v-5m0-3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  sucesso: <path d="m8 12.5 2.5 2.5L16 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  aviso: <path d="M12 9v4m0 3h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  perigo: <path d="M12 8v5m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
}

export function Aviso({
  tom = 'info',
  titulo,
  children,
}: {
  tom?: TomDoAviso
  titulo?: string
  children?: ReactNode
}): ReactNode {
  return (
    <div className={`ro-aviso ro-aviso--${tom}`} role={tom === 'perigo' ? 'alert' : undefined}>
      <svg
        className="ro-aviso__icone"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICONES[tom]}
      </svg>
      {titulo ? <p className="ro-aviso__titulo">{titulo}</p> : null}
      {children ? <div>{children}</div> : null}
    </div>
  )
}

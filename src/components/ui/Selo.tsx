/**
 * Selo de situação (Brandbook §9.4): "Paga", "Em aberto", "Travada", "No cofre".
 *
 * Existe para que a situação nunca dependa só da cor: o selo sempre leva
 * TEXTO, e o ponto colorido é reforço. Server Component — só marcação, não
 * manda JavaScript ao navegador.
 */

import type { ReactNode } from 'react'

export type TomDoSelo = 'neutro' | 'sucesso' | 'perigo' | 'aviso' | 'info' | 'ouro'

export function Selo({ tom = 'neutro', children }: { tom?: TomDoSelo; children: ReactNode }): ReactNode {
  return <span className={tom === 'neutro' ? 'ro-selo' : `ro-selo ro-selo--${tom}`}>{children}</span>
}

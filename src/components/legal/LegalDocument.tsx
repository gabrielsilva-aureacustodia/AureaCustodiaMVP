/**
 * Casco das páginas de documento (Termos, Privacidade, Taxas, SAC, Academy).
 *
 * Desde a Frente 3 (25/10/2026) usa o mesmo cabeçalho e rodapé da landing (`PublicHeader`/`PublicFooter`):
 * antes cada superfície tinha o seu, e quem ia da landing para /taxas parecia ter trocado de site.
 * Só a apresentação mudou — título, versão, hash, botão de imprimir e o texto (`children`) são os mesmos.
 */

import type { ReactNode } from 'react'

import { PublicFooter } from '@/components/landing/PublicFooter'
import { PublicHeader } from '@/components/landing/PublicHeader'

import { PrintButton } from './PrintButton'

interface LegalDocumentProps {
  title: string
  version: string
  updatedAt: string
  hash?: string
  children: ReactNode
  eyebrow?: string
  noticeTitle?: string
  noticeDescription?: ReactNode
}

export function LegalDocument({
  title,
  version,
  updatedAt,
  hash,
  children,
  eyebrow = 'Documento institucional oficial',
  noticeTitle,
  noticeDescription,
}: LegalDocumentProps): ReactNode {
  return (
    <main className="pub-page legal-page">
      <a href="#documento" className="skip-link">
        Pular para o documento
      </a>
      <PublicHeader variante="documento" />

      {/* Faixa de título no mesmo sistema da landing; o texto do documento vem intacto em `children`. */}
      <div className="legal-capa">
        <div className="legal-capa-inner">
          <p className="pub-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-meta">
            Versão: <strong>{version}</strong> · Vigente desde {updatedAt}
          </p>
          <div className="legal-actions-bar">
            {hash ? (
              <div className="legal-hash-pill" title={`Hash SHA-256 canônico integral: ${hash}`}>
                <strong>SHA-256:</strong>
                <span className="legal-hash-code">{hash.slice(0, 16)}…{hash.slice(-8)}</span>
              </div>
            ) : (
              <span />
            )}
            <PrintButton />
          </div>
        </div>
      </div>

      <article id="documento" tabIndex={-1} className="legal-document">
        {noticeTitle && (
          <aside className="legal-draft-warning" role="note">
            <strong>{noticeTitle}</strong>
            {typeof noticeDescription === 'string' ? <p>{noticeDescription}</p> : noticeDescription}
          </aside>
        )}

        <div className="legal-content">{children}</div>
      </article>

      <PublicFooter />
    </main>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_REAL_EMBLEMA } from '@/domain/constants'
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
    <main className="legal-page">
      <header className="legal-header">
        <Link className="landing-brand" href="/" aria-label="Real Olímpico — início">
          <Image src={LOGO_REAL_EMBLEMA} alt="Real Olímpico" width={58} height={58} priority />
          <span>
            <strong>Real Olímpico</strong>
            <small>Custódia de moedas comemorativas</small>
          </span>
        </Link>
        <nav aria-label="Documentos e acesso">
          <Link href="/academy">Academy</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/taxas">Taxas</Link>
          <Link href="/suporte">SAC</Link>
          <Link className="btn btn-outline" href="/entrar">
            Entrar
          </Link>
        </nav>
      </header>

      <article className="legal-document">
        <p className="landing-eyebrow">{eyebrow}</p>
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

        {noticeTitle && (
          <aside className="legal-draft-warning" role="note">
            <strong>{noticeTitle}</strong>
            {typeof noticeDescription === 'string' ? <p>{noticeDescription}</p> : noticeDescription}
          </aside>
        )}

        <div className="legal-content">{children}</div>
      </article>

      <footer className="legal-footer">
        <p>AUREA CUSTODIA LTDA · CNPJ 68.071.452/0001-06</p>
        <div className="legal-footer-nav">
          <Link href="/academy">Academy</Link>
          <Link href="/termos">Termos</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/taxas">Taxas</Link>
          <Link href="/suporte">SAC</Link>
          <Link href="/">Página inicial</Link>
        </div>
      </footer>
    </main>
  )
}

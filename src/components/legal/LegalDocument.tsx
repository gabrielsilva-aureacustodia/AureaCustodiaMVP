import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'

interface LegalDocumentProps {
  title: string
  version: string
  updatedAt: string
  children: ReactNode
  eyebrow?: string
  noticeTitle?: string
  noticeDescription?: ReactNode
}

export function LegalDocument({
  title,
  version,
  updatedAt,
  children,
  eyebrow = 'Documento institucional oficial',
  noticeTitle = 'Estrutura operacional acordada — redação jurídica final em 12/09/2026',
  noticeDescription = (
    <p>
      Este documento consolida o posicionamento institucional, a narrativa de origem e as cláusulas
      operacionais aprovadas pela diretoria e alinhadas na reunião com o jurídico em 09/09/2026.
      A redação final elaborada pela assessoria jurídica será incorporada em 12/09/2026.
    </p>
  ),
}: LegalDocumentProps): ReactNode {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="landing-brand" href="/" aria-label="Áurea Custódia — início">
          <Image src={LOGO_AUREA} alt="Áurea Custódia" width={58} height={58} priority />
          <span>
            <strong>Áurea Custódia</strong>
            <small>Real Olímpico</small>
          </span>
        </Link>
        <nav aria-label="Documentos e acesso">
          <Link href="/termos">Termos</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link className="btn btn-outline" href="/entrar">
            Entrar
          </Link>
        </nav>
      </header>

      <article className="legal-document">
        <p className="landing-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-meta">
          Versão: <strong>{version}</strong> · Atualizado em {updatedAt}
        </p>

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
        <Link href="/">Voltar à página inicial</Link>
      </footer>
    </main>
  )
}

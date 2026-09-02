import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'

interface LegalDocumentProps {
  title: string
  version: string
  updatedAt: string
  children: ReactNode
}

export function LegalDocument({
  title,
  version,
  updatedAt,
  children,
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
        <p className="landing-eyebrow">Documento legal provisório</p>
        <h1>{title}</h1>
        <p className="legal-meta">
          Versão: <strong>{version}</strong> · Atualizado em {updatedAt}
        </p>

        <aside className="legal-draft-warning" role="note">
          <strong>Rascunho operacional — revisão jurídica pendente.</strong>
          <p>
            Este texto permite testar a plataforma e o registro versionado do aceite. Ele não
            representa aprovação do advogado e deve ser revisado antes da abertura pública ou
            da movimentação de dinheiro real.
          </p>
        </aside>

        <div className="legal-content">{children}</div>
      </article>

      <footer className="legal-footer">
        <p>AUREA CUSTODIA LTDA · CNPJ 68.071.452/0001-06</p>
        <Link href="/">Voltar à página inicial</Link>
      </footer>
    </main>
  )
}

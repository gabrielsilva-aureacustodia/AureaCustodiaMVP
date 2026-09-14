import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'
import { DOCUMENTOS_VIGENTES } from '@/domain/documentos-legais'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Áurea Custódia',
  description:
    'Política de Privacidade da plataforma Áurea Custódia — governança de dados pessoais, cadastro progressivo e conformidade com a LGPD.',
}

export default function PrivacyPage(): ReactNode {
  const info = DOCUMENTOS_VIGENTES.politica_privacidade
  const doc = info.documento

  return (
    <LegalDocument
      title={doc.titulo}
      version={doc.versao}
      updatedAt={doc.vigenteDesde}
      hash={info.hash}
      eyebrow="Governança de Dados e Conformidade LGPD"
    >
      {doc.preambulo && doc.preambulo.length > 0 && (
        <div className="legal-quote">
          {doc.preambulo.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      )}

      {doc.capitulos.map((cap) => (
        <section key={cap.numero} id={`capitulo-${cap.numero}`}>
          <h2>
            Capítulo {cap.numero} — {cap.titulo}
          </h2>

          {cap.paragrafos.map((par, pIdx) => (
            <div key={pIdx}>
              {par.texto ? <p>{par.texto}</p> : null}
              {par.alineas && par.alineas.length > 0 && (
                <ul>
                  {par.alineas.map((al) => (
                    <li key={al.letra}>
                      <strong>{al.letra})</strong> {al.texto}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      ))}
    </LegalDocument>
  )
}

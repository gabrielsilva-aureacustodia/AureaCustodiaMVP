import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LegalDocument } from '@/components/legal/LegalDocument'
import { DOCUMENTOS_VIGENTES } from '@/domain/documentos-legais'
import { BLOCOS_LEGAIS_OBRIGATORIOS } from '@/domain/legal'

export const metadata: Metadata = {
  title: 'Termos de Uso | Áurea Custódia',
  description:
    'Termos e Condições Gerais de Uso da plataforma Áurea Custódia — serviço de guarda especializada de moedas comemorativas e marketplace numismático.',
}

function renderizarTextoComLinks(texto: string): ReactNode {
  if (texto.includes('Tabela de Taxas')) {
    const partes = texto.split('Tabela de Taxas')
    return (
      <>
        {partes.map((parte, idx) => (
          <span key={idx}>
            {parte}
            {idx < partes.length - 1 && (
              <Link href="/taxas" className="legal-block-link">
                Tabela de Taxas
              </Link>
            )}
          </span>
        ))}
      </>
    )
  }

  if (texto.includes('suporte@aureacustodia.com.br')) {
    const partes = texto.split('suporte@aureacustodia.com.br')
    return (
      <>
        {partes.map((parte, idx) => (
          <span key={idx}>
            {parte}
            {idx < partes.length - 1 && (
              <Link href="/suporte" className="legal-block-link">
                suporte@aureacustodia.com.br (SAC)
              </Link>
            )}
          </span>
        ))}
      </>
    )
  }

  return texto
}

export default function TermsPage(): ReactNode {
  const info = DOCUMENTOS_VIGENTES.termos_de_uso
  const doc = info.documento

  return (
    <LegalDocument
      title={doc.titulo}
      version={doc.versao}
      updatedAt={doc.vigenteDesde}
      hash={info.hash}
      eyebrow="Contrato de Prestação de Serviços e Condições Gerais"
    >
      {doc.preambulo && doc.preambulo.length > 0 && (
        <div className="legal-quote">
          {doc.preambulo.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      )}

      <div className="legal-summary-box">
        <h3>Pontos de Destaque e Condições Operacionais Essenciais</h3>
        <ol>
          {BLOCOS_LEGAIS_OBRIGATORIOS.map((bloco) => (
            <li key={bloco.id}>
              <strong>{bloco.titulo}:</strong> {bloco.resumo}{' '}
              {bloco.clausulaReferencia && (
                <span className="legal-block-index">({bloco.clausulaReferencia})</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {doc.capitulos.map((cap) => {
        const ehDestaque = Boolean(cap.negrito)
        return (
          <section
            key={cap.numero}
            id={`capitulo-${cap.numero}`}
            className={ehDestaque ? 'legal-arbitration-highlight' : undefined}
          >
            <h2>
              Capítulo {cap.numero} — {cap.titulo}
            </h2>

            {cap.paragrafos.map((par, pIdx) => {
              const parDestaque = ehDestaque || Boolean(par.negrito)
              const textoPar = par.texto ?? ''
              return (
                <div key={pIdx}>
                  {textoPar ? (
                    <p className={parDestaque ? 'legal-bold-text' : undefined}>
                      {renderizarTextoComLinks(textoPar)}
                    </p>
                  ) : null}
                  {par.alineas && par.alineas.length > 0 && (
                    <ul>
                      {par.alineas.map((al) => (
                        <li key={al.letra} className={parDestaque ? 'legal-bold-text' : undefined}>
                          <strong>{al.letra})</strong> {renderizarTextoComLinks(al.texto)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </LegalDocument>
  )
}

/**
 * Rodapé único das páginas públicas. A razão social e o CNPJ continuam aqui, como já estavam nos dois
 * rodapés antigos: é a empresa que responde pelo contrato, e a marca Real Olímpico não a substitui.
 * Sem 'use client'.
 */

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { LOGO_REAL_EMBLEMA } from '@/domain/constants'

export function PublicFooter(): ReactNode {
  return (
    <footer className="pub-footer">
      <div className="pub-footer-inner">
        <div className="pub-footer-brand">
          <Image src={LOGO_REAL_EMBLEMA} alt="" width={48} height={48} />
          <p>
            <strong>Real Olímpico</strong>
            <span>Guarda de itens de coleção com marketplace de recibos. Começamos pelas moedas comemorativas.</span>
          </p>
        </div>

        <nav className="pub-footer-cols" aria-label="Rodapé">
          <div>
            <h2>Plataforma</h2>
            <Link href="/cadastrar">Abrir conta</Link>
            <Link href="/entrar">Acessar minha conta</Link>
            <Link href="/academy">Academy</Link>
          </div>
          <div>
            <h2>Documentos</h2>
            <Link href="/taxas">Tabela de taxas</Link>
            <Link href="/termos">Termos de Uso</Link>
            <Link href="/privacidade">Política de Privacidade</Link>
          </div>
          <div>
            <h2>Ajuda</h2>
            <Link href="/suporte">Atendimento (SAC)</Link>
          </div>
        </nav>
      </div>

      <p className="pub-footer-legal">
        <strong>AUREA CUSTODIA LTDA</strong> · CNPJ 68.071.452/0001-06 · O Real Olímpico não é corretora, não é
        instituição financeira e não oferece investimento.
      </p>
    </footer>
  )
}

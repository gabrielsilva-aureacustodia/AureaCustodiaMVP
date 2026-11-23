'use client'

/**
 * Faixa de consentimento de cookies de publicidade (A09, 22/11/2026). Texto de `docs/manutencao-2026-11/garantias/
 * A09_PROPOSTA_BANNER_COOKIES.md`. "Aceitar" e "Recusar" têm o mesmo peso visual de propósito: recusar não pode custar
 * mais cliques que aceitar. Só aparece onde o Pixel poderia rodar (mesma regra de `caminhoSemRastreio`) e só se o
 * Pixel está configurado — sem `META_PIXEL_ID` não há cookie de publicidade para pedir licença.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { gravarConsentimento } from '@/lib/cookies/consentimento'
import { caminhoSemRastreio } from '@/lib/meta/eventos'

import { useConsentimento } from './useConsentimento'

export function BannerDeCookies({ ativo }: { ativo: boolean }): ReactNode {
  const estado = useConsentimento()
  const pathname = usePathname()

  if (!ativo || estado !== 'pendente' || caminhoSemRastreio(pathname)) return null

  return (
    <section className="cookies-faixa" role="region" aria-label="Aviso de cookies">
      <p className="cookies-texto">
        Usamos cookies essenciais e, com sua permissão, cookies de publicidade da Meta. Você pode recusar sem perder nada.
      </p>
      <div className="cookies-acoes">
        {/* Fora do parágrafo para ter a área de toque de 44px sem engordar a linha do texto. */}
        <Link href="/privacidade" className="cookies-saiba">
          Saiba mais
        </Link>
        <button type="button" className="btn btn-ghost" onClick={() => gravarConsentimento('recusado')}>
          Recusar
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => gravarConsentimento('aceito')}>
          Aceitar
        </button>
      </div>
    </section>
  )
}

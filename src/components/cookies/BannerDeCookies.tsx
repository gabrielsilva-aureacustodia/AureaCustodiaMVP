'use client'

/**
 * Aviso de cookies (A09, revisto em 22/11/2026 por pedido do Gabriel). O uso é PRESUMIDO: entrar no site já vale como
 * aceite (Termos de Uso 3.3 e Política de Privacidade). Por isso não há mais faixa que cubra a tela nem botão
 * "Aceitar": só um aviso pequeno, com ícone, que aparece UMA vez por navegador e some sozinho em poucos segundos.
 * Quem quiser abre o aviso (clique no ícone) e pode "Recusar" os cookies de publicidade da Meta; recusar não custa nada.
 * Só aparece onde o Pixel poderia rodar (mesma regra de `caminhoSemRastreio`) e só se o Pixel está configurado.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { CHAVE_AVISO_VISTO, gravarConsentimento } from '@/lib/cookies/consentimento'
import { caminhoSemRastreio } from '@/lib/meta/eventos'

import { useConsentimento } from './useConsentimento'

const SEGUNDOS_NA_TELA = 7

function jaFoiVisto(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_AVISO_VISTO) === '1'
  } catch {
    return false
  }
}

function marcarComoVisto(): void {
  try {
    window.localStorage.setItem(CHAVE_AVISO_VISTO, '1')
  } catch {
    // Sem localStorage o aviso volta na próxima visita: inofensivo.
  }
}

export function BannerDeCookies({ ativo }: { ativo: boolean }): ReactNode {
  const estado = useConsentimento()
  const pathname = usePathname()
  const [visivel, setVisivel] = useState(false)
  const [aberto, setAberto] = useState(false)
  const abertoRef = useRef(false)
  abertoRef.current = aberto

  const aplica = ativo && estado === 'aceito' && !caminhoSemRastreio(pathname)

  // Aparece uma vez por navegador e some sozinho; se a pessoa abriu o aviso, ele fica até ela fechar.
  useEffect(() => {
    if (!aplica || jaFoiVisto()) return
    setVisivel(true)
    marcarComoVisto()
    const t = window.setTimeout(() => {
      if (!abertoRef.current) setVisivel(false)
    }, SEGUNDOS_NA_TELA * 1000)
    return () => window.clearTimeout(t)
  }, [aplica])

  if (!aplica || !visivel) return null

  return (
    <aside className="cookies-aviso" role="status" aria-label="Aviso de cookies">
      {aberto ? (
        <div className="cookies-aviso-aberto">
          <p className="cookies-texto">
            Usamos cookies essenciais e cookies de publicidade da Meta. Ao entrar no site você está ciente do uso. Pode
            recusar os de publicidade sem perder nada.
          </p>
          <div className="cookies-acoes">
            <Link href="/privacidade" className="cookies-saiba">
              Saiba mais
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                gravarConsentimento('recusado')
                setVisivel(false)
              }}
            >
              Recusar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setVisivel(false)}>
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="cookies-icone" onClick={() => setAberto(true)} aria-label="Cookies: abrir aviso">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-5-5Z" />
            <circle cx="9" cy="11" r="1" />
            <circle cx="14" cy="15" r="1" />
            <circle cx="10" cy="16" r="1" />
          </svg>
          <span>Usamos cookies</span>
        </button>
      )}
    </aside>
  )
}

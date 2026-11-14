'use client'

/**
 * Pixel da Meta (Facebook/Instagram) — a ponta do navegador do rastreamento da campanha de tráfego para o site.
 *
 * O QUE ESTE COMPONENTE FAZ
 *  1. Carrega o `fbevents.js` e inicia o Pixel com o ID de `META_PIXEL_ID` (vem do servidor por prop — ver layout.tsx).
 *     O PageView da PRIMEIRA página sai do próprio script; as seguintes saem do efeito abaixo.
 *  2. PageView a cada troca de página. O App Router navega sem recarregar, e o snippet padrão da Meta só dispara no
 *     carregamento: sem isto, quem entra na landing e navega até /cadastrar só contaria a primeira página.
 *  3. Cadastro pelo Google: lê o cookie que o callback deixou (`ro_meta_evt`), dispara o CompleteRegistration com o
 *     mesmo ID que o servidor mandou pela API de Conversões (a Meta conta um só) e apaga o cookie.
 *  4. `CliqueCriarConta`: um ouvinte de clique único cobre todos os botões que levam a /cadastrar (cabeçalho, rodapé,
 *     seções da landing, login) sem editar cada link — e continua valendo para link que alguém criar depois.
 *
 * Sem `META_PIXEL_ID` válido o componente não renderiza nada e não carrega script de terceiros.
 * Não há faixa de consentimento: ver RA-61 em RISCOS_ASSUMIDOS.md.
 */

import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import {
  COOKIE_EVENTO_PENDENTE,
  lerEventoPendente,
  parametrosDoCadastro,
} from '@/lib/meta/eventos'
import { rastrearPadrao, rastrearPersonalizado } from '@/lib/meta/pixel'

interface MetaPixelProps {
  /** ID já validado no servidor (`lerPixelId`); `null` desliga tudo. */
  pixelId: string | null
}

function lerCookie(nome: string): string | null {
  for (const par of document.cookie.split(';')) {
    const [chave, ...resto] = par.trim().split('=')
    if (chave === nome) return decodeURIComponent(resto.join('='))
  }
  return null
}

function apagarCookie(nome: string): void {
  document.cookie = `${nome}=; Max-Age=0; Path=/; SameSite=Lax`
}

/** O snippet oficial da Meta (developers.facebook.com/docs/meta-pixel/get-started), com o ID já validado numérico. */
function snippetBase(pixelId: string): string {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`
}

export function MetaPixel({ pixelId }: MetaPixelProps): ReactNode {
  const pathname = usePathname()
  const ultimoCaminho = useRef<string | null>(null)

  useEffect(() => {
    if (!pixelId) return
    if (ultimoCaminho.current === null) {
      // Primeira montagem: o PageView já saiu do snippet. Aqui só se recolhe o cadastro deixado pelo servidor.
      ultimoCaminho.current = pathname
      const pendente = lerEventoPendente(lerCookie(COOKIE_EVENTO_PENDENTE))
      if (pendente) {
        apagarCookie(COOKIE_EVENTO_PENDENTE)
        rastrearPadrao('CompleteRegistration', parametrosDoCadastro(pendente.metodo), pendente.eventId)
      }
      return
    }
    if (ultimoCaminho.current === pathname) return
    ultimoCaminho.current = pathname
    rastrearPadrao('PageView')
  }, [pathname, pixelId])

  useEffect(() => {
    if (!pixelId) return
    function aoClicar(evento: MouseEvent): void {
      const alvo = evento.target instanceof Element ? evento.target.closest('a[href]') : null
      const destino = alvo?.getAttribute('href') ?? ''
      if (destino === '/cadastrar' || destino.startsWith('/cadastrar?')) {
        rastrearPersonalizado('CliqueCriarConta', { origem: window.location.pathname })
      }
    }
    document.addEventListener('click', aoClicar, { capture: true })
    return () => document.removeEventListener('click', aoClicar, { capture: true })
  }, [pixelId])

  if (!pixelId) return null

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {snippetBase(pixelId)}
      </Script>
      <noscript>
        {/* Navegador sem JavaScript: a Meta recomenda a imagem de 1 px como PageView de reserva. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}

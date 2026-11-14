'use client'

/**
 * Pixel da Meta (Facebook/Instagram) — a ponta do navegador do rastreamento da campanha de tráfego para o site.
 *
 * O QUE ESTE COMPONENTE FAZ
 *  1. Carrega o `fbevents.js` e inicia o Pixel com o ID de `META_PIXEL_ID` (vem do servidor por prop — ver layout.tsx).
 *  2. PageView em toda página, inclusive a primeira e a cada troca interna. O App Router navega sem recarregar, e o
 *     snippet padrão só dispara no carregamento: sem isto, quem entra na landing e navega até /cadastrar só contaria a
 *     primeira. Áreas com dado de gente na URL (`caminhoSemRastreio`) ficam de fora: o Pixel nem carrega nelas.
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
  caminhoSemRastreio,
  COOKIE_EVENTO_PENDENTE,
  lerEventoPendente,
  parametrosDoCadastro,
} from '@/lib/meta/eventos'
import { definirEnvio, rastrearPadrao, rastrearPersonalizado } from '@/lib/meta/pixel'

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

/**
 * O snippet oficial da Meta (developers.facebook.com/docs/meta-pixel/get-started), com o ID já validado numérico.
 * SEM o `fbq('track','PageView')` do original: o PageView sai sempre do efeito abaixo, que sabe se a página é de uma área
 * sem rastreio (`caminhoSemRastreio`). Com o PageView no snippet, a Meta receberia a URL de uma rota proibida.
 *
 * `disablePushState`: por padrão o Pixel manda PageView sozinho a cada troca de URL do navegador (pushState), no instante
 * da troca, ANTES de o efeito do React rodar — então navegar de uma página pública para /relatorios levava essa URL à
 * Meta mesmo com a trava (achado em 14/11/2026 testando logado). Desligado, só o nosso efeito dispara PageView.
 * `allowDuplicatePageViews`: sem isto o Pixel descarta um segundo PageView na mesma carga de página, e o PageView da
 * navegação interna (que o efeito dispara à mão) sumiria.
 */
function snippetBase(pixelId: string): string {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq.disablePushState=true;fbq.allowDuplicatePageViews=true;fbq('init','${pixelId}');`
}

export function MetaPixel({ pixelId }: MetaPixelProps): ReactNode {
  const pathname = usePathname()
  const bloqueado = caminhoSemRastreio(pathname)
  const ultimoCaminho = useRef<string | null>(null)
  const envioDesligado = useRef(false)

  useEffect(() => {
    if (!pixelId) return
    const primeiraMontagem = ultimoCaminho.current === null
    if (!primeiraMontagem && ultimoCaminho.current === pathname) return
    ultimoCaminho.current = pathname

    if (bloqueado) {
      // Área sem rastreio (painel, recibos, relatórios): nada sai. Se o script já estava carregado por uma página
      // pública anterior, `revoke` segura também o evento automático de clique.
      if (!primeiraMontagem) {
        definirEnvio(false)
        envioDesligado.current = true
      }
      return
    }
    if (envioDesligado.current) {
      definirEnvio(true)
      envioDesligado.current = false
    }
    rastrearPadrao('PageView')
    if (primeiraMontagem) {
      // Cadastro pelo Google: o servidor deixou o ID no cookie; o par do Pixel sai aqui e o cookie é apagado.
      const pendente = lerEventoPendente(lerCookie(COOKIE_EVENTO_PENDENTE))
      if (pendente) {
        apagarCookie(COOKIE_EVENTO_PENDENTE)
        rastrearPadrao('CompleteRegistration', parametrosDoCadastro(pendente.metodo), pendente.eventId)
      }
    }
  }, [pathname, bloqueado, pixelId])

  useEffect(() => {
    if (!pixelId) return
    function aoClicar(evento: MouseEvent): void {
      const alvo = evento.target instanceof Element ? evento.target.closest('a[href]') : null
      const destino = alvo?.getAttribute('href') ?? ''
      if (caminhoSemRastreio(window.location.pathname)) return
      if (destino === '/cadastrar' || destino.startsWith('/cadastrar?')) {
        rastrearPersonalizado('CliqueCriarConta', { origem: window.location.pathname })
      }
    }
    document.addEventListener('click', aoClicar, { capture: true })
    return () => document.removeEventListener('click', aoClicar, { capture: true })
  }, [pixelId])

  // Em área sem rastreio o script nem é carregado. Se já foi carregado antes, continua na página, mas mudo (ver efeito).
  if (!pixelId || bloqueado) return null

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

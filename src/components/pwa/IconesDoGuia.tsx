/**
 * Ícones e ilustrações do passo a passo de instalação.
 *
 * Os ícones dos passos reproduzem, em traço simples, os símbolos que a pessoa vai procurar na TELA DELA — o quadrado com
 * a seta para cima do Compartilhar no iPhone, os três pontos do menu no Android — porque "toque em Compartilhar"
 * sozinho não ajuda quem nunca percebeu esse botão. São desenhos genéricos de interface (não os logotipos da Apple ou
 * do Google) e herdam a cor do texto, então valem nos dois temas.
 *
 * As duas ilustrações (`BarraDoSafari`, `BarraDoChrome`) mostram ONDE o botão fica na barra do navegador, com um anel
 * dourado em volta dele. Sem texto dentro do SVG: o texto da tela já explica, e o SVG não precisa ser traduzido nem
 * lido por leitor de tela (`aria-hidden`).
 *
 * Sem 'use client': só marcação.
 */

import type { ReactNode, SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement>

function Traco({ children, ...props }: Props & { children: ReactNode }): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Download: seta para dentro de uma bandeja. O ícone dos botões "Baixar o app". */
export function IconeBaixar(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <path d="M12 4v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </Traco>
  )
}

/** Compartilhar do iPhone: caixa aberta em cima com a seta saindo. */
export function IconeCompartilhar(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <path d="M12 15V3.5" />
      <path d="M8 7.5 12 3.5l4 4" />
      <path d="M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5" />
    </Traco>
  )
}

/** "Adicionar à Tela de Início": quadrado com sinal de mais. */
export function IconeMaisQuadrado(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8.5v7" />
      <path d="M8.5 12h7" />
    </Traco>
  )
}

/** Menu do Chrome no Android: três pontos na vertical. */
export function IconeMenuPontos(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <circle cx="12" cy="5" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="19" r="1.3" fill="currentColor" />
    </Traco>
  )
}

/** "Instalar app": celular com seta para baixo. */
export function IconeInstalarApp(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M12 8v6" />
      <path d="M9.5 11.5 12 14l2.5-2.5" />
      <path d="M11 18.5h2" />
    </Traco>
  )
}

export function IconeConfirmar(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.8 2.8L16.3 9.5" />
    </Traco>
  )
}

/** Último passo: o app já na tela inicial — uma grade de ícones com um deles em destaque. */
export function IconeAppNaTela(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" fill="currentColor" />
    </Traco>
  )
}

export function IconeFechar(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Traco>
  )
}

export function IconeCopiar(props: Props): ReactNode {
  return (
    <Traco {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
    </Traco>
  )
}

/**
 * Barra de baixo do Safari (iPhone), com o botão Compartilhar destacado. Na ordem em que o Safari as mostra:
 * voltar, avançar, COMPARTILHAR, favoritos e abas.
 */
export function BarraDoSafari(): ReactNode {
  return (
    <svg className="pwa-ilu" viewBox="0 0 300 60" aria-hidden="true" focusable="false">
      <rect className="barra" x="1" y="8" width="298" height="44" rx="22" />
      <g className="glifo" transform="translate(24 18)">
        <path d="M14 5 7 12l7 7" />
      </g>
      <g className="glifo" transform="translate(78 18)">
        <path d="m10 5 7 7-7 7" />
      </g>
      <circle className="alvo" cx="150" cy="30" r="21" />
      <g className="glifo glifo-alvo" transform="translate(138 18)">
        <path d="M12 15V3.5" />
        <path d="M8 7.5 12 3.5l4 4" />
        <path d="M8.5 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5" />
      </g>
      <g className="glifo" transform="translate(198 18)">
        <path d="M12 6.5c-1.5-1.3-3.5-2-6-2v13c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2v-13c-2.5 0-4.5.7-6 2z" />
        <path d="M12 6.5v13" />
      </g>
      <g className="glifo" transform="translate(252 18)">
        <rect x="8" y="8" width="12" height="12" rx="2.2" />
        <path d="M4.5 15.5V6.7A2.2 2.2 0 0 1 6.7 4.5h8.8" />
      </g>
    </svg>
  )
}

/**
 * Barra de cima do Chrome (Android): campo do endereço e o menu de três pontos destacado, no canto direito.
 * A barra do endereço é só um traço — não escrevemos endereço nenhum para não ficar desatualizado.
 */
export function BarraDoChrome(): ReactNode {
  return (
    <svg className="pwa-ilu" viewBox="0 0 300 60" aria-hidden="true" focusable="false">
      <rect className="barra" x="1" y="8" width="298" height="44" rx="22" />
      <rect className="traco-endereco" x="18" y="21" width="158" height="18" rx="9" />
      <g className="glifo" transform="translate(190 18)">
        <rect x="6" y="6" width="12" height="12" rx="2.6" />
      </g>
      <circle className="alvo" cx="262" cy="30" r="21" />
      <g className="glifo glifo-alvo" transform="translate(250 18)">
        <circle cx="12" cy="5" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="19" r="1.5" fill="currentColor" />
      </g>
    </svg>
  )
}

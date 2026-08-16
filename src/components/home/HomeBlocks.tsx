/**
 * Os quatro blocos de ação do painel — port de aurea-mvp-teste.html, linhas
 * 1211-1232 (o `<div class="blocks">` de renderHome).
 *
 * ESTES QUATRO CARTÕES SÃO O REQUISITO DE NEGÓCIO CENTRAL DA TELA: comprar,
 * vender, enviar para custódia e ver os recibos precisam estar encontráveis de
 * forma MUITO fácil. Por isso ocupam a metade de baixo inteira, com ícone
 * grande, título, uma linha de explicação e a seta — nada disso é enfeite.
 *
 * DE onclick="go('buy')" PARA <Link>
 * ----------------------------------
 * O original era `<div class="block" onclick="go('buy')">`: um div que não é
 * alcançável por teclado, não abre em nova aba, não mostra o destino na barra
 * de status e não existe para leitor de tela. Como a única coisa que `go()`
 * fazia era trocar de view — o equivalente exato de navegar —, aqui vira um
 * <Link>, e as quatro entradas mais importantes do produto passam a ser links
 * de verdade. A aparência não muda: a classe .block é a mesma.
 *
 * SERVER COMPONENT: não há estado nem manipulador aqui, e <Link> funciona no
 * servidor. Manter assim é o que evita mandar quatro SVGs de ícone para o
 * bundle do navegador só para desenhar conteúdo fixo.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

interface Bloco {
  /** Destino. Substitui o argumento de go(): 'buy'|'sell'|'send'|'nfts'. */
  href: string
  titulo: string
  texto: string
  /** Miolo do <svg viewBox="0 0 24 24">; traço e tamanho vêm de .block-ico svg. */
  icone: ReactNode
}

const BLOCOS: Bloco[] = [
  {
    href: '/mercado', // go('buy')
    titulo: 'Comprar moeda',
    texto: 'Veja ofertas de venda e de compra, ou publique a sua.',
    icone: (
      <>
        <path d="M3 3h2l2 13h11l2-9H6" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </>
    ),
  },
  {
    href: '/vender', // go('sell')
    titulo: 'Vender ativo',
    texto: 'Anuncie uma ou várias moedas, ou venda direto para uma oferta de compra.',
    icone: (
      <>
        <path d="M20 12l-8 8-9-9V4h7z" />
        <circle cx="7.5" cy="7.5" r="1.3" />
      </>
    ),
  },
  {
    href: '/envios', // go('send')
    titulo: 'Enviar moeda para custódia',
    texto: 'Envie suas moedas para custódia com total segurança.',
    icone: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <circle cx="12" cy="12.5" r="3.4" />
        <path d="M9 5V3h6v2" />
      </>
    ),
  },
  {
    href: '/recibos', // go('nfts')
    titulo: 'Meus recibos NFT',
    texto: 'Acesse e gerencie seus recibos digitais de forma fácil.',
    icone: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 10h7M9 13.5h7M9 17h4" />
      </>
    ),
  },
]

export function HomeBlocks(): ReactNode {
  return (
    <div className="blocks">
      {BLOCOS.map((b) => (
        // `key` no href: é único e estável, e a lista é fixa em código.
        <Link key={b.href} href={b.href} className="block">
          <div className="block-ico">
            <svg viewBox="0 0 24 24">{b.icone}</svg>
          </div>
          <div className="block-tx">
            <h3>{b.titulo}</h3>
            <p>{b.texto}</p>
          </div>
          {/* Seta puramente decorativa: o link já é anunciado como link, e um
              leitor de tela lendo "›" no fim de cada cartão só atrapalha. */}
          <div className="block-arrow" aria-hidden="true">
            ›
          </div>
        </Link>
      ))}
    </div>
  )
}

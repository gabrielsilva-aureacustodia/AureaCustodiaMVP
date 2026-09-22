'use client'

/**
 * Os seis blocos de ação do painel — evolução de aurea-mvp-teste.html, linhas
 * 1211-1232 (o `<div class="blocks">` de renderHome), com a adição dos blocos
 * "Depositar em conta" e "Mercado" (AG6).
 *
 * ESTES CARTÕES SÃO O REQUISITO DE NEGÓCIO CENTRAL DA TELA: comprar, vender,
 * enviar para custódia, ver os recibos, depositar e acompanhar o mercado
 * precisam estar encontráveis de forma MUITO fácil. Por isso ocupam a metade
 * de baixo inteira, com ícone grande, título, uma linha de explicação e a seta.
 *
 * CLIENT COMPONENT
 * ----------------
 * Torna-se Client Component para permitir que o bloco "Depositar em conta" abra
 * diretamente a ModalDeposito (com a trava de cadastro de Minha Conta) via
 * useModal(), sem duplicar telas ou fluxos.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

import { ModalCadastro, ModalDeposito } from '@/components/account/AccountModals'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { temCadastroCompleto } from '@/domain/cadastro'

interface BlocoLink {
  tipo: 'link'
  href: string
  titulo: string
  texto: string
  /** Miolo do <svg viewBox="0 0 24 24">; traço e tamanho vêm de .block-ico svg. */
  icone: ReactNode
}

interface BlocoAction {
  tipo: 'action'
  id: string
  titulo: string
  texto: string
  /** Miolo do <svg viewBox="0 0 24 24">; traço e tamanho vêm de .block-ico svg. */
  icone: ReactNode
}

type Bloco = BlocoLink | BlocoAction

const BLOCOS: Bloco[] = [
  {
    tipo: 'link',
    href: '/compras',
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
    tipo: 'link',
    href: '/vender', // go('sell')
    titulo: 'Vender moeda',
    texto: 'Anuncie uma ou várias moedas, ou venda direto para uma oferta de compra.',
    icone: (
      <>
        <path d="M20 12l-8 8-9-9V4h7z" />
        <circle cx="7.5" cy="7.5" r="1.3" />
      </>
    ),
  },
  {
    tipo: 'link',
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
    tipo: 'link',
    href: '/recibos', // go('nfts')
    titulo: 'Meus recibos',
    texto: 'Acesse e gerencie seus recibos digitais de forma fácil.',
    icone: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9 10h7M9 13.5h7M9 17h4" />
      </>
    ),
  },
  {
    tipo: 'action',
    id: 'deposito',
    titulo: 'Depositar em conta',
    texto: 'Adicione saldo à sua conta via Pix para negociar na plataforma.',
    icone: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M16 13h2M3 11h18" />
      </>
    ),
  },
  {
    tipo: 'link',
    href: '/mercado',
    titulo: 'Mercado',
    texto: 'Acompanhe as ofertas de venda e de compra e os gráficos.',
    icone: <path d="M3 17l5-6 4 4 6-8 3 4" />,
  },
]

export function HomeBlocks(): ReactNode {
  const { me } = useApp()
  const { open } = useModal()

  const abrirDeposito = (): void => {
    if (temCadastroCompleto(me)) {
      open(<ModalDeposito />)
    } else {
      open(
        <ModalCadastro
          motivo="deposito"
          onSuccess={() => open(<ModalDeposito />)}
        />,
      )
    }
  }

  return (
    <div className="blocks">
      {BLOCOS.map((b) => {
        const conteudo = (
          <>
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
          </>
        )

        if (b.tipo === 'action') {
          return (
            <button
              key={b.id}
              type="button"
              className="block"
              onClick={abrirDeposito}
              style={{ textAlign: 'left', font: 'inherit', width: '100%' }}
            >
              {conteudo}
            </button>
          )
        }

        return (
          <Link key={b.href} href={b.href} className="block">
            {conteudo}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * As peças de composição do painel (25/10/2026, rodada 2 do polimento): uma por papel, para
 * toda tela falar a mesma língua visual (princípio 6 do docs/polimento/admin/BRIEF_DE_DESIGN.md).
 *
 *  - `Secao`: bloco com título h2, frase de contexto e as ações do bloco à direita. Antes cada
 *    tela montava o seu `<div className="panel"><h3>`, com h3 direto abaixo do h1 da topbar.
 *  - `Indicador`: o número com rótulo, detalhe e tom; vira link quando tem `href` (o número que
 *    pede ação leva à lista que o explica).
 *  - `Selo`: situação com cor + símbolo + texto, legível em escala de cinza (Carbon, tópico 35).
 *  - `Abas`: troca de visão dentro da página por URL (`?aba=`, `?ver=`), com contagem opcional.
 *  - `Vazio`: lista vazia que diz por quê e o que fazer.
 *
 * Sem 'use client' e sem hook: só marcação, desenhada no servidor ou dentro de componente de
 * cliente (doc 35 §4 do aprendizado_frontend). Nada aqui lê dado nem decide permissão.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'

export function Secao({
  id,
  titulo,
  descricao,
  acoes,
  children,
  aberta = false,
  className,
}: {
  /** Âncora da seção e base do id do título. */
  id: string
  titulo: ReactNode
  descricao?: ReactNode
  /** Botões e links do bloco (um primário, no máximo). */
  acoes?: ReactNode
  children?: ReactNode
  /** Sem a moldura de painel: para seções que já são uma grade de cartões. */
  aberta?: boolean
  className?: string
}): ReactNode {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className={`${aberta ? 'adm-bloco adm-bloco-aberto' : 'panel adm-bloco'}${className ? ` ${className}` : ''}`}>
      <header className="adm-bloco-cab">
        <div className="adm-bloco-cab-texto">
          <h2 id={`${id}-titulo`}>{titulo}</h2>
          {descricao ? <p>{descricao}</p> : null}
        </div>
        {acoes ? <div className="adm-bloco-acoes">{acoes}</div> : null}
      </header>
      {children}
    </section>
  )
}

export type Tom = 'neutro' | 'ok' | 'alerta' | 'atencao' | 'ouro'

export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = 'neutro',
  href,
}: {
  rotulo: string
  valor: ReactNode
  detalhe?: ReactNode
  tom?: Tom
  /** O número leva à lista que o explica. */
  href?: string
}): ReactNode {
  const corpo = (
    <>
      <span className="adm-ind-rotulo">{rotulo}</span>
      <span className="adm-ind-valor">{valor}</span>
      {detalhe ? <span className="adm-ind-detalhe">{detalhe}</span> : null}
    </>
  )
  return href ? (
    <Link href={href} className={`adm-ind adm-ind-${tom} adm-ind-link`}>
      {corpo}
    </Link>
  ) : (
    <div className={`adm-ind adm-ind-${tom}`}>{corpo}</div>
  )
}

const SIMBOLO: Record<Tom, string> = { neutro: '•', ok: '✓', alerta: '!', atencao: '◷', ouro: '★' }

export function Selo({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }): ReactNode {
  return (
    <span className={`adm-selo2 adm-selo2-${tom}`}>
      <span aria-hidden="true">{SIMBOLO[tom]}</span>
      {children}
    </span>
  )
}

export interface ItemAba {
  href: string
  rotulo: string
  atual: boolean
  contagem?: number
}

export function Abas({ rotulo, itens }: { rotulo: string; itens: readonly ItemAba[] }): ReactNode {
  return (
    <nav aria-label={rotulo} className="adm-abas2">
      <ul>
        {itens.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={i.atual ? 'page' : undefined} scroll={false}>
              {i.rotulo}
              {i.contagem !== undefined ? <span className="adm-abas2-n">{i.contagem}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Vazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }): ReactNode {
  return (
    <div className="adm-vazio">
      <b>{titulo}</b>
      {children}
      {acao ? <div className="adm-acoes">{acao}</div> : null}
    </div>
  )
}

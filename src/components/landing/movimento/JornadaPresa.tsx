'use client'

/**
 * "Como funciona" como história presa na tela (tópico 09 do aprendizado_frontend, receita B): o bloco é uma
 * pista alta, o palco fica `sticky` e, conforme a pessoa rola, os quatro passos se acendem um a um e a
 * foto do passo (cenas da Frente 2) troca ao lado. É a peça de movimento principal da página, abaixo da dobra.
 *
 * Por que a receita B (JS escreve --p) e não a A (`animation-timeline`, 0 JS): a A ainda é "limited" — Safari
 * e Firefox não têm —, e esta é a seção que explica o serviço; não pode depender do navegador. O ouvinte de
 * rolagem só existe enquanto o bloco está perto da tela (IntersectionObserver) e escreve no máximo uma vez por
 * quadro (requestAnimationFrame). O passo ativo vira estado do React só quando MUDA.
 *
 * Sem pista: no celular (< 861 px) e com "reduzir movimento", o CSS desfaz o sticky e mostra os quatro passos
 * em lista, todos acesos (tópico 15: reduzir não pode esconder conteúdo). Sem JavaScript, idem.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { PictureResponsiva } from '../PictureResponsiva'
import type { Visual } from '../visuais'

export interface PassoDaJornada {
  titulo: string
  texto: string
  /** Foto da cena (Frente 2). Sem ela, a cena mostra só o anel e o número. */
  foto?: Visual
}

interface JornadaPresaProps {
  id: string
  sobretitulo: string
  titulo: string
  passos: readonly PassoDaJornada[]
}

export function JornadaPresa({ id, sobretitulo, titulo, passos }: JornadaPresaProps): ReactNode {
  const ref = useRef<HTMLElement>(null)
  const [ativo, setAtivo] = useState(0)
  const [ligada, setLigada] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)')
    const largo = window.matchMedia('(min-width: 861px)')
    let raf = 0
    let ouvindo = false

    const atualiza = (): void => {
      raf = 0
      const r = el.getBoundingClientRect()
      const pista = r.height - window.innerHeight
      const p = pista > 0 ? Math.min(1, Math.max(0, -r.top / pista)) : 0
      el.style.setProperty('--p', p.toFixed(4))
      setAtivo(Math.min(passos.length - 1, Math.floor(p * passos.length)))
    }
    const rola = (): void => {
      raf ||= requestAnimationFrame(atualiza)
    }
    const liga = (sim: boolean): void => {
      if (sim === ouvindo) return
      ouvindo = sim
      if (sim) {
        window.addEventListener('scroll', rola, { passive: true })
        window.addEventListener('resize', rola)
        atualiza()
      } else {
        window.removeEventListener('scroll', rola)
        window.removeEventListener('resize', rola)
      }
    }

    const decide = (): boolean => {
      const pode = largo.matches && !reduz.matches
      setLigada(pode)
      return pode
    }
    let perto = false
    const io = new IntersectionObserver(([e]) => {
      perto = Boolean(e?.isIntersecting)
      liga(perto && decide())
    }, { rootMargin: '200px 0px' })
    io.observe(el)
    const mudouMidia = (): void => liga(perto && decide())
    largo.addEventListener('change', mudouMidia)
    reduz.addEventListener('change', mudouMidia)

    return () => {
      io.disconnect()
      liga(false)
      largo.removeEventListener('change', mudouMidia)
      reduz.removeEventListener('change', mudouMidia)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [passos.length])

  return (
    <section
      ref={ref}
      id={id}
      className="pub-jornada"
      data-ligada={ligada || undefined}
      aria-labelledby={`${id}-titulo`}
      style={{ ['--n' as string]: passos.length }}
    >
      <div className="pub-jornada-palco">
        <div className="pub-jornada-texto">
          <p className="pub-eyebrow">{sobretitulo}</p>
          <h2 id={`${id}-titulo`}>{titulo}</h2>
          <ol className="pub-jornada-passos">
            {passos.map((p, i) => (
              <li key={p.titulo} data-ativo={!ligada || i === ativo || undefined} data-feito={(ligada && i < ativo) || undefined}>
                <span className="pub-jornada-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="pub-jornada-cena" aria-hidden="true">
          <svg className="pub-jornada-anel" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" pathLength="1" className="pub-jornada-anel-fundo" />
            <circle cx="60" cy="60" r="54" pathLength="1" className="pub-jornada-anel-progresso" />
          </svg>
          {passos.map((p, i) =>
            p.foto ? (
              <div key={p.titulo} className="pub-jornada-quadro" data-ativo={i === ativo || undefined}>
                <PictureResponsiva visual={{ ...p.foto, alt: '' }} sizes="(max-width: 860px) 300px, 460px" />
              </div>
            ) : null,
          )}
          <span className="pub-jornada-grande">{String(ativo + 1).padStart(2, '0')}</span>
        </div>
      </div>
    </section>
  )
}

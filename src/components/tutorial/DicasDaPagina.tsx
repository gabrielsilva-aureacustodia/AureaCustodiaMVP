'use client'

/**
 * A camada de dicas: explica cada botão e função da tela SEM escurecer nada.
 *
 * O DESENHO
 * ---------
 * Cada elemento explicado ganha uma bolinha numerada no canto, e um painel pequeno lista os
 * números com o texto de cada um. Tocar na bolinha ou na linha do painel destaca o elemento com um
 * contorno dourado. A página inteira continua clicável — só a bolinha e o painel capturam toque —,
 * então a pessoa pode ler a dica e usar o botão ao mesmo tempo. É a diferença para o tour, que
 * bloqueia a tela de propósito.
 *
 * DICA SEM ELEMENTO NÃO É DICA PERDIDA
 * ------------------------------------
 * Dica cuja âncora não está na tela agora (um botão que só existe com moeda em custódia, por
 * exemplo) some do painel e volta sozinha se o elemento aparecer. Dica sem âncora declarada
 * (`alvo` ausente) é texto puro e sempre aparece, sem bolinha.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { Dica } from '@/domain/tutorial'
import { acharAlvo, medir, mesmaCaixa, trazerParaVista } from '@/components/tutorial/dom'
import type { Caixa } from '@/components/tutorial/dom'

interface Props {
  titulo: string
  dicas: Dica[]
  /** Mostra o link "Refazer o tour guiado" no rodapé (só nos tutoriais de página). */
  aoRefazerTour?: () => void
  aoFechar(): void
}

interface Item {
  dica: Dica
  el: HTMLElement | null
  caixa: Caixa | null
}

export function DicasDaPagina({ titulo, dicas, aoRefazerTour, aoFechar }: Props): ReactNode {
  const [itens, setItens] = useState<Item[]>([])
  const [ativa, setAtiva] = useState<string | null>(null)
  const [janela, setJanela] = useState<{ w: number; h: number }>({ w: 1280, h: 800 })
  const linhas = useRef<Record<string, HTMLLIElement | null>>({})

  // Procura os elementos e acompanha a posição deles. A busca se repete porque a tela do cliente
  // carrega por partes (estado, gráficos) e uma âncora pode aparecer segundos depois.
  useEffect(() => {
    const atualizar = (): void => {
      setJanela((j) => (j.w === window.innerWidth && j.h === window.innerHeight ? j : { w: window.innerWidth, h: window.innerHeight }))
      setItens((antes) => {
        const novos: Item[] = []
        for (const dica of dicas) {
          if (!dica.alvo) {
            novos.push({ dica, el: null, caixa: null })
            continue
          }
          const el = acharAlvo(dica.alvo)
          if (el) novos.push({ dica, el, caixa: medir(el) })
        }
        const igual =
          antes.length === novos.length &&
          antes.every((a, i) => a.dica.id === novos[i]!.dica.id && a.el === novos[i]!.el && mesmaCaixa(a.caixa, novos[i]!.caixa))
        return igual ? antes : novos
      })
    }
    atualizar()
    const timer = window.setInterval(atualizar, 300)
    window.addEventListener('scroll', atualizar, true)
    window.addEventListener('resize', atualizar)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('scroll', atualizar, true)
      window.removeEventListener('resize', atualizar)
    }
  }, [dicas])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  const numerados = useMemo(() => itens.map((it, i) => ({ ...it, n: i + 1 })), [itens])
  const movel = janela.w < 640

  function escolher(id: string, rolarPagina: boolean): void {
    setAtiva(id)
    const item = itens.find((i) => i.dica.id === id)
    if (rolarPagina && item?.el) trazerParaVista(item.el, movel ? 70 : 100)
    if (!rolarPagina) linhas.current[id]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const dicaAtiva = numerados.find((i) => i.dica.id === ativa)

  return (
    <div className="dicas-camada" data-tutorial-ui>
      {dicaAtiva?.caixa ? (
        <div
          className="dicas-contorno"
          style={{
            top: dicaAtiva.caixa.top - 4,
            left: dicaAtiva.caixa.left - 4,
            width: dicaAtiva.caixa.width + 8,
            height: dicaAtiva.caixa.height + 8,
          }}
        />
      ) : null}

      {numerados.map((it) => {
        if (!it.caixa) return null
        // Fora da tela (rolou para longe) a bolinha some em vez de grudar na borda.
        if (it.caixa.top + it.caixa.height < 0 || it.caixa.top > janela.h) return null
        const top = Math.min(Math.max(it.caixa.top - 10, 4), janela.h - 30)
        const left = Math.min(Math.max(it.caixa.left - 10, 4), janela.w - 30)
        return (
          <button
            key={it.dica.id}
            type="button"
            className={it.dica.id === ativa ? 'dicas-bolinha on' : 'dicas-bolinha'}
            style={{ top, left }}
            aria-label={`Dica ${it.n}: ${it.dica.titulo}`}
            onClick={() => escolher(it.dica.id, false)}
          >
            {it.n}
          </button>
        )
      })}

      <section className={movel ? 'dicas-painel dicas-painel-movel' : 'dicas-painel'} aria-label={titulo}>
        <header className="dicas-cabeca">
          <h4>{titulo}</h4>
          <button type="button" className="btn btn-gold dicas-fechar" onClick={aoFechar}>
            Fechar tutorial
          </button>
        </header>

        <ol className="dicas-lista">
          {numerados.map((it) => (
            <li
              key={it.dica.id}
              ref={(el) => {
                linhas.current[it.dica.id] = el
              }}
              className={it.dica.id === ativa ? 'on' : ''}
            >
              <button type="button" onClick={() => escolher(it.dica.id, true)}>
                <span className="dicas-num">{it.n}</span>
                <span className="dicas-conteudo">
                  <b>{it.dica.titulo}</b>
                  <span>{it.dica.texto}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        {aoRefazerTour ? (
          <footer className="dicas-rodape">
            <button type="button" className="dicas-link" onClick={aoRefazerTour}>
              Refazer o tour guiado
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  )
}

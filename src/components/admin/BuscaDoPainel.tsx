'use client'

/**
 * "Buscar ou ir para…" — a paleta do painel (Ctrl+K ou "/"), o atalho que Linear, Stripe e
 * Shopify Admin dão à equipe para não depender do menu (docs/polimento/admin/BENCHMARK.md).
 *
 * SÓ NAVEGA. Não busca nada no servidor nem lê dado de cliente: oferece as áreas que o papel
 * alcança e, com texto digitado, abre a lista de cada área JÁ FILTRADA pela URL que ela sempre
 * aceitou (`/admin/usuarios?busca=`, `/admin/moedas?busca=`, `/admin/logistica?busca=`,
 * `/admin/resultados/fiscal?busca=`). Quem decide o que aparece é a própria página, no servidor,
 * com a permissão dela — esta paleta só esconde o atalho de quem não tem a permissão, como o menu.
 *
 * `<dialog>` nativo: o navegador cuida do foco preso, do Esc e da camada de cima; aqui fica só a
 * lista com seta para cima/baixo e Enter (padrão "combobox com listbox" da WAI-ARIA).
 */

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { ChavePermissao } from '@/domain/admin/permissoes'

import { useAdmin } from './AdminProvider'
import { TODOS_ITENS, INICIO_ADMIN, permiteItem } from './navegacao'

interface Opcao {
  id: string
  rotulo: string
  detalhe: string
  href: string
}

/** As listas que já aceitam `?busca=` — a paleta só monta a URL. */
const BUSCAS: ReadonlyArray<{ rotulo: string; base: string; extra?: string; permissao: ChavePermissao }> = [
  { rotulo: 'Procurar contas de clientes', base: '/admin/usuarios', permissao: 'usuarios.ver' },
  { rotulo: 'Procurar moedas no acervo', base: '/admin/moedas', permissao: 'bancada.auditoria' },
  { rotulo: 'Procurar envios e retiradas', base: '/admin/logistica', extra: 'situacao=todos', permissao: 'logistica.ver' },
  { rotulo: 'Procurar notas fiscais', base: '/admin/resultados/fiscal', permissao: 'resultados.ver' },
]

/** Sem acento e em minúsculas: "logistica" acha "Logística". */
function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function BuscaDoPainel(): ReactNode {
  const { membro, pode } = useAdmin()
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [ativo, setAtivo] = useState(0)
  const idLista = useId()

  const areas = useMemo(
    () => [INICIO_ADMIN, ...TODOS_ITENS.filter((i) => i.href !== INICIO_ADMIN.href)].filter((i) => permiteItem(i, membro.permissoes)),
    [membro.permissoes],
  )

  const opcoes = useMemo<Opcao[]>(() => {
    const t = texto.trim()
    const n = normalizar(t)
    const paginas = areas
      .filter((i) => !n || normalizar(`${i.rotulo} ${i.titulo} ${i.subtitulo}`).includes(n))
      .map((i) => ({ id: `ir-${i.href}`, rotulo: i.rotulo, detalhe: i.subtitulo, href: i.href }))
    const buscas = t
      ? BUSCAS.filter((b) => pode(b.permissao)).map((b) => ({
          id: `busca-${b.base}`,
          rotulo: `${b.rotulo}: “${t}”`,
          detalhe: 'Abre a lista já filtrada',
          href: `${b.base}?${b.extra ? `${b.extra}&` : ''}busca=${encodeURIComponent(t)}`,
        }))
      : []
    // Área cujo nome bate vem antes: quem digita "saq" quer a tela de Saques, não procurar "saq"
    // nas contas. Um e-mail ou um código não bate com área nenhuma, e aí as buscas ficam no topo.
    return [...paginas, ...buscas]
  }, [areas, pode, texto])

  const abrir = useCallback((): void => {
    setTexto('')
    setAtivo(0)
    dialogo.current?.showModal()
    campo.current?.focus()
  }, [])

  function ir(o: Opcao | undefined): void {
    if (!o) return
    dialogo.current?.close()
    router.push(o.href)
  }

  // Ctrl+K / ⌘K de qualquer lugar; "/" só fora de campo de texto, para não roubar a barra de quem digita.
  useEffect(() => {
    function tecla(e: KeyboardEvent): void {
      const alvo = e.target as HTMLElement | null
      const digitando = !!alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        abrir()
      } else if (e.key === '/' && !digitando && !dialogo.current?.open) {
        e.preventDefault()
        abrir()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [abrir])

  const idAtivo = opcoes[ativo] ? `${idLista}-${ativo}` : undefined

  return (
    <>
      <button type="button" className="adm-busca-gatilho" onClick={abrir} aria-haspopup="dialog" data-uso="topbar-admin:buscar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-5-5" />
        </svg>
        <span>Buscar ou ir para…</span>
        <kbd aria-hidden="true">Ctrl K</kbd>
      </button>

      <dialog
        ref={dialogo}
        className="adm-busca"
        aria-label="Buscar ou ir para uma área do painel"
        onClick={(e) => {
          // Clique no fundo (fora da caixa) fecha, como Esc.
          if (e.target === dialogo.current) dialogo.current?.close()
        }}
      >
        <div className="adm-busca-caixa">
          <label htmlFor={`${idLista}-campo`} className="adm-sr">
            Buscar ou ir para
          </label>
          <input
            ref={campo}
            id={`${idLista}-campo`}
            className="tinput adm-busca-campo"
            role="combobox"
            aria-expanded="true"
            aria-controls={idLista}
            aria-activedescendant={idAtivo}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder="Nome de uma área, e-mail, código de moeda, rastreio…"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setAtivo(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setAtivo((a) => Math.min(a + 1, opcoes.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setAtivo((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                ir(opcoes[ativo])
              }
            }}
          />
          <ul id={idLista} role="listbox" aria-label="Resultados" className="adm-busca-lista">
            {opcoes.map((o, i) => (
              <li
                key={o.id}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === ativo}
                className={i === ativo ? 'on' : undefined}
                onMouseEnter={() => setAtivo(i)}
                onClick={() => ir(o)}
              >
                <b>{o.rotulo}</b>
                <span>{o.detalhe}</span>
              </li>
            ))}
            {opcoes.length === 0 ? <li className="adm-busca-vazio">Nenhuma área com esse nome no seu papel.</li> : null}
          </ul>
          <p className="adm-busca-dica">
            <kbd>↑</kbd> <kbd>↓</kbd> escolhe · <kbd>Enter</kbd> abre · <kbd>Esc</kbd> fecha
          </p>
        </div>
      </dialog>
    </>
  )
}

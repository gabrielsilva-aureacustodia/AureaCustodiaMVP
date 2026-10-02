/**
 * Ponte entre o conteúdo do tutorial (`@/domain/tutorial`) e a tela de verdade: achar o elemento de
 * uma âncora, medi-lo, e guardar no navegador o que a pessoa já viu.
 *
 * Tudo aqui é defensivo de propósito. O tutorial é um acessório: se o localStorage estiver
 * bloqueado (aba anônima, política do navegador) ou se a tela mudou e a âncora não acha nada, a
 * resposta é "não mostrar", nunca um erro que derrube a página do cliente.
 */

import type { Alvo } from '@/domain/tutorial'

/** Visível = ocupa espaço na tela (display:none e ancestrais ocultos têm caixa vazia). */
function visivel(el: Element): boolean {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/**
 * Acha o elemento da âncora. Devolve `null` se nada casar — quem chama decide o que fazer
 * (o tour mostra o balão no centro; as dicas por página simplesmente omitem a marca).
 */
export function acharAlvo(alvo: Alvo | undefined): HTMLElement | null {
  if (!alvo || typeof document === 'undefined') return null

  // Elementos do próprio tutorial não podem ser alvo dele mesmo.
  const candidatos = Array.from(document.querySelectorAll<HTMLElement>(alvo.css)).filter(
    (el) => !el.closest('[data-tutorial-ui]'),
  )
  const busca = alvo.contem?.toLowerCase()

  for (const el of candidatos) {
    if (busca && !(el.textContent ?? '').toLowerCase().includes(busca)) continue

    let destino: HTMLElement | null = el
    if (alvo.subir) destino = el.closest<HTMLElement>(alvo.subir)
    else if (alvo.proximo) destino = el.nextElementSibling as HTMLElement | null

    if (destino && visivel(destino)) return destino
  }
  return null
}

/** O retângulo do elemento no viewport, só com os campos que o desenho usa. */
export interface Caixa {
  top: number
  left: number
  width: number
  height: number
}

export function medir(el: HTMLElement | null): Caixa | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function mesmaCaixa(a: Caixa | null, b: Caixa | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  )
}

/** Traz o elemento para a parte de cima da tela, deixando o rodapé livre para o balão. */
export function trazerParaVista(el: HTMLElement, margemTopo = 90): void {
  const r = el.getBoundingClientRect()
  const cabeNaTela = r.top >= margemTopo - 10 && r.bottom <= window.innerHeight - 20
  if (cabeNaTela) return
  window.scrollTo({ top: window.scrollY + r.top - margemTopo, behavior: 'smooth' })
}

/* ------------------------------------------------------------------------- */
/* localStorage, sempre dentro de try/catch                                   */
/* ------------------------------------------------------------------------- */

export function lerChave(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave)
  } catch {
    return null
  }
}

export function gravarChave(chave: string, valor: string): void {
  try {
    window.localStorage.setItem(chave, valor)
  } catch {
    // Sem armazenamento, o tutorial só se repete na próxima visita. Não vale um erro.
  }
}

export function apagarChave(chave: string): void {
  try {
    window.localStorage.removeItem(chave)
  } catch {
    // idem
  }
}

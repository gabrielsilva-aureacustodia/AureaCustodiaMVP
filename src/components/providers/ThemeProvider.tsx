'use client'

/**
 * Tema claro/escuro — port de aurea-mvp-teste.html, linhas 1012-1035.
 *
 * O que NÃO mudou: o tema continua morando no atributo `data-theme` do <body>,
 * porque é lá que tokens.css declara os papéis semânticos
 * (body[data-theme="dark"]{--bg:...}). Não existe fallback no :root — um <body>
 * sem data-theme não tem --bg, --text nem --card, e a tela inteira fica com as
 * cores do navegador.
 *
 * O que mudou: `window.storage` (assíncrono, do sandbox do MVP) virou
 * localStorage (síncrono). A troca não é cosmética — é ela que permite o script
 * anti-flash do layout raiz decidir o tema ANTES da primeira pintura. Com uma
 * leitura assíncrona isso seria impossível: a página já teria pintado.
 *
 * A função `syncThemeSwitches` do original desapareceu de propósito. Ela existia
 * para manter os dois interruptores (topbar no desktop, gaveta no mobile) com a
 * mesma aparência mexendo em duas classes na mão. Aqui os dois leem `dark` deste
 * mesmo contexto, então a sincronia é consequência da estrutura, não de uma
 * rotina que alguém precisa lembrar de chamar.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/** Chave do localStorage. O script anti-flash do layout raiz usa a MESMA string. */
export const THEME_KEY = 'aurea-theme'

interface ThemeCtx {
  dark: boolean
  toggle(): void
}

const Ctx = createContext<ThemeCtx | null>(null)

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx)
  // Erro explícito em vez de valor padrão silencioso: um interruptor de tema que
  // não faz nada é bem mais difícil de diagnosticar do que uma exceção nomeada.
  if (!ctx) throw new Error('useTheme() precisa estar dentro de <ThemeProvider>.')
  return ctx
}

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  /**
   * Começa em `true` — NÃO porque escuro seja o padrão do usuário, mas porque é
   * o que o servidor renderizou (<body data-theme="dark">). Ler o localStorage
   * aqui no inicializador daria hidratação divergente para quem escolheu o tema
   * claro: o HTML do servidor traria `class="switch on"` e o cliente montaria
   * `class="switch"`, e o React reclamaria em cima de um elemento visível.
   *
   * O efeito abaixo corrige o estado logo depois da hidratação. As CORES já
   * estão certas desde o primeiro frame — quem as ajustou foi o script inline do
   * layout raiz —, então o que pode piscar por um frame é apenas a bolinha do
   * interruptor, e só para quem usa o tema claro.
   */
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(document.body.getAttribute('data-theme') !== 'light')
  }, [])

  const toggle = useCallback(() => {
    const body = document.body
    // A fonte da verdade é o próprio atributo, como no original (linha 1022).
    // Ler do DOM em vez do estado do React evita divergir do que o script
    // anti-flash escreveu antes da hidratação.
    const eraEscuro = body.getAttribute('data-theme') === 'dark'
    const proximo = eraEscuro ? 'light' : 'dark'
    body.setAttribute('data-theme', proximo)
    setDark(!eraEscuro)
    try {
      localStorage.setItem(THEME_KEY, proximo)
    } catch {
      // Navegação privada e cotas estouradas fazem setItem lançar. O original
      // também engolia (linha 1025): perder a preferência é aceitável, derrubar
      // a interface por causa dela não é.
    }
  }, [])

  const value = useMemo<ThemeCtx>(() => ({ dark, toggle }), [dark, toggle])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

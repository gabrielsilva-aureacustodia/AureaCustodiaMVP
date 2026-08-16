'use client'

/**
 * Aviso flutuante — port de aurea-mvp-teste.html, linhas 932-936 e 738.
 *
 * O original:
 *
 *   function toast(msg){
 *     const t = document.getElementById('toast');
 *     t.textContent = msg; t.classList.add('show');
 *     setTimeout(()=>t.classList.remove('show'), 3600);
 *   }
 *
 * Três decisões dele que este port PRESERVA de propósito:
 *
 *  1. Existe UM único elemento .toast, sempre no DOM, que só entra e sai pela
 *     classe .show. Não há fila: um aviso novo substitui o texto do anterior.
 *     Empilhar toasts mudaria a experiência.
 *
 *  2. O relógio de 3600ms é reiniciado a cada chamada. Aqui isso vira um
 *     clearTimeout explícito — no original acontecia por acidente feliz, já que
 *     o timer antigo removia uma classe que o novo tinha acabado de recolocar,
 *     e o efeito visível era o mesmo.
 *
 *  3. A duração é 3600ms, não 3000 nem 4000. É o tempo que os textos longos do
 *     sistema ('Compra realizada: 3 moedas por R$ ...') precisam para serem
 *     lidos.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** Mesma duração do setTimeout do monolito (linha 935). */
const TOAST_MS = 3600

const Ctx = createContext<((msg: string) => void) | null>(null)

export function useToast(): (msg: string) => void {
  const push = useContext(Ctx)
  if (!push) throw new Error('useToast() precisa estar dentro de <ToastProvider>.')
  return push
}

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const push = useCallback((m: string) => {
    setMsg(m)
    setShow(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setShow(false), TOAST_MS)
  }, [])

  // Desmontar o provider com um timer pendente deixaria um setState órfão.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  return (
    <Ctx.Provider value={push}>
      {children}
      {/* O texto continua no DOM depois do fade-out — .toast sem .show fica com
          opacity:0 e pointer-events:none, exatamente como no original, que
          também não limpava o textContent. Trocar por {show && msg} faria o
          texto sumir no meio da transição de saída.

          aria-live é acréscimo deste port: o monolito não anunciava nada a
          leitores de tela, e um aviso que só existe visualmente esconde metade
          das confirmações de compra e venda de quem usa leitor. Não muda pixel
          algum. */}
      <div className={show ? 'toast show' : 'toast'} role="status" aria-live="polite">
        {msg}
      </div>
    </Ctx.Provider>
  )
}

'use client'

/**
 * Registro de uso da plataforma, no navegador (plano do Admin, seção 1.5; frente C).
 *
 * Anota duas coisas e manda em lote para `POST /api/eventos`:
 *  - cada troca de rota — "abriu o mercado", "abriu a venda", "abriu um recibo";
 *  - cada clique num elemento marcado com `data-uso="…"`. Nenhum componente precisa
 *    importar nada para ser contado: basta o atributo. As AÇÕES DE NEGÓCIO (vendeu,
 *    comprou, pediu retirada) não passam por aqui — elas já ficam na trilha de
 *    auditoria do servidor, que a tela de Uso lê junto.
 *
 * NUNCA INTERROMPE A NAVEGAÇÃO. Tudo em try/catch, envio sem `await` na interação,
 * `sendBeacon` quando a aba some (é o único envio que o navegador garante ao fechar).
 * Se o registro falhar, a pessoa não percebe — e é isso que se quer.
 *
 * NÃO ANOTA CONTEÚDO. Só o caminho da tela (sem query string) e o nome do elemento
 * marcado. O servidor ainda troca identificadores e e-mails do caminho por `[id]`, e
 * nunca grava IP nem user agent completo.
 *
 * O identificador de sessão é aleatório, por aba (`sessionStorage`), só para agrupar
 * uma jornada. Não tem relação com o login.
 */

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

const ENDPOINT = '/api/eventos'
const CHAVE_SESSAO = 'aurea-uso-sessao'
const INTERVALO_MS = 5000
/** Com isto na fila, manda na hora em vez de esperar o relógio. */
const LOTE_CHEIO = 20
/** O servidor aceita até 50 por lote. */
const LOTE_MAX = 50

interface EventoNaFila {
  tipo: 'pagina' | 'acao'
  rota: string
  alvo?: string
  em: number
}

function novoId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // contexto sem crypto seguro (http fora de localhost): cai no fallback
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Sessão da aba. `sessionStorage` pode lançar (aba privada, cota): aí vale um id só da página. */
function idDaSessao(): string {
  try {
    const guardado = sessionStorage.getItem(CHAVE_SESSAO)
    if (guardado && /^[a-z0-9-]{8,64}$/.test(guardado)) return guardado
    const novo = novoId().toLowerCase()
    sessionStorage.setItem(CHAVE_SESSAO, novo)
    return novo
  } catch {
    return novoId().toLowerCase()
  }
}

export function RegistroDeUso(): null {
  const pathname = usePathname()
  const fila = useRef<EventoNaFila[]>([])
  const sessao = useRef<string>('')
  const ultimaRota = useRef<string | null>(null)

  const enviar = useCallback((aoSair: boolean) => {
    try {
      if (!fila.current.length) return
      const lote = fila.current.splice(0, LOTE_MAX)
      const corpo = JSON.stringify({ sessao: sessao.current, eventos: lote })
      if (aoSair && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(ENDPOINT, new Blob([corpo], { type: 'application/json' }))
        return
      }
      void fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => undefined)
    } catch {
      // Registro de uso nunca derruba a tela.
    }
  }, [])

  useEffect(() => {
    sessao.current = idDaSessao()
    const relogio = setInterval(() => enviar(false), INTERVALO_MS)
    const aoOcultar = (): void => {
      if (document.visibilityState === 'hidden') enviar(true)
    }
    const aoSairDaPagina = (): void => enviar(true)
    const aoClicar = (e: MouseEvent): void => {
      try {
        const alvo = e.target instanceof Element ? e.target.closest('[data-uso]') : null
        const nome = alvo?.getAttribute('data-uso')
        if (!nome) return
        fila.current.push({ tipo: 'acao', rota: window.location.pathname, alvo: nome.slice(0, 120), em: Date.now() })
        if (fila.current.length >= LOTE_CHEIO) enviar(false)
      } catch {
        // idem
      }
    }
    document.addEventListener('visibilitychange', aoOcultar)
    window.addEventListener('pagehide', aoSairDaPagina)
    document.addEventListener('click', aoClicar, true)
    return () => {
      clearInterval(relogio)
      document.removeEventListener('visibilitychange', aoOcultar)
      window.removeEventListener('pagehide', aoSairDaPagina)
      document.removeEventListener('click', aoClicar, true)
      enviar(true)
    }
  }, [enviar])

  useEffect(() => {
    // Mesma rota duas vezes seguidas não é navegação: é o React montando o efeito de
    // novo (modo estrito em desenvolvimento) ou um refresh dos dados da página.
    if (!pathname || pathname === ultimaRota.current) return
    ultimaRota.current = pathname
    fila.current.push({ tipo: 'pagina', rota: pathname, em: Date.now() })
    if (fila.current.length >= LOTE_CHEIO) enviar(false)
  }, [pathname, enviar])

  return null
}

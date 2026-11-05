/**
 * A ponte entre a loja de instalação (./instalacao.ts, pura) e o navegador de verdade: localStorage, user agent,
 * `display-mode` e os eventos `beforeinstallprompt` / `appinstalled`.
 *
 * Nada aqui roda no servidor: `iniciarInstalacao` só é chamada de dentro de um `useEffect`
 * (src/components/pwa/RaizDoPwa.tsx). A loja `lojaDeInstalacao` pode ser IMPORTADA no servidor sem efeito — as funções
 * dela só tocam `window` quando chamadas.
 */

import {
  criarLoja,
  detectarAmbiente,
  ehEventoDeInstalacao,
  lerRegistro,
  type RegistroLocal,
} from './instalacao'

/** Chave do localStorage. Versão no nome e no conteúdo (`v: 1`): formato novo no futuro não lê o antigo. */
const CHAVE = 'ro-pwa'

/** O script de <head> do layout guarda aqui o evento que chegou antes de o React existir. */
declare global {
  interface Window {
    __roPwaEvento?: Event
  }
}

const VAZIO: RegistroLocal = { v: 1 }

export const lojaDeInstalacao = criarLoja({
  lerRegistro() {
    // localStorage lança em janela anônima com dados bloqueados e em captura de miniatura: nunca pode derrubar a página.
    try {
      return lerRegistro(window.localStorage.getItem(CHAVE))
    } catch {
      return VAZIO
    }
  },
  gravarRegistro(registro) {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(registro))
    } catch {
      // Sem armazenamento a decisão vale só nesta visita. O aviso pode voltar; ninguém é prejudicado.
    }
  },
  agora: () => Date.now(),
})

/**
 * `manifest.ts` declara `display: 'standalone'`: o app instalado responde a esta consulta e uma aba comum responde
 * `browser`. O iPhone mais antigo só expõe o app da tela inicial pela propriedade não padronizada `navigator.standalone`.
 */
const CONSULTA_STANDALONE = '(display-mode: standalone)'

export function lerStandalone(): boolean {
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true
  return typeof window.matchMedia === 'function' && window.matchMedia(CONSULTA_STANDALONE).matches
}

/** Liga a loja ao navegador. Devolve a função que desfaz tudo (o `useEffect` a usa como limpeza). */
export function iniciarInstalacao(): () => void {
  const adiado = window.__roPwaEvento
  // Consumido: se este módulo for iniciado de novo (modo estrito em desenvolvimento), não ressuscita um evento já usado.
  window.__roPwaEvento = undefined

  lojaDeInstalacao.iniciar({
    ambiente: detectarAmbiente({ userAgent: window.navigator.userAgent, maxTouchPoints: window.navigator.maxTouchPoints }),
    standalone: lerStandalone(),
    eventoAdiado: ehEventoDeInstalacao(adiado) ? adiado : null,
  })

  window.addEventListener('beforeinstallprompt', lojaDeInstalacao.capturarEvento)
  window.addEventListener('appinstalled', lojaDeInstalacao.marcarInstalado)

  const consulta = typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_STANDALONE) : null
  const aoMudarModo = (): void => lojaDeInstalacao.mudarStandalone(lerStandalone())
  consulta?.addEventListener('change', aoMudarModo)

  return () => {
    window.removeEventListener('beforeinstallprompt', lojaDeInstalacao.capturarEvento)
    window.removeEventListener('appinstalled', lojaDeInstalacao.marcarInstalado)
    consulta?.removeEventListener('change', aoMudarModo)
  }
}

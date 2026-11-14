/**
 * Ajudantes do Pixel da Meta para o navegador. Só roda no cliente; no servidor todas as funções são inofensivas.
 *
 * O script da Meta (`fbevents.js`) é carregado depois da hidratação (ver `components/meta/MetaPixel.tsx`), então um
 * evento pedido cedo demais — por exemplo o cadastro que o servidor deixou num cookie — encontraria `window.fbq`
 * ainda inexistente. `quandoPronto` espera o Pixel existir (até 5 s) em vez de perder o evento em silêncio.
 */

import type { EventoPadrao, EventoPersonalizado, ParametrosDoEvento } from './eventos'

type Fbq = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: Fbq
  }
}

const INTERVALO_MS = 100
const TENTATIVAS = 50

function quandoPronto(acao: (fbq: Fbq) => void): void {
  if (typeof window === 'undefined') return
  let restantes = TENTATIVAS
  const tentar = (): void => {
    if (window.fbq) {
      acao(window.fbq)
      return
    }
    if (--restantes > 0) window.setTimeout(tentar, INTERVALO_MS)
  }
  tentar()
}

/** Evento padrão da Meta. `eventId` é o par do evento que o servidor mandou pela API de Conversões. */
export function rastrearPadrao(
  nome: EventoPadrao,
  parametros?: ParametrosDoEvento,
  eventId?: string,
): void {
  quandoPronto((fbq) => {
    if (eventId) fbq('track', nome, parametros ?? {}, { eventID: eventId })
    else if (parametros) fbq('track', nome, parametros)
    else fbq('track', nome)
  })
}

export function rastrearPersonalizado(
  nome: EventoPersonalizado,
  parametros?: ParametrosDoEvento,
): void {
  quandoPronto((fbq) => {
    if (parametros) fbq('trackCustom', nome, parametros)
    else fbq('trackCustom', nome)
  })
}

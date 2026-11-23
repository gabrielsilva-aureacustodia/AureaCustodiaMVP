'use client'

import { useSyncExternalStore } from 'react'

import { assinarConsentimento, lerConsentimento } from '@/lib/cookies/consentimento'

/**
 * 'carregando' no servidor e na hidratação (nada decidido ainda: o banner não aparece e o Pixel não carrega, sem
 * diferença de HTML entre servidor e navegador); depois 'aceito' ou 'recusado'. Sem escolha gravada vale 'aceito' (uso presumido, decisão de 22/11/2026).
 */
export type EstadoDoConsentimento = 'carregando' | 'aceito' | 'recusado'

export function useConsentimento(): EstadoDoConsentimento {
  return useSyncExternalStore<EstadoDoConsentimento>(
    assinarConsentimento,
    () => lerConsentimento() ?? 'aceito',
    () => 'carregando',
  )
}

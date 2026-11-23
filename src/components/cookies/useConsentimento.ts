'use client'

import { useSyncExternalStore } from 'react'

import { assinarConsentimento, lerConsentimento } from '@/lib/cookies/consentimento'

/**
 * 'carregando' no servidor e na hidratação (nada decidido ainda: o banner não aparece e o Pixel não carrega, sem
 * diferença de HTML entre servidor e navegador); depois 'aceito', 'recusado' ou 'pendente' (ainda não escolheu).
 */
export type EstadoDoConsentimento = 'carregando' | 'aceito' | 'recusado' | 'pendente'

export function useConsentimento(): EstadoDoConsentimento {
  return useSyncExternalStore<EstadoDoConsentimento>(
    assinarConsentimento,
    () => lerConsentimento() ?? 'pendente',
    () => 'carregando',
  )
}

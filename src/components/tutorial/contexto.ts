'use client'

/**
 * O contexto do tutorial, separado do provider de propósito: `AvisoDebitoCustodia` e
 * `ResumoDaCustodia` só precisam LER o exemplo de custódia, e importar o provider traria junto o
 * formulário de cadastro e as Server Actions dele — o que quebra os testes dessas telas, que
 * renderizam sem servidor.
 */

import { createContext, useContext } from 'react'

import type { FaturaCustodia } from '@/domain/types'

export interface TutorialCtx {
  /** A fatura de exemplo, só durante a etapa de custódia do tour. `null` o resto do tempo. */
  exemplo: FaturaCustodia | null
}

// Padrão sem provider: telas que leem o contexto continuam funcionando (e testáveis) sem tutorial.
export const Ctx = createContext<TutorialCtx>({ exemplo: null })

export function useTutorial(): TutorialCtx {
  return useContext(Ctx)
}

'use client'

import { useCallback, useState } from 'react'
import type { UserEmail } from '@/domain/types'
import {
  situacaoDoBloqueioPorPendencia,
  type SituacaoBloqueioPorPendencia,
} from '@/server/actions/bloqueio-por-debito'

export interface UseBloqueioPorPendenciaResult {
  minhaContaBloqueada: boolean
  vendedoresPausados: UserEmail[]
  consultando: boolean
  consultar: () => Promise<SituacaoBloqueioPorPendencia>
  limpar: () => void
}

/**
 * Hook de consulta da situação de bloqueio por pendência para componentes do cliente.
 *
 * Evita chamadas desnecessárias ao servidor:
 * - Não consulta na montagem nem a cada mutação de `state` do `useApp()`.
 * - Consulta sob demanda via `consultar()` quando o usuário abre uma tela ou modal
 *   relevante (venda, retirada, faturas, mercado).
 * - Retorna valor padrão "liberado" (falso/vazio) antes da resposta e em caso de falha.
 */
export function useBloqueioPorPendencia(): UseBloqueioPorPendenciaResult {
  const [minhaContaBloqueada, setMinhaContaBloqueada] = useState(false)
  const [vendedoresPausados, setVendedoresPausados] = useState<UserEmail[]>([])
  const [consultando, setConsultando] = useState(false)

  const consultar = useCallback(async (): Promise<SituacaoBloqueioPorPendencia> => {
    setConsultando(true)
    try {
      const res = await situacaoDoBloqueioPorPendencia()
      setMinhaContaBloqueada(res.minhaContaBloqueada)
      setVendedoresPausados(res.vendedoresPausados)
      return res
    } catch {
      setMinhaContaBloqueada(false)
      setVendedoresPausados([])
      return { minhaContaBloqueada: false, vendedoresPausados: [] }
    } finally {
      setConsultando(false)
    }
  }, [])

  const limpar = useCallback(() => {
    setMinhaContaBloqueada(false)
    setVendedoresPausados([])
    setConsultando(false)
  }, [])

  return {
    minhaContaBloqueada,
    vendedoresPausados,
    consultando,
    consultar,
    limpar,
  }
}

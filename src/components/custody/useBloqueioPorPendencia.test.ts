import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockSituacaoDoBloqueio = vi.fn()

vi.mock('@/server/actions/bloqueio-por-debito', () => ({
  situacaoDoBloqueioPorPendencia: () => mockSituacaoDoBloqueio(),
}))

import { useBloqueioPorPendencia } from './useBloqueioPorPendencia'

/**
 * Runner leve de hooks para o ambiente de testes em Node (sem DOM).
 * Conecta diretamente ao despachante de clientes do React 19 para permitir
 * que useState e useCallback funcionem de forma reativa.
 */
function renderHook<T>(hookFn: () => T) {
  const hooks: unknown[] = []
  let hookIndex = 0
  let currentResult: T

  function run() {
    hookIndex = 0
    const prevDispatcher = (React as unknown as { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown } })
      .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H

    ;(React as unknown as { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown } })
      .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = {
      useState(initialState: unknown) {
        const idx = hookIndex++
        if (hooks.length <= idx) {
          const val = typeof initialState === 'function' ? (initialState as () => unknown)() : initialState
          hooks[idx] = val
        }
        const setState = (newVal: unknown) => {
          hooks[idx] = typeof newVal === 'function' ? (newVal as (prev: unknown) => unknown)(hooks[idx]) : newVal
          run()
        }
        return [hooks[idx], setState]
      },
      useCallback(fn: unknown) {
        const idx = hookIndex++
        if (hooks.length <= idx) {
          hooks[idx] = fn
        }
        return hooks[idx]
      },
    }

    try {
      currentResult = hookFn()
      return currentResult
    } finally {
      ;(React as unknown as { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: { H: unknown } })
        .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = prevDispatcher
    }
  }

  run()
  return {
    get current() {
      return currentResult
    },
    rerender() {
      return run()
    },
  }
}

describe('useBloqueioPorPendencia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('montar o hook e simular mutações de state do useApp() NÃO chama a action', () => {
    let mockAppStateVersion = 1
    const hook = renderHook(() => {
      // Simula leitura de estado externo que re-renderiza o componente
      void mockAppStateVersion
      return useBloqueioPorPendencia()
    })

    expect(mockSituacaoDoBloqueio).not.toHaveBeenCalled()
    expect(hook.current.minhaContaBloqueada).toBe(false)
    expect(hook.current.vendedoresPausados).toEqual([])

    // Simula mutações frequentes de mercado/saldos no estado do useApp()
    mockAppStateVersion = 2
    hook.rerender()
    mockAppStateVersion = 3
    hook.rerender()

    expect(mockSituacaoDoBloqueio).not.toHaveBeenCalled()
  })

  it('consultar() chama a action uma vez e atualiza o estado', async () => {
    mockSituacaoDoBloqueio.mockResolvedValueOnce({
      minhaContaBloqueada: true,
      vendedoresPausados: ['vendedor.pausado@exemplo.com.br'],
    })

    const hook = renderHook(() => useBloqueioPorPendencia())

    expect(hook.current.minhaContaBloqueada).toBe(false)
    const promise = hook.current.consultar()
    await promise

    expect(mockSituacaoDoBloqueio).toHaveBeenCalledTimes(1)
    expect(hook.current.minhaContaBloqueada).toBe(true)
    expect(hook.current.vendedoresPausados).toEqual(['vendedor.pausado@exemplo.com.br'])
  })

  it('nova mudança de state com o modal aberto não chama a action de novo e o resultado se mantém', async () => {
    mockSituacaoDoBloqueio.mockResolvedValueOnce({
      minhaContaBloqueada: true,
      vendedoresPausados: ['vendedor1@exemplo.com.br'],
    })

    let mockAppStateTrades = 0
    const hook = renderHook(() => {
      void mockAppStateTrades
      return useBloqueioPorPendencia()
    })

    await hook.current.consultar()
    expect(mockSituacaoDoBloqueio).toHaveBeenCalledTimes(1)
    expect(hook.current.minhaContaBloqueada).toBe(true)

    // Negociações acontecem no background enquanto o modal do cliente está aberto
    mockAppStateTrades = 1
    hook.rerender()
    mockAppStateTrades = 2
    hook.rerender()

    expect(mockSituacaoDoBloqueio).toHaveBeenCalledTimes(1)
    expect(hook.current.minhaContaBloqueada).toBe(true)
    expect(hook.current.vendedoresPausados).toEqual(['vendedor1@exemplo.com.br'])
  })

  it('fechar e abrir chama a action de novo', async () => {
    mockSituacaoDoBloqueio
      .mockResolvedValueOnce({
        minhaContaBloqueada: true,
        vendedoresPausados: [],
      })
      .mockResolvedValueOnce({
        minhaContaBloqueada: false,
        vendedoresPausados: [],
      })

    // Primeira abertura do modal
    const modal1 = renderHook(() => useBloqueioPorPendencia())
    await modal1.current.consultar()
    expect(modal1.current.minhaContaBloqueada).toBe(true)
    expect(mockSituacaoDoBloqueio).toHaveBeenCalledTimes(1)

    // Modal fechado (descartado) e reaberto pelo usuário
    const modal2 = renderHook(() => useBloqueioPorPendencia())
    await modal2.current.consultar()
    expect(modal2.current.minhaContaBloqueada).toBe(false)
    expect(mockSituacaoDoBloqueio).toHaveBeenCalledTimes(2)
  })

  it('antes da resposta e com a action rejeitando, o valor é "liberado"', async () => {
    mockSituacaoDoBloqueio.mockRejectedValueOnce(new Error('Falha de rede ou servidor'))

    const hook = renderHook(() => useBloqueioPorPendencia())

    // Valor inicial antes da resposta
    expect(hook.current.minhaContaBloqueada).toBe(false)
    expect(hook.current.vendedoresPausados).toEqual([])

    await hook.current.consultar()

    // Valor após rejeição continua liberado
    expect(hook.current.minhaContaBloqueada).toBe(false)
    expect(hook.current.vendedoresPausados).toEqual([])
  })
})

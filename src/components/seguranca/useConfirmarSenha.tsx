'use client'

/* ============================================================================
 * A LIGAÇÃO ENTRE A AÇÃO E O MODAL DE CONFIRMAÇÃO — frente A, 17/11/2026.
 *
 * Como usar numa tela (o único padrão do site para toda ação sensível):
 *
 *     const { confirmar, dialogo } = useConfirmarSenha()
 *     ...
 *     const res = await run(() => confirmar(() => solicitarSaque(cents)))
 *     ...
 *     return (<> ...a tela... {dialogo} </>)
 *
 * `confirmar` chama a ação. Se o servidor responder que falta a confirmação
 * (`{ ok:false, precisaSenha:true }`), abre o `ModalConfirmarSenha`, espera a pessoa e,
 * confirmada, CHAMA A MESMA AÇÃO DE NOVO com os mesmos argumentos — a tela não recarrega,
 * o que a pessoa digitou fica onde estava e o resultado final é o da segunda chamada.
 *
 * Se a pessoa cancela, devolve `{ ok:false }` sem texto de erro: nenhuma tela mostra aviso
 * de falha para uma desistência (o `run()` do AppProvider só abre toast quando há texto).
 *
 * POR QUE UM HOOK POR TELA, E NÃO UM PONTO CENTRAL NO `run()`. O `run()` atende a maior parte
 * das telas, mas há chamadas diretas (`iniciarCompraDireta`, `iniciarOfertaPrePaga`,
 * `salvarCadastro`) que não passam por ele; um ponto central deixaria essas de fora, e o
 * teste de varredura não enxerga tela. Com o hook, cada chamada diz explicitamente que pode
 * pedir confirmação. O modal em si é um só (`ModalConfirmarSenha`).
 *
 * Só UMA confirmação fica aberta por vez em cada tela: duas ações pedidas ao mesmo tempo
 * esperam a mesma resposta. Se a tela sai do ar com o modal aberto, a espera termina como
 * cancelamento (nada fica pendurado).
 * ==========================================================================*/

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { ActionResult } from '@/domain/types'

import { executarComConfirmacao, type MetodoDeConfirmacao, type NivelDeConfirmacao } from './confirmacao'
import { ModalConfirmarSenha } from './ModalConfirmarSenha'

interface Pedido {
  nivel: NivelDeConfirmacao
  metodo: MetodoDeConfirmacao
}

interface EsperaAberta {
  promessa: Promise<boolean>
  resolver: (confirmou: boolean) => void
}

export interface ConfirmarSenha {
  /** Chama `acao`; se faltar a confirmação, abre o modal e reenvia `acao` depois que a pessoa confirmar. */
  confirmar: <T>(acao: () => Promise<ActionResult<T>>) => Promise<ActionResult<T>>
  /** O modal. Renderize uma vez na tela que chama `confirmar` (vira `null` enquanto não há pedido). */
  dialogo: ReactNode
}

export function useConfirmarSenha(): ConfirmarSenha {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const espera = useRef<EsperaAberta | null>(null)

  // Tela desmontada com o modal aberto: a espera termina como cancelamento.
  useEffect(
    () => () => {
      espera.current?.resolver(false)
      espera.current = null
    },
    [],
  )

  const pedirConfirmacao = useCallback((nivel: NivelDeConfirmacao, metodo: MetodoDeConfirmacao): Promise<boolean> => {
    if (espera.current) return espera.current.promessa
    let resolver: (confirmou: boolean) => void = () => undefined
    const promessa = new Promise<boolean>((resolve) => {
      resolver = resolve
    })
    espera.current = { promessa, resolver }
    setPedido({ nivel, metodo })
    return promessa
  }, [])

  const encerrar = useCallback((confirmou: boolean) => {
    const atual = espera.current
    espera.current = null
    setPedido(null)
    atual?.resolver(confirmou)
  }, [])

  const confirmar = useCallback(
    // A vírgula em <T,> não é engano: sem ela o TypeScript lê o <T> como abertura de JSX num arquivo .tsx.
    <T,>(acao: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> => executarComConfirmacao(acao, pedirConfirmacao),
    [pedirConfirmacao],
  )

  const dialogo: ReactNode = pedido ? (
    <ModalConfirmarSenha
      nivel={pedido.nivel}
      metodo={pedido.metodo}
      onConfirmado={() => encerrar(true)}
      onCancelar={() => encerrar(false)}
    />
  ) : null

  return { confirmar, dialogo }
}

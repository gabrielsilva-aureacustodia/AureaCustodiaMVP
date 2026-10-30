'use client'

/**
 * Confirmação de "Cancelar solicitação" da retirada (30/10/2026, polimento — lente "estados").
 *
 * Era um `window.confirm` nativo: caixa do navegador, sem a marca, sem tema escuro e que alguns
 * navegadores de celular suprimem. A pergunta e o efeito são os mesmos de antes — a moeda volta
 * a ficar disponível para negociação —, só passam a morar na modal do sistema. Quem cancela de
 * fato continua sendo `cancelarSolicitacaoRetirada`, chamada pela tela; esta modal só pergunta.
 *
 * "Manter solicitação" é o botão contornado e fica primeiro: o destrutivo (`.btn-danger`) vem
 * por último, como no resto do sistema.
 */

import type { ReactNode } from 'react'

import { useModal } from '@/components/ui/Modal'

export function ModalCancelarRetirada({ onConfirmar }: { onConfirmar: () => void }): ReactNode {
  const { close } = useModal()

  return (
    <>
      <h3>Cancelar esta solicitação de retirada?</h3>
      <p>A moeda voltará a ficar disponível para negociação. Você pode pedir a retirada de novo quando quiser.</p>
      <div className="m-actions">
        <button type="button" className="btn btn-outline" onClick={close}>
          Manter solicitação
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            close()
            onConfirmar()
          }}
        >
          Cancelar solicitação
        </button>
      </div>
    </>
  )
}

'use client'

/**
 * Modal de Aceite por Blocos dos Termos de Uso e Política de Privacidade.
 *
 * Requisito jurídico de Felipe Moraes (reunião 09/09/2026) e Gabriel:
 * Em vez de um aceite genérico no rodapé, o cliente confirma pontualmente as
 * condições operacionais mais sensíveis (moeda equiparável, prazos D+3/D+30,
 * custos a cargo do cliente, débito/garantia, posicionamento institucional e LGPD).
 *
 * Trava 3 (Seção 3.3 do Plano Executivo):
 * O modal é acionado na primeira operação (depósito, compra ou venda), nunca no login.
 * Alvos de toque mantidos em >= 44px para dispositivos móveis.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import {
  BLOCOS_LEGAIS_OBRIGATORIOS,
  TODOS_OS_BLOCOS_IDS,
  verificarAceiteVigente,
  VERSAO_TERMOS_VIGENTE,
} from '@/domain/legal'
import type { LegalBlockId } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { useModal } from '@/components/ui/Modal'
import { salvarAceiteLegal } from '@/server/actions/legal'

export interface ModalAceiteBlocosProps {
  /** Callback executado após a gravação bem-sucedida do aceite. */
  onSuccess?: () => void
  /** Callback executado caso o usuário feche a modal sem confirmar. */
  onCancel?: () => void
}

export function ModalAceiteBlocos({
  onSuccess,
  onCancel,
}: ModalAceiteBlocosProps): ReactNode {
  const { run } = useApp()
  const { close } = useModal()

  const [marcados, setMarcados] = useState<Set<LegalBlockId>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const todosMarcados = TODOS_OS_BLOCOS_IDS.every((id) => marcados.has(id))
  const quantidadeMarcada = marcados.size
  const total = TODOS_OS_BLOCOS_IDS.length

  function toggleBloco(id: LegalBlockId): void {
    setMarcados((anterior) => {
      const proximo = new Set(anterior)
      if (proximo.has(id)) {
        proximo.delete(id)
      } else {
        proximo.add(id)
      }
      return proximo
    })
    setErro(null)
  }

  function toggleMarcarTodos(): void {
    if (todosMarcados) {
      setMarcados(new Set())
    } else {
      setMarcados(new Set(TODOS_OS_BLOCOS_IDS))
    }
    setErro(null)
  }

  async function submeter(): Promise<void> {
    if (!todosMarcados || salvando) return
    setSalvando(true)
    setErro(null)

    try {
      const res = await run(() => salvarAceiteLegal(Array.from(marcados)))
      if (res.ok) {
        close()
        onSuccess?.()
      } else {
        setErro(res.error ?? 'Não foi possível registrar o aceite. Tente novamente.')
        setSalvando(false)
      }
    } catch {
      setErro('Erro de conexão ao salvar aceite legal.')
      setSalvando(false)
    }
  }

  function cancelar(): void {
    close()
    onCancel?.()
  }

  return (
    <div className="legal-blocks-modal">
      <div className="legal-blocks-header">
        <div className="legal-blocks-badge">
          Termos e Condições · v{VERSAO_TERMOS_VIGENTE}
        </div>
        <h3 className="serif legal-blocks-title">
          Confirmação de Condições Operacionais
        </h3>
        <p className="legal-blocks-intro">
          Para realizar movimentações na plataforma (depósitos, compras ou
          vendas), leia e confirme ciência e concordância com os 6 pontos
          abaixo:
        </p>
      </div>

      <div className="legal-blocks-actions-top">
        <button
          type="button"
          className="btn btn-outline legal-btn-select-all"
          onClick={toggleMarcarTodos}
        >
          {todosMarcados ? 'Desmarcar todos' : 'Marcar todos os 6 itens'}
        </button>
        <span className="legal-blocks-counter" aria-live="polite">
          {quantidadeMarcada} de {total} itens confirmados
        </span>
      </div>

      {erro && (
        <div className="legal-blocks-error" role="alert">
          {erro}
        </div>
      )}

      <div className="legal-blocks-list" role="group" aria-label="Condições operacionais obrigatórias">
        {BLOCOS_LEGAIS_OBRIGATORIOS.map((bloco, index) => {
          const marcado = marcados.has(bloco.id)
          const inputId = `bloco-legal-${bloco.id}`

          return (
            <label
              key={bloco.id}
              htmlFor={inputId}
              className={`legal-block-card ${marcado ? 'selected' : ''}`}
            >
              <div className="legal-block-checkbox-wrap">
                <input
                  type="checkbox"
                  id={inputId}
                  checked={marcado}
                  onChange={() => toggleBloco(bloco.id)}
                  className="legal-block-checkbox"
                />
              </div>

              <div className="legal-block-body">
                <div className="legal-block-header-row">
                  <span className="legal-block-index">#{index + 1}</span>
                  <span className="legal-block-name">{bloco.titulo}</span>
                </div>
                <p className="legal-block-summary">{bloco.resumo}</p>
                <div className="legal-block-ref-row">
                  <a
                    href={bloco.urlDocumento}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="legal-block-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver {bloco.clausulaReferencia} ↗
                  </a>
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <div className="m-actions legal-blocks-footer">
        <button
          type="button"
          className="btn btn-outline"
          onClick={cancelar}
          disabled={salvando}
          style={{ minHeight: '44px' }}
        >
          Voltar
        </button>

        <button
          type="button"
          className="btn btn-gold"
          disabled={!todosMarcados || salvando}
          onClick={() => void submeter()}
          style={{ minHeight: '44px' }}
        >
          {salvando ? 'Registrando aceite…' : 'Aceitar e prosseguir'}
        </button>
      </div>
    </div>
  )
}

/**
 * Hook utilitário para Client Components verificarem o status do aceite
 * e interceptarem operações caso o aceite ainda não tenha sido concedido.
 */
export function useVerificarAceiteLegal() {
  const { me } = useApp()
  const { open } = useModal()

  const temAceiteVigente = verificarAceiteVigente(me?.settings?.legalAcceptance)

  /**
   * Executa a ação se o aceite estiver vigente; caso contrário, abre a modal de
   * aceite por blocos e executa a ação imediatamente após a confirmação.
   */
  function executarComAceite(acao: () => void, aoCancelar?: () => void): void {
    if (temAceiteVigente) {
      acao()
    } else {
      open(
        <ModalAceiteBlocos
          onSuccess={acao}
          onCancel={aoCancelar}
        />,
      )
    }
  }

  return {
    temAceiteVigente,
    executarComAceite,
  }
}

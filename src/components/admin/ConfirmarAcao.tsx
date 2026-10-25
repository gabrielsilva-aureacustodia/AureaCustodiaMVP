'use client'

/**
 * Confirmação em dois passos, no próprio lugar, com o OBJETO no nome do botão (25/10/2026).
 *
 * POR QUE NÃO `window.confirm`. A caixa do navegador não diz de qual linha é, some atrás de
 * outra janela, não segue o tema e o leitor de tela lê só "OK". E "Confirmar" repetido em cada
 * linha da tabela é o mesmo nome para destinos diferentes — o erro que o doc 35 §6 do
 * `aprendizado_frontend` mediu (×11 numa tela). Aqui o segundo botão diz o que vai acontecer e
 * com quem: "Confirmar: pagar o saque de R$ 120,00 a Ana Souza".
 *
 * Primeiro clique abre a caixa logo abaixo do botão (a confirmação acontece do lado do registro,
 * como já fazia `AcoesDoRegistro`); o foco vai para "Confirmar"; Esc ou "Cancelar" desiste.
 * Quem decide se pode é a Server Action — este componente só pergunta.
 *
 * Marca (rodada 3): ação irreversível (`perigo`) usa `.btn-danger` no gatilho e na confirmação, e
 * "Cancelar" é `.btn-ghost` — brandbook §9.1 e recomendação à Frente 5.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function ConfirmarAcao({
  rotulo,
  objeto,
  detalhe,
  aoConfirmar,
  variante = 'outline',
  perigo = false,
  desabilitado = false,
  usoNome,
}: {
  /** O botão de antes da confirmação: "Aprovar e enviar Pix". */
  rotulo: string
  /** O que acontece e com quem, em minúsculas: "pagar o saque de R$ 120,00 a Ana Souza". */
  objeto: string
  /** Uma frase de consequência: "O Pix sai da conta da empresa e não pode ser desfeito por aqui." */
  detalhe?: ReactNode
  aoConfirmar: () => Promise<unknown>
  variante?: 'outline' | 'gold'
  /** Ação destrutiva ou irreversível: caixa em vermelho. */
  perigo?: boolean
  desabilitado?: boolean
  usoNome?: string
}): ReactNode {
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const confirmar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (aberto) confirmar.current?.focus()
  }, [aberto])

  async function executar(): Promise<void> {
    setOcupado(true)
    try {
      await aoConfirmar()
    } finally {
      setOcupado(false)
      setAberto(false)
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        className={`btn ${perigo ? 'btn-danger' : variante === 'gold' ? 'btn-gold' : 'btn-outline'} adm-btn-compacto`}
        disabled={desabilitado}
        onClick={() => setAberto(true)}
        aria-expanded={false}
        data-uso={usoNome}
      >
        {rotulo}
      </button>
    )
  }

  return (
    <div
      className={perigo ? 'adm-confirmacao adm-perigo' : 'adm-confirmacao'}
      role="group"
      aria-label={`Confirmar: ${objeto}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !ocupado) setAberto(false)
      }}
    >
      {detalhe ? <p>{detalhe}</p> : null}
      <div className="adm-acoes">
        <button ref={confirmar} type="button" className={`btn ${perigo ? 'btn-danger' : 'btn-gold'} adm-btn-compacto`} disabled={ocupado} onClick={() => void executar()} data-uso={usoNome ? `${usoNome}:confirmar` : undefined}>
          {ocupado ? 'Enviando…' : `Confirmar: ${objeto}`}
        </button>
        <button type="button" className="btn btn-ghost adm-btn-compacto" disabled={ocupado} onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

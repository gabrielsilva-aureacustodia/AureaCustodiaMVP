'use client'

/**
 * O botão "Cancelar envio" da equipe, com o MOTIVO obrigatório (frente H, 17/11/2026).
 *
 * Serve às duas portas do mesmo gesto: a linha do envio em `/admin/logistica` e o "Cancelar validação" da
 * bancada. Quem muda é a Server Action que `aoCancelar` chama (e a permissão que ela confere: `logistica.expedir`
 * × `bancada.analisar`); a confirmação, o texto do que acontece e o motivo são os mesmos.
 *
 * POR QUE NÃO `ConfirmarAcao`: ele só pergunta "confirma?", e aqui a ação devolve dinheiro de verdade ao saldo
 * do cliente, então a resposta precisa de um motivo escrito — que vai para o envio e para a trilha da equipe — e o
 * botão de confirmar só liga depois dele. O resto é do mesmo molde (`adm-confirmacao adm-perigo`, foco no campo,
 * Esc desiste).
 *
 * ESCONDER BOTÃO NÃO PROTEGE NADA. Quem só enxerga o painel não vê este botão (`podeExpedir`), mas a Server Action
 * confere a permissão por conta própria.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { MOTIVO_MAXIMO_CARACTERES, MOTIVO_MINIMO_CARACTERES, motivoValido } from '@/domain/cancelar-envio'
import type { ActionResult } from '@/domain/types'

import { useAdmin } from '../AdminProvider'

export function CancelarEnvioDaEquipe({
  protocolo,
  rotulo = 'Cancelar envio',
  jaPostado,
  aoCancelar,
  usoNome,
}: {
  protocolo: string
  /** O texto do botão que abre a confirmação. */
  rotulo?: string
  /** O pacote já saiu de "Protocolo gerado": o frete não volta e a tela precisa dizer. */
  jaPostado: boolean
  /** A Server Action (ela mesma confere a permissão). */
  aoCancelar: (motivo: string) => Promise<ActionResult<unknown>>
  usoNome?: string
}): ReactNode {
  const { run } = useAdmin()
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [texto, setTexto] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (aberto) campo.current?.focus()
  }, [aberto])

  const motivo = motivoValido(texto)

  async function confirmar(): Promise<void> {
    if (!motivo || ocupado) return
    setOcupado(true)
    try {
      const r = await run(() => aoCancelar(motivo))
      if (r.ok) {
        setAberto(false)
        setTexto('')
      }
    } finally {
      setOcupado(false)
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        className="btn btn-outline adm-btn-compacto"
        onClick={() => setAberto(true)}
        aria-expanded={false}
        data-uso={usoNome}
      >
        {rotulo}
        <span className="adm-sr"> do envio {protocolo}</span>
      </button>
    )
  }

  return (
    <div
      className="adm-confirmacao adm-perigo"
      role="group"
      aria-label={`Confirmar: cancelar o envio ${protocolo}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !ocupado) setAberto(false)
      }}
    >
      <p>
        Devolve ao saldo do cliente o <b>frete</b> e o <b>1º mês de custódia</b> pagos por este envio, cancela a{' '}
        <b>nota fiscal</b> do 1º mês e a <b>etiqueta dos Correios</b>, e encerra o protocolo. Não dá para desfazer.
      </p>
      {jaPostado ? (
        <p>
          <b>Este envio já foi postado:</b> o frete NÃO volta (os Correios já cobraram o serviço da Áurea). O 1º mês e
          a nota voltam. Se o pacote chegar à custódia depois, ele não terá protocolo válido.
        </p>
      ) : null}
      <div className="field">
        <label htmlFor={`motivo-${protocolo}`}>Motivo (obrigatório, ao menos {MOTIVO_MINIMO_CARACTERES} caracteres)</label>
        <textarea
          id={`motivo-${protocolo}`}
          ref={campo}
          className="obs"
          value={texto}
          maxLength={MOTIVO_MAXIMO_CARACTERES}
          disabled={ocupado}
          onChange={(ev) => setTexto(ev.target.value)}
          placeholder="Ex.: o cliente desistiu; o pacote nunca chegou; protocolo criado por engano"
        />
      </div>
      <div className="adm-acoes">
        <button
          type="button"
          className="btn btn-danger adm-btn-compacto"
          disabled={ocupado || motivo === null}
          onClick={() => void confirmar()}
          data-uso={usoNome ? `${usoNome}:confirmar` : undefined}
        >
          {ocupado ? 'Cancelando…' : `Confirmar: cancelar o envio ${protocolo}`}
        </button>
        <button type="button" className="btn btn-ghost adm-btn-compacto" disabled={ocupado} onClick={() => setAberto(false)}>
          Voltar
        </button>
      </div>
    </div>
  )
}

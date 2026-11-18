'use client'

/**
 * Botão "Cancelar este envio" da lista de envios do cliente (frente H, 17/11/2026).
 *
 * POR QUE EXISTE: até aqui o cliente que criava um envio, pagava o frete e o 1º mês de custódia e desistia
 * ficava com o dinheiro preso até o protocolo vencer sozinho (3 dias) — e, no caso do 1º mês, nem depois. Agora
 * ele mesmo cancela, e o que pagou volta ao saldo junto com a nota fiscal e a etiqueta dos Correios.
 *
 * O QUE A TELA PRECISA DEIXAR CLARO, antes do clique (é a razão da confirmação em duas etapas):
 *  1. quanto volta ao saldo e de onde vem (frete e 1º mês) — nada é devolvido ao Pix ou ao cartão;
 *  2. que a etiqueta dos Correios deixa de valer: o rótulo já impresso não pode mais ser usado;
 *  3. que o protocolo se encerra e não reabre (para enviar de novo, gera-se um novo).
 * Os valores mostrados aqui são os mesmos que o servidor usa (`primeiroMesDoEnvio` e o frete do envio), mas
 * quem decide é o servidor: a mensagem final do toast diz o que de fato voltou.
 *
 * Client Component: não importa nada de `@/server/*` além da Server Action, que o Next transforma numa
 * chamada de rede. A regra de quem pode cancelar o quê vive em `src/domain/cancelar-envio.ts`.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'

import {
  MOTIVO_MAXIMO_CARACTERES,
  MOTIVO_MINIMO_CARACTERES,
  MOTIVOS_DO_CLIENTE,
  motivoValido,
} from '@/domain/cancelar-envio'
import { prePostagemAtiva, primeiroMesDoEnvio } from '@/domain/envios'
import { brl } from '@/domain/money'
import type { Envio } from '@/domain/types'
import { useApp } from '@/components/providers/AppProvider'
import { cancelarMeuEnvio } from '@/server/actions/cancelar-envio'

const OUTRO = 'outro' as const

export interface CancelarEnvioProps {
  envio: Envio
}

export function CancelarEnvio({ envio }: CancelarEnvioProps): ReactNode {
  const { state, run } = useApp()
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [escolha, setEscolha] = useState<string>('')
  const [texto, setTexto] = useState('')

  // O que volta ao saldo, na leitura da tela. O frete só volta se foi pago; do 1º mês só volta a fatura
  // paga (a que ainda está em aberto é só cancelada, não saiu dinheiro).
  const freteCents = envio.frete?.status === 'pago' ? envio.frete.valorCents : 0
  const { faturas } = primeiroMesDoEnvio(state, envio)
  const primeiroMesCents = faturas.filter((f) => f.status === 'paga').reduce((soma, f) => soma + f.valorCents, 0)
  const primeiroMesEmAberto = faturas.some((f) => f.status !== 'paga' && f.status !== 'cancelada')
  const totalCents = freteCents + primeiroMesCents
  const temEtiqueta = prePostagemAtiva(envio) !== null

  // O motivo gravado é a frase da lista ou, em "Outro motivo", o texto livre (mínimo de caracteres).
  const motivo = escolha === OUTRO ? motivoValido(texto) : escolha || null
  const faltaTexto = escolha === OUTRO && motivo === null

  async function confirmar(): Promise<void> {
    if (!motivo || ocupado) return
    setOcupado(true)
    try {
      const r = await run(() => cancelarMeuEnvio(envio.protocolo, motivo))
      if (r.ok) setAberto(false)
    } finally {
      setOcupado(false)
    }
  }

  if (!aberto) {
    return (
      <button type="button" className="btn btn-outline auto hist-acao" onClick={() => setAberto(true)}>
        Cancelar este envio
        <span className="sr-only"> {envio.protocolo}</span>
      </button>
    )
  }

  return (
    <div className="zona-perigo" role="group" aria-label={`Confirmar o cancelamento do envio ${envio.protocolo}`}>
      <p>
        <b>Cancelar o envio {envio.protocolo}?</b> O protocolo é encerrado e não pode ser reaberto; para enviar suas
        moedas depois, gere um novo protocolo.
      </p>

      {totalCents > 0 ? (
        <p>
          Voltam para o <b>saldo da sua conta</b> no Real Olímpico:{' '}
          {freteCents > 0 && (
            <>
              o frete ({brl(freteCents)})
              {primeiroMesCents > 0 ? ' e ' : ''}
            </>
          )}
          {primeiroMesCents > 0 && <>o primeiro mês de custódia ({brl(primeiroMesCents)})</>}
          {' '}— <b>{brl(totalCents)}</b> no total. Nada é devolvido ao Pix ou ao cartão usado no pagamento. A nota
          fiscal do primeiro mês, se já foi emitida, é cancelada junto.
        </p>
      ) : (
        <p>
          Este envio não tem nenhum valor pago, então nada volta ao saldo.
          {primeiroMesEmAberto ? ' A cobrança do primeiro mês, ainda em aberto, é cancelada.' : ''}
        </p>
      )}

      {temEtiqueta && (
        <p>
          A etiqueta dos Correios deste envio é cancelada. <b>Não use mais o rótulo que você imprimiu</b>: ele deixa
          de valer.
        </p>
      )}

      <fieldset style={{ border: 0, margin: '0 0 10px', padding: 0, minWidth: 0 }} disabled={ocupado}>
        <legend className="campo-dica" style={{ padding: 0 }}>
          Por que você está cancelando?
        </legend>
        {MOTIVOS_DO_CLIENTE.map((m) => (
          <label key={m} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', minHeight: 44 }}>
            <input
              type="radio"
              name={`motivo-${envio.protocolo}`}
              value={m}
              checked={escolha === m}
              onChange={() => setEscolha(m)}
            />
            <span>{m}</span>
          </label>
        ))}
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', minHeight: 44 }}>
          <input
            type="radio"
            name={`motivo-${envio.protocolo}`}
            value={OUTRO}
            checked={escolha === OUTRO}
            onChange={() => setEscolha(OUTRO)}
          />
          <span>Outro motivo</span>
        </label>
        {escolha === OUTRO && (
          <>
            <textarea
              className="obs"
              value={texto}
              maxLength={MOTIVO_MAXIMO_CARACTERES}
              onChange={(ev) => setTexto(ev.target.value)}
              aria-label="Conte o motivo do cancelamento"
              aria-invalid={faltaTexto && texto.length > 0}
              placeholder="Conte em poucas palavras"
            />
            <p className="campo-dica">Escreva ao menos {MOTIVO_MINIMO_CARACTERES} caracteres.</p>
          </>
        )}
      </fieldset>

      <div className="acoes">
        <button type="button" className="btn btn-outline" disabled={ocupado} onClick={() => setAberto(false)}>
          Manter envio<span className="sr-only"> {envio.protocolo}</span>
        </button>
        <button type="button" className="btn btn-danger" disabled={ocupado || motivo === null} onClick={() => void confirmar()}>
          {ocupado ? 'Cancelando…' : 'Confirmar cancelamento'}
          <span className="sr-only"> do envio {envio.protocolo}</span>
        </button>
      </div>
    </div>
  )
}

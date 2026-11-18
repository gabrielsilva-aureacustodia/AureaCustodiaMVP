'use client'

/* ============================================================================
 * O MODAL ÚNICO DE CONFIRMAÇÃO — frente A, 17/11/2026.
 *
 * Abre quando uma ação sensível (saque, compra, venda, troca de Pix, senha ou e-mail,
 * retirada de moeda) devolve `{ ok:false, precisaSenha:true }`. A pessoa confirma e a
 * ação é reenviada sozinha, sem recarregar a tela (quem reenvia é `useConfirmarSenha`).
 * A regra de verdade — conferir senha, emitir a prova, decidir senha ou código — mora no
 * servidor (`src/server/auth/reautenticacao.ts`); este arquivo só pergunta e mostra.
 *
 * POR QUE NÃO USA O `ModalHost` DO SITE. O `ModalHost` guarda UM conteúdo por vez: abrir
 * outro modal por ele trocaria o conteúdo e a pessoa perderia o que digitou (o valor do
 * saque, a chave Pix nova, a quantidade da compra). Este diálogo é uma camada à parte,
 * desenhada por cima (portal no <body>, z-index logo acima do modal e abaixo do toast),
 * então o modal de baixo continua intacto com o estado dele — e quando a confirmação
 * termina, a ação segue de onde parou.
 *
 * As classes `.modal-bg` e `.modal` são reaproveitadas de propósito: o mesmo véu, a mesma
 * caixa, os mesmos tokens de tema claro e escuro, o mesmo cuidado com o teclado do
 * celular (a caixa rola em vez de cortar). O que é só deste diálogo está em
 * `src/styles/seguranca.css`.
 *
 * TECLADO E LEITOR DE TELA: o foco entra no primeiro campo, Tab e Shift+Tab giram dentro
 * da caixa, Esc cancela (menos durante o envio), e o foco volta para o elemento que o
 * tinha antes. Alvos de toque de 44 px vêm de `.btn` e `.tinput`.
 *
 * VOCABULÁRIO: a conta que só entra com Google recebe um "código" (nunca outra palavra).
 * ==========================================================================*/

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  confirmarCodigoAction,
  confirmarSenhaAction,
  pedirCodigoPorEmailAction,
} from '@/server/auth/reautenticacao-actions'

import type { MetodoDeConfirmacao, NivelDeConfirmacao } from './confirmacao'

export interface ModalConfirmarSenhaProps {
  nivel: NivelDeConfirmacao
  metodo: MetodoDeConfirmacao
  /** A confirmação foi aceita pelo servidor: a ação pode ser reenviada. */
  onConfirmado: () => void
  /** A pessoa desistiu (botão Cancelar ou Esc): a ação NÃO é reenviada. */
  onCancelar: () => void
}

/** `enviar`: conta Google, ainda sem código · `digitar`: código pedido · `senha`: conta com senha. */
type Etapa = 'senha' | 'enviar' | 'digitar'

const TAMANHO_DO_CODIGO = 6
const REENVIO_PADRAO_MS = 60_000
const FALHA_PADRAO = 'Não foi possível confirmar agora. Tente novamente.'

const FOCAVEIS =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

function focaveisDe(caixa: HTMLElement | null): HTMLElement[] {
  return caixa ? Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS)) : []
}

export function ModalConfirmarSenha({ nivel, metodo, onConfirmado, onCancelar }: ModalConfirmarSenhaProps): ReactNode {
  const idTitulo = useId()
  const idTexto = useId()
  const caixaRef = useRef<HTMLDivElement>(null)

  const [etapa, setEtapa] = useState<Etapa>(metodo === 'senha' ? 'senha' : 'enviar')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  /** Quando o botão de reenviar volta a funcionar (hora do relógio), e o "agora" que o contador lê. */
  const [reenviarEm, setReenviarEm] = useState(0)
  const [agora, setAgora] = useState(() => Date.now())

  /* ---------- foco: entra, gira dentro da caixa e volta para onde estava ---------- */

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => anterior?.focus()
  }, [])

  // O foco vai para o primeiro controle da caixa na abertura, a cada etapa nova e sempre que um envio termina
  // (durante o envio o campo e o botão ficam desabilitados e o navegador tira o foco deles: sem isto quem
  // usa teclado errava a senha e ficava com o foco perdido).
  useEffect(() => {
    if (ocupado) return
    const alvo = caixaRef.current?.querySelector<HTMLElement>('[data-foco-inicial]') ?? focaveisDe(caixaRef.current)[0]
    alvo?.focus()
  }, [etapa, ocupado])

  /* ---------- contagem para pedir outro código ---------- */

  useEffect(() => {
    if (reenviarEm <= Date.now()) return
    const relogio = window.setInterval(() => {
      const agoraMs = Date.now()
      setAgora(agoraMs)
      if (agoraMs >= reenviarEm) window.clearInterval(relogio)
    }, 1000)
    return () => window.clearInterval(relogio)
  }, [reenviarEm])

  const segundosParaReenviar = Math.max(0, Math.ceil((reenviarEm - agora) / 1000))

  /* ---------- teclado ---------- */

  const aoTeclar = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (!ocupado) onCancelar()
        return
      }
      if (e.key !== 'Tab') return
      const itens = focaveisDe(caixaRef.current)
      if (itens.length === 0) return
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      const atual = document.activeElement
      if (e.shiftKey && (atual === primeiro || !caixaRef.current?.contains(atual))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (atual === ultimo || !caixaRef.current?.contains(atual))) {
        e.preventDefault()
        primeiro.focus()
      }
    },
    [ocupado, onCancelar],
  )

  /* ---------- as três chamadas ao servidor ---------- */

  async function confirmarComSenha(): Promise<void> {
    if (ocupado || !senha) return
    setOcupado(true)
    setErro('')
    try {
      const res = await confirmarSenhaAction(senha, nivel)
      if (res.ok) {
        setSenha('')
        onConfirmado()
        return
      }
      setErro(res.error ?? FALHA_PADRAO)
      setSenha('')
    } catch {
      setErro(FALHA_PADRAO)
    } finally {
      setOcupado(false)
    }
  }

  async function enviarCodigo(): Promise<void> {
    if (ocupado) return
    setOcupado(true)
    setErro('')
    setAviso('')
    try {
      const res = await pedirCodigoPorEmailAction()
      if (res.ok) {
        const espera = res.data?.reenvioEmMs ?? REENVIO_PADRAO_MS
        const agoraMs = Date.now()
        setAgora(agoraMs)
        setReenviarEm(agoraMs + espera)
        setCodigo('')
        setAviso(res.message ?? 'Enviamos um código para o seu e-mail.')
        setEtapa('digitar')
        return
      }
      setErro(res.error ?? FALHA_PADRAO)
    } catch {
      setErro(FALHA_PADRAO)
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarComCodigo(): Promise<void> {
    if (ocupado || codigo.length !== TAMANHO_DO_CODIGO) return
    setOcupado(true)
    setErro('')
    try {
      const res = await confirmarCodigoAction(codigo, nivel)
      if (res.ok) {
        setCodigo('')
        onConfirmado()
        return
      }
      setErro(res.error ?? FALHA_PADRAO)
      setCodigo('')
    } catch {
      setErro(FALHA_PADRAO)
    } finally {
      setOcupado(false)
    }
  }

  function aoEnviarFormulario(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    if (etapa === 'senha') void confirmarComSenha()
    else if (etapa === 'enviar') void enviarCodigo()
    else void confirmarComCodigo()
  }

  /* ---------- textos ---------- */

  const titulo = etapa === 'senha' ? 'Confirme a sua senha' : 'Confirme por código'
  const texto =
    etapa === 'senha'
      ? nivel === 'janela'
        ? 'Por segurança, digite a sua senha para comprar ou vender. Depois disso você negocia por alguns minutos sem digitar de novo.'
        : 'Por segurança, digite a sua senha para continuar. Esta confirmação vale só para esta ação.'
      : etapa === 'enviar'
        ? 'A sua conta entra com o Google e não tem senha no Real Olímpico. Vamos enviar um código de 6 dígitos para o seu e-mail.'
        : `${aviso} Digite o código abaixo.`.trim()

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="modal-bg show confirma-bg"
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
      aria-describedby={idTexto}
      onKeyDown={aoTeclar}
    >
      <div className="modal confirma" ref={caixaRef}>
        <h3 className="serif" id={idTitulo}>
          {titulo}
        </h3>
        <p id={idTexto}>{texto}</p>

        <form onSubmit={aoEnviarFormulario} noValidate>
          {etapa === 'senha' ? (
            <>
              <label className="field-lbl" htmlFor={`${idTexto}-senha`}>
                Senha
              </label>
              <input
                id={`${idTexto}-senha`}
                data-foco-inicial
                type="password"
                className="tinput"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                disabled={ocupado}
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? `${idTexto}-erro` : undefined}
              />
            </>
          ) : null}

          {etapa === 'digitar' ? (
            <>
              <label className="field-lbl" htmlFor={`${idTexto}-codigo`}>
                Código de {TAMANHO_DO_CODIGO} dígitos
              </label>
              <input
                id={`${idTexto}-codigo`}
                data-foco-inicial
                className="tinput confirma-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, TAMANHO_DO_CODIGO))}
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                disabled={ocupado}
                aria-invalid={erro ? true : undefined}
                aria-describedby={erro ? `${idTexto}-erro` : undefined}
              />
            </>
          ) : null}

          {erro ? (
            <div className="note u-mt10 u-erro" role="alert" id={`${idTexto}-erro`}>
              {erro}
            </div>
          ) : null}

          <div className="m-actions">
            <button type="button" className="btn btn-outline" onClick={onCancelar} disabled={ocupado}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-gold"
              data-foco-inicial={etapa === 'enviar' ? true : undefined}
              disabled={
                ocupado ||
                (etapa === 'senha' && !senha) ||
                (etapa === 'digitar' && codigo.length !== TAMANHO_DO_CODIGO)
              }
              aria-busy={ocupado || undefined}
            >
              {ocupado
                ? 'Aguarde...'
                : etapa === 'enviar'
                  ? 'Enviar código'
                  : 'Confirmar'}
            </button>
          </div>

          {etapa === 'enviar' ? (
            <div className="confirma-extra">
              <button type="button" className="btn btn-ghost" onClick={() => setEtapa('digitar')} disabled={ocupado}>
                Já tenho um código
              </button>
            </div>
          ) : null}

          {etapa === 'digitar' ? (
            <div className="confirma-extra" aria-live="polite">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void enviarCodigo()}
                disabled={ocupado || segundosParaReenviar > 0}
              >
                {segundosParaReenviar > 0 ? `Reenviar código em ${segundosParaReenviar} s` : 'Reenviar código'}
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>,
    document.body,
  )
}

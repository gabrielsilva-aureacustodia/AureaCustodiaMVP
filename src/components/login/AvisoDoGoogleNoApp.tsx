'use client'

/**
 * Aviso sob o botão do Google quando a tela de entrada roda DENTRO do app instalado (T6, 22/11/2026, item 10b do
 * Rogério: "o app não funciona, principalmente no iPhone").
 *
 * POR QUÊ. No iPhone o Google abre numa folha do Safari, fora do app, e o retorno pode não achar o cookie do login
 * (docs/pwa/DIAGNOSTICO_PWA.md, "Contrato D↔E"). Só um aparelho real diz se acontece; até lá a pessoa precisa de uma
 * saída escrita na própria tela. O botão do Google NÃO some: se funcionar, é o caminho mais curto.
 *
 * A saída é e-mail e senha. Quem criou a conta só pelo Google não tem senha: o "Esqueci minha senha" (S01, QA Davi
 * 22/11/2026, `solicitarRedefinicaoDeSenha`) cria uma; o atendimento segue como segunda saída. Até o S01 a tela não
 * tinha o botão e o texto só mandava pedir o link à equipe.
 *
 * Renderiza nada no servidor e numa aba comum: só `lerStandalone()` (cliente, depois da hidratação) liga o aviso.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { lerStandalone } from '@/lib/pwa/navegador'

export const TEXTO_AVISO_GOOGLE_NO_APP =
  'Se o Google não abrir ou voltar sem entrar, use e-mail e senha logo abaixo. ' +
  'Criou a conta pelo Google e ainda não tem senha? Toque em "Esqueci minha senha" para criar uma, ou peça ao atendimento.'

/** Só o texto, sem decisão de quando aparece — separado para a suíte (sem DOM) conferir o conteúdo. */
export function AvisoDoGoogleNoAppVisivel(): ReactNode {
  return (
    <p className="auth-hint" role="note" data-aviso="google-no-app">
      {TEXTO_AVISO_GOOGLE_NO_APP}
    </p>
  )
}

export function AvisoDoGoogleNoApp(): ReactNode {
  const [emApp, setEmApp] = useState(false)

  useEffect(() => {
    setEmApp(lerStandalone())
  }, [])

  return emApp ? <AvisoDoGoogleNoAppVisivel /> : null
}

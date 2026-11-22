'use client'

/**
 * Formulário de entrada por Supabase Auth.
 *
 * A página continua sendo Server Component para barrar quem já está logado;
 * este filho concentra apenas estado de formulário, acessibilidade e a chamada
 * à Server Action. Nenhum cliente ou segredo do Supabase cruza esta fronteira.
 *
 * Google primeiro (frente D, item 4 do Rogério, 17/11/2026): "Entrar com o Google" é a ação principal e e-mail e
 * senha — os mesmos campos, olho de revelar e chamada de `login` de antes — ficaram recolhidos em "Prefiro usar
 * e-mail e senha". Os avisos seguem a regra do RegisterForm: o que vem do servidor (conta desativada, retorno do
 * OAuth, e-mail confirmado) e o erro do Google aparecem sob o botão do Google; erro da senha, dentro do bloco.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { login, loginWithGoogle } from '@/server/actions/auth'

import { AuthShell } from './AuthShell'
import { AvisoDoGoogleNoApp } from './AvisoDoGoogleNoApp'
import { EmailAlternativo } from './EmailAlternativo'
import { GoogleButton } from './GoogleButton'

const PW_REVEAL_MS = 3000
const ERRO_GENERICO = 'Não foi possível entrar. Tente novamente.'

const IconeOlho = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M1.8 12S5.6 5.2 12 5.2 22.2 12 22.2 12 18.4 18.8 12 18.8 1.8 12 1.8 12z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
)

const IconeOlhoCortado = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9.9 5.5A8.6 8.6 0 0112 5.2c6.4 0 10.2 6.8 10.2 6.8a17 17 0 01-3.3 4.1M6.4 6.5A17 17 0 001.8 12S5.6 18.8 12 18.8a8.9 8.9 0 004-.9" />
    <path d="M9.7 9.7a3.2 3.2 0 004.5 4.5" />
    <path d="M3 3l18 18" strokeLinecap="round" />
  </svg>
)

interface LoginFormProps {
  initialError?: string
  initialMessage?: string
  registrationOpen: boolean
}

export function LoginForm({
  initialError = '',
  initialMessage = '',
  registrationOpen,
}: LoginFormProps): ReactNode {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(initialError)
  const [mensagem, setMensagem] = useState(initialMessage)
  const [revelada, setRevelada] = useState(false)
  const [enviando, setEnviando] = useState(false)
  // Em qual das duas regiões de aviso o texto aparece (ver o cabeçalho do arquivo).
  const [ondeAvisar, setOndeAvisar] = useState<'topo' | 'email'>('topo')
  const timerRevelar = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!revelada) return
    timerRevelar.current = setTimeout(() => setRevelada(false), PW_REVEAL_MS)
    return () => {
      if (timerRevelar.current) clearTimeout(timerRevelar.current)
    }
  }, [revelada])

  async function entrar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (enviando) return
    setOndeAvisar('email')
    setEnviando(true)
    setErro('')
    setMensagem('')

    try {
      const result = await login(email, senha)
      if (!result.ok) {
        setErro(result.error ?? ERRO_GENERICO)
        return
      }
      router.push('/inicio')
      router.refresh()
    } finally {
      setEnviando(false)
    }
  }

  async function entrarGoogle(): Promise<void> {
    if (enviando) return
    setOndeAvisar('topo')
    setEnviando(true)
    setErro('')
    setMensagem('')

    try {
      const result = await loginWithGoogle()
      if (!result.ok || !result.data?.redirectTo) {
        setErro(result.error ?? ERRO_GENERICO)
        return
      }
      window.location.assign(result.data.redirectTo)
    } finally {
      setEnviando(false)
    }
  }

  // Mesmo conteúdo para as duas regiões de aviso; só uma delas o recebe (ver o cabeçalho do arquivo).
  const avisos = (
    <>
      {erro ? <p className="login-error">{erro}</p> : null}
      {mensagem ? <p className="auth-success">{mensagem}</p> : null}
    </>
  )

  return (
    <AuthShell titulo="Acesse sua conta e acompanhe sua coleção.">
      <section className="login-card" aria-labelledby="login-title">
        <h1 className="login-title" id="login-title">
          Acessar plataforma
        </h1>
        <p className="login-sub">Entre com a conta confirmada dos sócios.</p>

        <GoogleButton rotulo="Entrar com o Google" disabled={enviando} onClick={() => void entrarGoogle()} />
        <AvisoDoGoogleNoApp />
        <div className="auth-feedback" aria-live="polite">
          {ondeAvisar === 'topo' ? avisos : null}
        </div>

        <EmailAlternativo aberto={Boolean(initialError)}>
          <form onSubmit={(event) => void entrar(event)}>
            <div className="field">
              <label htmlFor="loginEmail">E-mail</label>
              <input
                id="loginEmail"
                type="email"
                placeholder="seuemail@exemplo.com.br"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="loginPass">Senha</label>
              <div className="pw-wrap">
                <input
                  id="loginPass"
                  type={revelada ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                />
                <button
                  type="button"
                  className={revelada ? 'pw-toggle on' : 'pw-toggle'}
                  onClick={() => setRevelada((value) => !value)}
                  aria-label={revelada ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={revelada}
                  aria-controls="loginPass"
                >
                  {revelada ? IconeOlhoCortado : IconeOlho}
                </button>
              </div>
            </div>

            <div className="auth-feedback" aria-live="polite">
              {ondeAvisar === 'email' ? avisos : null}
            </div>

            <button className="btn btn-outline" type="submit" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </EmailAlternativo>

        <p className="auth-switch">
          {registrationOpen ? 'Ainda não tem conta?' : 'Novos cadastros estão fechados.'}{' '}
          <Link href="/cadastrar">Criar conta</Link>
        </p>
      </section>
    </AuthShell>
  )
}

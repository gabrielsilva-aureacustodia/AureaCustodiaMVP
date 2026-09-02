'use client'

/**
 * Formulário de entrada por Supabase Auth.
 *
 * A página continua sendo Server Component para barrar quem já está logado;
 * este filho concentra apenas estado de formulário, acessibilidade e a chamada
 * à Server Action. Nenhum cliente ou segredo do Supabase cruza esta fronteira.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'
import { login } from '@/server/actions/auth'

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

  return (
    <main className="login-wrap auth-page">
      <section className="login-card" aria-labelledby="login-title">
        <Link className="auth-brand-link" href="/" aria-label="Voltar para a página inicial">
          <Image src={LOGO_AUREA} alt="Áurea Custódia" width={120} height={120} priority />
        </Link>

        <h1 className="login-title" id="login-title">
          Acessar plataforma
        </h1>
        <p className="login-sub">Entre com a conta confirmada dos sócios.</p>

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
            {erro ? <p className="login-error">{erro}</p> : null}
            {mensagem ? <p className="auth-success">{mensagem}</p> : null}
          </div>

          <button className="btn btn-gold" type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="auth-switch">
          {registrationOpen ? 'Ainda não tem conta?' : 'Novos cadastros estão fechados.'}{' '}
          <Link href="/cadastrar">Criar conta</Link>
        </p>
        <p className="env-tag">Ambiente de teste · Pré-MVP · Dados fictícios</p>
      </section>
    </main>
  )
}

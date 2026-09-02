'use client'

/** Formulário de cadastro protegido pela trava legal do RA-03. */

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { LOGO_AUREA } from '@/domain/constants'
import { registerWithEmail, registerWithGoogle } from '@/server/actions/auth'

interface RegistrationStatusView {
  enabled: boolean
  reason?: string
  termsUrl?: string
  privacyUrl?: string
}

interface RegisterFormProps {
  registration: RegistrationStatusView
  initialError?: string
}

export function RegisterForm({
  registration,
  initialError = '',
}: RegisterFormProps): ReactNode {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [erro, setErro] = useState(initialError)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function cadastrar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (enviando || !registration.enabled) return
    if (senha !== confirmacao) {
      setErro('As senhas informadas não são iguais.')
      return
    }

    setEnviando(true)
    setErro('')
    setMensagem('')
    try {
      const result = await registerWithEmail(name, email, senha, accepted)
      if (!result.ok) {
        setErro(result.error ?? 'Não foi possível criar a conta.')
        return
      }
      setMensagem(result.message ?? 'Conta criada. Confirme seu e-mail.')
    } finally {
      setEnviando(false)
    }
  }

  async function cadastrarGoogle(): Promise<void> {
    if (enviando || !registration.enabled) return
    setEnviando(true)
    setErro('')
    try {
      const result = await registerWithGoogle(accepted)
      if (!result.ok || !result.data?.redirectTo) {
        setErro(result.error ?? 'Não foi possível iniciar o acesso com Google.')
        return
      }
      window.location.assign(result.data.redirectTo)
    } finally {
      setEnviando(false)
    }
  }

  const disabled = enviando || !registration.enabled

  return (
    <main className="auth-page register-wrap">
      <section className="register-card" aria-labelledby="register-title">
        <Link className="auth-brand-link" href="/" aria-label="Voltar para a página inicial">
          <Image src={LOGO_AUREA} alt="Áurea Custódia" width={104} height={104} priority />
        </Link>
        <h1 className="login-title" id="register-title">
          Criar conta
        </h1>
        <p className="login-sub">Use seu e-mail real para receber a confirmação de acesso.</p>

        {!registration.enabled ? (
          <div className="auth-gate" id="documentos-legais" role="status">
            <strong>Cadastro temporariamente fechado</strong>
            <p>{registration.reason}</p>
            <p>
              A estrutura está pronta, mas nenhuma informação pessoal será enviada enquanto os
              Termos de Uso e a Política de Privacidade não estiverem vigentes.
            </p>
          </div>
        ) : null}

        <form onSubmit={(event) => void cadastrar(event)}>
          <fieldset disabled={disabled}>
            <div className="register-grid">
              <div className="field">
                <label htmlFor="registerName">Nome completo</label>
                <input
                  id="registerName"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="registerEmail">E-mail</label>
                <input
                  id="registerEmail"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="registerPassword">Senha</label>
                <input
                  id="registerPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="registerPasswordConfirmation">Confirmar senha</label>
                <input
                  id="registerPasswordConfirmation"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(event.target.value)}
                />
              </div>
            </div>

            <label className="legal-check">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                required
              />
              <span>
                Li e aceito os{' '}
                {registration.termsUrl ? (
                  <a href={registration.termsUrl} target="_blank" rel="noreferrer">
                    Termos de Uso
                  </a>
                ) : (
                  'Termos de Uso'
                )}{' '}
                e a{' '}
                {registration.privacyUrl ? (
                  <a href={registration.privacyUrl} target="_blank" rel="noreferrer">
                    Política de Privacidade
                  </a>
                ) : (
                  'Política de Privacidade'
                )}
                .
              </span>
            </label>
          </fieldset>

          <div className="auth-feedback" aria-live="polite">
            {erro ? <p className="login-error">{erro}</p> : null}
            {mensagem ? <p className="auth-success">{mensagem}</p> : null}
          </div>

          <button className="btn btn-gold" type="submit" disabled={disabled}>
            {enviando ? 'Criando…' : 'Criar conta por e-mail'}
          </button>
          <div className="auth-divider" aria-hidden="true">
            <span>ou</span>
          </div>
          <button
            className="btn btn-outline auth-google"
            type="button"
            disabled={disabled}
            onClick={() => void cadastrarGoogle()}
          >
            Continuar com Google
          </button>
        </form>

        <p className="auth-switch">
          Já tem conta? <Link href="/entrar">Entrar</Link>
        </p>
      </section>
    </main>
  )
}
